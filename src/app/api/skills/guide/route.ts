import { NextResponse } from "next/server";
import { z } from "zod";
import { extractJsonObject } from "@/lib/ai-json";
import { chatComplete } from "@/lib/ai";

export const runtime = "nodejs";

const GENERATION_ERROR =
  "Skill guide generation is unavailable right now. Check your connection and try again.";

const requestSchema = z.object({
  skill: z.string().trim().min(2).max(120),
  context: z.string().trim().max(300).optional(),
});

const SYSTEM =
  "You are FORGE SKILLS MASTER: a veteran instructor assembled from a survival expert, a chartered financial analyst, a master tradesman, a communications coach, a career strategist, a security engineer and a sports scientist. You write practical, honest, safety first guides for real life skills. You never invent statistics, never guarantee outcomes, and always say when a professional or emergency service is the right call. Respond with ONLY valid JSON, no markdown fences, no commentary.";

const VALID_CATEGORIES = [
  "Survival",
  "Money",
  "Everyday",
  "People",
  "Career",
  "Digital",
  "Body and Mind",
];

function normalizeCategory(raw: string): string {
  const lower = raw.toLowerCase();
  const found = VALID_CATEGORIES.find((c) => c.toLowerCase() === lower);
  if (found) return found;
  if (lower.includes("surviv")) return "Survival";
  if (lower.includes("money") || lower.includes("finan")) return "Money";
  if (lower.includes("peopl") || lower.includes("social")) return "People";
  if (lower.includes("career") || lower.includes("work")) return "Career";
  if (
    lower.includes("digital") ||
    lower.includes("tech") ||
    lower.includes("cyber")
  )
    return "Digital";
  if (lower.includes("body") || lower.includes("health") || lower.includes("mind"))
    return "Body and Mind";
  return "Everyday";
}

function normalizeDifficulty(raw: string): string {
  const lower = raw.toLowerCase();
  if (
    lower.includes("begin") ||
    lower.includes("easy") ||
    lower.includes("novice")
  )
    return "Beginner";
  if (
    lower.includes("advanc") ||
    lower.includes("hard") ||
    lower.includes("expert")
  )
    return "Advanced";
  return "Intermediate";
}

/** Coerce model output into the guide shape. Tolerant: drops broken items. */
function normalizeGuide(
  raw: unknown,
  skill: string
): {
  title: string;
  category: string;
  difficulty: string;
  timeToLearn: string;
  why: string;
  steps: string[];
  tips: string[];
  mistakes: string[];
  drills: string[];
  fourWeekPlan: string[];
  checklist: string[];
} | null {
  const rec =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : null;
  if (!rec) return null;

  const strings = (value: unknown, max: number): string[] =>
    (Array.isArray(value) ? value : [])
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .map((item) => item.trim().slice(0, 500))
      .slice(0, max);

  const steps = strings(rec.steps, 10);
  const tips = strings(rec.tips, 6);
  const mistakes = strings(rec.mistakes, 5);
  const drills = strings(rec.drills, 6);
  const fourWeekPlan = strings(rec.fourWeekPlan, 6);
  const checklist = strings(rec.checklist, 8);

  if (steps.length === 0) return null;

  return {
    title:
      typeof rec.title === "string" && rec.title.trim().length > 0
        ? rec.title.trim().slice(0, 120)
        : skill,
    category: normalizeCategory(
      typeof rec.category === "string" ? rec.category : "Everyday"
    ),
    difficulty: normalizeDifficulty(
      typeof rec.difficulty === "string" ? rec.difficulty : "Intermediate"
    ),
    timeToLearn:
      typeof rec.timeToLearn === "string" && rec.timeToLearn.trim().length > 0
        ? rec.timeToLearn.trim().slice(0, 120)
        : "Varies with practice",
    why:
      typeof rec.why === "string" && rec.why.trim().length > 0
        ? rec.why.trim().slice(0, 600)
        : `Learning ${skill} builds real capability you keep for life.`,
    steps,
    tips: tips.length > 0 ? tips : ["Practice slowly and deliberately, one step at a time."],
    mistakes: mistakes.length > 0 ? mistakes : ["Rushing the fundamentals before they are solid."],
    drills: drills.length > 0 ? drills : steps.slice(0, 3),
    fourWeekPlan:
      fourWeekPlan.length > 0
        ? fourWeekPlan
        : [
            `Week 1: learn the basics of ${skill}.`,
            "Week 2: repeat the steps until they feel natural.",
            "Week 3: practice under realistic pressure.",
            "Week 4: check yourself against the checklist.",
          ],
    checklist: checklist.length > 0 ? checklist : steps.slice(0, 4),
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
      { error: "Describe the skill you want in 2 to 120 characters." },
      { status: 400 }
    );
  }

  const { skill, context } = parsed.data;

  const contextLine = context
    ? `The learner adds this context: "${context}". Weave it into every part of the guide.\n`
    : "";

  const user = [
    `Build a JSON guide for the real life skill: "${skill}".`,
    contextLine,
    "Guide laws you must follow:",
    "1. Steps are imperative, one action each, ordered, concrete. Real numbers and real orders where they exist.",
    "2. Tips carry technique, safety and efficiency. Mistakes each say why they hurt.",
    "3. Drills are repeatable practice actions that build the skill.",
    "4. The four week plan turns the skill into a habit: week 1 foundations, week 2 repetition, week 3 pressure and realism, week 4 mastery check.",
    "5. Checklist items are proof of mastery the learner can actually tick off.",
    "6. Honest difficulty and honest time estimates. Never fake competence.",
    "7. Safety first: where a professional, a course or emergency services belong, say it plainly.",
    "Return JSON with EXACTLY this shape:",
    `{`,
    `  "title": string (a clear name for the skill),`,
    `  "category": one of "Survival", "Money", "Everyday", "People", "Career", "Digital", "Body and Mind",`,
    `  "difficulty": one of "Beginner", "Intermediate", "Advanced",`,
    `  "timeToLearn": string (honest estimate),`,
    `  "why": string (1-2 sentences on the real life stakes),`,
    `  "steps": array of 6-8 strings,`,
    `  "tips": array of 3-4 strings,`,
    `  "mistakes": array of 2-3 strings,`,
    `  "drills": array of 3-4 strings,`,
    `  "fourWeekPlan": array of exactly 4 strings,`,
    `  "checklist": array of 4-5 strings`,
    `}`,
    "Plain text only. No markdown formatting anywhere in the values. No emoji. No em dashes. Respond with ONLY the JSON object.",
  ].join("\n");

  // Two full generation attempts: chatComplete retries transport errors,
  // this retries BAD SHAPE (truncated or hollow bodies).
  let guide: Record<string, unknown> | null = null;
  let lastFailure = "unknown";
  for (let attempt = 1; attempt <= 2 && !guide; attempt++) {
    try {
      const text = await chatComplete({ system: SYSTEM, user });
      if (!text) {
        lastFailure = "empty completion";
        continue;
      }
      const raw = extractJsonObject(text);
      const content = normalizeGuide(raw, skill);
      if (!content) {
        lastFailure = "unusable shape";
        console.error(
          `[api/skills/guide] attempt ${attempt}: unusable shape. Head of raw:`,
          JSON.stringify(raw).slice(0, 400)
        );
        continue;
      }

      guide = {
        id: `skg-${Date.now().toString(36)}`,
        skill,
        title: content.title,
        category: normalizeCategory(content.category),
        difficulty: normalizeDifficulty(content.difficulty),
        timeToLearn: content.timeToLearn,
        why: content.why,
        steps: content.steps,
        tips: content.tips,
        mistakes: content.mistakes,
        drills: content.drills,
        fourWeekPlan: content.fourWeekPlan,
        checklist: content.checklist,
        savedAt: new Date().toISOString(),
      };
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : "unknown error";
      console.error(`[api/skills/guide] attempt ${attempt} failed:`, error);
    }
  }

  if (!guide) {
    console.error("[api/skills/guide] giving up after all attempts:", lastFailure);
    return NextResponse.json({ error: GENERATION_ERROR }, { status: 502 });
  }

  return NextResponse.json({ guide });
}
