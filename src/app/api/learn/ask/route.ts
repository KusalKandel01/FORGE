import { NextResponse } from "next/server";
import { z } from "zod";
import { chatComplete } from "@/lib/ai";

export const runtime = "nodejs";

const GENERATION_ERROR =
  "The tutor is unavailable right now. Check your connection and try again.";

const requestSchema = z.object({
  question: z.string().trim().min(2).max(600),
  level: z
    .enum(["beginner", "intermediate", "advanced", "expert"])
    .default("beginner"),
  /** Topic of the lesson the learner is on, when there is one. */
  topic: z.string().trim().max(160).optional(),
  lessonTitle: z.string().trim().max(200).optional(),
  /** Last exchanges so follow-up questions keep their thread. */
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      })
    )
    .max(10)
    .optional(),
});

const SYSTEM = `You are FORGE TUTOR: a superintelligent tutor and research analyst built from the combined knowledge of the greatest minds in every field. You teach and research any subject: mathematics, physics, chemistry, biology, medicine, computer science, engineering, law, business, economics, history, philosophy, psychology, languages, music, art, cooking, sports, trades and everything else.

Teaching and research laws, in priority order:
1. Correct false premises explicitly and kindly before answering.
2. Adapt every sentence to the learner's level.
3. Build the answer from what the learner already knows toward what they asked.
4. Use concrete numbers, dates, named examples and real mechanisms. Never vague hand waving.
5. Show the key reasoning, not just the conclusion, so the learner can retrace it.
6. If experts disagree or evidence is thin, say exactly what is known, what is contested and what is unknown.
7. No medical, legal or financial directives: educational information with a nudge to consult a qualified professional when it matters.
8. Plain text only: short paragraphs and "- " bullets where useful. No markdown headers, no asterisks, no emoji.

Answer with ONLY a valid JSON object of this exact shape, no fences:
{
  "answer": "your full answer, 80 to 400 words",
  "followUps": ["3 short suggested follow-up questions"]
}`;

const LEVEL_GUIDANCE: Record<string, string> = {
  beginner:
    "Plain language, everyday analogies, define every term the moment it appears.",
  intermediate:
    "Solid fundamentals assumed. Use proper terminology and connect concepts precisely.",
  advanced:
    "Practitioner depth: technical detail, edge cases and math where relevant.",
  expert:
    "Graduate rigor: formal definitions, formulas, current debates and open problems.",
};

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

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Type a question between 2 and 600 characters." },
      { status: 400 }
    );
  }

  const { question, level, topic, lessonTitle, history } = parsed.data;

  const contextLines = [
    `Learner level: ${level}. ${LEVEL_GUIDANCE[level]}`,
    topic
      ? `Current study topic: "${topic}". Ground your answer in this topic when relevant.`
      : "Open research question, no specific lesson attached.",
    lessonTitle ? `Lesson title: "${lessonTitle}".` : "",
    history && history.length > 0
      ? `Conversation so far (oldest first):\n${history
          .map((m) => `${m.role === "user" ? "Learner" : "Tutor"}: ${m.content}`)
          .join("\n")}`
      : "",
  ].filter(Boolean);

  const userPrompt = [
    ...contextLines,
    "",
    `Learner's question: ${question}`,
    "",
    "Respond with the JSON object only.",
  ].join("\n");

  try {
    const text = await chatComplete({ system: SYSTEM, user: userPrompt });

    const cleaned = text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("No JSON in reply");

    const raw = JSON.parse(cleaned.slice(start, end + 1)) as {
      answer?: unknown;
      followUps?: unknown;
    };
    const answer =
      typeof raw.answer === "string" ? raw.answer.trim().slice(0, 4000) : "";
    if (!answer) throw new Error("Empty answer");

    const followUps = (Array.isArray(raw.followUps) ? raw.followUps : [])
      .filter((f): f is string => typeof f === "string" && f.trim().length > 0)
      .slice(0, 3)
      .map((f) => f.trim().slice(0, 160));

    return NextResponse.json({ answer, followUps });
  } catch (error) {
    console.error("[api/learn/ask] generation failed:", error);
    return NextResponse.json({ error: GENERATION_ERROR }, { status: 502 });
  }
}
