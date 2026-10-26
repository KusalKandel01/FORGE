"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useProfile } from "@/lib/profile-store";

/**
 * FORGE daily habits store. Everything starts at zero.
 * Persists to localStorage key "forge-habits" (cleared by global reset).
 *
 * XP is only awarded for real user actions:
 *  - first check of a habit on a given day -> +10 XP (guard "hb-x:YYYY-MM-DD")
 *  - every active habit checked on the same day -> +15 bonus XP, once per day
 *    (guard "alldone:YYYY-MM-DD")
 * Unchecking never removes XP.
 */

export interface Habit {
  id: string;
  name: string;
  createdAt: string;
  archivedAt: string | null;
}

/** Hard cap so the list stays honest and finishable in one day. */
export const MAX_ACTIVE_HABITS = 8;

interface HabitsState {
  habits: Habit[];
  /** habitId -> sorted, unique "YYYY-MM-DD" keys of checked days. */
  checks: Record<string, string[]>;
  /** One-time XP guards, e.g. "hb-xxx:2025-01-31" or "alldone:2025-01-31". */
  xpAwarded: string[];

  addHabit: (name: string) => Habit | null;
  removeHabit: (id: string) => void;
  toggleCheck: (habitId: string, key: string) => void;
  resetHabits: () => void;
}

/* ------------------------------------------------------------------ */
/* Date helpers (local time, mirrors src/components/fitness/store.ts)  */
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

/** Parse a "YYYY-MM-DD" key into a local Date at midnight. */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map((part) => parseInt(part, 10));
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

export const useHabits = create<HabitsState>()(
  persist(
    (set, get) => ({
      habits: [],
      checks: {},
      xpAwarded: [],

      addHabit: (name) => {
        const clean = name.trim().slice(0, 60);
        if (!clean) return null;
        const state = get();
        const activeCount = state.habits.filter((h) => !h.archivedAt).length;
        if (activeCount >= MAX_ACTIVE_HABITS) return null;
        const habit: Habit = {
          id: `hb-${Date.now().toString(36)}`,
          name: clean,
          createdAt: new Date().toISOString(),
          archivedAt: null,
        };
        set({ habits: [...state.habits, habit] });
        return habit;
      },

      // Archive, do not delete: past checks stay so streaks and history
      // remain truthful for the days the habit was actually tracked.
      removeHabit: (id) =>
        set((s) => ({
          habits: s.habits.map((h) =>
            h.id === id && !h.archivedAt
              ? { ...h, archivedAt: new Date().toISOString() }
              : h
          ),
        })),

      toggleCheck: (habitId, key) => {
        const state = get();
        const habit = state.habits.find((h) => h.id === habitId);
        if (!habit || habit.archivedAt) return;

        const current = state.checks[habitId] ?? [];
        const wasDone = current.includes(key);
        const nextChecks = wasDone
          ? current.filter((k) => k !== key)
          : [...current, key].sort();

        const nextAwarded = [...state.xpAwarded];

        if (!wasDone) {
          // +10 XP the first time this habit is checked on this day.
          const guard = `${habitId}:${key}`;
          if (!nextAwarded.includes(guard)) {
            nextAwarded.push(guard);
            useProfile.getState().addXp(10);
          }

          // +15 bonus once per day when every active habit is done today.
          if (key === todayKey()) {
            const active = state.habits.filter((h) => !h.archivedAt);
            const allDone =
              active.length > 0 &&
              active.every((h) =>
                (h.id === habitId ? nextChecks : state.checks[h.id] ?? []).includes(
                  key
                )
              );
            const bonusGuard = `alldone:${key}`;
            if (allDone && !nextAwarded.includes(bonusGuard)) {
              nextAwarded.push(bonusGuard);
              useProfile.getState().addXp(15);
            }
          }
        }

        set({
          checks: { ...state.checks, [habitId]: nextChecks },
          ...(nextAwarded.length !== state.xpAwarded.length
            ? { xpAwarded: nextAwarded }
            : {}),
        });
      },

      resetHabits: () => set({ habits: [], checks: {}, xpAwarded: [] }),
    }),
    { name: "forge-habits" }
  )
);

/* ------------------------------------------------------------------ */
/* Read helpers (safe to call from client components after mount)      */
/* ------------------------------------------------------------------ */

/** True if the habit was checked on that day. */
export function isDone(habitId: string, key: string): boolean {
  const checks = useHabits.getState().checks[habitId];
  return !!checks && checks.includes(key);
}

/**
 * Current streak of checked days. Ends today if today is checked,
 * otherwise ends yesterday, so an unfinished today never shows 0 mid-day.
 */
export function streakFor(habitId: string): number {
  const checks = useHabits.getState().checks[habitId];
  if (!checks || checks.length === 0) return 0;
  const done = new Set(checks);
  let streak = 0;
  const cursor = new Date();
  if (!done.has(dateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (done.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
