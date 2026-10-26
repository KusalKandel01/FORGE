/**
 * One chat-completion helper for the whole platform.
 *
 * Deployment modes:
 * 1. Sandbox / local default: uses the built-in z-ai-web-dev-sdk. No config.
 * 2. Any host (Vercel, Netlify, Cloudflare, Railway, Render, a VPS): set
 *    AI_API_KEY (plus optional AI_BASE_URL and AI_MODEL) to any
 *    OpenAI-compatible chat completions API. That covers Z.ai (recommended,
 *    free key at z.ai), OpenAI, Groq, Google AI Studio (OpenAI mode),
 *    Together, OpenRouter, Mistral and every self-hosted gateway that
 *    speaks the same protocol.
 *
 * Env vars (all optional):
 * - AI_API_KEY   secret key for the provider. When set, mode 2 is used.
 * - AI_BASE_URL  default: https://api.openai.com/v1
 * - AI_MODEL     default: gpt-4o-mini
 */

export interface ChatRequest {
  /** System / developer instruction for the model. */
  system: string;
  /** The user prompt. */
  user: string;
}

const DEFAULT_TIMEOUT_MS = 120_000;

const CHAT_ATTEMPTS = 3;

/**
 * Run an async operation with up to `attempts` tries and a small backoff.
 * The sandbox SDK and free provider tiers throttle or drop requests often;
 * a silent retry here is the difference between "works" and "broken" for
 * the user, so every AI call goes through this.
 */
async function withRetries<T>(
  op: () => Promise<T>,
  attempts: number,
  label: string
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await op();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        const delayMs = 1200 * attempt;
        console.warn(
          `[ai] ${label} attempt ${attempt}/${attempts} failed, retrying in ${delayMs}ms:`,
          error instanceof Error ? error.message : error
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}

/**
 * Returns the raw model text. Throws on failure; callers already wrap this
 * in try/catch and show friendly errors. Retries up to 3 times internally.
 */
export async function chatComplete(req: ChatRequest): Promise<string> {
  const apiKey = process.env.AI_API_KEY?.trim();
  if (apiKey) {
    return withRetries(() => openAiCompatibleComplete(req, apiKey), CHAT_ATTEMPTS, "chat");
  }
  return withRetries(() => sandboxComplete(req), CHAT_ATTEMPTS, "chat");
}

/** Mode 2: any OpenAI-compatible endpoint via plain fetch (no SDK needed). */
async function openAiCompatibleComplete(
  req: ChatRequest,
  apiKey: string
): Promise<string> {
  const baseUrl = (
    process.env.AI_BASE_URL?.trim() || "https://api.openai.com/v1"
  ).replace(/\/+$/, "");
  const model = process.env.AI_MODEL?.trim() || "gpt-4o-mini";

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.user },
      ],
    }),
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `AI provider responded with ${res.status}. ${detail.slice(0, 300)}`
    );
  }

  const data: unknown = await res.json();
  const content = (data as { choices?: { message?: { content?: unknown } }[] })
    ?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("AI provider returned an empty response.");
  }
  return content;
}

/** Mode 1: the built-in sandbox SDK. Used when AI_API_KEY is not set. */
async function sandboxComplete(req: ChatRequest): Promise<string> {
  const mod = await import("z-ai-web-dev-sdk");
  const ZAI = mod.default;
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      { role: "assistant", content: req.system },
      { role: "user", content: req.user },
    ],
    thinking: { type: "disabled" },
  });
  return completion.choices[0]?.message?.content ?? "";
}
