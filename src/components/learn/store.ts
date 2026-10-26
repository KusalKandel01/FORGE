"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useProfile } from "@/lib/profile-store";
import { clearAll as clearLessonIdb } from "@/lib/learn-cache";
import type { LessonLevel } from "@/lib/learn-cache";

/**
 * Per-lesson summary kept in localStorage ("forge-learn").
 * Full lesson bodies live in IndexedDB (src/lib/learn-cache.ts).
 * Starts empty: no fake lessons, no seeded stats.
 */
export interface LessonMeta {
  id: string;
  topic: string;
  level: LessonLevel;
  title: string;
  savedAt: string;
  completed: boolean;
  quizScore: number | null;
  quizTotal: number | null;
  notes: string;
  /** Client clock of the last change. Used by cloud sync. */
  updatedAt?: string;
}

interface XpAwarded {
  lessonComplete: string[];
  perfectQuiz: string[];
}

interface LearnState {
  lessons: LessonMeta[];
  xpAwarded: XpAwarded;
  /** Lessons deleted here, kept so cloud sync can tombstone them. */
  removedLessonIds: string[];
  /** When each removed lesson was deleted (ISO by id). */
  removedLessonAt: Record<string, string>;
  upsertMeta: (meta: LessonMeta) => void;
  setNotes: (id: string, notes: string) => void;
  markCompleted: (id: string) => void;
  awardLessonXp: (id: string) => void;
  awardQuizXp: (id: string) => void;
  setQuizScore: (id: string, score: number, total: number) => void;
  removeMeta: (id: string) => void;
  resetLearn: () => void;
}

const XP_LESSON_COMPLETE = 30;
const XP_PERFECT_QUIZ = 10;

export const useLearnStore = create<LearnState>()(
  persist(
    (set, get) => ({
      lessons: [],
      xpAwarded: { lessonComplete: [], perfectQuiz: [] },
      removedLessonIds: [],
      removedLessonAt: {},

      upsertMeta: (meta) =>
        set((state) => {
          const stamped: LessonMeta = { ...meta, updatedAt: new Date().toISOString() };
          const index = state.lessons.findIndex((l) => l.id === meta.id);
          if (index === -1) {
            return { lessons: [stamped, ...state.lessons] };
          }
          const next = [...state.lessons];
          next[index] = { ...next[index], ...stamped };
          return { lessons: next };
        }),

      setNotes: (id, notes) =>
        set((state) => ({
          lessons: state.lessons.map((l) =>
            l.id === id ? { ...l, notes, updatedAt: new Date().toISOString() } : l
          ),
        })),

      markCompleted: (id) => {
        set((state) => ({
          lessons: state.lessons.map((l) =>
            l.id === id
              ? { ...l, completed: true, updatedAt: new Date().toISOString() }
              : l
          ),
        }));
        get().awardLessonXp(id);
      },

      awardLessonXp: (id) => {
        if (get().xpAwarded.lessonComplete.includes(id)) return;
        set((state) => ({
          xpAwarded: {
            ...state.xpAwarded,
            lessonComplete: [...state.xpAwarded.lessonComplete, id],
          },
        }));
        useProfile.getState().addXp(XP_LESSON_COMPLETE);
      },

      awardQuizXp: (id) => {
        if (get().xpAwarded.perfectQuiz.includes(id)) return;
        set((state) => ({
          xpAwarded: {
            ...state.xpAwarded,
            perfectQuiz: [...state.xpAwarded.perfectQuiz, id],
          },
        }));
        useProfile.getState().addXp(XP_PERFECT_QUIZ);
      },

      setQuizScore: (id, score, total) => {
        set((state) => ({
          lessons: state.lessons.map((l) =>
            l.id === id
              ? {
                  ...l,
                  quizScore: score,
                  quizTotal: total,
                  updatedAt: new Date().toISOString(),
                }
              : l
          ),
        }));
        if (total > 0 && score === total) get().awardQuizXp(id);
      },

      removeMeta: (id) =>
        set((state) => ({
          lessons: state.lessons.filter((l) => l.id !== id),
          removedLessonIds: [...new Set([...state.removedLessonIds, id])].slice(-200),
          removedLessonAt: {
            ...state.removedLessonAt,
            [id]: new Date().toISOString(),
          },
        })),

      resetLearn: () => {
        set((state) => ({
          lessons: [],
          xpAwarded: { lessonComplete: [], perfectQuiz: [] },
          removedLessonIds: [
            ...new Set([
              ...state.removedLessonIds,
              ...state.lessons.map((l) => l.id),
            ]),
          ].slice(-200),
          removedLessonAt: {
            ...state.removedLessonAt,
            ...Object.fromEntries(
              state.lessons.map((l) => [l.id, new Date().toISOString()])
            ),
          },
        }));
        void clearLessonIdb();
      },
    }),
    {
      name: "forge-learn",
      version: 2,
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<LearnState>;
        return {
          lessons: Array.isArray(state.lessons) ? state.lessons : [],
          xpAwarded: {
            lessonComplete: state.xpAwarded?.lessonComplete ?? [],
            perfectQuiz: state.xpAwarded?.perfectQuiz ?? [],
          },
          removedLessonIds: Array.isArray(state.removedLessonIds)
            ? state.removedLessonIds
            : [],
          removedLessonAt:
            state.removedLessonAt && typeof state.removedLessonAt === "object"
              ? state.removedLessonAt
              : {},
        } as LearnState;
      },
    }
  )
);
