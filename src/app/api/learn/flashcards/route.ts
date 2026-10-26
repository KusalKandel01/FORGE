import { NextResponse } from "next/server";
import { z } from "zod";
import { chatComplete } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  topic: z.string().trim().min(1).max(200),
  level: z.string().trim().min(1).max(80),
});

const SYSTEM =
  "You are a world class teacher and memory coach. You turn any subject into atomic flashcards for spaced repetition. Card laws: one fact per card, nothing else on it. The front is a sharp, specific question that has exactly one clear answer, never a vague prompt like Tell me about X. The back is a complete answer in 1 to 2 sentences with zero filler. Cards must stand alone: no card depends on having seen another card. Cover the most important, memorable and testable facts of the topic at the level the learner asks for. Respond with ONLY valid JSON, no markdown fences.";

interface ParsedCards {
  cards: { front: string; back: string }[];
}

/** Parse the model reply robustly: strip fences, slice first { to last }. */
function parseCards(raw: string): ParsedCards | null {
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
    const rawCards = Array.isArray(obj.cards) ? obj.cards : [];
    const cards = rawCards
      .map((c) => {
        if (!c || typeof c !== "object") return null;
        const rec = c as Record<string, unknown>;
        const front = typeof rec.front === "string" ? rec.front.trim() : "";
        const back = typeof rec.back === "string" ? rec.back.trim() : "";
        if (front.length === 0 || back.length === 0) return null;
        return { front: front.slice(0, 300), back: back.slice(0, 600) };
      })
      .filter((c): c is { front: string; back: string } => c !== null)
      .slice(0, 10);
    if (cards.length < 3) return null;
    return { cards };
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
      { error: "Give the deck a topic first." },
      { status: 400 }
    );
  }

  const { topic, level } = parsed.data;

  const prompt = [
    `Create exactly 10 flashcards on the topic "${topic}" for a ${level} learner.`,
    "",
    "Card laws:",
    "- One atomic fact per card. If a card needs the word and, split it into two cards.",
    "- The front is a sharp, specific question. Never vague, never yes or no unless the reasoning is the point.",
    "- The back answers it completely in 1 to 2 sentences, with concrete numbers, names or mechanisms where possible.",
    "- The 10 cards must cover 10 different angles of the topic: no duplicates, no near duplicates.",
    "",
    "Return JSON exactly in this shape:",
    "{",
    '  "cards": [',
    '    { "front": "the sharp specific question", "back": "the 1 to 2 sentence answer" }',
    "  ]",
    "}",
    "Respond with ONLY valid JSON, no markdown fences.",
  ].join("\n");

  try {
    const content = await chatComplete({ system: SYSTEM, user: prompt });
    const parsedCards = parseCards(content);
    if (!parsedCards) throw new Error("Model reply was not usable JSON");

    return NextResponse.json({ cards: parsedCards.cards });
  } catch {
    return NextResponse.json(
      { error: "The flashcard writer is unavailable right now. Try again in a moment." },
      { status: 502 }
    );
  }
}
