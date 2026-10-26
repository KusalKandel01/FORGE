"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { putMeta } from "@/lib/book-cache";
import { useProfile } from "@/lib/profile-store";

/**
 * Library shelf state. Persisted to localStorage under "forge-library".
 * The shelf starts empty: no fake books, no invented stats.
 * Offline content (texts, chapters, outlines) lives in IndexedDB ("forge-books").
 */

export type ShelfSource = "gutenberg" | "archive" | "generated" | "personal";

export interface ShelfMeta {
  id: string;
  title: string;
  author: string;
  cover: string | null;
  source: ShelfSource;
  chapterCount: number | null;
  addedAt: string;
  /** Reading progress, 0..1. */
  progress: number;
  lastReadAt: string | null;
  offlineReady: boolean;
  description?: string;
  /** True for AI reading companions of real published books. */
  companion?: boolean;
  /** Client clock of the last change. Used by cloud sync. */
  touchedAt?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  author: string;
  year: number | null;
  cover: string | null;
  source: "gutenberg" | "openlibrary" | "archive";
  downloadable: boolean;
}

export const XP_PER_FINISHED_BOOK = 30;
const DEFAULT_FONT_SIZE = 17;
const MIN_FONT_SIZE = 13;
const MAX_FONT_SIZE = 28;

interface LibraryState {
  shelf: ShelfMeta[];
  fontSize: number;
  /** Book ids that already earned their one-time finish bonus. */
  booksXpAwarded: string[];
  /** Books deleted here, kept so cloud sync can tombstone them. */
  removedBookIds: string[];
  /** When each removed book was deleted (ISO by id). */
  removedBookAt: Record<string, string>;
  addBook: (meta: ShelfMeta) => void;
  updateProgress: (id: string, progress: number) => void;
  markOfflineReady: (id: string) => void;
  setFontSize: (size: number) => void;
  removeBook: (id: string) => void;
  resetLibrary: () => void;
}

export const useLibrary = create<LibraryState>()(
  persist(
    (set, get) => ({
      shelf: [],
      fontSize: DEFAULT_FONT_SIZE,
      booksXpAwarded: [],
      removedBookIds: [],
      removedBookAt: {},

      addBook: (meta) => {
        set((s) => {
          const existing = s.shelf.find((b) => b.id === meta.id);
          if (existing) {
            // Already shelved: refresh display fields, keep reading state.
            return {
              shelf: s.shelf.map((b) =>
                b.id === meta.id
                  ? {
                      ...b,
                      title: meta.title,
                      author: meta.author,
                      cover: meta.cover,
                      description: meta.description ?? b.description,
                      chapterCount: meta.chapterCount ?? b.chapterCount,
                    }
                  : b
              ),
            };
          }
          return {
            shelf: [{ ...meta, touchedAt: new Date().toISOString() }, ...s.shelf],
          };
        });
        const saved = get().shelf.find((b) => b.id === meta.id);
        if (saved) void putMeta({ ...saved }).catch(() => {});
      },

      updateProgress: (id, progress) => {
        const clamped = Math.min(1, Math.max(0, progress));
        const now = new Date().toISOString();
        const shouldAward =
          clamped >= 0.999 && !get().booksXpAwarded.includes(id);
        set((s) => ({
          shelf: s.shelf.map((b) =>
            b.id === id
              ? { ...b, progress: clamped, lastReadAt: now, touchedAt: now }
              : b
          ),
          booksXpAwarded: shouldAward
            ? [...s.booksXpAwarded, id]
            : s.booksXpAwarded,
        }));
        if (shouldAward) {
          useProfile.getState().addXp(XP_PER_FINISHED_BOOK);
        }
      },

      markOfflineReady: (id) => {
        set((s) => ({
          shelf: s.shelf.map((b) =>
            b.id === id && !b.offlineReady
              ? { ...b, offlineReady: true, touchedAt: new Date().toISOString() }
              : b
          ),
        }));
        const saved = get().shelf.find((b) => b.id === id);
        if (saved && saved.offlineReady) {
          void putMeta({ ...saved }).catch(() => {});
        }
      },

      setFontSize: (size) =>
        set({
          fontSize: Math.min(
            MAX_FONT_SIZE,
            Math.max(MIN_FONT_SIZE, Math.round(size))
          ),
        }),

      removeBook: (id) =>
        set((s) => ({
          shelf: s.shelf.filter((b) => b.id !== id),
          removedBookIds: [...new Set([...s.removedBookIds, id])].slice(-200),
          removedBookAt: { ...s.removedBookAt, [id]: new Date().toISOString() },
        })),

      resetLibrary: () =>
        set((s) => ({
          shelf: [],
          fontSize: DEFAULT_FONT_SIZE,
          booksXpAwarded: [],
          removedBookIds: [
            ...new Set([...s.removedBookIds, ...s.shelf.map((b) => b.id)]),
          ].slice(-200),
          removedBookAt: {
            ...s.removedBookAt,
            ...Object.fromEntries(
              s.shelf.map((b) => [b.id, new Date().toISOString()])
            ),
          },
        })),
    }),
    { name: "forge-library" }
  )
);
