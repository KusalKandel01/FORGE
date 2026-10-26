"use client";

/**
 * Real online media, attached straight into the app: actual YouTube
 * instructional videos and actual photographs from the open web, found by
 * the server through web/image search and shared by every visitor via the
 * MediaCache table.
 *
 * Design laws:
 * - Loading is visible but cheap (thin skeletons), failures degrade to an
 *   always-working "open on YouTube" link, never a dead box.
 * - Embeds play inline; if a network blocks the iframe (some school and
 *   office networks do), the big OPEN ON YOUTUBE button right below is the
 *   escape hatch.
 */

import { useEffect, useState } from "react";
import {
  ExternalLink,
  ImageIcon,
  PlayCircle,
  RefreshCw,
  Youtube,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RealImage {
  url: string;
  caption: string;
  source: string;
}

interface RealVideo {
  id: string;
  title: string;
  url: string;
  playlist?: boolean;
}

interface VideoLookup {
  videos: RealVideo[];
  searchUrl: string;
}

const LABEL =
  "font-head text-[11px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground";

function openExternal(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

/* ------------------------------------------------------------------ */
/* Real video                                                          */
/* ------------------------------------------------------------------ */

export function TopicVideo({
  query,
  className,
}: {
  query: string;
  className?: string;
}) {
  const [lookup, setLookup] = useState<VideoLookup | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLookup(null);
    setFailed(false);
    (async () => {
      try {
        const res = await fetch(
          `/api/media/video?q=${encodeURIComponent(query)}`,
          // The server search takes a few seconds on a cold cache; give it
          // room instead of flickering into the error state.
          { signal: AbortSignal.timeout(45_000) }
        );
        if (!res.ok) throw new Error("video lookup failed");
        const data = (await res.json()) as VideoLookup;
        if (cancelled) return;
        setLookup({
          videos: Array.isArray(data.videos) ? data.videos : [],
          searchUrl: data.searchUrl ?? `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
        });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query, attempt]);

  const video = lookup?.videos[0];
  const others = lookup?.videos.slice(1, 3) ?? [];

  return (
    <div className={className}>
      <p className={cn(LABEL, "flex items-center gap-1.5")}>
        <PlayCircle className="h-3.5 w-3.5 text-volt" aria-hidden />
        Watch it done for real
      </p>

      {lookup === null && !failed ? (
        <div
          className="mt-2 flex aspect-video w-full animate-pulse items-center justify-center border border-border bg-secondary/40"
          role="status"
          aria-label="Finding a real video"
        >
          <span className="px-4 text-center font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Finding a real video…
          </span>
        </div>
      ) : null}

      {video ? (
        <div className="mt-2">
          <div className="aspect-video w-full border border-border bg-black">
            <iframe
              key={video.id}
              src={
                video.playlist
                  ? `https://www.youtube-nocookie.com/embed/videoseries?list=${video.id}&rel=0`
                  : `https://www.youtube-nocookie.com/embed/${video.id}?rel=0`
              }
              title={video.title || `Real video about ${query}`}
              className="h-full w-full"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {video.playlist ? "Real video playlist from YouTube" : video.title || "Real video from YouTube"}
            </p>
            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                className="h-10 border-border px-3 font-head text-[10px] font-extrabold uppercase tracking-widest"
                onClick={() => openExternal(video.url)}
              >
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Open on YouTube
              </Button>
              {others.length > 0 ? (
                <Button
                  variant="outline"
                  className="h-10 border-border px-3 font-head text-[10px] font-extrabold uppercase tracking-widest"
                  onClick={() => {
                    // Rotate to the next found video.
                    setLookup((prev) =>
                      prev
                        ? {
                            videos: [...prev.videos.slice(1), prev.videos[0]],
                            searchUrl: prev.searchUrl,
                          }
                        : prev
                    );
                  }}
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                  Next video
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {(failed || (lookup !== null && lookup.videos.length === 0)) && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border border-border bg-secondary/30 p-3">
          <p className="text-xs text-muted-foreground">
            No video could be pulled right now — the YouTube search page has
            plenty.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="h-10 border-border px-3 font-head text-[10px] font-extrabold uppercase tracking-widest"
              onClick={() => setAttempt((a) => a + 1)}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Retry
            </Button>
            <Button
              variant="outline"
              className="h-10 border-volt px-3 font-head text-[10px] font-extrabold uppercase tracking-widest text-volt hover:bg-volt hover:text-black"
              onClick={() =>
                openExternal(
                  lookup?.searchUrl ??
                    `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
                )
              }
            >
              <Youtube className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Search on YouTube
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Real photos                                                         */
/* ------------------------------------------------------------------ */

export function TopicImages({
  query,
  count = 4,
  className,
}: {
  query: string;
  count?: number;
  className?: string;
}) {
  const [images, setImages] = useState<RealImage[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setImages(null);
    setFailed(false);
    (async () => {
      try {
        const res = await fetch(
          `/api/media/image?q=${encodeURIComponent(query)}&count=${count}`,
          { signal: AbortSignal.timeout(45_000) }
        );
        if (!res.ok) throw new Error("image lookup failed");
        const data = (await res.json()) as { images?: RealImage[] };
        if (cancelled) return;
        setImages(Array.isArray(data.images) ? data.images : []);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query, count, attempt]);

  if (failed) return null;
  if (images !== null && images.length === 0) return null;

  return (
    <div className={className}>
      <p className={cn(LABEL, "flex items-center gap-1.5")}>
        <ImageIcon className="h-3.5 w-3.5 text-volt" aria-hidden />
        Real photos from the web
      </p>
      {images === null ? (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4" role="status" aria-label="Finding real photos">
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className="aspect-square w-full animate-pulse border border-border bg-secondary/40"
            />
          ))}
        </div>
      ) : (
        <div className="nice-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <figure
              key={`${img.url}-${i}`}
              className="w-40 shrink-0 sm:w-44"
            >
              {/* Real photo from the OSS re-host; if the CDN hiccups the
                  tile collapses and the strip just shows fewer photos. */}
              <img
                src={img.url}
                alt={img.caption || query}
                className="aspect-square w-full border border-border object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              <figcaption className="mt-1 truncate text-[10px] text-muted-foreground">
                {img.source ? `Source: ${img.source}` : "Web photo"}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Combined section                                                    */
/* ------------------------------------------------------------------ */

/**
 * The full "learn from real media" block: a real video plus a strip of
 * real photos for one topic. Used by skills guides, exercise details and
 * learn lessons.
 */
export function TopicMedia({
  query,
  showImages = true,
  className,
}: {
  query: string;
  showImages?: boolean;
  className?: string;
}) {
  return (
    <section
      aria-label="Real videos and photos for this topic"
      className={cn(
        "space-y-4 border border-border bg-secondary/20 p-3 sm:p-4",
        className
      )}
    >
      <TopicVideo query={query} />
      {showImages ? <TopicImages query={query} /> : null}
    </section>
  );
}
