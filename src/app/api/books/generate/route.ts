import { NextResponse } from "next/server";
import { z } from "zod";
import { chatComplete } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  title: z.string().trim().min(1).max(200),
  genre: z.string().trim().min(1).max(80),
  blurb: z.string().trim().max(2000).optional(),
  author: z.string().trim().max(120).optional(),
  /** original = a brand new FORGE book. companion = a readable, faithful
   *  guide through a real published book the reader wants to read. */
  mode: z.enum(["original", "companion"]).default("original"),
});

const ORIGINAL_SYSTEM =
  "You are one of the greatest writers who ever lived: a master novelist and non-fiction author with the plotting instinct of a bestselling storyteller and the research discipline of an academic. You design book outlines with real architecture: a compelling premise, escalating arcs and a satisfying destination. Respond with ONLY valid JSON, no markdown fences.";

const COMPANION_SYSTEM =
  "You are the world's best book guide: a legendary literature professor and study coach who has read every major book ever published and can walk any reader through a real book, chapter by chapter, faithfully covering its actual ideas, structure, stories and lessons. You know these books deeply. Respond with ONLY valid JSON, no markdown fences.";

interface ParsedOutline {
  title: string;
  description: string;
  chapterTitles: string[];
}

/** Parse the model reply robustly: strip fences, slice first { to last }. */
function parseOutline(
  raw: string,
  fallbackTitle: string,
  mode: "original" | "companion"
): ParsedOutline | null {
  if (!raw) return null;
  let s = raw.trim();
  s = s
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first < 0 || last <= first) return null;
  try {
    const obj = JSON.parse(s.slice(first, last + 1)) as Record<string, unknown>;
    const title =
      typeof obj.title === "string" && obj.title.trim()
        ? obj.title.trim()
        : fallbackTitle;
    const rawDescription =
      typeof obj.description === "string" ? obj.description.trim() : "";
    const description =
      mode === "companion" && rawDescription &&
      !rawDescription.toLowerCase().includes("companion")
        ? `An AI reading companion for the real book. ${rawDescription}`
        : rawDescription;
    const chapters = Array.isArray(obj.chapterTitles)
      ? obj.chapterTitles
          .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
          .map((t) => t.trim())
      : [];
    if (chapters.length === 0) return null;
    const chapterTitles = chapters.slice(0, 12);
    while (chapterTitles.length < 10) {
      chapterTitles.push(`Part ${chapterTitles.length + 1}`);
    }
    return { title, description, chapterTitles };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Give the book a title first." },
      { status: 400 }
    );
  }

  const { title, genre, blurb, author, mode } = parsed.data;
  const byLine = author && author.length > 0 ? ` by ${author}` : "";

  const prompt =
    mode === "companion"
      ? [
          `The reader wants to READ the real published book "${title}"${byLine} right now, but no free ebook copy exists in the catalogs.`,
          "So build a 10 chapter READING COMPANION that walks them through the REAL book, part by part:",
          "- The chapters must follow the real book's actual structure in order. For fiction: the real plot arc, beginning to ending (spoilers expected and wanted). For non-fiction: the real curriculum the book teaches, with its actual core ideas, methods and memorable examples.",
          "- Every chapter title should name what that part of the real book covers. No generic titles, no duplicates.",
          `- The description (2 to 3 sentences) must say honestly what the real book "${title}"${byLine} teaches or shows, and that this companion walks through all of it in order.`,
          "This is a guide edition written in fresh words, not the publisher's text.",
          "",
          "Return JSON exactly in this shape:",
          "{",
          '  "title": "the book title (as published)",',
          '  "description": "2 to 3 sentences describing the real book and this walkthrough",',
          '  "chapterTitles": ["exactly 10 chapter titles as strings"]',
          "}",
          "Respond with ONLY valid JSON, no markdown fences.",
        ].join("\n")
      : [
          `Create an original book outline for the title "${title}".`,
          "Genre: " + genre + ".",
          "User notes: " + (blurb && blurb.length > 0 ? blurb : "none") + ".",
          "",
          "Outline laws:",
          "- The 10 chapter titles must form a real arc: for fiction, escalating stakes, turning points and a strong destination; for non-fiction, a coherent curriculum that builds from foundations to mastery.",
          "- Every title must be specific and evocative. No generic titles like The Beginning or The End and no duplicates.",
          "- The description must read like compelling jacket copy: 2 to 3 sentences that make someone want to read it.",
          "",
          "Return JSON exactly in this shape:",
          "{",
          '  "title": "the nicely formatted book title",',
          '  "description": "2 to 3 sentences describing the book",',
          '  "chapterTitles": ["exactly 10 chapter titles as strings"]',
          "}",
          "Respond with ONLY valid JSON, no markdown fences.",
        ].join("\n");

  try {
    const content = await chatComplete({
      system: mode === "companion" ? COMPANION_SYSTEM : ORIGINAL_SYSTEM,
      user: prompt,
    });
    const outline = parseOutline(content, title, mode);
    if (!outline) throw new Error("Model reply was not usable JSON");

    return NextResponse.json({
      book: {
        id: `gen-${Date.now().toString(36)}`,
        title: outline.title,
        author: mode === "companion" ? (author || "Published book") : "FORGE Original",
        description: outline.description,
        chapterTitles: outline.chapterTitles,
        mode,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "The writer model is unavailable right now. Try again in a moment." },
      { status: 502 }
    );
  }
}
