/**
 * Real online media for the whole platform: photographs and instructional
 * videos found on the open web, NOT drawn by an AI model. This is what
 * powers the "learn from real videos and photos" sections across skills,
 * train and learn, and the real-photo step illustrations.
 *
 * Photo search is two-tier:
 * 1. Openverse (open API of Creative Commons photos, no key, ~2-10s) with
 *    a simplified keyword query. Covers most steps fast.
 * 2. The z-ai SDK image search (slower, ~1 minute, but better natural
 *    language relevance) when Openverse finds nothing.
 *
 * Two cache layers keep it fast and cheap:
 * - memory (per server instance, TTL capped)
 * - Prisma MediaCache (shared by every device: the first visitor pays the
 *   search, everyone after that gets it instantly)
 */

import { db } from "@/lib/db";

export interface RealImage {
  url: string;
  caption: string;
  source: string;
  width: number;
  height: number;
}

export interface RealVideo {
  /** 11 character YouTube id, embeddable at /embed/<id>. */
  id: string;
  title: string;
  url: string;
  /** True when this is a playlist; embed via /embed/videoseries?list=. */
  playlist?: boolean;
}

export interface VideoLookup {
  videos: RealVideo[];
  /** Always present: the YouTube results page for this query. */
  searchUrl: string;
}

const MEMORY_TTL_MS = 24 * 60 * 60 * 1000;
const memory = new Map<string, { expires: number; payload: unknown }>();

function norm(q: string): string {
  return q.toLowerCase().replace(/\s+/g, " ").trim();
}

async function readCache<T>(key: string): Promise<T | null> {
  const hit = memory.get(key);
  if (hit && hit.expires > Date.now()) return hit.payload as T;
  try {
    const row = await db.mediaCache.findUnique({ where: { key } });
    if (row) {
      const payload = JSON.parse(row.payload) as T;
      memory.set(key, { expires: Date.now() + MEMORY_TTL_MS, payload });
      return payload;
    }
  } catch {
    // DB unavailable: memory cache still works.
  }
  return null;
}

async function writeCache(key: string, payload: unknown): Promise<void> {
  memory.set(key, { expires: Date.now() + MEMORY_TTL_MS, payload });
  try {
    await db.mediaCache.upsert({
      where: { key },
      create: { key, payload: JSON.stringify(payload) },
      update: { payload: JSON.stringify(payload) },
    });
  } catch {
    // Memory cache is enough to keep the request serving.
  }
}

async function getZai() {
  const mod = await import("z-ai-web-dev-sdk");
  return mod.default.create();
}

/**
 * One search at a time, with a small gap. The SDK gateway rate limits
 * bursts (a guide with 8 steps fires 8+ searches at once), and a serialized
 * queue is the difference between every step getting a real photo and the
 * tail of them dying with 429.
 */
let searchChain: Promise<void> = Promise.resolve();
function enqueueSearch<T>(op: () => Promise<T>): Promise<T> {
  const result = searchChain.then(op);
  const requeue = () =>
    new Promise<void>((resolve) => setTimeout(resolve, 400));
  searchChain = result.then(requeue, requeue);
  return result;
}

/** Two tries with backoff: the gateway occasionally 429s even serially. */
async function withSearchRetry<T>(
  op: () => Promise<T>,
  label: string
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await enqueueSearch(op);
    } catch (error) {
      lastError = error;
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 2500));
      }
    }
  }
  console.warn(
    `[real-media] ${label} failed after retries:`,
    lastError instanceof Error ? lastError.message : lastError
  );
  throw lastError;
}

/* ------------------------------------------------------------------ */
/* Real photos                                                         */
/* ------------------------------------------------------------------ */

const OPENVERSE_STOPWORDS = new Set([
  "how", "to", "a", "an", "the", "of", "for", "with", "your", "and", "or",
  "in", "on", "at", "step", "steps", "from", "into", "using", "use",
  "properly", "proper", "correct", "correctly", "beginner", "guide",
]);

/** Openverse matches short keyword queries, not sentences. */
function simplifyForOpenverse(q: string): string {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !OPENVERSE_STOPWORDS.has(w))
    .slice(0, 4)
    .join(" ");
}

/**
 * Tier 1: Openverse (https://api.openverse.org) - free, no key, real
 * Creative Commons photos hosted on Flickr/Wikimedia/etc. Short timeout:
 * when it is slow or empty we hand over to the SDK search instead of
 * blocking the user.
 */
async function searchOpenverse(q: string, count: number): Promise<RealImage[]> {
  const url =
    `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}` +
    `&page_size=${count}&format=json`;
  const res = await fetch(url, {
    headers: { "User-Agent": "FORGE-learning-app/1.0" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`openverse responded ${res.status}`);
  const data = (await res.json()) as {
    results?: {
      url?: string;
      title?: string;
      source?: string;
      width?: number;
      height?: number;
    }[];
  };
  return (data.results ?? [])
    .filter((r) => typeof r.url === "string" && r.url.startsWith("http"))
    .slice(0, count)
    .map((r) => ({
      url: r.url as string,
      caption: (r.title ?? "").trim(),
      source: (r.source ?? "openverse").trim(),
      width: Math.round(r.width ?? 0),
      height: Math.round(r.height ?? 0),
    }));
}

/** Look up real web photos for a natural language query. Never throws. */
export async function findRealImages(
  query: string,
  count = 4
): Promise<RealImage[]> {
  const q = norm(query).slice(0, 160);
  const key = `img:${count}:${q}`;
  const cached = await readCache<RealImage[]>(key);
  if (cached) return cached;

  /* --- tier 1: Openverse, fast --- */
  const simplified = simplifyForOpenverse(q);
  if (simplified.length >= 3) {
    try {
      const fast = await searchOpenverse(simplified, count);
      if (fast.length > 0) {
        await writeCache(key, fast);
        return fast;
      }
    } catch (error) {
      console.warn(
        "[real-media] openverse missed, trying sdk search:",
        error instanceof Error ? error.message : error
      );
    }
  }

  /* --- tier 2: SDK image search, slow but relevant --- */
  try {
    const res = await withSearchRetry(
      () =>
        getZai().then((zai) =>
          zai.images.search.create({
            query: q,
            count,
            gl: "us",
            rank: true,
          })
        ),
      "image search"
    );
    const images: RealImage[] = (res.success ? res.results : [])
      .filter((r) => typeof r.original_url === "string" && r.original_url.startsWith("http"))
      .slice(0, count)
      .map((r) => ({
        url: r.original_url,
        caption: (r.caption ?? "").trim(),
        source: (r.source ?? "web").trim(),
        width: parseInt(r.original_width ?? "0", 10) || 0,
        height: parseInt(r.original_height ?? "0", 10) || 0,
      }));
    await writeCache(key, images);
    return images;
  } catch (error) {
    console.warn(
      "[real-media] image search failed:",
      error instanceof Error ? error.message : error
    );
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* Real videos (YouTube)                                               */
/* ------------------------------------------------------------------ */

const WATCH_RE = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{11})/;
const PLAYLIST_RE = /[?&]list=([\w-]{12,})/;

function videoSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(
    query
  )}`;
}

/** Look up real, embeddable YouTube videos for a query. Never throws. */
export async function findRealVideos(query: string): Promise<VideoLookup> {
  const q = norm(query).slice(0, 160);
  const key = `vid:${q}`;
  const cached = await readCache<VideoLookup>(key);
  if (cached) return cached;

  const fallback: VideoLookup = { videos: [], searchUrl: videoSearchUrl(q) };

  const tryOnce = async (searchQuery: string): Promise<RealVideo[]> => {
    const zai = await getZai();
    const res = await zai.functions.invoke("web_search", {
      query: searchQuery,
      num: 10,
    });
    const seenVideos = new Set<string>();
    const seenLists = new Set<string>();
    const watchVideos: RealVideo[] = [];
    const playlistVideos: RealVideo[] = [];
    for (const item of res) {
      const watch = item.url.match(WATCH_RE);
      if (watch && !seenVideos.has(watch[1])) {
        seenVideos.add(watch[1]);
        watchVideos.push({
          id: watch[1],
          title: (item.name ?? "").replace(/ - YouTube$/i, "").trim(),
          url: `https://www.youtube.com/watch?v=${watch[1]}`,
        });
        continue;
      }
      // Playlists embed fine (videoseries) and exist for basically every
      // educational topic, so they are the safety net when no single watch
      // URL shows up in the results.
      if (item.url.includes("youtube.com/playlist")) {
        const list = item.url.match(PLAYLIST_RE);
        if (list && !seenLists.has(list[1])) {
          seenLists.add(list[1]);
          playlistVideos.push({
            id: list[1],
            title: (item.name ?? "").replace(/ - YouTube$/i, "").trim(),
            url: `https://www.youtube.com/playlist?list=${list[1]}`,
            playlist: true,
          });
        }
      }
    }
    const videos =
      watchVideos.length > 0
        ? watchVideos
        : playlistVideos.slice(0, 3);
    return videos.slice(0, 3);
  };

  const attempts = [
    `site:youtube.com ${q}`,
    `${q} youtube video watch`,
    `best youtube video to learn ${q}`,
  ];

  try {
    let videos: RealVideo[] = [];
    for (const attempt of attempts) {
      videos = await withSearchRetry(() => tryOnce(attempt), "video search");
      if (videos.length > 0) break;
    }
    // Never cache an empty result: the next visitor should get a fresh
    // chance at finding a video instead of a permanent dead end.
    if (videos.length > 0) {
      const payload: VideoLookup = { videos, searchUrl: videoSearchUrl(q) };
      await writeCache(key, payload);
      return payload;
    }
    return fallback;
  } catch (error) {
    console.warn(
      "[real-media] video search failed:",
      error instanceof Error ? error.message : error
    );
    return fallback;
  }
}
