"use client";

/**
 * Extract plain text from a PDF file, entirely on the client, so the user's
 * own study books and textbooks can join the shelf without any upload to a
 * server. pdfjs loads lazily: nothing of it is downloaded until a PDF is
 * actually picked.
 */

export async function extractPdfText(file: File): Promise<string> {
  // Hard ceiling so a broken or scanned PDF can never leave the upload
  // button hanging forever.
  const withTimeout = <T,>(p: Promise<T>, ms: number, what: string): Promise<T> =>
    Promise.race([
      p,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Reading the PDF timed out while ${what}. The file may be damaged or a scan without text.`)), ms)
      ),
    ]);

  const pdfjs = await withTimeout(
    import("pdfjs-dist"),
    30000,
    "loading the PDF reader"
  );
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await withTimeout(
    pdfjs.getDocument({ data }).promise,
    45000,
    "opening the document"
  );

  const parts: string[] = [];
  const maxPages = Math.min(doc.numPages, 2000);
  for (let p = 1; p <= maxPages; p++) {
    const page = await doc.getPage(p);
    const content = await withTimeout(page.getTextContent(), 30000, `reading page ${p}`);
    let lastY: number | null = null;
    let pageText = "";
    for (const item of content.items) {
      if (!("str" in item)) continue;
      const str = item.str as string;
      const y = ("transform" in item ? (item.transform as number[])[5] : null) as
        | number
        | null;
      // A new line in the PDF layout becomes a real newline.
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) {
        pageText += "\n";
      } else if (pageText && !pageText.endsWith(" ") && !pageText.endsWith("\n")) {
        pageText += " ";
      }
      pageText += str;
      if (y !== null) lastY = y;
    }
    parts.push(pageText.trim());
    page.cleanup();
  }
  // pdfjs v6 has no doc.destroy(): the loading task and document are
  // garbage collected once we drop the references here.

  const text = parts
    .filter((t) => t.length > 0)
    .join("\n\n")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();

  if (!text) {
    throw new Error("No readable text found in this PDF. It may be a scanned copy of pages, which needs character recognition that FORGE does not have yet.");
  }
  return text;
}
