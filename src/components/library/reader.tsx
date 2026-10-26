"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Minus,
  Plus,
  RefreshCcw,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getChapter,
  getMisc,
  getText,
  putChapter,
  putMisc,
  putText,
  type StoredOutline,
} from "@/lib/book-cache";
import { useLibrary, type ShelfMeta } from "@/components/library/store";

const WORDS_PER_PAGE = 1600;
const MIN_CHAPTERS = 1;

function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function useOnline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true
  );
}

/** Split a book into ~1600 word pages, cutting on paragraph boundaries. */
function splitIntoPages(text: string): string[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return [];
  const pages: string[] = [];
  let current: string[] = [];
  let words = 0;
  for (const para of paragraphs) {
    const count = para.split(/\s+/).length;
    if (words > 0 && words + count > WORDS_PER_PAGE) {
      pages.push(current.join("\n\n"));
      current = [];
      words = 0;
    }
    current.push(para);
    words += count;
  }
  if (current.length > 0) pages.push(current.join("\n\n"));
  return pages;
}

function isOutline(value: unknown): value is StoredOutline {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as StoredOutline).chapterTitles) &&
    (value as StoredOutline).chapterTitles.length >= MIN_CHAPTERS
  );
}

function clampIndex(i: number, total: number): number {
  return Math.min(Math.max(0, total - 1), Math.max(0, i));
}

function ReaderTopBar({
  title,
  subtitle,
  indicator,
  onClose,
}: {
  title: string;
  subtitle: string;
  indicator: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border bg-card px-3 py-2">
      <Button
        variant="outline"
        onClick={onClose}
        className="h-11 w-11 shrink-0 border-border"
        aria-label="Close reader"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden />
      </Button>
      <div className="min-w-0 flex-1">
        <p className="truncate font-head text-sm font-bold">{title}</p>
        <p className="truncate font-head text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
          {subtitle}
        </p>
      </div>
      <span className="shrink-0 font-head text-xs font-extrabold uppercase tracking-[0.2em] text-volt">
        {indicator}
      </span>
    </div>
  );
}

function FontControls({
  fontSize,
  onSmaller,
  onLarger,
}: {
  fontSize: number;
  onSmaller: () => void;
  onLarger: () => void;
}) {
  return (
    <>
      <Button
        variant="outline"
        onClick={onSmaller}
        disabled={fontSize <= 13}
        className="h-12 w-12 shrink-0 border-border font-head text-xs font-extrabold"
        aria-label="Smaller text"
      >
        <Minus className="h-4 w-4" aria-hidden />
      </Button>
      <Button
        variant="outline"
        onClick={onLarger}
        disabled={fontSize >= 28}
        className="h-12 w-12 shrink-0 border-border font-head text-xs font-extrabold"
        aria-label="Larger text"
      >
        <Plus className="h-4 w-4" aria-hidden />
      </Button>
    </>
  );
}

function NoticeState({
  icon,
  heading,
  body,
  action,
}: {
  icon: React.ReactNode;
  heading: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      {icon}
      <p className="font-head text-xs font-extrabold uppercase tracking-[0.2em]">
        {heading}
      </p>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
      {action}
    </div>
  );
}

function TextSkeleton({ label }: { label: string }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <p className="mb-4 font-head text-xs font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <div className="space-y-3">
        {[92, 100, 96, 100, 90, 100, 84, 100].map((w, i) => (
          <Skeleton key={i} className="h-4" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Gutenberg reader: paginated full text from the public domain source */
/* ------------------------------------------------------------------ */

type GutenbergStatus = "loading" | "ready" | "offline" | "error";

function GutenbergReader({
  book,
  onClose,
}: {
  book: ShelfMeta;
  onClose: () => void;
}) {
  const fontSize = useLibrary((s) => s.fontSize);
  const setFontSize = useLibrary((s) => s.setFontSize);
  const updateProgress = useLibrary((s) => s.updateProgress);
  const markOfflineReady = useLibrary((s) => s.markOfflineReady);
  const online = useOnline();

  const [status, setStatus] = useState<GutenbergStatus>("loading");
  const [pages, setPages] = useState<string[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await getText(book.id);
      if (cancelled) return;
      if (cached && cached.trim().length > 0) {
        const p = splitIntoPages(cached);
        if (p.length === 0) {
          if (!cancelled) setStatus("error");
          return;
        }
        const restored = clampIndex(
          Math.floor(book.progress * p.length),
          p.length
        );
        if (cancelled) return;
        setPages(p);
        setPageIndex(restored);
        setStatus("ready");
        return;
      }
      if (!navigator.onLine) {
        if (!cancelled) setStatus("offline");
        return;
      }
      // Personal uploads have no server copy: the text only lives on this
      // device, so a missing cache means the file was never opened here.
      if (book.source === "personal") {
        if (!cancelled) setStatus("error");
        return;
      }
      try {
        const res = await fetch(
          `/api/books/text?id=${encodeURIComponent(book.id)}`
        );
        if (!res.ok) throw new Error("Book text request failed");
        const data = (await res.json()) as { text?: unknown };
        const text = typeof data.text === "string" ? data.text : "";
        if (!text.trim()) throw new Error("Book text came back empty");
        void putText(book.id, text);
        markOfflineReady(book.id);
        const p = splitIntoPages(text);
        if (p.length === 0) throw new Error("Book text was empty");
        const restored = clampIndex(
          Math.floor(book.progress * p.length),
          p.length
        );
        if (cancelled) return;
        setPages(p);
        setPageIndex(restored);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [book.id, reloadKey, markOfflineReady]);

  const goToPage = useCallback(
    (next: number) => {
      if (pages.length === 0) return;
      const clamped = clampIndex(next, pages.length);
      if (clamped === pageIndex) return;
      setPageIndex(clamped);
      updateProgress(book.id, (clamped + 1) / pages.length);
      scrollRef.current?.scrollTo({ top: 0 });
    },
    [pages.length, pageIndex, book.id, updateProgress]
  );

  useEffect(() => {
    if (status !== "ready") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goToPage(pageIndex - 1);
      if (e.key === "ArrowRight") goToPage(pageIndex + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status, pageIndex, goToPage]);

  const percent =
    pages.length > 0
      ? Math.round(((pageIndex + 1) / pages.length) * 100)
      : 0;

  return (
    <>
      <ReaderTopBar
        title={book.title}
        subtitle={book.author}
        indicator={pages.length > 0 ? `PAGE ${pageIndex + 1} / ${pages.length}` : ""}
        onClose={onClose}
      />

      {status === "loading" && (
        <div className="flex-1 overflow-hidden">
          <TextSkeleton label="Loading book..." />
        </div>
      )}

      {status === "ready" && (
        <div ref={scrollRef} className="nice-scrollbar flex-1 overflow-y-auto">
          <div
            className="mx-auto max-w-2xl px-4 py-6"
            style={{ fontSize: `${fontSize}px`, lineHeight: 1.7 }}
          >
            <p className="whitespace-pre-wrap">{pages[pageIndex]}</p>
          </div>
        </div>
      )}

      {status === "offline" && (
        <NoticeState
          icon={<WifiOff className="h-6 w-6 text-ember" aria-hidden />}
          heading="NOT SAVED FOR OFFLINE YET"
          body="Open this book once while online to save it for offline reading."
        />
      )}

      {status === "error" && (
        <NoticeState
          icon={
            <AlertTriangle className="h-6 w-6 text-ember" aria-hidden />
          }
          heading="COULD NOT LOAD THIS BOOK"
          body={
            online
              ? "The book could not be downloaded right now. Give it another try."
              : "You are offline and this book is not saved on your device yet."
          }
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                variant="outline"
                className="h-11 border-border px-4 font-head text-xs font-extrabold uppercase tracking-[0.2em]"
                onClick={() => {
                  setStatus("loading");
                  setReloadKey((k) => k + 1);
                }}
              >
              <RefreshCcw className="h-4 w-4" aria-hidden /> Try again
              </Button>
              {book.id.startsWith("ia-") && (
                <Button
                  variant="outline"
                  className="h-11 border-volt px-4 font-head text-xs font-extrabold uppercase tracking-[0.2em] text-volt hover:bg-volt hover:text-black"
                  onClick={() => {
                    window.open(
                      `https://archive.org/details/${encodeURIComponent(
                        book.id.slice(3)
                      )}`,
                      "_blank",
                      "noopener,noreferrer"
                    );
                  }}
                >
                  Open on Archive.org
                </Button>
              )}
            </div>
          }
        />
      )}

      <div className="flex items-center gap-2 border-t border-border bg-card px-3 py-3">
        <Button
          variant="outline"
          onClick={() => goToPage(pageIndex - 1)}
          disabled={status !== "ready" || pageIndex === 0}
          className="h-12 min-w-0 flex-1 border-border px-3 font-head text-xs font-extrabold uppercase tracking-[0.2em]"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden /> Prev
        </Button>
        <span
          className="w-12 shrink-0 text-center font-head text-xs font-extrabold text-volt"
          aria-label={`Reading progress ${percent} percent`}
        >
          {percent}%
        </span>
        <Button
          variant="outline"
          onClick={() => goToPage(pageIndex + 1)}
          disabled={status !== "ready" || pageIndex >= pages.length - 1}
          className="h-12 min-w-0 flex-1 border-border px-3 font-head text-xs font-extrabold uppercase tracking-[0.2em]"
        >
          Next <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
        <FontControls
          fontSize={fontSize}
          onSmaller={() => setFontSize(fontSize - 1)}
          onLarger={() => setFontSize(fontSize + 1)}
        />
      </div>
    </>
  );
}

/* --------------------------------------------------------------------------- */
/* Generated reader: outline from misc + per chapter text written by the model */
/* --------------------------------------------------------------------------- */

type OutlinePhase = "loading" | "ready" | "offline" | "error";
type ChapterState = "loading" | "ready" | "offline" | "error";

function GeneratedReader({
  book,
  onClose,
}: {
  book: ShelfMeta;
  onClose: () => void;
}) {
  const fontSize = useLibrary((s) => s.fontSize);
  const setFontSize = useLibrary((s) => s.setFontSize);
  const updateProgress = useLibrary((s) => s.updateProgress);
  const markOfflineReady = useLibrary((s) => s.markOfflineReady);
  const online = useOnline();

  const [phase, setPhase] = useState<OutlinePhase>("loading");
  const [outline, setOutline] = useState<StoredOutline | null>(null);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [chapterState, setChapterState] = useState<ChapterState>("loading");
  const [chapterText, setChapterText] = useState<string | null>(null);
  const [chapterReloadKey, setChapterReloadKey] = useState(0);
  const [outlineReloadKey, setOutlineReloadKey] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  /* Load the outline on open. If it went missing (wiped IndexedDB) rebuild
     it once while online, then persist it under the same book id. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let loaded = await getMisc<StoredOutline>(`${book.id}:outline`);
      if (cancelled) return;
      if (!isOutline(loaded)) {
        if (!navigator.onLine) {
          if (!cancelled) setPhase("offline");
          return;
        }
        try {
          const res = await fetch("/api/books/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: book.title,
              genre: "Other",
              blurb: book.description ?? undefined,
              author: book.companion ? book.author : undefined,
              mode: book.companion ? "companion" : "original",
            }),
          });
          if (!res.ok) throw new Error("Outline rebuild failed");
          const data = (await res.json()) as {
            book?: { description?: string; chapterTitles?: unknown };
          };
          const titles = Array.isArray(data.book?.chapterTitles)
            ? data.book?.chapterTitles.filter(
                (t): t is string => typeof t === "string" && t.trim().length > 0
              )
            : [];
          if (titles.length === 0) throw new Error("Outline came back empty");
          loaded = {
            description:
              book.description ?? (data.book?.description as string) ?? "",
            chapterTitles: titles,
            genre: "Other",
            mode: book.companion ? "companion" : "original",
            author: book.companion ? book.author : undefined,
          };
          void putMisc(`${book.id}:outline`, loaded);
        } catch {
          if (!cancelled) setPhase("error");
          return;
        }
      }
      const total = loaded.chapterTitles.length;
      const restored = clampIndex(
        Math.floor(book.progress * total),
        total
      );
      if (cancelled) return;
      setOutline(loaded);
      setChapterIndex(restored);
      setPhase("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, [book.id, outlineReloadKey, markOfflineReady]);

  /* Load the current chapter: cache first, then the writer API. Assumes the
     chapter state was already switched to "loading" by whoever changed the
     chapter index, so this effect never calls setState synchronously. */
  useEffect(() => {
    if (!outline) return;
    let cancelled = false;
    (async () => {
      const total = outline.chapterTitles.length;
      const cached = await getChapter(book.id, chapterIndex);
      if (cancelled) return;
      if (cached && cached.trim().length > 0) {
        setChapterText(cached);
        setChapterState("ready");
        return;
      }
      if (!navigator.onLine) {
        setChapterText(null);
        setChapterState("offline");
        return;
      }
      try {
        const res = await fetch("/api/books/chapter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: book.title,
            genre: outline.genre ?? "Other",
            blurb: book.description ?? undefined,
            description: outline.description || undefined,
            author: outline.mode === "companion" ? book.author : undefined,
            chapterTitle: outline.chapterTitles[chapterIndex],
            index: chapterIndex,
            total,
            mode: outline.mode ?? "original",
          }),
        });
        if (!res.ok) throw new Error("Chapter request failed");
        const data = (await res.json()) as { text?: unknown };
        const text = typeof data.text === "string" ? data.text.trim() : "";
        if (!text) throw new Error("Chapter came back empty");
        void putChapter(book.id, chapterIndex, text);

        // Offline ready once every chapter of the book is saved on device.
        const all = await Promise.all(
          Array.from({ length: total }, (_, i) => getChapter(book.id, i))
        );
        if (all.every((t) => typeof t === "string" && t.trim().length > 0)) {
          markOfflineReady(book.id);
        }

        if (cancelled) return;
        setChapterText(text);
        setChapterState("ready");
      } catch {
        if (!cancelled) {
          setChapterText(null);
          setChapterState("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [outline, chapterIndex, chapterReloadKey, book.id, markOfflineReady]);

  const total = outline?.chapterTitles.length ?? 0;

  const goToChapter = useCallback(
    (next: number) => {
      if (!outline) return;
      const t = outline.chapterTitles.length;
      const clamped = clampIndex(next, t);
      if (clamped === chapterIndex) return;
      setChapterIndex(clamped);
      setChapterState("loading");
      setChapterText(null);
      updateProgress(book.id, (clamped + 1) / t);
      scrollRef.current?.scrollTo({ top: 0 });
    },
    [outline, chapterIndex, book.id, updateProgress]
  );

  if (phase === "loading") {
    return (
      <>
        <ReaderTopBar
          title={book.title}
          subtitle={book.author}
          indicator=""
          onClose={onClose}
        />
        <div className="flex-1 overflow-hidden">
          <TextSkeleton label="Opening book..." />
        </div>
      </>
    );
  }

  if (phase === "offline") {
    return (
      <>
        <ReaderTopBar
          title={book.title}
          subtitle={book.author}
          indicator=""
          onClose={onClose}
        />
        <NoticeState
          icon={<WifiOff className="h-6 w-6 text-ember" aria-hidden />}
          heading="NOT SAVED FOR OFFLINE YET"
          body="Open this book once while online to save it for offline reading."
        />
      </>
    );
  }

  if (phase === "error") {
    return (
      <>
        <ReaderTopBar
          title={book.title}
          subtitle={book.author}
          indicator=""
          onClose={onClose}
        />
        <NoticeState
          icon={<AlertTriangle className="h-6 w-6 text-ember" aria-hidden />}
          heading="COULD NOT LOAD THIS BOOK"
          body={
            online
              ? "The book outline could not be loaded right now. Give it another try."
              : "You are offline and this book is not saved on your device yet."
          }
          action={
            <Button
              variant="outline"
              className="h-11 border-border px-4 font-head text-xs font-extrabold uppercase tracking-[0.2em]"
              onClick={() => setOutlineReloadKey((k) => k + 1)}
            >
              <RefreshCcw className="h-4 w-4" aria-hidden /> Try again
            </Button>
          }
        />
      </>
    );
  }

  const percent =
    total > 0 ? Math.round(((chapterIndex + 1) / total) * 100) : 0;

  return (
    <>
      <ReaderTopBar
        title={book.title}
        subtitle={
          book.companion
            ? `AI COMPANION - ${book.author}`
            : (outline?.chapterTitles[chapterIndex] ?? "")
        }
        indicator={total > 0 ? `${book.companion ? "PART " : "CH. "}${chapterIndex + 1} / ${total}` : ""}
        onClose={() => {}}
      />

      {chapterState === "ready" && chapterText && (
        <div ref={scrollRef} className="nice-scrollbar flex-1 overflow-y-auto">
          <div
            className="mx-auto max-w-2xl px-4 py-6"
            style={{ fontSize: `${fontSize}px`, lineHeight: 1.7 }}
          >
            {book.companion ? (
              <p className="mb-4 font-head text-[10px] font-extrabold uppercase tracking-[0.2em] text-volt">
                {outline?.chapterTitles[chapterIndex]}
              </p>
            ) : null}
            <p className="whitespace-pre-wrap">{chapterText}</p>
            {book.companion && total > 0 ? (
              <p className="mt-8 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
                AI reading companion: a walkthrough of the real book in fresh
                words, not the publisher&apos;s text. The next part covers:
                {" "}
                {outline?.chapterTitles[chapterIndex + 1] ?? "the final wrap-up"}.
              </p>
            ) : null}
          </div>
        </div>
      )}

      {chapterState === "loading" && (
        <div className="flex-1 overflow-hidden">
          <TextSkeleton
            label={`${book.companion ? "Writing part" : "Writing chapter"} ${chapterIndex + 1}...`}
          />
        </div>
      )}

      {chapterState === "offline" && (
        <NoticeState
          icon={<WifiOff className="h-6 w-6 text-ember" aria-hidden />}
          heading="CHAPTER NOT SAVED YET"
          body="This chapter is not on your device yet. Open it once while online to save it for offline reading."
        />
      )}

      {chapterState === "error" && (
        <NoticeState
          icon={<AlertTriangle className="h-6 w-6 text-ember" aria-hidden />}
          heading="THE WRITER STOPPED"
          body={
            online
              ? "This chapter could not be written right now. Give it another try."
              : "You are offline and this chapter is not saved on your device yet."
          }
          action={
            <Button
              variant="outline"
              className="h-11 border-border px-4 font-head text-xs font-extrabold uppercase tracking-[0.2em]"
              onClick={() => {
                setChapterState("loading");
                setChapterReloadKey((k) => k + 1);
              }}
            >
              <RefreshCcw className="h-4 w-4" aria-hidden /> Retry
            </Button>
          }
        />
      )}

      <div className="flex items-center gap-2 border-t border-border bg-card px-3 py-3">
        <Button
          variant="outline"
          onClick={() => goToChapter(chapterIndex - 1)}
          disabled={chapterIndex === 0}
          className="h-12 min-w-0 flex-1 border-border px-3 font-head text-xs font-extrabold uppercase tracking-[0.2em]"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden /> Prev
        </Button>
        <span
          className="w-12 shrink-0 text-center font-head text-xs font-extrabold text-volt"
          aria-label={`Reading progress ${percent} percent`}
        >
          {percent}%
        </span>
        <Button
          variant="outline"
          onClick={() => goToChapter(chapterIndex + 1)}
          disabled={chapterIndex >= total - 1}
          className="h-12 min-w-0 flex-1 border-border px-3 font-head text-xs font-extrabold uppercase tracking-[0.2em]"
        >
          Next <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
        <FontControls
          fontSize={fontSize}
          onSmaller={() => setFontSize(fontSize - 1)}
          onLarger={() => setFontSize(fontSize + 1)}
        />
      </div>
    </>
  );
}

/* -------------------------------------------------------------- */
/* Full screen overlay shared by both reading modes               */
/* -------------------------------------------------------------- */

export function LibraryReader({
  book,
  onClose,
}: {
  book: ShelfMeta;
  onClose: () => void;
}) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const close = useCallback(() => onClose(), [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background"
      role="dialog"
      aria-modal="true"
      aria-label={`Reading ${book.title}`}
    >
      {book.source === "generated" ? (
        <GeneratedReader book={book} onClose={close} />
      ) : (
        <GutenbergReader book={book} onClose={close} />
      )}
    </div>
  );
}

export default LibraryReader;
