import { NextResponse } from "next/server";
import { z } from "zod";
import type { Lesson, LessonLevel } from "@/lib/learn-cache";
import {
  extractJsonObject,
  normalizeKeyTerm,
  normalizeQuizQuestion,
  normalizeSection,
} from "@/lib/ai-json";
import { chatComplete } from "@/lib/ai";

export const runtime = "nodejs";

const GENERATION_ERROR =
  "Lesson generation is unavailable right now. Check your connection and try again.";

const requestSchema = z.object({
  topic: z.string().trim().min(2).max(120),
  level: z.enum(["beginner", "intermediate", "advanced", "expert"]),
  focus: z.string().trim().max(200).optional(),
});

const SYSTEM =
  "You are FORGE TUTOR: a superintelligent tutor and polymath built from the combined knowledge of the greatest teachers in every field: Richard Feynman's intuition building, the Socratic method of Socrates, Euclid's rigor, Sal Khan's patience, a research librarian's range and a world class professor's depth. You teach any subject at any level: sciences, mathematics, computing, engineering, medicine, law, business, economics, history, philosophy, psychology, languages, arts, music, cooking, trades and everything in between. Respond with ONLY valid JSON, no markdown fences, no commentary.";

const DEPTH_GUIDANCE: Record<LessonLevel, string> = {
  beginner:
    "Use plain language, everyday analogies and no assumed background. Define every term the moment it appears. Teach intuition before formalism.",
  intermediate:
    "Assume solid fundamentals. Use proper terminology and connect concepts precisely. Show how ideas build on each other.",
  advanced:
    "Go deep: technical depth, edge cases, and math where relevant. Treat the learner as a practitioner.",
  expert:
    "Graduate level rigor: formulas, formal definitions, open problems and current debates in the field.",
};

function buildUserPrompt(
  topic: string,
  level: LessonLevel,
  focus?: string
): string {
  const focusLine = focus
    ? `Focus: the learner specifically wants this angle: "${focus}". Keep every section, term and example relevant to that angle.\n`
    : "";
  return [
    `Build a JSON lesson on "${topic}" at "${level}" level.`,
    `Depth guidance for ${level}: ${DEPTH_GUIDANCE[level]}`,
    focusLine,
    "Teaching laws you must follow:",
    "1. Intuition before formalism: the learner must understand WHY before any definition lands.",
    "2. Build from what the learner already knows toward the new idea, one step at a time.",
    "3. Every section names and destroys one common misconception of this topic, woven into the prose.",
    "4. Each section covers a DIFFERENT angle of the topic. Two sections must never share sentences or repeat the same content.",
    "5. ON TOPIC ALWAYS: the lesson is about the requested topic and nothing else. The FIRST section must directly explain the topic itself (what it is, how it works), not its history, its applications or its connections. Other fields, applications or connections may appear only inside the LAST section, and even there they must circle back to the topic. Never spend a whole section on a different subject.",
    "6. Concrete everywhere: real numbers, dates, named experiments, worked mechanisms. Zero vague filler.",
    "7. Each section ends with one checkpoint sentence that locks in the core insight.",
    "Return JSON with EXACTLY this shape:",
    `{`,
    `  "title": string,`,
    `  "summary": string (2-3 sentences),`,
    `  "sections": array of 4-5 objects, each { "heading": string, "content": string (100-200 words, plain paragraphs separated by \\n\\n, no markdown, includes one misconception and ends with the checkpoint insight) },`,
    `  "keyTerms": array of 4-6 objects, each { "term": string, "definition": string },`,
    `  "examples": array of 2-3 strings (concrete, specific, with real numbers or dates where possible),`,
    `  "quiz": array of exactly 5 objects, each { "question": string, "options": exactly 4 strings, "answerIndex": 0-3, "explanation": string },`,
    `  "nextTopics": array of exactly 5 short topic strings for further study`,
    `}`,
    "Quiz rules: options must be plausible and mutually exclusive, only one is correct, answerIndex points at the correct option, explanation justifies it in 1-2 sentences, and at least two questions must test understanding of WHY rather than recall.",
    "Be complete but concise: every sentence must teach something. Never pad. Respond with ONLY the JSON object.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Drop sections whose content repeats (models sometimes duplicate a section). */
function dedupeSections(
  sections: { heading: string; content: string }[]
): { heading: string; content: string }[] {
  const seen = new Set<string>();
  return sections.filter((section) => {
    const key = section.content.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Coerce whatever the model returned into a Lesson. Tolerant by design:
 * repairs option counts, clamps indices, drops broken items and only fails
 * when the response is genuinely unusable.
 */
function normalizeLesson(
  raw: unknown,
  topic: string,
  level: LessonLevel
): Lesson | null {
  const root = raw as Record<string, unknown> | null;
  if (!root) return null;

  const sections = (Array.isArray(root.sections) ? root.sections : [])
    .map(normalizeSection)
    .filter((s): s is { heading: string; content: string } => s !== null);

  const keyTerms = (Array.isArray(root.keyTerms) ? root.keyTerms : [])
    .map(normalizeKeyTerm)
    .filter((t): t is { term: string; definition: string } => t !== null);

  const examples = (Array.isArray(root.examples) ? root.examples : [])
    .filter((e): e is string => typeof e === "string" && e.trim().length > 0)
    .map((e) => e.trim().slice(0, 600));

  const quiz = (Array.isArray(root.quiz) ? root.quiz : [])
    .map(normalizeQuizQuestion)
    .filter(
      (q): q is {
        question: string;
        options: string[];
        answerIndex: number;
        explanation: string;
      } => q !== null
    );

  const nextTopics = (Array.isArray(root.nextTopics) ? root.nextTopics : [])
    .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
    .map((t) => t.trim().slice(0, 80));

  // Hard floor: need at least one section to teach.
  if (sections.length === 0) return null;

  // Models sometimes truncate before the quiz or extras. Never 502 for
  // that: synthesize them from what did arrive.
  const finalQuiz =
    quiz.length > 0
      ? quiz
      : sections.slice(0, 3).map((section) => ({
          question: `Which statement matches the section "${section.heading}"?`,
          options: [
            section.content.split(". ")[0].slice(0, 180) + ".",
            "The section claims the opposite of its checkpoint.",
            "The section is unrelated to the lesson topic.",
            "None of the above",
          ],
          answerIndex: 0,
          explanation: `That is the opening claim of the section "${section.heading}".`,
        }));

  const finalNextTopics =
    nextTopics.length > 0
      ? nextTopics
      : sections.slice(0, 5).map((section) => section.heading);

  const title =
    typeof root.title === "string" && root.title.trim().length > 0
      ? root.title.trim().slice(0, 160)
      : topic;
  const summary =
    typeof root.summary === "string" && root.summary.trim().length > 0
      ? root.summary.trim().slice(0, 800)
      : `A lesson on ${topic}.`;

  return {
    id: `les-${Date.now().toString(36)}`,
    topic,
    level,
    title,
    summary,
    sections: dedupeSections(sections),
    keyTerms,
    examples,
    quiz: finalQuiz,
    nextTopics: finalNextTopics,
    savedAt: new Date().toISOString(),
  };
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a topic (2 to 120 characters) and pick a level." },
      { status: 400 }
    );
  }

  const { topic, level, focus } = parsed.data;

  const user = buildUserPrompt(topic, level, focus);

  // Two full generation attempts: attempt 1 sometimes comes back with a
  // truncated or hollow body (a section with empty content, missing quiz).
  // chatComplete already retries transport errors; this retries BAD SHAPE.
  let lesson: Lesson | null = null;
  let lastFailure = "unknown";
  for (let attempt = 1; attempt <= 2 && !lesson; attempt++) {
    try {
      const text = await chatComplete({ system: SYSTEM, user });
      if (!text) {
        lastFailure = "empty completion";
        continue;
      }
      const raw = extractJsonObject(text);
      lesson = normalizeLesson(raw, topic, level);
      if (!lesson) {
        lastFailure = "unusable shape";
        console.error(
          `[api/learn/lesson] attempt ${attempt}: unusable shape. Head of raw:`,
          JSON.stringify(raw).slice(0, 400)
        );
      }
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : "unknown error";
      console.error(`[api/learn/lesson] attempt ${attempt} failed:`, error);
    }
  }

  if (!lesson) {
    console.error("[api/learn/lesson] giving up after all attempts:", lastFailure);
    return NextResponse.json({ error: GENERATION_ERROR }, { status: 502 });
  }

  return NextResponse.json({ lesson });
}
