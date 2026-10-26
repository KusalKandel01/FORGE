import { NextResponse } from "next/server";
import { z } from "zod";
import { chatComplete } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z
  .object({
    title: z.string().trim().min(1).max(200),
    genre: z.string().trim().min(1).max(80),
    blurb: z.string().trim().max(2000).optional(),
    description: z.string().trim().max(4000).optional(),
    author: z.string().trim().max(120).optional(),
    chapterTitle: z.string().trim().min(1).max(200),
    index: z.number().int().min(0).max(49),
    total: z.number().int().min(1).max(50),
    mode: z.enum(["original", "companion"]).default("original"),
  })
  .refine((v) => v.index < v.total, {
    message: "index must be smaller than total",
  });

const ORIGINAL_SYSTEM =
  "You are one of the greatest prose writers who ever lived with total command of voice, rhythm and research. For fiction: immersive scene craft, concrete sensory detail, strong verbs, varied sentence rhythm, authentic dialogue, show don't tell, zero cliches, every chapter ends on a hook that pulls the reader forward. For non-fiction: researcher-grade authority with precise facts, clear structure and vivid illustration. Output the chapter text only: no headings, no markdown, no chapter numbers, 700 to 1000 words, ending on a natural beat.";

const COMPANION_SYSTEM =
  "You are the world's best book guide: a legendary literature professor and study coach who walks readers through real published books chapter by chapter, faithfully covering what each part of the actual book contains. You write in vivid, plain, engaging prose. You NEVER reproduce the publisher's copyrighted text, you NEVER invent a different story than the real book tells. Output the walkthrough text only: no headings, no markdown, no chapter numbers, 700 to 1100 words, plain paragraphs.";

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
      { error: "Missing chapter details. Go back to the book and try again." },
      { status: 400 }
    );
  }

  const { title, genre, blurb, description, author, chapterTitle, index, total, mode } =
    parsed.data;
  const byLine = author && author.length > 0 ? ` by ${author}` : "";

  const prompt =
    mode === "companion"
      ? [
          `Real book: "${title}"${byLine}.`,
          "What this companion covers overall: " +
            (description && description.length > 0 ? description : "the whole book") +
            ".",
          `Write the reading-companion walkthrough for part ${index + 1} of ${total}: "${chapterTitle}".`,
          "Cover faithfully, in your own vivid words, what the REAL book actually delivers in this part:",
          "- For non-fiction: the book's real arguments, methods, steps, studies and memorable examples for this part, taught clearly so the reader genuinely learns them.",
          "- For fiction: the real events of this stretch of the plot, scene by scene, with the real characters' names, decisions and turning points, told as an engaging story retelling.",
          "Do not drift into generic filler; every paragraph must carry something the real book actually contains. End with a short pointer to what the next part covers.",
        ].join(" ")
      : [
          `Book: "${title}" (${genre}).`,
          "Description: " + (description && description.length > 0 ? description : "not provided") + ".",
          "Blurb: " + (blurb && blurb.length > 0 ? blurb : "none") + ".",
          "Write chapter " + (index + 1) + " of " + total + ', titled "' + chapterTitle + '".' +
            (index > 0
              ? " It should continue the story naturally from the previous chapter, honoring continuity and escalating the arc."
              : " It is the opening chapter: hook the reader within the first three sentences and establish the world, the voice and the stakes."),
          "Craft requirements: open in a specific moment, not with weather or summary; ground every scene in concrete sensory detail; cut every word that does not earn its place.",
        ].join(" ");

  try {
    const text = (
      await chatComplete({
        system: mode === "companion" ? COMPANION_SYSTEM : ORIGINAL_SYSTEM,
        user: prompt,
      })
    ).trim();
    if (!text) throw new Error("Model returned an empty chapter");

    return NextResponse.json({ text });
  } catch {
    return NextResponse.json(
      { error: "The writer model is unavailable right now. Try again in a moment." },
      { status: 502 }
    );
  }
}
