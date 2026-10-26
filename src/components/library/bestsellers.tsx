"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ExternalLink,
  Library as LibraryIcon,
  Loader2,
  Search,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  BESTSELLERS,
  BESTSELLER_CATEGORIES,
  bestsellerBorrowLinks,
  bestsellerCoverUrl,
  type BestsellerBook,
  type BestsellerCategory,
} from "@/lib/bestsellers";

function BorrowDialog({ book }: { book: BestsellerBook }) {
  const links = bestsellerBorrowLinks(book);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-10 w-full border-border px-3 font-head text-[10px] font-extrabold uppercase tracking-[0.2em]"
        >
          <ExternalLink className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          Borrow the real book
        </Button>
      </DialogTrigger>
      <DialogContent className="border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl uppercase tracking-wide">
            Borrow the real book
          </DialogTitle>
          <DialogDescription>
            These are legit places to read &ldquo;{book.title}&rdquo; by{" "}
            {book.author}, all free or already included with a library card.
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

function BestsellerCard({
  book,
  generating,
  onDeepDive,
}: {
  book: BestsellerBook;
  generating: boolean;
  onDeepDive: (book: BestsellerBook) => void;
}) {
  const cover = bestsellerCoverUrl(book);
  const [imgFailed, setImgFailed] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [trackedId, setTrackedId] = useState(book.id);
  const showImage = Boolean(cover) && !imgFailed;

  // Reset cover state when the card is reused for another book. Adjusting
  // state during render is the React recommended way to derive a reset from
  // changed props (same pattern the search result cards use).
  if (trackedId !== book.id) {
    setTrackedId(book.id);
    setImgFailed(false);
    setImgLoaded(false);
  }

  // If a cover CDN hangs, the styled banner underneath takes over instead
  // of leaving a blank box (same protection the search cards use).
  useEffect(() => {
    if (!cover || imgLoaded) return;
    const timer = setTimeout(() => setImgFailed(true), 6000);
    return () => clearTimeout(timer);
  }, [cover, imgLoaded]);

  return (
    <Card className="flex flex-col overflow-hidden border-border bg-card">
      <div className="relative h-52 w-full border-b border-border bg-secondary">
        {/* Styled banner always renders underneath the cover image, so a slow
            or missing cover can never leave the card blank. */}
        <div className="absolute inset-0 flex flex-col justify-between p-4">
          <div className="flex items-center justify-between">
            <BookOpen className="h-5 w-5 text-muted-foreground" aria-hidden />
            <Star
              className="h-4 w-4 fill-volt text-volt"
              aria-label="Bestseller"
            />
          </div>
          <div>
            <p className="font-display text-xl uppercase leading-tight tracking-wide">
              {book.title}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{book.author}</p>
          </div>
        </div>
        {showImage ? (
          <img
            src={cover as string}
            alt={`Cover of ${book.title}`}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
              imgLoaded ? "opacity-100" : "opacity-0"
            }`}
            referrerPolicy="no-referrer"
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgFailed(true)}
          />
        ) : null}
      </div>
      <CardContent className="flex flex-1 flex-col gap-2 p-4">
        <p className="font-head text-sm font-bold leading-snug">{book.title}</p>
        <p className="text-xs text-muted-foreground">
          {book.author} - {book.year}
        </p>
        <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
          {book.blurb}
        </p>
        <Badge variant="outline" className="w-fit border-volt text-volt">
          BESTSELLER
        </Badge>
        <div className="mt-auto flex flex-col gap-2 pt-1">
          <Button
            onClick={() => onDeepDive(book)}
            disabled={generating}
            className="h-11 bg-volt px-4 font-head text-xs font-extrabold uppercase tracking-[0.2em] text-black hover:bg-volt/90"
          >
            {generating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <BookOpen className="mr-2 h-4 w-4" aria-hidden />
            )}
            {generating ? "Writing your guide..." : "Read the deep dive"}
          </Button>
          <p className="text-[11px] leading-snug text-muted-foreground">
            A full walkthrough of the real book, readable right here.
          </p>
          <BorrowDialog book={book} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function BestsellersShelf({
  generating,
  onDeepDive,
}: {
  generating: boolean;
  onDeepDive: (book: BestsellerBook) => void;
}) {
  const [category, setCategory] = useState<BestsellerCategory | "all">("habits");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BESTSELLERS.filter((b) => {
      const catOk = category === "all" || b.category === category;
      const qOk =
        q.length === 0 ||
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q);
      return catOk && qOk;
    });
  }, [category, query]);

  return (
    <section aria-label="Bestsellers" className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 font-display text-3xl uppercase tracking-wide">
          <Star className="h-5 w-5 fill-volt text-volt" aria-hidden />
          Bestsellers
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          The famous modern books everyone recommends, from Atomic Habits to
          Rich Dad Poor Dad. New titles are copyrighted, so FORGE gives you two
          honest ways in: a readable Deep Dive walkthrough built for each book,
          or legal free borrow links to the real thing.
        </p>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            {BESTSELLER_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                aria-pressed={category === c.id}
                className={`h-10 border px-3 font-head text-[10px] font-extrabold uppercase tracking-widest transition-colors ${
                  category === c.id
                    ? "border-volt bg-volt text-black"
                    : "border-border bg-background text-muted-foreground hover:border-volt hover:text-volt"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter the shelf by title or author"
              aria-label="Filter bestsellers by title or author"
              className="h-11 border-border bg-background pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 border border-dashed border-border bg-secondary/30 px-6 py-10 text-center">
          <BookOpen className="h-6 w-6 text-volt" aria-hidden />
          <p className="max-w-md text-sm text-muted-foreground">
            Nothing matches &quot;{query.trim()}&quot; on this shelf. Try the
            search above for any other book, or clear the filter.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setQuery("");
              setCategory("all");
            }}
            className="h-11 border-volt px-5 font-head text-xs font-extrabold uppercase tracking-[0.2em] text-volt hover:bg-volt hover:text-black"
          >
            Show all bestsellers
          </Button>
        </div>
      ) : (
        <div className="nice-scrollbar max-h-[42rem] overflow-y-auto pr-1">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((b) => (
              <BestsellerCard
                key={b.id}
                book={b}
                generating={generating}
                onDeepDive={onDeepDive}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
