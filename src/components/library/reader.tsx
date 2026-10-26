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
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Highlighter,
  Minus,
  NotebookPen,
  Plus,
  RefreshCcw,
  Trash2,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/sonner";
import {
  getChapter,
  getMisc,
  getText,
  putChapter,
  putMisc,
  putText,
  type StoredOutline,
} from "@/lib/book-cache";
import {
  useLibrary,
  type Bookmark as BookmarkEntry,
  type Highlight,
  type ShelfMeta,
} from "@/components/library/store";

const WORDS_PER_PAGE = 1600;
const MIN_CHAPTERS = 1;
/** A selection must be at least this many chars before it can be highlighted. */
const MIN_HIGHLIGHT_CHARS = 3;

/** Stable empty array: selectors must never return a fresh reference or
 *  useSyncExternalStore throws an infinite loop error. */
const EMPTY_MARKS: BookmarkEntry[] = [];

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
  bookmarked = false,
  onToggleBookmark,
  onOpenNotes,
}: {
  title: string;
  subtitle: string;
  indicator: string;
  onClose: () => void;
  bookmarked?: boolean;
  onToggleBookmark?: () => void;
  onOpenNotes?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-border bg-card px-3 py-2">
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
      {onToggleBookmark ? (
        <Button
          variant="outline"
          onClick={onToggleBookmark}
          aria-label={
            bookmarked ? "Remove bookmark from this page" : "Bookmark this page"
          }
          aria-pressed={bookmarked}
          className="h-11 w-11 shrink-0 border-border p-0"
        >
          <Bookmark
            className={`h-5 w-5 ${bookmarked ? "fill-volt text-volt" : ""}`}
            aria-hidden
          />
        </Button>
      ) : null}
      {onOpenNotes ? (
        <Button
          variant="outline"
          onClick={onOpenNotes}
          aria-label="Open bookmarks and highlights"
          className="h-11 w-11 shrink-0 border-border"
        >
          <NotebookPen className="h-5 w-5" aria-hidden />
        </Button>
      ) : null}
      <span className="shrink-0 font-head text-xs font-extrabold uppercase tracking-[0.2em] text-volt">
        {indicator}
      </span>
    </div>
  );
}

/** Compact honest date for the notes list. Never invents a date. */
function formatSavedDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const sameYear = d.getFullYear() === new Date().getFullYear();
    return d.toLocaleDateString(
      undefined,
      sameYear
        ? { month: "short", day: "numeric" }
        : { month: "short", day: "numeric", year: "numeric" }
    );
  } catch {
    return "";
  }
}

function NotesDialog({
  open,
  onOpenChange,
  unit,
  bookmarks,
  highlights,
  onJump,
  onDeleteBookmark,
  onDeleteHighlight,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Row unit for page numbers: "Page", "Ch." or "Part". */
  unit: string;
  bookmarks: BookmarkEntry[];
  highlights: Highlight[];
  onJump: (page: number) => void;
  onDeleteBookmark: (id: string) => void;
  onDeleteHighlight: (id: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl uppercase tracking-wide">
            Notes
          </DialogTitle>
          <DialogDescription>
            Bookmarks and highlights for this book, saved on this device only.
          </DialogDescription>
        </DialogHeader>

        <p className="font-head text-xs font-extrabold uppercase tracking-[0.2em] text-volt">
          Bookmarks
        </p>
        {bookmarks.length === 0 ? (
          <p className="border border-dashed border-border p-4 text-center text-sm leading-relaxed text-muted-foreground">
            No bookmarks yet. Tap the bookmark icon in the top bar to save the
            page you are on.
          </p>
        ) : (
          <div className="nice-scrollbar max-h-56 space-y-2 overflow-y-auto pr-1">
            {bookmarks.map((bm) => (
              <div key={bm.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onJump(bm.page);
                  }}
                  className="min-h-11 flex-1 border border-transparent p-2 text-left transition-colors hover:border-volt/60 hover:bg-secondary/40"
                >
                  <span className="flex items-center gap-2 font-head text-xs font-extrabold uppercase tracking-widest text-volt">
                    <Bookmark className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {bm.label ?? `${unit} ${bm.page}`}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {formatSavedDate(bm.at)}
                  </span>
                </button>
                <Button
                  variant="outline"
                  onClick={() => onDeleteBookmark(bm.id)}
                  aria-label="Delete bookmark"
                  className="h-11 w-11 shrink-0 border-border"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Separator />

        <p className="font-head text-xs font-extrabold uppercase tracking-[0.2em] text-volt">
          Highlights
        </p>
        {highlights.length === 0 ? (
          <p className="border border-dashed border-border p-4 text-center text-sm leading-relaxed text-muted-foreground">
            No highlights yet. Select any text while reading, then tap
            HIGHLIGHT.
          </p>
        ) : (
          <div className="nice-scrollbar max-h-64 space-y-2 overflow-y-auto pr-1">
            {highlights.map((h) => (
              <div key={h.id} className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onJump(h.page);
                  }}
                  className="min-h-11 flex-1 border border-transparent p-2 text-left transition-colors hover:border-volt/60 hover:bg-secondary/40"
                >
                  <span className="line-clamp-2 text-sm leading-relaxed">
                    &ldquo;{h.text}&rdquo;
                  </span>
                  <span className="mt-1 flex items-center gap-1.5 font-head text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                    <Highlighter className="h-3 w-3 shrink-0" aria-hidden />
                    {unit} {h.page} · {formatSavedDate(h.at)}
                  </span>
                </button>
                <Button
                  variant="outline"
                  onClick={() => onDeleteHighlight(h.id)}
                  aria-label="Delete highlight"
                  className="h-11 w-11 shrink-0 border-border"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface HighlightPopup {
  text: string;
  top: number;
  left: number;
}

/**
 * Read text selections inside the reading pane and expose a small
 * "HIGHLIGHT" popup near the selection. Works with mouse (mouseup) and
 * touch (touchend + delay). Everything is defensive: a selection API
 * failure must never break reading or page turning.
 */
function useSelectionHighlight({
  wrapperRef,
  paneRef,
  enabled,
  onSave,
}: {
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  paneRef: React.RefObject<HTMLDivElement | null>;
  enabled: boolean;
  onSave: (text: string) => void;
}) {
  const [popup, setPopup] = useState<HighlightPopup | null>(null);
  const pendingRef = useRef("");
  const timerRef = useRef<number | null>(null);
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const clearPopup = useCallback(() => {
    setPopup(null);
    pendingRef.current = "";
  }, []);

  const capture = useCallback(() => {
    if (!enabled) return;
    try {
      const pane = paneRef.current;
      const wrapper = wrapperRef.current;
      if (!pane || !wrapper) return;
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setPopup(null);
        return;
      }
      const text = sel.toString().replace(/\s+/g, " ").trim();
      if (text.length < MIN_HIGHLIGHT_CHARS || text.length > 300) {
        setPopup(null);
        return;
      }
      const range = sel.getRangeAt(0);
      if (!pane.contains(range.commonAncestorContainer)) {
        setPopup(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      if (!rect || (rect.width === 0 && rect.height === 0)) {
        setPopup(null);
        return;
      }
      // Position the popup above the selection, clamped inside the pane.
      const wrapRect = wrapper.getBoundingClientRect();
      const POPUP_W = 124;
      const POPUP_H = 44;
      const GAP = 8;
      const left = Math.min(
        Math.max(
          rect.left - wrapRect.left + rect.width / 2 - POPUP_W / 2,
          GAP
        ),
        Math.max(GAP, wrapRect.width - POPUP_W - GAP)
      );
      let top = rect.top - wrapRect.top - POPUP_H - GAP;
      if (top < GAP) top = rect.bottom - wrapRect.top + GAP;
      top = Math.max(
        GAP,
        Math.min(top, Math.max(GAP, wrapRect.height - POPUP_H - GAP))
      );
      pendingRef.current = text;
      setPopup({ text, top, left });
    } catch {
      setPopup(null);
    }
  }, [enabled, paneRef, wrapperRef]);

  const scheduleCapture = useCallback(
    (delay: number) => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        capture();
      }, delay);
    },
    [capture]
  );

  /* Hide the popup as soon as the selection collapses (tap elsewhere). */
  useEffect(() => {
    if (!enabled) return;
    const onSelectionChange = () => {
      try {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) setPopup(null);
      } catch {
        setPopup(null);
      }
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", onSelectionChange);
  }, [enabled, clearPopup]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const saveFromPopup = useCallback(() => {
    const text = pendingRef.current;
    clearPopup();
    try {
      window.getSelection()?.removeAllRanges();
    } catch {
      // Selection clearing is cosmetic; saving must not depend on it.
    }
    if (text) onSaveRef.current(text);
  }, [clearPopup]);

  /* Popup is only meaningful while the reading pane is live; readers render
     it inside their "ready" branch, so stale entries never show. */
  return {
    popup: enabled ? popup : null,
    scheduleCapture,
    clearPopup,
    saveFromPopup,
  };
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
  const addBookmark = useLibrary((s) => s.addBookmark);
  const removeBookmark = useLibrary((s) => s.removeBookmark);
  const addHighlight = useLibrary((s) => s.addHighlight);
  const removeHighlight = useLibrary((s) => s.removeHighlight);
  const bookmarks = useLibrary((s) => s.bookmarks[book.id] ?? EMPTY_MARKS);
  const highlights = useLibrary((s) => s.highlights[book.id] ?? EMPTY_MARKS);
  const online = useOnline();

  const [status, setStatus] = useState<GutenbergStatus>("loading");
  const [pages, setPages] = useState<string[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [notesOpen, setNotesOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const paneWrapperRef = useRef<HTMLDivElement | null>(null);

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

  const displayPage = pageIndex + 1;
  const currentBookmark = bookmarks.find((b) => b.page === displayPage);

  const toggleBookmark = useCallback(() => {
    const existing = bookmarks.find((b) => b.page === displayPage);
    if (existing) {
      removeBookmark(book.id, existing.id);
      return;
    }
    addBookmark(book.id, displayPage, `Page ${displayPage}`);
    toast.success(`Page ${displayPage} bookmarked`);
  }, [
    bookmarks,
    displayPage,
    removeBookmark,
    addBookmark,
    book.id,
  ]);

  const handleSaveHighlight = useCallback(
    (text: string) => {
      addHighlight(book.id, displayPage, text);
      toast.success("Highlight saved", {
        description: `Page ${displayPage}`,
      });
    },
    [addHighlight, book.id, displayPage]
  );

  const { popup, scheduleCapture, clearPopup, saveFromPopup } =
    useSelectionHighlight({
      wrapperRef: paneWrapperRef,
      paneRef: scrollRef,
      enabled: status === "ready",
      onSave: handleSaveHighlight,
    });

  /* A stale popup after a page turn would sit in the wrong spot. */
  useEffect(() => {
    clearPopup();
  }, [pageIndex, clearPopup]);

  useEffect(() => {
    if (status !== "ready") return;
    const onKey = (e: KeyboardEvent) => {
      // An open shadcn dialog owns the keyboard; do not turn pages behind it.
      if (document.querySelector('[data-state="open"][role="dialog"]')) return;
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
        bookmarked={status === "ready" && currentBookmark !== undefined}
        onToggleBookmark={status === "ready" ? toggleBookmark : undefined}
        onOpenNotes={status === "ready" ? () => setNotesOpen(true) : undefined}
      />

      {status === "loading" && (
        <div className="flex-1 overflow-hidden">
          <TextSkeleton label="Loading book..." />
        </div>
      )}

      {status === "ready" && (
        <div ref={paneWrapperRef} className="relative min-h-0 flex-1">
          <div
            ref={scrollRef}
            className="nice-scrollbar h-full overflow-y-auto"
            onMouseUp={() => scheduleCapture(0)}
            onTouchEnd={() => scheduleCapture(300)}
            onScroll={clearPopup}
          >
            <div
              className="mx-auto max-w-2xl px-4 py-6"
              style={{ fontSize: `${fontSize}px`, lineHeight: 1.7 }}
            >
              <p className="whitespace-pre-wrap">{pages[pageIndex]}</p>
            </div>
          </div>
          {popup ? (
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                saveFromPopup();
              }}
              style={{ top: popup.top, left: popup.left }}
              className="absolute z-10 h-11 w-[124px] border border-volt bg-background font-head text-[10px] font-extrabold uppercase tracking-[0.2em] text-volt hard-shadow-sm-volt"
              aria-label="Save highlight"
            >
              HIGHLIGHT
            </button>
          ) : null}
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

      <NotesDialog
        open={notesOpen}
        onOpenChange={setNotesOpen}
        unit="Page"
        bookmarks={bookmarks}
        highlights={highlights}
        onJump={(page) => goToPage(page - 1)}
        onDeleteBookmark={(id) => removeBookmark(book.id, id)}
        onDeleteHighlight={(id) => removeHighlight(book.id, id)}
      />
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
  const addBookmark = useLibrary((s) => s.addBookmark);
  const removeBookmark = useLibrary((s) => s.removeBookmark);
  const addHighlight = useLibrary((s) => s.addHighlight);
  const removeHighlight = useLibrary((s) => s.removeHighlight);
  const bookmarks = useLibrary((s) => s.bookmarks[book.id] ?? EMPTY_MARKS);
  const highlights = useLibrary((s) => s.highlights[book.id] ?? EMPTY_MARKS);
  const online = useOnline();

  const [phase, setPhase] = useState<OutlinePhase>("loading");
  const [outline, setOutline] = useState<StoredOutline | null>(null);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [chapterState, setChapterState] = useState<ChapterState>("loading");
  const [chapterText, setChapterText] = useState<string | null>(null);
  const [chapterReloadKey, setChapterReloadKey] = useState(0);
  const [outlineReloadKey, setOutlineReloadKey] = useState(0);
  const [notesOpen, setNotesOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const paneWrapperRef = useRef<HTMLDivElement | null>(null);

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

  const displayPage = chapterIndex + 1;
  const unit = book.companion ? "Part" : "Ch.";
  const currentBookmark = bookmarks.find((b) => b.page === displayPage);

  const toggleBookmark = useCallback(() => {
    const existing = bookmarks.find((b) => b.page === displayPage);
    if (existing) {
      removeBookmark(book.id, existing.id);
      return;
    }
    addBookmark(book.id, displayPage, `${unit} ${displayPage}`);
    toast.success(`${unit} ${displayPage} bookmarked`);
  }, [bookmarks, displayPage, unit, removeBookmark, addBookmark, book.id]);

  const handleSaveHighlight = useCallback(
    (text: string) => {
      addHighlight(book.id, displayPage, text);
      toast.success("Highlight saved", {
        description: `${unit} ${displayPage}`,
      });
    },
    [addHighlight, book.id, displayPage, unit]
  );

  const { popup, scheduleCapture, clearPopup, saveFromPopup } =
    useSelectionHighlight({
      wrapperRef: paneWrapperRef,
      paneRef: scrollRef,
      enabled: chapterState === "ready",
      onSave: handleSaveHighlight,
    });

  /* A stale popup after a chapter switch would sit in the wrong spot. */
  useEffect(() => {
    clearPopup();
  }, [chapterIndex, clearPopup]);

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

  const totalForPercent =
    outline?.chapterTitles.length ?? 0;
  const percent =
    totalForPercent > 0
      ? Math.round(((chapterIndex + 1) / totalForPercent) * 100)
      : 0;

  return (
    <>
      <ReaderTopBar
        title={book.title}
        subtitle={
          book.companion
            ? `AI COMPANION - ${book.author}`
            : (outline?.chapterTitles[chapterIndex] ?? "")
        }
        indicator={
          totalForPercent > 0
            ? `${book.companion ? "PART " : "CH. "}${chapterIndex + 1} / ${totalForPercent}`
            : ""
        }
        onClose={onClose}
        bookmarked={
          chapterState === "ready" && phase === "ready" && currentBookmark !== undefined
        }
        onToggleBookmark={
          chapterState === "ready" && phase === "ready" ? toggleBookmark : undefined
        }
        onOpenNotes={
          chapterState === "ready" && phase === "ready"
            ? () => setNotesOpen(true)
            : undefined
        }
      />

      {chapterState === "ready" && chapterText && (
        <div ref={paneWrapperRef} className="relative min-h-0 flex-1">
          <div
            ref={scrollRef}
            className="nice-scrollbar h-full overflow-y-auto"
            onMouseUp={() => scheduleCapture(0)}
            onTouchEnd={() => scheduleCapture(300)}
            onScroll={clearPopup}
          >
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
              {book.companion && totalForPercent > 0 ? (
                <p className="mt-8 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
                  AI reading companion: a walkthrough of the real book in fresh
                  words, not the publisher&apos;s text. The next part covers:
                  {" "}
                  {outline?.chapterTitles[chapterIndex + 1] ?? "the final wrap-up"}.
                </p>
              ) : null}
            </div>
          </div>
          {popup ? (
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                saveFromPopup();
              }}
              style={{ top: popup.top, left: popup.left }}
              className="absolute z-10 h-11 w-[124px] border border-volt bg-background font-head text-[10px] font-extrabold uppercase tracking-[0.2em] text-volt hard-shadow-sm-volt"
              aria-label="Save highlight"
            >
              HIGHLIGHT
            </button>
          ) : null}
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

      <NotesDialog
        open={notesOpen}
        onOpenChange={setNotesOpen}
        unit={unit}
        bookmarks={bookmarks}
        highlights={highlights}
        onJump={(page) => goToChapter(page - 1)}
        onDeleteBookmark={(id) => removeBookmark(book.id, id)}
        onDeleteHighlight={(id) => removeHighlight(book.id, id)}
      />
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
      // Escape inside an open shadcn dialog (notes) closes that dialog only.
      if (
        e.key === "Escape" &&
        document.querySelector('[data-state="open"][role="dialog"]')
      )
        return;
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
      {/* Sonner toasts for bookmark/highlight confirmations while reading. */}
      <Toaster position="bottom-center" />
    </div>
  );
}

export default LibraryReader;
