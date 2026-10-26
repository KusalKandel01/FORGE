import { NextResponse } from "next/server";
import sharp from "sharp";
import { generateImage } from "@/lib/ai";
import { db } from "@/lib/db";
import {
  tutorialImageKey,
  type TutorialImageKind,
} from "@/lib/tutorial-image-key";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Step by step tutorial illustration endpoint.
 *
 * POST { kind, id, title, stepText, stepIndex, context? }
 * -> { dataUrl, cached }
 *
 * The illustration is deterministic per step: one stable key, one image.
 * Cache order: in-memory -> Prisma (survives restarts, shared by every
 * visitor on Turso) -> AI generation (compressed to webp with sharp).
 */

const MEMORY_MAX = 40;
const memoryCache = new Map<string, string>();

/**
 * Global generation queue. The image model rate limits hard: N parallel
 * requests guarantee 429s and failed step images. Serializing ALL generation
 * through one promise chain (with a small gap between jobs) plus longer
 * backoff on rate limit errors makes every queued step eventually succeed.
 */
let generationChain: Promise<void> = Promise.resolve();
const GENERATION_GAP_MS = 400;

function enqueueGeneration<T>(job: () => Promise<T>): Promise<T> {
  const run = generationChain.then(job, job);
  // Keep the chain alive no matter what the job threw.
  generationChain = run.then(
    () => new Promise((r) => setTimeout(r, GENERATION_GAP_MS)),
    () => new Promise((r) => setTimeout(r, GENERATION_GAP_MS))
  );
  return run;
}

function isRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /429|too many requests|rate limit/i.test(msg);
}

interface ImageRequest {
  kind?: unknown;
  id?: unknown;
  title?: unknown;
  stepText?: unknown;
  stepIndex?: unknown;
  context?: unknown;
  /** When true, skip every cache and draw a fresh image. */
  force?: unknown;
  /** Client nonce for forced redraws (not part of the stored key). */
  nonce?: unknown;
}

function asString(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function buildPrompt(
  kind: TutorialImageKind,
  title: string,
  stepText: string,
  context: string
): string {
  const style =
    "clean flat vector instructional illustration, one single scene, " +
    "dark charcoal background, human figure with lime green and white " +
    "accents, minimal geometric shapes, soft floor shadow, high contrast, " +
    "centered square composition";

  // Image models love to paint garbled caption text into diagrams. The ban
  // leads AND closes the prompt, and the word "step" plus digits never
  // appear: models see "step 3" and paint a caption saying it.
  const noText =
    "A completely WORDLESS picture. No text of any kind: no words, no " +
    "letters, no numbers, no typography in any language, no labels, no " +
    "captions, no speech bubbles, no watermarks. Pure imagery only, like a " +
    "public signage pictogram with every glyph removed.";
  const closing =
    "Final rule: zero text, zero letters, zero digits, zero labels. If " +
    "anything written appears in the picture, the picture is wrong.";

  if (kind === "exercise") {
    return (
      `${noText} Instructional fitness illustration in pictogram style. ` +
      `Exercise: ${title}. This picture shows one phase of the movement: ` +
      `${stepText} ${context} Show the correct body position for this ` +
      `phase from the best teaching angle. ${style}. ${closing}`
    );
  }
  return (
    `${noText} Instructional real life skill illustration in pictogram ` +
    `style. Skill: ${title}. This picture shows one action: ${stepText} ` +
    `${context} Show the key objects and the hands or person performing ` +
    `the action clearly, educational and non graphic. ${style}. ${closing}`
  );
}

export async function POST(request: Request) {
  let body: ImageRequest;
  try {
    body = (await request.json()) as ImageRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const kind: TutorialImageKind = body.kind === "skill" ? "skill" : "exercise";
  const id = asString(body.id, 60);
  const title = asString(body.title, 120);
  const stepText = asString(body.stepText, 500);
  const context = asString(body.context, 200);
  const stepIndex =
    typeof body.stepIndex === "number" && Number.isFinite(body.stepIndex)
      ? Math.max(0, Math.min(20, Math.floor(body.stepIndex)))
      : 0;

  if (!id || !title || !stepText) {
    return NextResponse.json(
      { error: "id, title and stepText are required." },
      { status: 400 }
    );
  }

  const key = tutorialImageKey(kind, id, stepIndex, stepText);
  const force = body.force === true;

  // 1. Memory cache (skipped on forced redraw).
  if (!force) {
    const memo = memoryCache.get(key);
    if (memo) return NextResponse.json({ dataUrl: memo, cached: true });
  }

  // 2. Database cache (best effort: a DB hiccup must not block generation).
  if (!force) {
    try {
      const row = await db.tutorialImage.findUnique({ where: { key } });
      if (row?.dataUrl) {
        remember(key, row.dataUrl);
        return NextResponse.json({ dataUrl: row.dataUrl, cached: true });
      }
    } catch {
      // Cache lookup failed, keep going.
    }
  }

  // 3. Generate with the AI, compress, store. Requests are serialized through
  // a global queue (parallel step requests would trip the model rate limit)
  // and rate limit errors get escalating backoff: 2s, 6s, 12s.
  try {
    const prompt = buildPrompt(kind, title, stepText, context);
    const b64 = await enqueueGeneration(async () => {
      let result = "";
      let lastError: unknown = null;
      const backoffs = [2000, 6000, 12000];
      for (let attempt = 0; attempt <= backoffs.length; attempt++) {
        try {
          result = await generateImage(prompt, "512x512");
          if (result) break;
          lastError = new Error(
            "Image generation returned an empty response."
          );
        } catch (e) {
          lastError = e;
          result = "";
        }
        // Non rate limit failures are not worth burning all retries: two
        // tries total. Rate limits get the full escalating backoff ladder.
        if (attempt < backoffs.length) {
          const isRl = isRateLimitError(lastError);
          if (!isRl && attempt >= 1) break;
          await new Promise((r) => setTimeout(r, backoffs[attempt]));
        }
      }
      if (!result) {
        throw lastError ?? new Error("Image generation failed.");
      }
      return result;
    });
    const webp = await sharp(Buffer.from(b64, "base64"))
      .resize(512, 512, { fit: "cover" })
      .webp({ quality: 80 })
      .toBuffer();
    const dataUrl = `data:image/webp;base64,${webp.toString("base64")}`;

    remember(key, dataUrl);
    try {
      await db.tutorialImage.upsert({
        where: { key },
        update: { dataUrl },
        create: { key, dataUrl },
      });
    } catch {
      // DB write failed: image still returned and memory cached.
    }

    return NextResponse.json({ dataUrl, cached: false });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Image generation failed.";
    return NextResponse.json(
      {
        error: `Could not draw this step right now. ${message.slice(0, 160)}`,
      },
      { status: 502 }
    );
  }
}

function remember(key: string, dataUrl: string): void {
  if (memoryCache.size >= MEMORY_MAX) {
    const oldest = memoryCache.keys().next().value;
    if (oldest !== undefined) memoryCache.delete(oldest);
  }
  memoryCache.set(key, dataUrl);
}
