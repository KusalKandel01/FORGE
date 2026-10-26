import { NextResponse } from "next/server";
import { z } from "zod";
import { extractJsonObject } from "@/lib/ai-json";
import { chatComplete } from "@/lib/ai";

export const runtime = "nodejs";

const bodySchema = z.object({
  goal: z.string().min(1).max(100),
  experience: z.string().min(1).max(50),
  daysPerWeek: z.number().int().min(2).max(6),
  equipment: z.string().min(1).max(100),
});

const SYSTEM_PROMPT = `You are FORGE COACH: one coach forged from the combined minds of every legendary trainer from the beginning of physical culture until today. Their proven methods run through you: Eugen Sandow, George Hackenschmidt and Arthur Saxon (old-school full body barbell strength), Jack LaLanne (lifelong conditioning), Joe Weider (the Weider Principles: progressive overload, split systems, priority, muscle priority and instinctive training), Vince Gironda (intensity and craftsmanship), Reg Park and Bill Starr (5x5 foundations), Arnold Schwarzenegger and the golden era (volume, mind muscle connection, weakest point priority), Mike Mentzer (Heavy Duty: brief, intense, rare), Dorian Yates (one all out working set, recovery management), Louie Simmons (Westside conjugate method), Charles Poliquin (German Volume Training, tempo), Pavel Tsatsouline (strength as a skill, greasing the groove), Mark Rippetoe (Starting Strength linear progression on the big lifts), Jim Wendler (5/3/1 slow sustainable progress), Greg Glassman (constantly varied functional movement), Stuart McRobert (hardgainer recovery realism), Bret Contreras and Brad Schoenfeld (modern hypertrophy and mechanical tension science) and Jeff Cavaliere (physio informed joint safe form).

You design safe, sensible weekly training plans that blend the right masters' methods for this athlete. You never give medical advice and you never promise results.

Respond ONLY with a single valid JSON object and nothing else. No markdown, no code fences, no commentary before or after.

The JSON object must match this shape exactly:
{
  "summary": "2 to 3 sentence overview of the week naming the methods you blended",
  "days": [
    {
      "day": "Day 1",
      "focus": "short focus name",
      "exercises": [
        { "name": "exercise name", "sets": 3, "reps": "8-10", "restSec": 90 }
      ]
    }
  ],
  "tips": ["short actionable tip", "another tip"]
}

Rules:
- The days array length must equal the requested number of training days per week.
- Label days as "Day 1", "Day 2" and so on.
- Each day has 4 to 6 exercises.
- Order exercises by priority: explosive or heavy compounds first, then accessories, then core or conditioning.
- sets is an integer between 2 and 6. reps is a short string like "8-10", "12" or "30 sec". restSec is an integer between 30 and 180.
- Rest matches the goal: strength 120 to 180 seconds on compounds, hypertrophy 60 to 90, conditioning 30 to 60.
- tips has 3 to 5 items and must name the master or principle behind each tip, for example the progressive overload principle, Heavy Duty, 5x5, conjugate method or greasing the groove.
- Only prescribe exercises that make sense for the requested equipment and experience level.
- Respect recovery: a beginner gets full body or simple splits, an advanced athlete can get specialized splits.
- Keep loads as guidance, not prescriptions. Safety first.`;

interface PlanExercise {
  name: string;
  sets: number;
  reps: string;
  restSec: number;
}

interface PlanDay {
  day: string;
  focus: string;
  exercises: PlanExercise[];
}

interface Plan {
  summary: string;
  goal: string;
  createdAt: string;
  days: PlanDay[];
  tips: string[];
}

/** Strip code fences handled by the shared extractor. */
function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizePlan(
  raw: unknown,
  goal: string,
  daysPerWeek: number
): Plan | null {
  const root = asRecord(raw);
  if (!root) return null;

  const days: PlanDay[] = [];
  const daysRaw = Array.isArray(root.days) ? root.days : [];
  for (const dayRaw of daysRaw) {
    if (days.length >= daysPerWeek) break;
    const day = asRecord(dayRaw);
    if (!day) continue;

    const exercises: PlanExercise[] = [];
    const exercisesRaw = Array.isArray(day.exercises) ? day.exercises : [];
    for (const exRaw of exercisesRaw) {
      const ex = asRecord(exRaw);
      if (!ex || typeof ex.name !== "string" || ex.name.trim().length === 0) {
        continue;
      }
      exercises.push({
        name: ex.name.trim().slice(0, 80),
        sets:
          typeof ex.sets === "number" && Number.isFinite(ex.sets)
            ? Math.min(6, Math.max(2, Math.round(ex.sets)))
            : 3,
        reps:
          typeof ex.reps === "string" && ex.reps.trim().length > 0
            ? ex.reps.trim().slice(0, 20)
            : "10",
        restSec:
          typeof ex.restSec === "number" && Number.isFinite(ex.restSec)
            ? Math.min(180, Math.max(30, Math.round(ex.restSec)))
            : 60,
      });
    }
    if (exercises.length === 0) continue;

    days.push({
      day:
        typeof day.day === "string" && day.day.trim().length > 0
          ? day.day.trim().slice(0, 30)
          : `Day ${days.length + 1}`,
      focus:
        typeof day.focus === "string" && day.focus.trim().length > 0
          ? day.focus.trim().slice(0, 60)
          : "Training",
      exercises: exercises.slice(0, 8),
    });
  }

  if (days.length === 0) return null;

  const tips = (Array.isArray(root.tips) ? root.tips : [])
    .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
    .slice(0, 5);

  return {
    summary:
      typeof root.summary === "string" && root.summary.trim().length > 0
        ? root.summary.trim().slice(0, 600)
        : "Your weekly training plan.",
    goal,
    createdAt: new Date().toISOString(),
    days,
    tips,
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Invalid request. Check goal, experience, daysPerWeek and equipment.",
      },
      { status: 400 }
    );
  }

  const { goal, experience, daysPerWeek, equipment } = parsed.data;

  const userPrompt = `Create a weekly training plan.
Goal: ${goal}
Experience level: ${experience}
Training days per week: ${daysPerWeek}
Available equipment: ${equipment}

Respond with the JSON object only.`;

  // Two full generation attempts: chatComplete retries transport errors,
  // this retries BAD SHAPE (truncated or hollow plans).
  let plan: Plan | null = null;
  let lastFailure = "unknown";
  for (let attempt = 1; attempt <= 2 && !plan; attempt++) {
    try {
      const text = await chatComplete({
        system: SYSTEM_PROMPT,
        user: userPrompt,
      });
      if (!text) {
        lastFailure = "empty completion";
        continue;
      }
      plan = normalizePlan(extractJsonObject(text), goal, daysPerWeek);
      if (!plan) {
        lastFailure = "unusable shape";
        console.error(`[api/fitness/plan] attempt ${attempt}: unusable shape`);
      }
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : "unknown error";
      console.error(`[api/fitness/plan] attempt ${attempt} failed:`, error);
    }
  }

  if (!plan) {
    console.error("[api/fitness/plan] giving up after all attempts:", lastFailure);
    return NextResponse.json(
      { error: "Plan generation is unavailable right now. Try again later." },
      { status: 502 }
    );
  }

  return NextResponse.json({ plan });
}
