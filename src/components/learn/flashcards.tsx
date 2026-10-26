"use client";

import { useRef, useState } from "react";
import {
  Check,
  Eye,
  Layers,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  todayKey,
  useFlashcards,
  type Deck,
  type FcRating,
} from "@/lib/flashcards-store";

const LABEL = "font-head text-xs font-extrabold uppercase tracking-[0.2em]";

const PRIMARY =
  "bg-volt text-black hard-shadow-sm-volt hover:bg-volt/90 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none";

interface DeckRow {
  front: string;
  back: string;
}

interface SessionState {
  deckId: string;
  deckName: string;
  queue: string[];
  totalSteps: number;
  done: number;
  revealed: boolean;
}

interface SessionSummary {
  deckId: string;
  deckName: string;
  reviewed: number;
  xp: number;
}

const RATING_BUTTONS: {
  rating: FcRating;
  label: string;
  className: string;
}[] = [
  {
    rating: "again",
    label: "Again",
    className:
      "h-12 border-ember/60 bg-background font-head text-xs font-extrabold uppercase tracking-[0.2em] text-ember hover:bg-ember/10 hover:text-ember",
  },
  {
    rating: "hard",
    label: "Hard",
    className:
      "h-12 border-border bg-background font-head text-xs font-extrabold uppercase tracking-[0.2em] hover:bg-secondary",
  },
  {
    rating: "good",
    label: "Good",
    className: cn(PRIMARY, "h-12 px-4 font-head text-xs font-extrabold uppercase tracking-[0.2em]"),
  },
  {
    rating: "easy",
    label: "Easy",
    className:
      "h-12 border-volt/60 bg-background font-head text-xs font-extrabold uppercase tracking-[0.2em] text-volt hover:bg-volt/10 hover:text-volt",
  },
];

export default function FlashcardsSection() {
  const { toast } = useToast();
  const decks = useFlashcards((s) => s.decks);
  const createDeck = useFlashcards((s) => s.createDeck);
  const rateCard = useFlashcards((s) => s.rateCard);
  const deleteDeck = useFlashcards((s) => s.deleteDeck);
  const awardSessionXp = useFlashcards((s) => s.awardSessionXp);

  const today = todayKey();

  // Manual deck builder
  const [newName, setNewName] = useState("");
  const [rows, setRows] = useState<DeckRow[]>([{ front: "", back: "" }]);

  // Review session (local, per visit)
  const [session, setSession] = useState<SessionState | null>(null);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const reviewedIdsRef = useRef<Set<string>>(new Set());

  const totalDue = decks.reduce(
    (acc, deck) => acc + deck.cards.filter((c) => c.due <= today).length,
    0
  );

  const sessionDeck = session
    ? decks.find((d) => d.id === session.deckId)
    : undefined;
  const currentCard = sessionDeck
    ? sessionDeck.cards.find((c) => c.id === session?.queue[0])
    : undefined;

  const startSession = (deckId: string) => {
    const deck = decks.find((d) => d.id === deckId);
    if (!deck) return;
    const dueIds = deck.cards.filter((c) => c.due <= today).map((c) => c.id);
    if (dueIds.length === 0) {
      toast({
        title: "Nothing due",
        description: "Every card in this deck is scheduled for a later day.",
      });
      return;
    }
    reviewedIdsRef.current = new Set();
    setSummary(null);
    setSession({
      deckId,
      deckName: deck.name,
      queue: dueIds,
      totalSteps: dueIds.length,
      done: 0,
      revealed: false,
    });
  };

  const endSession = () => {
    setSession(null);
    setSummary(null);
    reviewedIdsRef.current = new Set();
  };

  const handleRate = (rating: FcRating) => {
    if (!session || !session.revealed || !currentCard) return;
    const cardId = currentCard.id;

    rateCard(session.deckId, cardId, rating);

    const isNew = !reviewedIdsRef.current.has(cardId);
    if (isNew) reviewedIdsRef.current.add(cardId);
    const uniqueCount = reviewedIdsRef.current.size;

    const isAgain = rating === "again";
    const nextQueue = isAgain
      ? [...session.queue.slice(1), cardId]
      : session.queue.slice(1);
    const nextDone = session.done + 1;

    if (nextQueue.length === 0) {
      const xp = awardSessionXp(session.deckId, uniqueCount);
      setSummary({
        deckId: session.deckId,
        deckName: session.deckName,
        reviewed: uniqueCount,
        xp,
      });
      setSession(null);
      if (xp > 0) {
        toast({
          title: "Session complete",
          description: `+${xp} XP added to your profile.`,
        });
      }
      return;
    }

    setSession({
      ...session,
      queue: nextQueue,
      totalSteps: session.totalSteps + (isAgain ? 1 : 0),
      done: nextDone,
      revealed: false,
    });
  };

  const canCreate =
    newName.trim().length > 0 &&
    rows.some((r) => r.front.trim().length > 0 && r.back.trim().length > 0);

  const handleCreate = () => {
    if (!canCreate) return;
    const name = newName.trim();
    createDeck(name, name, rows);
    setNewName("");
    setRows([{ front: "", back: "" }]);
    toast({
      title: "Deck created",
      description: `${name} is ready. New cards are due immediately.`,
    });
  };

  const updateRow = (index: number, patch: Partial<DeckRow>) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  const summaryDeck = summary
    ? decks.find((d) => d.id === summary.deckId)
    : undefined;
  const summaryDueLeft = summaryDeck
    ? summaryDeck.cards.filter((c) => c.due <= today).length
    : 0;

  return (
    <section aria-label="Flashcards" className="space-y-4">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-3xl tracking-wide">FLASHCARDS</h2>
        <span className={cn(LABEL, "text-muted-foreground")}>
          {decks.length} decks · {totalDue} due today
        </span>
      </div>

      {/* Review session: the queue replaces the deck list for focus */}
      {session && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Layers className="h-4 w-4 shrink-0 text-volt" aria-hidden />
              <h3 className={cn(LABEL, "truncate")}>{session.deckName}</h3>
            </div>
            <Button
              variant="outline"
              onClick={endSession}
              className="h-11 shrink-0 border-border bg-background px-4 font-head text-xs font-extrabold uppercase tracking-[0.2em] hover:bg-secondary"
            >
              <X className="mr-2 h-4 w-4" aria-hidden /> End session
            </Button>
          </div>

          <p
            aria-live="polite"
            className={cn(LABEL, "text-muted-foreground")}
          >
            {session.done} of {session.totalSteps} reviewed
          </p>

          {currentCard ? (
            <div className="space-y-6 border border-border bg-secondary/30 p-6 sm:p-8">
              <div className="min-h-[140px] sm:min-h-[160px]">
                <p
                  className={cn(LABEL, "mb-3 text-volt")}
                  aria-hidden
                >
                  Question
                </p>
                <p className="font-display text-3xl leading-tight tracking-wide md:text-4xl">
                  {currentCard.front}
                </p>
              </div>

              {!session.revealed ? (
                <Button
                  onClick={() =>
                    setSession((s) =>
                      s ? { ...s, revealed: true } : s
                    )
                  }
                  className={cn(PRIMARY, "h-12 w-full px-8 font-head text-xs font-extrabold uppercase tracking-[0.2em] sm:w-auto")}
                >
                  <Eye className="mr-2 h-4 w-4" aria-hidden /> Show answer
                </Button>
              ) : (
                <div className="space-y-6">
                  <div className="border-l-2 border-volt pl-4">
                    <p className={cn(LABEL, "text-volt")} aria-hidden>
                      Answer
                    </p>
                    <p className="mt-1 text-base leading-relaxed">
                      {currentCard.back}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {RATING_BUTTONS.map((btn) => (
                        <Button
                          key={btn.rating}
                          variant="outline"
                          onClick={() => handleRate(btn.rating)}
                          className={btn.className}
                        >
                          {btn.label}
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Rate how well you knew it. Again brings the card back
                      before this session ends.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Card className="border-border bg-card">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">
                  This deck no longer exists on this device.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Session summary */}
      {!session && summary && (
        <Card className="border-border bg-card">
          <CardContent className="space-y-4 p-8 text-center">
            <p className={cn(LABEL, "text-muted-foreground")}>
              Session complete
            </p>
            <p className="font-display text-4xl tracking-wide">
              Reviewed {summary.reviewed} cards
            </p>
            {summary.xp > 0 ? (
              <p className="text-sm font-semibold text-volt">
                +{summary.xp} XP added to your profile. This deck banks XP
                once per day.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                XP for this deck is already banked today. The cards you
                rated AGAIN are due right now.
              </p>
            )}
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              {summaryDueLeft > 0 && (
                <Button
                  onClick={() => startSession(summary.deckId)}
                  className={cn(PRIMARY, "h-11 px-6 font-head text-xs font-extrabold uppercase tracking-[0.2em]")}
                >
                  <RotateCcw className="mr-2 h-4 w-4" aria-hidden /> Review
                  again ({summaryDueLeft} left)
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setSummary(null)}
                className="h-11 border-border bg-background px-6 font-head text-xs font-extrabold uppercase tracking-[0.2em] hover:bg-secondary"
              >
                Back to decks
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deck list + builder, hidden while a session runs */}
      {!session && (
        <>
          {decks.length === 0 ? (
            <Card className="border-dashed bg-card">
              <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
                <Layers
                  className="h-8 w-8 text-muted-foreground"
                  aria-hidden
                />
                <p className={LABEL}>No decks yet</p>
                <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                  No decks yet. Make one from a lesson or by hand.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="nice-scrollbar grid max-h-96 gap-4 overflow-y-auto pr-1 md:grid-cols-2">
              {decks.map((deck) => (
                <DeckCard
                  key={deck.id}
                  deck={deck}
                  today={today}
                  onReview={() => startSession(deck.id)}
                  onDelete={() => deleteDeck(deck.id)}
                />
              ))}
            </div>
          )}

          {/* Manual deck builder */}
          <Card className="border-border bg-card">
            <CardContent className="space-y-5 p-6">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-volt" aria-hidden />
                <h3 className={LABEL}>New deck by hand</h3>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="fc-deck-name"
                  className={cn(LABEL, "text-muted-foreground")}
                >
                  Deck name
                </label>
                <Input
                  id="fc-deck-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Spanish verbs, API design, music theory"
                  className="h-12 border-border bg-background text-base"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-3">
                <span className={cn(LABEL, "text-muted-foreground")}>
                  Cards
                </span>
                {rows.map((row, i) => (
                  <div key={i} className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={row.front}
                      onChange={(e) =>
                        updateRow(i, { front: e.target.value })
                      }
                      placeholder={`Question ${i + 1}`}
                      aria-label={`Card ${i + 1} front`}
                      className="h-11 border-border bg-background sm:flex-1"
                      autoComplete="off"
                    />
                    <Input
                      value={row.back}
                      onChange={(e) => updateRow(i, { back: e.target.value })}
                      placeholder={`Answer ${i + 1}`}
                      aria-label={`Card ${i + 1} back`}
                      className="h-11 border-border bg-background sm:flex-1"
                      autoComplete="off"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setRows((prev) =>
                          prev.length > 1
                            ? prev.filter((_, ri) => ri !== i)
                            : prev
                        )
                      }
                      disabled={rows.length === 1}
                      aria-label={`Remove card ${i + 1}`}
                      className="h-11 w-11 shrink-0 border-border bg-background text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() => setRows((prev) => [...prev, { front: "", back: "" }])}
                  className="h-11 border-border bg-background px-4 font-head text-xs font-extrabold uppercase tracking-[0.2em] hover:bg-secondary"
                >
                  <Plus className="mr-2 h-4 w-4" aria-hidden /> Add row
                </Button>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  onClick={handleCreate}
                  disabled={!canCreate}
                  className={cn(PRIMARY, "h-12 px-8 font-head text-xs font-extrabold uppercase tracking-[0.2em]")}
                >
                  <Plus className="mr-2 h-4 w-4" aria-hidden /> Create deck
                </Button>
                <p className="text-xs text-muted-foreground">
                  Rows missing a question or an answer are skipped. New cards
                  are due immediately.
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* One deck in the list                                                */
/* ------------------------------------------------------------------ */

function DeckCard({
  deck,
  today,
  onReview,
  onDelete,
}: {
  deck: Deck;
  today: string;
  onReview: () => void;
  onDelete: () => void;
}) {
  const dueCount = deck.cards.filter((c) => c.due <= today).length;

  return (
    <Card className="border-border bg-card transition-colors hover:border-volt/70">
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-head text-xs font-extrabold uppercase tracking-[0.2em]">
              {deck.name}
            </p>
            <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
              {deck.topic || "No topic"}
            </p>
          </div>
          {dueCount > 0 ? (
            <span className="shrink-0 border border-volt/60 px-2 py-0.5 font-head text-[10px] font-extrabold uppercase tracking-widest text-volt">
              {dueCount} due
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1 border border-border px-2 py-0.5 font-head text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
              <Check className="h-3 w-3" aria-hidden /> Done today
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {deck.cards.length} {deck.cards.length === 1 ? "card" : "cards"} ·{" "}
          {dueCount} due today
        </p>

        <div className="mt-auto flex items-center gap-2">
          {dueCount > 0 ? (
            <Button
              onClick={onReview}
              className="h-11 flex-1 bg-volt font-head text-xs font-extrabold uppercase tracking-[0.2em] text-black hover:bg-volt/90"
            >
              Review
            </Button>
          ) : (
            <span className="inline-flex h-11 flex-1 items-center justify-center border border-border px-4 font-head text-xs font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
              All caught up
            </span>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label={`Delete deck: ${deck.name}`}
                className="h-11 w-11 shrink-0 border-border bg-background text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display text-2xl tracking-wide">
                  Delete this deck?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {deck.name} and all {deck.cards.length} of its cards will be
                  removed from this device. Review history goes with them.
                  This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-destructive font-head text-xs font-extrabold uppercase tracking-[0.2em] text-white hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
