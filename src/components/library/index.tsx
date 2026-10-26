"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  BookOpen,
  ExternalLink,
  GraduationCap,
  Check,
  Library as LibraryIcon,
  Loader2,
  Search,
  Sparkles,
  TrendingUp,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  clearAll,
  deleteBookEverywhere,
  putMisc,
  putText,
} from "@/lib/book-cache";
import { extractPdfText } from "@/lib/pdf-text";
import LibraryReader from "@/components/library/reader";
import {
  useLibrary,
  type SearchResult,
  type ShelfMeta,
} from "@/components/library/store";

const GENRES = [
  "Fantasy",
  "Science fiction",
  "Mystery",
  "Romance",
  "Adventure",
  "Non fiction",
  "Self help",
  "History",
  "Philosophy",
  "Kids",
  "Other",
] as const;

interface GenerateResponse {
  book?: {
    id: string;
    title: string;
    author: string;
    description: string;
    chapterTitles: string[];
    mode: "original" | "companion";
  };
  error?: string;
}

interface SearchResponse {
  results?: SearchResult[];
  warning?: string;
  error?: string;
}

/** Legit places to read the real book when no free ebook exists. */
function FindRealCopyDialog({
  title,
  author,
}: {
  title: string;
  author: string;
}) {
  const term = `${title} ${author}`.trim();
  const links = [
    {
      name: "Archive.org — borrow free with an account",
      url: `https://archive.org/search?query=${encodeURIComponent(term)}&sin=TXT`,
      note: "Digital lending library: millions of real books you can borrow at no cost.",
    },
    {
      name: "Open Library",
      url: `https://openlibrary.org/search?q=${encodeURIComponent(term)}`,
      note: "Borrow modern ebooks and scanned copies, run by the Internet Archive.",
    },
    {
      name: "Google Books",
      url: `https://www.google.com/search?tbm=bks&q=${encodeURIComponent(term)}`,
      note: "Previews, store links and full views where the edition is free.",
    },
    {
      name: "Your public library (Libby / OverDrive)",
      url: `https://libbyapp.com/search/${encodeURIComponent(title)}`,
      note: "Free with a library card on phone, tablet or e-reader.",
    },
  ];
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-10 w-full border-border px-3 font-head text-[10px] font-extrabold uppercase tracking-[0.2em]"
        >
          <ExternalLink className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          Find the real book
        </Button>
      </DialogTrigger>
      <DialogContent className="border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl uppercase tracking-wide">
            Read the real book
          </DialogTitle>
          <DialogDescription>
            Free full copies of new books are rare. These are the legit ways
            to read &ldquo;{title}&rdquo;{author ? ` by ${author}` : ""} — all free or
            already included with a library card.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          {links.map((l, i) => (
            <div key={l.url}>
              {i > 0 ? <Separator className="my-1" /> : null}
              <button
                type="button"
                onClick={() =>
                  window.open(l.url, "_blank", "noopener,noreferrer")
                }
                className="w-full border border-transparent p-2 text-left transition-colors hover:border-volt/60 hover:bg-secondary/40"
              >
                <span className="flex items-center gap-2 font-head text-xs font-extrabold uppercase tracking-widest text-volt">
                  <LibraryIcon className="h-4 w-4 shrink-0" aria-hidden />
                  {l.name}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                  {l.note}
                </span>
              </button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------- result card ------------------------------ */

function ResultCard({
  result,
  onRead,
  onWrite,
}: {
  result: SearchResult;
  onRead: (r: SearchResult) => void;
  onWrite: (r: SearchResult) => void;
}) {
  const [imgState, setImgState] = useState<"loading" | "loaded" | "failed">(
    "loading"
  );
  const [trackedCover, setTrackedCover] = useState<string | null>(result.cover);
  const showImage = Boolean(result.cover) && imgState !== "failed";
  // Gutenberg books are always fully readable. Archive items are readable
  // only when search confirmed a public domain text (downloadable). Modern
  // lending-restricted scans get the honest NO FREE EBOOK state, with two
  // ways forward that both work: the AI reading companion (readable right
  // here) and legit places to get the real book.
  const isFree =
    result.source === "gutenberg" ||
    (result.source === "archive" && result.downloadable !== false);

  // Reset the banner fallback when this card switches to a different cover
  // (new search reusing the same component instance). Adjusting state during
  // render is the React recommended way to derive a reset from changed props.
  if (trackedCover !== result.cover) {
    setTrackedCover(result.cover);
    setImgState("loading");
  }

  // If a cover CDN hangs (slow network, rate limiting), the styled banner
  // underneath takes over after a few seconds instead of leaving a blank box.
  useEffect(() => {
    if (!result.cover || imgState === "loaded") return;
    const timer = setTimeout(() => {
      setImgState((s) => (s === "loaded" ? s : "failed"));
    }, 5000);
    return () => clearTimeout(timer);
  }, [result.cover, imgState]);

  return (
    <Card className="flex flex-col overflow-hidden border-border bg-card">
      {/* The styled banner always renders underneath the cover image, so a
          slow or blocked cover CDN can never leave the card blank. */}
      <div className="relative h-56 w-full border-b border-border bg-secondary">
        <div className="absolute inset-0 flex flex-col justify-between p-4">
          <BookOpen className="h-6 w-6 text-muted-foreground" aria-hidden />
          <div>
            <p className="font-display text-xl uppercase leading-tight tracking-wide">
              {result.title}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {result.author}
            </p>
          </div>
        </div>
        {showImage ? (
          <img
            src={result.cover as string}
            alt={`Cover of ${result.title}`}
            className="absolute inset-0 h-full w-full object-cover"
            referrerPolicy="no-referrer"
            onLoad={() => setImgState("loaded")}
            onError={() => setImgState("failed")}
          />
        ) : null}
      </div>
      <CardContent className="flex flex-1 flex-col gap-2 p-4">
        <p className="font-head text-sm font-bold leading-snug">{result.title}</p>
        <p className="text-xs text-muted-foreground">
          {result.author}
          {result.year ? ` - ${result.year}` : ""}
        </p>
        {isFree ? (
          <Badge variant="outline" className="border-volt text-volt">
            {result.source === "archive" ? "ARCHIVE.ORG FULL BOOK" : "FREE FULL BOOK"}
          </Badge>
        ) : (
          <Badge variant="outline" className="border-border text-muted-foreground">
            NO FREE EBOOK
          </Badge>
        )}
        {isFree ? (
          <Button
            onClick={() => onRead(result)}
            className="mt-auto h-11 px-4 font-head text-xs font-extrabold uppercase tracking-[0.2em]"
          >
            READ NOW
          </Button>
        ) : (
          <div className="mt-auto flex flex-col gap-2">
            <Button
              onClick={() => onWrite(result)}
              className="h-11 bg-volt px-4 font-head text-xs font-extrabold uppercase tracking-[0.2em] text-black hover:bg-volt/90"
            >
              READ THE COMPANION
            </Button>
            <p className="text-[11px] leading-snug text-muted-foreground">
              A full walkthrough of the real book, readable right here.
            </p>
            <FindRealCopyDialog title={result.title} author={result.author} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* -------------------------------- shelf card ------------------------------ */

function ShelfCard({
  book,
  onContinue,
}: {
  book: ShelfMeta;
  onContinue: (b: ShelfMeta) => void;
}) {
  const removeBook = useLibrary((s) => s.removeBook);
  const { toast } = useToast();
  const percent = Math.round(book.progress * 100);

  return (
    <Card className="flex flex-col border-border bg-card">
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex h-36 flex-col justify-between border border-border bg-secondary p-3">
          <p className="font-display text-lg uppercase leading-tight tracking-wide">
            {book.title}
          </p>
          <div className="flex items-end justify-between gap-2">
            <p className="truncate text-xs text-muted-foreground">{book.author}</p>
            <Badge
              variant="outline"
              className={`shrink-0 ${
                book.source === "gutenberg" || book.source === "archive"
                  ? "border-volt text-volt"
                  : book.source === "personal"
                    ? "border-ember text-ember"
                    : book.companion
                      ? "border-volt text-volt"
                      : "border-border text-muted-foreground"
              }`}
            >
              {book.source === "gutenberg" || book.source === "archive"
                ? "FREE"
                : book.source === "personal"
                  ? "MY BOOK"
                  : book.companion
                    ? "AI COMPANION"
                    : "FORGE"}
            </Badge>
          </div>
        </div>

        <div>
          <div className="h-1.5 w-full bg-secondary" aria-hidden>
            <div className="h-1.5 bg-volt" style={{ width: `${percent}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{percent}% read</span>
            <span className="truncate">
              {book.lastReadAt
                ? `Last read ${formatDistanceToNow(new Date(book.lastReadAt), {
                    addSuffix: true,
                  })}`
                : "Not started"}
            </span>
          </div>
        </div>

        {book.offlineReady && (
          <Badge variant="outline" className="border-volt text-volt">
            <Check className="h-3 w-3" aria-hidden /> OFFLINE READY
          </Badge>
        )}

        <div className="mt-auto flex gap-2">
          <Button
            onClick={() => onContinue(book)}
            className="h-11 min-w-0 flex-1 bg-volt px-3 font-head text-xs font-extrabold uppercase tracking-[0.2em] text-black hover:bg-volt/90"
          >
            Continue reading
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="h-11 w-11 shrink-0 border-border text-destructive hover:text-destructive"
                aria-label={`Remove ${book.title} from your shelf`}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display text-2xl uppercase tracking-wide">
                  Remove book
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Remove &quot;{book.title}&quot; from your shelf? The saved text and
                  reading progress on this device are deleted too. This cannot be
                  undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep it</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-white hover:bg-destructive/90"
                  onClick={async () => {
                    try {
                      await deleteBookEverywhere(book.id);
                    } catch {
                      // Shelf removal still applies even if cleanup fails.
                    }
                    removeBook(book.id);
                    toast({
                      title: "Book removed",
                      description: `"${book.title}" was removed from your shelf.`,
                    });
                  }}
                >
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

/* --------------------------------- the hub -------------------------------- */

export default function LibraryHub() {
  const addBook = useLibrary((s) => s.addBook);
  const shelf = useLibrary((s) => s.shelf);
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searchWarning, setSearchWarning] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [arrivalsMode, setArrivalsMode] = useState(false);
  const [loadingArrivals, setLoadingArrivals] = useState(false);

  const [genTitle, setGenTitle] = useState("");
  const [genGenre, setGenGenre] = useState<string>("Fantasy");
  const [genBlurb, setGenBlurb] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [reading, setReading] = useState<ShelfMeta | null>(null);
  const closeReader = useCallback(() => setReading(null), []);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  /** Bring the user's own study book onto the shelf, fully on device. */
  const runUpload = async (file: File) => {
    setUploadError(null);
    const name = file.name.trim();
    const lower = name.toLowerCase();
    const isTxt = lower.endsWith(".txt") || lower.endsWith(".md");
    const isPdf = lower.endsWith(".pdf");
    if (!isTxt && !isPdf) {
      setUploadError(
        "Only .txt, .md and .pdf files are supported right now."
      );
      return;
    }
    if (file.size > 40 * 1024 * 1024) {
      setUploadError(
        "That file is over 40 MB. Use a smaller file or split it first."
      );
      return;
    }
    setUploading(true);
    try {
      let text: string;
      if (isPdf) {
        text = await extractPdfText(file);
      } else {
        text = (await file.text()).replace(/\r\n/g, "\n");
      }
      if (text.trim().length < 40) {
        setUploadError("That file has almost no readable text in it.");
        return;
      }
      const title =
        name
          .replace(/\.(txt|md|pdf)$/i, "")
          .replace(/[_-]+/g, " ")
          .trim() || "My study book";
      const id = `mine-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
      await putText(id, text);
      const meta: ShelfMeta = {
        id,
        title,
        author: "Personal upload",
        cover: null,
        source: "personal",
        chapterCount: null,
        addedAt: new Date().toISOString(),
        progress: 0,
        lastReadAt: null,
        offlineReady: true,
      };
      addBook(meta);
      const merged =
        useLibrary.getState().shelf.find((b) => b.id === id) ?? meta;
      setReading(merged);
      toast({
        title: "Book added",
        description: `"${title}" is on your shelf and ready to read offline.`,
      });
    } catch (e) {
      setUploadError(
        e instanceof Error
          ? e.message
          : "Could not read that file. Try a different one."
      );
    } finally {
      setUploading(false);
    }
  };

  const runSearch = async (rawQuery?: string) => {
    const q = (rawQuery ?? query).trim();
    if (q.length < 2) {
      setSearchError("Type at least 2 characters to search.");
      return;
    }
    if (rawQuery !== undefined) setQuery(rawQuery);
    setSearching(true);
    setArrivalsMode(false);
    setSearchError(null);
    setSearchWarning(null);
    setResults(null);
    try {
      const res = await fetch(`/api/books/search?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as SearchResponse;
      if (!res.ok) {
        setSearchError(data.error ?? "Search failed. Try again in a moment.");
        setResults([]);
        return;
      }
      setResults(data.results ?? []);
      setSearchWarning(data.warning ?? null);
    } catch {
      setSearchError("Search failed. Check your connection and try again.");
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  /** Pull whatever Project Gutenberg released most recently, live. */
  const runArrivals = async () => {
    setLoadingArrivals(true);
    setSearching(false);
    setArrivalsMode(true);
    setSearchError(null);
    setSearchWarning(null);
    setQuery("");
    setResults(null);
    try {
      const res = await fetch("/api/books/search?mode=new");
      const data = (await res.json()) as SearchResponse;
      if (!res.ok) {
        setSearchError(data.error ?? "Could not load new arrivals. Try again in a moment.");
        setResults([]);
        return;
      }
      setResults(data.results ?? []);
      setSearchWarning(null);
    } catch {
      setSearchError("Could not load new arrivals. Check your connection and try again.");
      setResults([]);
    } finally {
      setLoadingArrivals(false);
    }
  };

  const openFromSearch = (result: SearchResult) => {
    const meta: ShelfMeta = {
      id: result.id,
      title: result.title,
      author: result.author,
      cover: result.cover,
      source: result.source === "archive" ? "archive" : "gutenberg",
      chapterCount: null,
      addedAt: new Date().toISOString(),
      progress: 0,
      lastReadAt: null,
      offlineReady: false,
    };
    addBook(meta);
    const merged =
      useLibrary.getState().shelf.find((b) => b.id === meta.id) ?? meta;
    setReading(merged);
  };

  /** One tap on READ THE COMPANION: build the readable walkthrough now. */
  const writeWithAi = (result: SearchResult) => {
    setGenerateError(null);
    void runGenerate(result.title, {
      mode: "companion",
      author: result.author,
    });
  };

  const runGenerate = async (
    titleOverride?: string,
    opts?: { mode?: "original" | "companion"; author?: string }
  ) => {
    const mode = opts?.mode ?? "original";
    const author = opts?.author;
    const title = (titleOverride ?? genTitle).trim();
    if (title.length === 0) {
      setGenerateError("Give the book a title first.");
      return;
    }
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch("/api/books/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          genre: genGenre,
          blurb: genBlurb.trim() || undefined,
          author,
          mode,
        }),
      });
      const data = (await res.json()) as GenerateResponse;
      if (!res.ok || !data.book) {
        setGenerateError(data.error ?? "Generation failed. Try again in a moment.");
        return;
      }
      const b = data.book;
      void putMisc(`${b.id}:outline`, {
        description: b.description,
        chapterTitles: b.chapterTitles,
        genre: genGenre,
        mode: b.mode,
        author: author,
      }).catch(() => {});
      const meta: ShelfMeta = {
        id: b.id,
        title: b.title,
        author: b.author,
        cover: null,
        source: "generated",
        chapterCount: b.chapterTitles.length,
        addedAt: new Date().toISOString(),
        progress: 0,
        lastReadAt: null,
        offlineReady: false,
        description: b.description,
        companion: b.mode === "companion",
      };
      addBook(meta);
      const merged =
        useLibrary.getState().shelf.find((x) => x.id === b.id) ?? meta;
      setGenBlurb("");
      setReading(merged);
      toast({
        title: b.mode === "companion" ? "Companion ready" : "Book ready",
        description:
          b.mode === "companion"
            ? `The walkthrough of "${b.title}" is ready. Every part is readable in order.`
            : `"${b.title}" was written and added to your shelf.`,
      });
    } catch {
      setGenerateError("Generation failed. Check your connection and try again.");
    } finally {
      setGenerating(false);
    }
  };

  const resetLibrary = useLibrary((s) => s.resetLibrary);

  const handleReset = async () => {
    try {
      await clearAll();
    } catch {
      // The store reset still applies even if IndexedDB cleanup fails.
    }
    resetLibrary();
    toast({
      title: "Library reset",
      description: "Your shelf, saved books and reading progress were cleared.",
    });
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10">
      {/* Header */}
      <header>
        <h1 className="font-display text-5xl uppercase tracking-wide">Library</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Type the name of any book: thousand year old epics, century old
          classics, study texts or whatever Gutenberg published today. If a
          free copy exists you can read it here. If it does not, FORGE writes
          an original one for you.
        </p>
      </header>

      {/* Search */}
      <section aria-label="Search books" className="space-y-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4 sm:p-6">
            <form
              className="flex flex-col gap-3 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                void runSearch();
              }}
            >
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Book title, e.g. Moby Dick"
                aria-label="Book title to search"
                className="h-12 flex-1 border-border bg-background text-base"
              />
              <Button
                type="submit"
                disabled={searching}
                className="h-12 bg-volt px-6 font-head text-xs font-extrabold uppercase tracking-[0.2em] text-black hover:bg-volt/90"
              >
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Search className="h-4 w-4" aria-hidden />
                )}
                Search
              </Button>
            </form>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Browse the built-in classics shelf:
              </span>
              {["philosophy", "mystery", "adventure", "children", "horror", "science", "history", "poetry", "study", "self help"].map(
                (g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      void runSearch(g);
                    }}
                    className="h-10 border border-border bg-background px-3 font-head text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground transition-colors hover:border-volt hover:text-volt"
                  >
                    {g}
                  </button>
                )
              )}
              <button
                type="button"
                onClick={() => {
                  void runArrivals();
                }}
                disabled={loadingArrivals || searching}
                className="flex h-10 items-center gap-1.5 border border-volt bg-volt/10 px-3 font-head text-[10px] font-extrabold uppercase tracking-widest text-volt transition-colors hover:bg-volt hover:text-black disabled:opacity-50"
              >
                {loadingArrivals ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                )}
                New arrivals, live
              </button>
            </div>
          </CardContent>
        </Card>

        {searchError && (
          <p className="text-sm font-bold text-destructive" role="alert">
            {searchError}
          </p>
        )}
        {searchWarning && !searchError && (
          <p className="text-sm text-ember" role="status">
            {searchWarning}
          </p>
        )}

        {searching && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="overflow-hidden border-border bg-card">
                <Skeleton className="h-56 w-full rounded-none" />
                <CardContent className="space-y-2 p-4">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {loadingArrivals && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="overflow-hidden border-border bg-card">
                <Skeleton className="h-56 w-full rounded-none" />
                <CardContent className="space-y-2 p-4">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!searching && !loadingArrivals && arrivalsMode && results && results.length > 0 && (
          <p className="flex items-center gap-2 text-sm text-volt" role="status">
            <TrendingUp className="h-4 w-4" aria-hidden />
            The newest free books on Project Gutenberg, pulled live just now.
            New titles appear here as they are released.
          </p>
        )}

        {!searching && !loadingArrivals && results && results.length > 0 && (
          <div className="nice-scrollbar max-h-96 overflow-y-auto pr-1">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {results.map((r) => (
                <ResultCard
                  key={r.id}
                  result={r}
                  onRead={openFromSearch}
                  onWrite={writeWithAi}
                />
              ))}
            </div>
          </div>
        )}

        {!searching && !loadingArrivals && results && results.length === 0 && !searchError && (
          <div className="flex flex-col items-center gap-3 border border-dashed border-border bg-secondary/30 px-6 py-10 text-center">
            <BookOpen className="h-6 w-6 text-volt" aria-hidden />
            <p className="max-w-md text-sm text-muted-foreground">
              No free copy of &quot;{query.trim()}&quot; showed up. New books
              are usually copyrighted, so free full copies are rare. Two
              options that always work: open the readable AI companion of it,
              or borrow the real book from Archive.org or your library.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                onClick={() => {
                  setGenTitle(query.trim());
                  void runGenerate(query.trim(), { mode: "companion" });
                }}
                disabled={generating}
                className="h-11 bg-volt px-5 font-head text-xs font-extrabold uppercase tracking-[0.2em] text-black hover:bg-volt/90"
              >
                {generating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <BookOpen className="mr-2 h-4 w-4" aria-hidden />
                )}
                Read the AI companion
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  window.location.hash = "#/learn";
                }}
                className="h-11 border-volt px-5 font-head text-xs font-extrabold uppercase tracking-[0.2em] text-volt hover:bg-volt hover:text-black"
              >
                <GraduationCap className="mr-2 h-4 w-4" aria-hidden />
                Study the subject instead
              </Button>
            </div>
          </div>
        )}

        {!searching && !loadingArrivals && results === null && (
          <div className="flex flex-col items-center gap-3 border border-dashed border-border bg-secondary/30 px-6 py-10 text-center">
            <BookOpen className="h-6 w-6 text-volt" aria-hidden />
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Every book you open is saved on your device and stays readable
              offline. Search a title above to find a free full copy.
            </p>
          </div>
        )}
      </section>

      {/* Your own study books */}
      <section aria-label="Upload your own book">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 font-display text-2xl uppercase tracking-wide">
              <Upload className="h-5 w-5 text-volt" aria-hidden />
              YOUR OWN STUDY BOOK
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Reading a textbook or course notes that no free catalog carries?
              Bring the file from your device: .txt, .md or .pdf. It never
              leaves this device, works offline and keeps your progress like
              any other book on the shelf.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.pdf,text/plain,application/pdf"
              className="hidden"
              aria-label="Book file to upload"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void runUpload(f);
              }}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              variant="outline"
              className="h-11 border-border bg-background px-5 font-head text-xs font-extrabold uppercase tracking-[0.2em] hover:bg-secondary"
            >
              {uploading ? (
                <Loader2
                  className="mr-2 h-4 w-4 animate-spin"
                  aria-hidden
                />
              ) : (
                <Upload className="mr-2 h-4 w-4" aria-hidden />
              )}
              {uploading ? "READING FILE" : "UPLOAD A BOOK FILE"}
            </Button>
            {uploadError && (
              <p className="max-w-2xl text-sm text-ember" role="alert">
                {uploadError}
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Generate */}
      <section aria-label="Generate an original book">
        <Card id="forge-generate-panel" className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-2xl uppercase tracking-wide">
              <Sparkles className="h-5 w-5 text-volt" aria-hidden />
              Can&apos;t find it? Create it.
            </CardTitle>
            <p className="text-sm leading-relaxed text-muted-foreground">
              FORGE writes an original book for you: ten chapters, ready to read
              and save offline.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="forge-gen-title"
                  className="font-head text-xs font-extrabold uppercase tracking-[0.2em] text-muted-foreground"
                >
                  Title
                </label>
                <Input
                  id="forge-gen-title"
                  value={genTitle}
                  onChange={(e) => setGenTitle(e.target.value)}
                  placeholder="The title you could not find"
                  className="h-11 border-border bg-background"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="forge-gen-genre"
                  className="font-head text-xs font-extrabold uppercase tracking-[0.2em] text-muted-foreground"
                >
                  Genre
                </label>
                <Select value={genGenre} onValueChange={(v) => setGenGenre(v)}>
                  <SelectTrigger
                    id="forge-gen-genre"
                    className="h-11 w-full border-border bg-background"
                  >
                    <SelectValue placeholder="Pick a genre" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENRES.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="forge-gen-blurb"
                className="font-head text-xs font-extrabold uppercase tracking-[0.2em] text-muted-foreground"
              >
                Blurb (optional)
              </label>
              <Textarea
                id="forge-gen-blurb"
                value={genBlurb}
                onChange={(e) => setGenBlurb(e.target.value)}
                placeholder="Any notes for the author: setting, characters, what should happen..."
                className="min-h-24 border-border bg-background"
              />
            </div>
            {generateError && (
              <p className="text-sm font-bold text-destructive" role="alert">
                {generateError}
              </p>
            )}
            <Button
              onClick={() => void runGenerate()}
              disabled={generating}
              className="h-11 bg-volt px-6 font-head text-xs font-extrabold uppercase tracking-[0.2em] text-black hover:bg-volt/90"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden />
              )}
              {generating ? "Writing your book..." : "Generate book"}
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Shelf */}
      <section aria-label="Your shelf" className="space-y-4">
        <h2 className="font-display text-3xl uppercase tracking-wide">
          Your shelf
        </h2>

        {shelf.length === 0 ? (
          <Card className="border-dashed border-border bg-card">
            <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
              <BookOpen className="h-6 w-6 text-volt" aria-hidden />
              <p className="text-sm text-muted-foreground">
                Your shelf is empty. Search a title above or generate an
                original book.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="nice-scrollbar max-h-96 overflow-y-auto pr-1">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {shelf.map((b) => (
                <ShelfCard key={b.id} book={b} onContinue={setReading} />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Danger zone */}
      <section aria-label="Library data">
        <Card className="border-destructive/40 bg-card">
          <CardContent className="flex flex-col items-start justify-between gap-4 p-4 sm:flex-row sm:items-center sm:p-6">
            <div>
              <h3 className="font-head text-xs font-extrabold uppercase tracking-[0.2em] text-destructive">
                Reset library data
              </h3>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Clears your shelf, every saved book and all reading progress on
                this device. Your XP stays.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="h-11 shrink-0 px-4 font-head text-xs font-extrabold uppercase tracking-[0.2em]"
                >
                  Reset library
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-display text-2xl uppercase tracking-wide">
                    Reset library data
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This wipes your shelf, every saved book, all reading
                    progress and the offline copies on this device. This cannot
                    be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep my books</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-white hover:bg-destructive/90"
                    onClick={() => void handleReset()}
                  >
                    Reset everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </section>

      {reading && (
        <LibraryReader book={reading} onClose={closeReader} />
      )}
    </div>
  );
}
