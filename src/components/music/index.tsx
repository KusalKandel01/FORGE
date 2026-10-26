"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dices,
  ExternalLink,
  ListMusic,
  Music2,
  Pause,
  Play,
  RefreshCw,
  SkipBack,
  SkipForward,
  Shuffle,
  Star,
  Trash2,
  Volume2,
  WifiOff,
  Youtube,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import {
  RADIO_MIXES,
  parseSource,
  useMusic,
  type Favorite,
  type SourceType,
} from "@/components/music/store";

type YTPlayer = any;

/**
 * Shared loader for the YouTube IFrame API.
 *
 * CRITICAL: the cached promise is CLEARED whenever it rejects, so a single
 * blocked attempt (offline moment, flaky network, sandbox) never permanently
 * kills the player. Every Try Again starts a genuinely fresh attempt.
 */
let apiPromise: Promise<any> | null = null;

function loadYouTubeApi(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("no window"));
  }
  const w = window as Window & {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  };
  if (w.YT && w.YT.Player) return Promise.resolve(w.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const fail = (reason: Error) => {
        apiPromise = null;
        reject(reason);
      };
      const timer = window.setTimeout(
        () => fail(new Error("YouTube API timed out")),
        20000
      );
      const prev = w.onYouTubeIframeAPIReady;
      w.onYouTubeIframeAPIReady = () => {
        if (prev) prev();
        window.clearTimeout(timer);
        resolve(w.YT);
      };
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      tag.onerror = () => {
        window.clearTimeout(timer);
        fail(new Error("YouTube API blocked"));
      };
      document.head.appendChild(tag);
    });
  }
  return apiPromise;
}

function Controls({
  playing,
  onPlayPause,
  onPrev,
  onNext,
  onShuffle,
  shuffle,
}: {
  playing: boolean;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onShuffle: () => void;
  shuffle: boolean;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      <Button
        variant="outline"
        aria-label="Previous track"
        onClick={onPrev}
        className="h-12 border-border"
      >
        <SkipBack className="h-5 w-5" aria-hidden />
      </Button>
      <Button
        onClick={onPlayPause}
        aria-label={playing ? "Pause" : "Play"}
        className="col-span-2 h-12 bg-volt font-head text-xs font-extrabold uppercase tracking-[0.2em] text-black hover:bg-volt/90"
      >
        {playing ? (
          <Pause className="mr-2 h-5 w-5" aria-hidden />
        ) : (
          <Play className="mr-2 h-5 w-5" aria-hidden />
        )}
        {playing ? "Pause" : "Play"}
      </Button>
      <Button
        variant="outline"
        aria-label="Next track"
        onClick={onNext}
        className="h-12 border-border"
      >
        <SkipForward className="h-5 w-5" aria-hidden />
      </Button>
      <Button
        variant={shuffle ? "default" : "outline"}
        aria-pressed={shuffle}
        onClick={onShuffle}
        className={`h-11 col-span-4 font-head text-[11px] font-extrabold uppercase tracking-[0.2em] ${
          shuffle ? "bg-volt text-black hover:bg-volt/90" : "border-border"
        }`}
      >
        <Shuffle className="mr-2 h-4 w-4" aria-hidden />
        Shuffle {shuffle ? "on" : "off"}
      </Button>
    </div>
  );
}

export default function MusicPlayer() {
  const { toast } = useToast();
  const sourceType = useMusic((s) => s.type);
  const sourceId = useMusic((s) => s.id);
  const volume = useMusic((s) => s.volume);
  const shuffle = useMusic((s) => s.shuffle);
  const setSource = useMusic((s) => s.setSource);
  const clearSource = useMusic((s) => s.clearSource);
  const setVolume = useMusic((s) => s.setVolume);
  const setShuffle = useMusic((s) => s.setShuffle);
  const favorites = useMusic((s) => s.favorites);
  const addFavorite = useMusic((s) => s.addFavorite);
  const removeFavorite = useMusic((s) => s.removeFavorite);

  const [input, setInput] = useState("");
  const [playing, setPlaying] = useState(false);
  const [trackTitle, setTrackTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [retryNonce, setRetryNonce] = useState(0);

  const hostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const creatingRef = useRef(false);

  const load = useCallback(
    (type: SourceType, id: string) => {
      const player = playerRef.current;
      if (!player) return;
      try {
        if (type === "playlist") {
          player.loadPlaylist({ list: id, listType: "playlist", index: 0 });
        } else {
          player.loadVideoById(id);
        }
        setError(null);
      } catch {
        setError("Could not load that link. Check it and try again.");
      }
    },
    []
  );

  // Create the player once a source exists; reload when the source changes.
  // volume and shuffle are deliberately NOT dependencies: they are applied via
  // safeCall immediately, and re-running this effect would restart the
  // playlist from index 0 whenever the user moves a slider mid song.
  useEffect(() => {
    if (!sourceType || !sourceId) return;
    let cancelled = false;

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return;
        if (playerRef.current) {
          load(sourceType, sourceId);
          return;
        }
        if (!hostRef.current || creatingRef.current) return;
        creatingRef.current = true;
        try {
          playerRef.current = new YT.Player(hostRef.current, {
            height: "100%",
            width: "100%",
            videoId: sourceType === "video" ? sourceId : undefined,
            playerVars: {
              listType: "playlist",
              list: sourceType === "playlist" ? sourceId : undefined,
              modestbranding: 1,
              rel: 0,
              playsinline: 1,
            },
            events: {
              onReady: (e: YTPlayer) => {
                creatingRef.current = false;
                try {
                  const s = useMusic.getState();
                  e.target.setVolume(s.volume);
                  if (s.shuffle) e.target.setShuffle(true);
                } catch {
                  /* ignore */
                }
              },
              onStateChange: (e: YTPlayer) => {
                setPlaying(e.data === 1);
                if (e.data === 1) {
                  setError(null);
                  try {
                    setTrackTitle(e.target.getVideoData()?.title ?? "");
                  } catch {
                    /* ignore */
                  }
                }
              },
              onError: () => {
                setError(
                  "YouTube blocked this item or it does not exist. Skip to the next track, try another mix, or open the mix on YouTube."
                );
              },
            },
          });
        } catch {
          creatingRef.current = false;
          setError(
            "The YouTube player failed to start on this device. Tap Try Again."
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            "YouTube could not be reached right now. Check the connection, then tap Try Again."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sourceType, sourceId, tick, retryNonce, load]);

  const retry = () => {
    setError(null);
    setRetryNonce((n) => n + 1);
  };

  const youtubeEscape =
    sourceType === "video"
      ? `https://www.youtube.com/watch?v=${sourceId ?? ""}`
      : `https://www.youtube.com/playlist?list=${sourceId ?? ""}`;

  const handleLoad = () => {
    const parsed = parseSource(input);
    if (!parsed) {
      toast({
        title: "That does not look like a YouTube link or ID",
        description:
          "Paste a playlist URL (it contains list=), a video URL or a bare ID.",
      });
      return;
    }
    setError(null);
    setSource(parsed.type, parsed.id);
    // If the same source was already active, force a reload.
    if (sourceType === parsed.type && sourceId === parsed.id) {
      setTick((t) => t + 1);
    }
  };

  const handleMix = (id: string) => {
    setError(null);
    if (sourceType === "playlist" && sourceId === id) {
      setTick((t) => t + 1);
    } else {
      setSource("playlist", id);
    }
  };

  const surprise = () => {
    const mix = RADIO_MIXES[Math.floor(Math.random() * RADIO_MIXES.length)];
    handleMix(mix.id);
  };

  // Honest label for the current source: real video title for videos, the
  // known mix name for built-in mixes, otherwise the raw ID. Never invented.
  let currentLabel = "";
  if (sourceType && sourceId) {
    if (sourceType === "video") {
      currentLabel = trackTitle || sourceId;
    } else {
      const mix = RADIO_MIXES.find((m) => m.id === sourceId);
      currentLabel = mix ? mix.label : sourceId;
    }
  }
  const currentSaved = Boolean(
    sourceType &&
      sourceId &&
      favorites.some((f) => f.type === sourceType && f.id === sourceId)
  );

  const toggleFavorite = () => {
    if (!sourceType || !sourceId) return;
    if (currentSaved) {
      removeFavorite(sourceType, sourceId);
      toast({ title: "Removed from favorites" });
    } else {
      addFavorite(sourceType, sourceId, currentLabel);
      toast({ title: "Saved to favorites", description: currentLabel });
    }
  };

  // Same load flow as handleMix: reuse the source state, bump the tick to
  // force a reload when the favorite is already the active source.
  const playFavorite = (fav: Favorite) => {
    setError(null);
    if (sourceType === fav.type && sourceId === fav.id) {
      setTick((t) => t + 1);
    } else {
      setSource(fav.type, fav.id);
    }
  };

  const safeCall = (fn: (p: YTPlayer) => void) => {
    const p = playerRef.current;
    if (!p) return;
    try {
      fn(p);
    } catch {
      /* ignore */
    }
  };

  const online =
    typeof navigator === "undefined" ? true : navigator.onLine;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-6">
        <h1 className="font-display text-5xl tracking-wide">MUSIC</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Training soundtrack. Paste any YouTube playlist link, or hit a random
          mix and go.
        </p>
      </div>

      {!online && (
        <Card className="mb-6 border-ember/60">
          <CardContent className="flex items-center gap-3 p-4">
            <WifiOff className="h-5 w-5 shrink-0 text-ember" aria-hidden />
            <p className="text-sm text-muted-foreground">
              You are offline. YouTube streaming needs a connection. Everything
              else in FORGE still works.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardContent className="p-4">
            <div className="relative aspect-video w-full overflow-hidden border border-border bg-black">
              {sourceType && sourceId ? (
                <div ref={hostRef} className="h-full w-full" title="YouTube player" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-muted-foreground">
                  <Music2 className="h-10 w-10" aria-hidden />
                  <p className="font-head text-xs font-extrabold uppercase tracking-[0.2em]">
                    Load a playlist or a random mix
                  </p>
                </div>
              )}
            </div>
            <div className="mt-3 border border-border bg-secondary/40 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-head text-[11px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
                    Now playing
                  </p>
                  <p className="mt-1 truncate text-sm" title={trackTitle}>
                    {error
                      ? "Player error"
                      : playing
                        ? trackTitle || "Loading..."
                        : sourceType
                          ? trackTitle || "Paused"
                          : "Nothing loaded yet"}
                  </p>
                </div>
                {sourceType && sourceId && (
                  <Button
                    variant="outline"
                    onClick={toggleFavorite}
                    aria-label={
                      currentSaved
                        ? "Remove from favorites"
                        : "Save to favorites"
                    }
                    aria-pressed={currentSaved}
                    className={`h-11 w-11 shrink-0 ${
                      currentSaved
                        ? "border-volt text-volt"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    <Star
                      className={`h-5 w-5 ${
                        currentSaved ? "fill-volt" : ""
                      }`}
                      aria-hidden
                    />
                  </Button>
                )}
              </div>
            </div>
            {error && (
              <div className="mt-2 space-y-2">
                <p className="flex items-start gap-2 text-sm text-destructive">
                  <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  {error}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={retry}
                    className="h-10 bg-volt px-4 font-head text-xs font-extrabold uppercase tracking-[0.2em] text-black hover:bg-volt/90"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
                    Try again
                  </Button>
                  {sourceId ? (
                    <a
                      href={youtubeEscape}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 items-center border border-border px-4 font-head text-xs font-extrabold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:border-volt hover:text-volt"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
                      Open on YouTube
                    </a>
                  ) : null}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-head text-xs font-extrabold uppercase tracking-[0.2em]">
                <Youtube className="h-4 w-4 text-volt" aria-hidden /> Your
                playlist
              </CardTitle>
              <CardDescription>
                Paste a YouTube playlist link (any link containing list=), a
                video link or a bare ID. Playlists from your own channel work
                too.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleLoad();
                  }}
                  placeholder="https://youtube.com/playlist?list=..."
                  aria-label="YouTube playlist or video link"
                  className="h-12"
                />
                <Button
                  onClick={handleLoad}
                  className="h-12 bg-volt px-4 font-head text-xs font-extrabold uppercase tracking-[0.2em] text-black hover:bg-volt/90"
                >
                  Load
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={surprise}
                className="h-12 w-full border-border font-head text-xs font-extrabold uppercase tracking-[0.2em]"
              >
                <Dices className="mr-2 h-4 w-4 text-volt" aria-hidden />
                Surprise me: random mix
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-head text-xs font-extrabold uppercase tracking-[0.2em]">
                <ListMusic className="h-4 w-4 text-volt" aria-hidden /> Quick
                mixes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {RADIO_MIXES.map((mix) => (
                  <Button
                    key={mix.id}
                    variant="outline"
                    onClick={() => handleMix(mix.id)}
                    className={`h-10 px-4 font-head text-[11px] font-bold uppercase tracking-widest ${
                      sourceId === mix.id
                        ? "border-volt text-volt"
                        : "border-border"
                    }`}
                  >
                    {mix.label}
                  </Button>
                ))}
              </div>

              <Controls
                playing={playing}
                onPlayPause={() =>
                  safeCall((p) => (playing ? p.pauseVideo() : p.playVideo()))
                }
                onPrev={() => safeCall((p) => p.previousVideo())}
                onNext={() => safeCall((p) => p.nextVideo())}
                onShuffle={() => {
                  const next = !shuffle;
                  setShuffle(next);
                  safeCall((p) => p.setShuffle(next));
                }}
                shuffle={shuffle}
              />

              <div>
                <p className="mb-2 flex items-center gap-2 font-head text-[11px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
                  <Volume2 className="h-4 w-4" aria-hidden /> Volume {volume}%
                </p>
                <Slider
                  value={[volume]}
                  min={0}
                  max={100}
                  step={1}
                  aria-label="Volume"
                  onValueChange={(vals) => {
                    const v = vals[0] ?? volume;
                    setVolume(v);
                    safeCall((p) => p.setVolume(v));
                  }}
                />
              </div>

              {sourceType && (
                <Button
                  variant="outline"
                  onClick={() => {
                    clearSource();
                    setTrackTitle("");
                    setPlaying(false);
                    setError(null);
                    playerRef.current = null;
                    toast({ title: "Player cleared" });
                  }}
                  className="h-11 w-full border-border font-head text-[11px] font-extrabold uppercase tracking-[0.2em]"
                >
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                  Clear player
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-head text-xs font-extrabold uppercase tracking-[0.2em]">
                <Star className="h-4 w-4 text-volt" aria-hidden /> Favorites
              </CardTitle>
              <CardDescription>
                Saved mixes, playlists and videos. Stored on this device.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {favorites.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No favorites yet. Save a mix or playlist while it plays.
                </p>
              ) : (
                <ul className="nice-scrollbar max-h-96 space-y-2 overflow-y-auto pr-1">
                  {favorites.map((fav) => {
                    const active =
                      fav.type === sourceType && fav.id === sourceId;
                    return (
                      <li
                        key={`${fav.type}:${fav.id}`}
                        className={`flex items-center gap-2 border bg-secondary/40 p-2 ${
                          active ? "border-volt" : "border-border"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm" title={fav.label}>
                            {fav.label}
                          </p>
                          <p className="mt-0.5 font-head text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
                            {fav.type === "video" ? "Video" : "Playlist"}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => playFavorite(fav)}
                          aria-label={`Play ${fav.label}`}
                          className={`h-11 w-11 shrink-0 ${
                            active
                              ? "border-volt text-volt"
                              : "border-border"
                          }`}
                        >
                          <Play className="h-4 w-4" aria-hidden />
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            removeFavorite(fav.type, fav.id);
                            toast({ title: "Removed from favorites" });
                          }}
                          aria-label={`Remove ${fav.label} from favorites`}
                          className="h-11 w-11 shrink-0 border-border text-muted-foreground hover:text-ember"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
