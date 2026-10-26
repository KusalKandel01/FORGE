"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useProfile } from "@/lib/profile-store";

/**
 * FORGE flashcards store: spaced repetition decks with an SM-2 lite scheduler.
 * Persists to localStorage key "forge-flashcards" (cleared by global reset).
 *
 * XP is only awarded for real review work:
 *  - finishing a review session -> min(30, unique cards reviewed * 2) XP,
 *    at most once per deck per day (guard key "deckId:dateKey").
 */

export interface FcCard {
  id: string;
  front: string;
  back: string;
  /** SM-2 easiness factor. Starts 2.5, clamped to [1.3, 3.0]. */
  ease: number;
  /** Current interval in days. */
  interval: number;
  /** Next due date as a local "YYYY-MM-DD" key. */
  due: string;
  /** Successful reviews in a row (reset by "again"). */
  reps: number;
  /** Times forgotten. */
  lapses: number;
}

export interface Deck {
  id: string;
  name: string;
  topic: string;
  createdAt: string;
  cards: FcCard[];
}

export type FcRating = "again" | "hard" | "good" | "easy";

/* ------------------------------------------------------------------ */
/* Date helpers (local time, mirrors fitness/store.ts)                 */
/* ------------------------------------------------------------------ */

export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Local "YYYY-MM-DD" for right now. */
export function todayKey(): string {
  return dateKey(new Date());
}

/** Add days to a "YYYY-MM-DD" key, still on local midnight. */
export function addDaysKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map((part) => parseInt(part, 10));
  const date = new Date(y || 1970, (m || 1) - 1, d || 1);
  date.setDate(date.getDate() + Math.max(0, days));
  return dateKey(date);
}

/* ------------------------------------------------------------------ */
/* Internals                                                           */
/* ------------------------------------------------------------------ */

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `fcc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const MIN_EASE = 1.3;
const MAX_EASE = 3.0;
const MAX_INTERVAL_DAYS = 365;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function newCard(front: string, back: string): FcCard {
  return {
    id: makeId(),
    front: front.trim(),
    back: back.trim(),
    ease: 2.5,
    interval: 0,
    due: todayKey(),
    reps: 0,
    lapses: 0,
  };
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

interface FlashcardsState {
  decks: Deck[];
  /** One-time guards, format "deckId:dateKey", one XP payout per deck per day. */
  xpAwarded: string[];
  /** Deck ids deleted here, kept so cloud sync can tombstone them. */
  tombstones: string[];

  createDeck: (
    name: string,
    topic: string,
    cards: { front: string; back: string }[]
  ) => string;
  addCard: (deckId: string, front: string, back: string) => void;
  rateCard: (deckId: string, cardId: string, rating: FcRating) => void;
  deleteDeck: (deckId: string) => void;
  /** Award XP for a finished review session once per deck per day. Returns the amount granted. */
  awardSessionXp: (deckId: string, uniqueReviewed: number) => number;
  resetFlashcards: () => void;
}

export const useFlashcards = create<FlashcardsState>()(
  persist(
    (set, get) => ({
      decks: [],
      xpAwarded: [],
      tombstones: [],

      createDeck: (name, topic, cards) => {
        const id = `fc-${Date.now().toString(36)}`;
        const clean = cards
          .map((c) => ({ front: c.front.trim(), back: c.back.trim() }))
          .filter((c) => c.front.length > 0 && c.back.length > 0)
          .map((c) => newCard(c.front, c.back));
        const deck: Deck = {
          id,
          name: name.trim() || "Untitled deck",
          topic: topic.trim(),
          createdAt: new Date().toISOString(),
          cards: clean,
        };
        set((s) => ({ decks: [deck, ...s.decks] }));
        return id;
      },

      addCard: (deckId, front, back) =>
        set((s) => ({
          decks: s.decks.map((deck) =>
            deck.id === deckId
              ? { ...deck, cards: [...deck.cards, newCard(front, back)] }
              : deck
          ),
        })),

      rateCard: (deckId, cardId, rating) =>
        set((s) => ({
          decks: s.decks.map((deck) => {
            if (deck.id !== deckId) return deck;
            return {
              ...deck,
              cards: deck.cards.map((card) => {
                if (card.id !== cardId) return card;

                if (rating === "again") {
                  return {
                    ...card,
                    interval: 0,
                    due: todayKey(),
                    reps: 0,
                    lapses: card.lapses + 1,
                  };
                }

                const ease = clamp(card.ease, MIN_EASE, MAX_EASE);
                let nextEase = ease;
                let nextInterval: number;

                if (rating === "hard") {
                  nextInterval = Math.max(1, Math.round(card.interval * 1.2));
                  nextEase = Math.max(MIN_EASE, ease - 0.2);
                } else if (rating === "good") {
                  nextInterval =
                    card.reps === 0
                      ? 1
                      : Math.max(1, Math.round(card.interval * ease));
                } else {
                  nextInterval =
                    card.reps === 0
                      ? 3
                      : Math.max(1, Math.round(card.interval * ease * 1.3));
                  nextEase = Math.min(MAX_EASE, ease + 0.15);
                }

                nextInterval = Math.min(MAX_INTERVAL_DAYS, nextInterval);

                return {
                  ...card,
                  ease: nextEase,
                  interval: nextInterval,
                  due: addDaysKey(todayKey(), nextInterval),
                  reps: card.reps + 1,
                };
              }),
            };
          }),
        })),

      deleteDeck: (deckId) =>
        set((s) => ({
          decks: s.decks.filter((deck) => deck.id !== deckId),
          tombstones: [...new Set([...s.tombstones, deckId])].slice(-400),
        })),

      awardSessionXp: (deckId, uniqueReviewed) => {
        const guard = `${deckId}:${todayKey()}`;
        if (get().xpAwarded.includes(guard)) return 0;
        const amount = Math.min(30, Math.max(0, Math.round(uniqueReviewed)) * 2);
        set((s) => ({ xpAwarded: [...s.xpAwarded, guard].slice(-400) }));
        if (amount > 0) useProfile.getState().addXp(amount);
        return amount;
      },

      resetFlashcards: () =>
        set((s) => ({
          decks: [],
          xpAwarded: [],
          tombstones: [
            ...new Set([...s.tombstones, ...s.decks.map((d) => d.id)]),
          ].slice(-400),
        })),
    }),
    {
      name: "forge-flashcards",
      version: 1,
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<FlashcardsState>;
        return {
          decks: Array.isArray(state.decks) ? state.decks : [],
          xpAwarded: Array.isArray(state.xpAwarded) ? state.xpAwarded : [],
          tombstones: Array.isArray(state.tombstones) ? state.tombstones : [],
        } as FlashcardsState;
      },
    }
  )
);
