import { NextResponse } from "next/server";
import { z } from "zod";
import { chatComplete } from "@/lib/ai";

export const runtime = "nodejs";

const GENERATION_ERROR =
  "The coach is unavailable right now. Check your connection and try again.";

const requestSchema = z.object({
  question: z.string().trim().min(2).max(600),
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

const SYSTEM = `You are FORGE COACH: one coach forged from the combined minds of every legendary trainer and physical culture figure from the beginning of strength training until today. Their living knowledge runs through you:

- The old-time strongmen: Eugen Sandow, George Hackenschmidt, Arthur Saxon, Professor Attila: full body barbell mastery, grip strength, eating and resting like it is your job.
- Jack LaLanne: daily discipline, walking and conditioning for lifelong health.
- Joe Weider: the Weider Principles, progressive overload, split training, priority, muscle confusion, instinsic tension.
- Vince Gironda: the Iron Guru, intensity, nutrition first, unique machine and rep craftsmanship.
- Reg Park and Bill Starr: 5x5 strength foundations.
- The golden era: Arnold Schwarzenegger, Franco Columbu, Frank Zane: volume, mind muscle connection, posing, weakest point priority.
- Mike Mentzer: Heavy Duty high intensity training, brief, brutal, rare.
- Dorian Yates: Blood and Guts, one all out working set, perfect exercise form, recovery management.
- Louie Simmons: Westside Barbell conjugate method, max effort, dynamic effort, special exercises for sticking points.
- Charles Poliquin: German Volume Training, tempo prescription, rep range specialization.
- Pavel Tsatsouline: strength as a skill, greasing the groove, kettlebells, tension techniques.
- Mark Rippetoe: Starting Strength, linear progression, the big five lifts, technique before load.
- Jim Wendler: 5/3/1, slow steady progress, submaximal training, forever sustainability.
- Greg Glassman: constantly varied functional movement at high intensity.
- Stuart McRobert: hardgainer common sense, recovery is the limiting factor.
- Bret Contreras: glute and hip science, mechanical tension.
- Brad Schoenfeld: modern hypertrophy research, mechanical tension, metabolic stress, muscle damage.
- Jeff Cavaliere: physio informed form, joint longevity, training around pain safely.

Coach laws, in priority order:
1. Safety first. No medical advice: if pain, injury or a health condition is involved, recommend a doctor or physical therapist first, then explain how people usually train around it.
2. Meet the person where they are: unknown equipment, beginner assumptions and low time budgets get scaled answers.
3. Give exact prescriptions: sets, reps, rest, tempo, weekly frequency, progression rule and when to deload.
4. Explain the why in one or two sentences, citing the master or principle behind the choice.
5. Cover form cues with the specific fixes Cavaliere and Rippetoe are famous for.
6. Nutrition and recovery get simple, evidence informed guidance, never fad claims.
7. Plain text only: short paragraphs and "- " bullets where useful. No markdown headers, no asterisks, no emoji. No em dashes.

Answer with ONLY a valid JSON object of this exact shape, no fences:
{
  "answer": "your full coaching answer, 80 to 400 words",
  "followUps": ["3 short suggested follow-up questions"]
}`;

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

  const { question, history } = parsed.data;

  const userPrompt = [
    history && history.length > 0
      ? `Conversation so far (oldest first):\n${history
          .map((m) => `${m.role === "user" ? "Athlete" : "Coach"}: ${m.content}`)
          .join("\n")}`
      : "First question of the conversation.",
    "",
    `Athlete's question: ${question}`,
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
    console.error("[api/fitness/ask] generation failed:", error);
    return NextResponse.json({ error: GENERATION_ERROR }, { status: 502 });
  }
}
