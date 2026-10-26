import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * In-memory cache (FIFO eviction, max 15 entries) so repeat opens of the same
 * book do not re-download a multi-megabyte plain text file.
 */
const textCache = new Map<string, string>();
const TEXT_CACHE_MAX = 15;

const BROWSER_UA = "Mozilla/5.0 (compatible; FORGE-reader/1.0)";

function cacheText(id: string, text: string): void {
  if (textCache.size >= TEXT_CACHE_MAX) {
    const oldest = textCache.keys().next().value;
    if (oldest !== undefined) textCache.delete(oldest);
  }
  textCache.set(id, text);
}

/** Trim Project Gutenberg boilerplate and normalize the body. */
function cleanGutenbergText(raw: string): string {
  let text = raw.replace(/\r\n/g, "\n");
  const startMarker = "*** START OF THE PROJECT GUTENBERG EBOOK";
  const endMarker = "*** END OF THE PROJECT GUTENBERG EBOOK";
  const startAt = text.indexOf(startMarker);
  if (startAt >= 0) {
    const lineEnd = text.indexOf("\n", startAt);
    text = lineEnd >= 0 ? text.slice(lineEnd + 1) : "";
  }
  const endAt = text.indexOf(endMarker);
  if (endAt >= 0) {
    const lineStart = text.lastIndexOf("\n", endAt);
    text = lineStart >= 0 ? text.slice(0, lineStart) : text.slice(0, endAt);
  }
  text = text.replace(/\n{4,}/g, "\n\n\n");
  return text.trim();
}

const PLAIN_TEXT_FORMATS = [
  "text/plain; charset=utf-8",
  "text/plain",
  "text/plain; charset=us-ascii",
];

/** Direct plain text URLs on gutenberg.org, tried in order. */
function directTextUrls(n: string): string[] {
  return [
    `https://www.gutenberg.org/ebooks/${n}.txt.utf-8`,
    `https://www.gutenberg.org/cache/epub/${n}/pg${n}.txt`,
    `https://www.gutenberg.org/files/${n}/${n}-0.txt`,
  ];
}

async function downloadText(url: string, timeoutMs: number): Promise<string> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "User-Agent": BROWSER_UA },
  });
  if (!res.ok) throw new Error(`Text request failed (${res.status})`);
  const raw = await res.text();
  if (!raw.trim()) throw new Error("Text body was empty");
  return raw;
}

/**
 * Internet Archive full text. Identifier -> metadata (fast JSON listing of
 * the item files) -> download the OCR text file. Archive.org occasionally
 * answers 503 under load, so the download retries once before giving up.
 */
async function archiveText(
  identifier: string,
  cacheId: string
): Promise<NextResponse> {
  const cached = textCache.get(cacheId);
  if (cached) {
    return NextResponse.json({ text: cached });
  }

  try {
    const metaRes = await fetch(
      `https://archive.org/metadata/${encodeURIComponent(identifier)}`,
      {
        signal: AbortSignal.timeout(10000),
        next: { revalidate: 86400 },
        headers: { "User-Agent": BROWSER_UA, Accept: "application/json" },
      }
    );
    if (!metaRes.ok) throw new Error(`Metadata request failed (${metaRes.status})`);
    const meta: unknown = await metaRes.json();
    const files = (meta as { files?: unknown })?.files;
    let fileName: string | null = null;
    if (Array.isArray(files)) {
      for (const file of files) {
        const name = (file as { name?: unknown })?.name;
        if (typeof name !== "string") continue;
        const lower = name.toLowerCase();
        if (lower.endsWith("_djvu.txt") || lower.endsWith(".txt")) {
          fileName = name;
          // Prefer the plain djvu OCR text over any other txt.
          if (lower.endsWith("_djvu.txt")) break;
        }
      }
    }
    if (!fileName) throw new Error("No text format available for this item");

    const textUrl = `https://archive.org/download/${encodeURIComponent(
      identifier
    )}/${fileName.split("/").map(encodeURIComponent).join("/")}`;

    let raw = "";
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        raw = await downloadText(textUrl, 25000);
        break;
      } catch (e) {
        lastError = e;
      }
    }
    if (!raw.trim()) throw lastError ?? new Error("Archive text came back empty");

    // Normalize the OCR text: strip archive.org URL footers that repeat,
    // collapse runaway blank lines, trim the usual leading metadata cruft.
    let text = raw
      .replace(/\r\n/g, "\n")
      .replace(/https?:\/\/\S*archive\.org\/details\/\S*/g, "")
      .replace(/\n{4,}/g, "\n\n\n")
      .trim();
    if (text.length < 200) throw new Error("Archive text was too short to read");
    // Drop the leading scan header up to the first long paragraph if it
    // looks like machine metadata instead of the book.
    const firstBig = text.search(/\n\s*\n\s*\S/);
    if (text.slice(0, firstBig >= 0 ? firstBig : 0).includes("http")) {
      text = firstBig >= 0 ? text.slice(firstBig).trim() : text;
    }

    cacheText(cacheId, text);
    return NextResponse.json({ text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("(401)") || msg.includes("(403)")) {
      return NextResponse.json(
        {
          error:
            "This modern scan is lending-restricted on the Archive, so its pages cannot be copied. Open the book banner for the free public domain edition of this title, or use WRITE IT WITH AI.",
        },
        { status: 403 }
      );
    }
    if (msg.includes("(404)")) {
      return NextResponse.json(
        {
          error:
            "This item has no plain text scan. Pick another edition with the READ NOW badge, or use WRITE IT WITH AI.",
        },
        { status: 404 }
      );
    }
    return NextResponse.json(
      {
        error:
          "Could not load this Archive.org book right now. Its scan may be image only, or the Archive is under load. Try again in a moment.",
      },
      { status: 502 }
    );
  }
}

export async function GET(request: Request) {
  const id = (new URL(request.url).searchParams.get("id") ?? "").trim();

  const gutMatch = /^gut-(\d+)$/.exec(id);
  const iaMatch = /^ia-([A-Za-z0-9._-]+)$/.exec(id);
  if (iaMatch) {
    return archiveText(iaMatch[1], id);
  }
  if (!gutMatch) {
    return NextResponse.json(
      { error: "Invalid book id. Free full books use ids like gut-2701." },
      { status: 400 }
    );
  }

  const cached = textCache.get(id);
  if (cached) {
    return NextResponse.json({ text: cached });
  }

  const gutenbergId = gutMatch[1];
  try {
    // 1. Book metadata: which plain text formats exist?
    let textUrl: string | undefined;
    try {
      const metaRes = await fetch(
        `https://gutendex.com/books/${gutenbergId}`,
        {
          signal: AbortSignal.timeout(15000),
          next: { revalidate: 86400 },
          headers: { "User-Agent": BROWSER_UA, Accept: "application/json" },
        }
      );
      if (metaRes.ok) {
        const meta: unknown = await metaRes.json();
        const formats =
          (meta as { formats?: Record<string, string> })?.formats ?? {};
        for (const key of PLAIN_TEXT_FORMATS) {
          const value = formats[key];
          if (typeof value === "string" && value && !value.endsWith(".zip")) {
            textUrl = value;
            break;
          }
        }
      }
    } catch {
      // Metadata catalog unreachable: fall back to direct URLs below.
    }

    // 2. Download the full plain text (metadata URL first, then direct).
    const candidates = textUrl
      ? [textUrl, ...directTextUrls(gutenbergId)]
      : directTextUrls(gutenbergId);
    let text: string | null = null;
    let lastError: unknown = null;
    for (const candidate of candidates) {
      try {
        text = cleanGutenbergText(await downloadText(candidate, 20000));
        if (text) break;
      } catch (e) {
        lastError = e;
      }
    }
    if (!text) {
      throw lastError ?? new Error("No plain text format available");
    }

    cacheText(id, text);
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json(
      { error: "Could not load this book right now." },
      { status: 502 }
    );
  }
}
