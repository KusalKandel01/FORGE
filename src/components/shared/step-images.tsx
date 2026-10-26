"use client";

/**
 * Step by step tutorial with a picture next to every written step.
 *
 * Picture pipeline, per step:
 * 1. REAL PHOTO from the open web (server-side image search, cached in the
 *    MediaCache table) - fast, real, exactly what the user asked for.
 * 2. AI drawn illustration (server queue, cached in Prisma + IndexedDB)
 *    only when no usable real photo was found.
 * 3. Branded fallback tile so a failed picture never blocks reading.
 *
 * Every step always keeps its text: a missing or failed image never
 * blocks the tutorial.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ImageIcon, RefreshCw, Sparkles, X } from "lucide-react";
import { getCachedImage, putCachedImage } from "@/lib/image-cache";
import {
  tutorialImageKey,
  type TutorialImageKind,
} from "@/lib/tutorial-image-key";

type StepStatus =
  | {
      state: "done";
      url: string;
      kind: "real" | "ai";
      source?: string;
    }
  | { state: "loading" }
  | { state: "error" };

/** Server serializes AI generation, so the client only needs a trickle. */
const CONCURRENCY = 2;

function stepQuery(title: string, step: string): string {
  const short = step.replace(/\s+/g, " ").trim().split(" ").slice(0, 9).join(" ");
  return `${title} how to ${short}`.slice(0, 150);
}

const REAL_CACHE_PREFIX = "real:";

/** Marker string stored in IndexedDB for real photo cache entries. */
function realCacheValue(source: string, url: string): string {
  return `REAL|${source}|${url}`;
}

function parseRealCacheValue(v: string):
  | { url: string; source: string }
  | null {
  if (!v.startsWith("REAL|")) return null;
  const [, source, url] = v.split("|");
  if (!url || !url.startsWith("http")) return null;
  return { url, source: source || "web" };
}

/**
 * Branded fallback tile shown when no picture can be fetched or drawn
 * (rate limits, offline). Keeps the text + picture layout stable instead
 * of collapsing into a bare retry button.
 */
function fallbackTile(stepNumber: number, title: string): string {
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">` +
    `<rect width="512" height="512" fill="#09090b"/>` +
    `<rect x="14" y="14" width="484" height="484" fill="none" stroke="#a3e635" stroke-width="3"/>` +
    `<text x="256" y="210" text-anchor="middle" font-family="Arial, sans-serif" font-size="130" font-weight="bold" fill="#a3e635">${stepNumber}</text>` +
    `<text x="256" y="290" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" letter-spacing="6" fill="#ffffff">ILLUSTRATION</text>` +
    `<text x="256" y="326" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" letter-spacing="6" fill="#ffffff">UNAVAILABLE</text>` +
    `<text x="256" y="400" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#71717a">${esc(
      title.slice(0, 34)
    )}</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function StepImages({
  kind,
  id,
  title,
  steps,
  context,
  numberedBadge = false,
}: {
  kind: TutorialImageKind;
  id: string;
  title: string;
  steps: string[];
  context?: string;
  /** Use the volt square step number badge (skills style) vs plain number. */
  numberedBadge?: boolean;
}) {
  const [images, setImages] = useState<Record<number, StepStatus>>({});
  const [imagesOn, setImagesOn] = useState(true);
  const runIdRef = useRef(0);
  /** Per-step paging through the real photos found for that step. */
  const variantRef = useRef<Record<number, number>>({});

  const doneCount = Object.values(images).filter(
    (s) => s.state === "done"
  ).length;
  const realCount = Object.values(images).filter(
    (s) => s.state === "done" && s.kind === "real"
  ).length;

  /**
   * Fetch one step picture. `source` picks the pipeline:
   * - "auto": real photo first (paging with `variant` so "find another
   *   picture" actually moves to the next photo), AI drawing only when
   *   the search comes back empty.
   * - "ai": force the drawn illustration (user asked for it).
   */
  const fetchStep = useCallback(
    async (
      index: number,
      runId: number,
      autoRetries = 1,
      opts?: { force?: boolean; variant?: number },
      source: "auto" | "ai" = "auto"
    ) => {
      const key = tutorialImageKey(kind, id, index, steps[index]);
      const variant = opts?.variant ?? 0;
      setImages((prev) => ({ ...prev, [index]: { state: "loading" } }));

      /* --- 1. real photo from the web --- */
      if (source === "auto") {
        try {
          const res = await fetch(
            `/api/media/image?q=${encodeURIComponent(
              stepQuery(title, steps[index])
            )}&count=1&skip=${variant}`,
            { signal: AbortSignal.timeout(40_000) }
          );
          if (res.ok) {
            const data = (await res.json()) as {
              images?: { url?: string; source?: string }[];
            };
            const hit = data.images?.[0];
            if (
              runId === runIdRef.current &&
              hit &&
              typeof hit.url === "string" &&
              hit.url.startsWith("http")
            ) {
              setImages((prev) => ({
                ...prev,
                [index]: {
                  state: "done",
                  url: hit.url as string,
                  kind: "real",
                  source: hit.source || "web",
                },
              }));
              void putCachedImage(
                REAL_CACHE_PREFIX + key,
                realCacheValue(hit.source || "web", hit.url)
              );
              return;
            }
          }
        } catch {
          // Search failed or timed out: fall through to the AI pipeline.
        }
        if (runId !== runIdRef.current) return;
      }

      /* --- 2. AI drawn illustration --- */
      try {
        const res = await fetch("/api/tutorials/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind,
            id,
            title,
            stepText: steps[index],
            stepIndex: index,
            context,
          }),
        });
        if (runId !== runIdRef.current) return;
        if (!res.ok) throw new Error("image request failed");
        const data = (await res.json()) as { dataUrl?: string };
        const url = data.dataUrl;
        if (typeof url !== "string" || !url.startsWith("data:image")) {
          throw new Error("image response was invalid");
        }
        setImages((prev) => ({
          ...prev,
          [index]: { state: "done", url, kind: "ai" },
        }));
        void putCachedImage(key, url);
        // Remember the user chose the drawing for this step, so the real
        // photo pipeline does not override it on the next visit.
        void putCachedImage(REAL_CACHE_PREFIX + key, "AI|");
      } catch {
        if (runId !== runIdRef.current) return;
        setImages((prev) => ({ ...prev, [index]: { state: "error" } }));
        // The image model rate limits under parallel requests, so one silent
        // automatic retry with a short backoff rescues most transient
        // failures without the user ever pressing anything.
        if (autoRetries > 0) {
          setTimeout(() => {
            if (runId === runIdRef.current) {
              void fetchStep(index, runId, autoRetries - 1);
            }
          }, 3000);
        }
      }
    },
    [kind, id, title, steps, context]
  );

  // Load cached pictures first, then queue the missing ones with small
  // concurrency so steps appear progressively while the dialog is open.
  useEffect(() => {
    const runId = ++runIdRef.current;
    setImages({});
    if (!imagesOn || steps.length === 0) return;

    let cancelled = false;
    const pending: number[] = [];

    (async () => {
      for (let i = 0; i < steps.length; i++) {
        if (cancelled || runId !== runIdRef.current) return;
        const key = tutorialImageKey(kind, id, i, steps[i]);
        // Defensive timeout: IndexedDB must never stall the queue. A slow
        // or blocked probe is treated as a cache miss and the fetch runs.
        const cached = await Promise.race([
          (async () => {
            const real = await getCachedImage(REAL_CACHE_PREFIX + key);
            if (real) {
              const parsed = parseRealCacheValue(real);
              if (parsed) return parsed;
            }
            const drawn = await getCachedImage(key);
            if (drawn) return { url: drawn, source: "" };
            return null;
          })(),
          new Promise<null>((r) => setTimeout(() => r(null), 2500)),
        ]);
        if (cancelled || runId !== runIdRef.current) return;
        if (cached) {
          setImages((prev) => ({
            ...prev,
            [i]: {
              state: "done",
              url: cached.url,
              kind: cached.source ? "real" : "ai",
              source: cached.source || undefined,
            },
          }));
        } else {
          pending.push(i);
        }
      }

      let cursor = 0;
      const worker = async () => {
        while (!cancelled && runId === runIdRef.current) {
          const index = cursor++;
          if (index >= pending.length) return;
          await fetchStep(pending[index], runId);
        }
      };
      const workers = Array.from(
        { length: Math.min(CONCURRENCY, pending.length) },
        () => worker()
      );
      await Promise.all(workers);
    })();

    return () => {
      cancelled = true;
    };
  }, [kind, id, steps, imagesOn, fetchStep]);

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 font-head text-[11px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
          <ImageIcon className="h-3.5 w-3.5 text-volt" aria-hidden />
          Step by step, with pictures
        </p>
        <button
          type="button"
          onClick={() => setImagesOn((v) => !v)}
          aria-pressed={imagesOn}
          className={`min-h-11 border px-2 py-1 font-head text-[10px] font-bold uppercase tracking-widest transition-colors ${
            imagesOn
              ? "border-volt text-volt"
              : "border-border text-muted-foreground hover:border-volt/60"
          }`}
        >
          {imagesOn
            ? `Images on ${doneCount}/${steps.length}${
                realCount > 0 ? ` · ${realCount} real` : ""
              }`
            : "Images off"}
        </button>
      </div>

      <ol className="mt-3 space-y-4">
        {steps.map((step, i) => {
          const status = imagesOn ? images[i] : undefined;
          return (
            <li key={i} className="flex gap-3">
              {numberedBadge ? (
                <span
                  aria-hidden
                  className="flex h-7 w-7 shrink-0 items-center justify-center bg-volt font-display text-sm text-black"
                >
                  {i + 1}
                </span>
              ) : (
                <span className="font-display text-2xl leading-none text-volt">
                  {i + 1}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-relaxed">{step}</p>

                {status?.state === "loading" ? (
                  <div className="mt-2 flex aspect-square w-full max-w-[240px] animate-pulse items-center justify-center border border-border bg-secondary/40">
                    <span className="font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Finding a real photo for step {i + 1}...
                    </span>
                  </div>
                ) : null}

                {status?.state === "done" ? (
                  <div className="mt-2 w-full max-w-[240px]">
                    <img
                      src={status.url}
                      alt={`Step ${i + 1} illustration for ${title}`}
                      className="w-full border border-border"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                    <p className="mt-1 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                      {status.kind === "real" ? (
                        <>
                          <ImageIcon
                            className="h-3 w-3 shrink-0 text-volt"
                            aria-hidden
                          />
                          Real photo{status.source ? ` · ${status.source}` : ""}
                        </>
                      ) : (
                        <>
                          <Sparkles
                            className="h-3 w-3 shrink-0 text-volt"
                            aria-hidden
                          />
                          AI illustration
                        </>
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (status.kind === "real") {
                          void fetchStep(i, runIdRef.current, 0, undefined, "ai");
                        } else {
                          const next = (variantRef.current[i] ?? 0) + 1;
                          variantRef.current[i] = next;
                          void fetchStep(i, runIdRef.current, 0, {
                            variant: next,
                          });
                        }
                      }}
                      className="mt-1 flex min-h-11 w-full items-center justify-center gap-2 border border-border px-2 font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:border-volt hover:text-volt"
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                      {status.kind === "real"
                        ? `Draw step ${i + 1} with AI`
                        : `Find another picture`}
                    </button>
                  </div>
                ) : null}

                {status?.state === "error" ? (
                  <div className="mt-2 w-full max-w-[240px]">
                    <img
                      src={fallbackTile(i + 1, title)}
                      alt={`Step ${i + 1} illustration unavailable for ${title}`}
                      className="w-full border border-border"
                      loading="lazy"
                    />
                    <button
                      type="button"
                      onClick={() => void fetchStep(i, runIdRef.current)}
                      className="mt-1 flex min-h-11 w-full items-center justify-center gap-2 border border-ember/60 px-2 font-head text-[10px] font-bold uppercase tracking-widest text-ember transition-colors hover:border-ember"
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                      Retry step {i + 1}
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      {imagesOn ? (
        <p className="mt-3 flex items-start gap-2 text-xs leading-snug text-muted-foreground">
          <X className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/60" aria-hidden />
          Steps show a real photo from the web when one exists, otherwise a
          drawing made once by the AI. Everything is saved on this device.
          Not happy with a picture? Swap it or redraw it. Turn them off any
          time.
        </p>
      ) : null}
    </div>
  );
}
