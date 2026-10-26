"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useProfile } from "@/lib/profile-store";

/**
 * FORGE fitness store. Everything starts at zero.
 * Persists to localStorage key "forge-fitness" (cleared by global reset).
 *
 * XP is only awarded for real logged activity:
 *  - addWorkout -> +50 XP
 *  - setSteps crossing the daily goal for the first time -> +20 XP
 */

export interface WorkoutEntry {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weightKg: number;
  durationMin: number;
  calories: number;
}

export interface DayLog {
  date: string;
  steps: number;
  workouts: WorkoutEntry[];
  note: string;
  /** Client clock of the last change to this day. Used by cloud sync. */
  updatedAt?: string;
}

export interface PlanExercise {
  name: string;
  sets: number;
  reps: string;
  restSec: number;
}

export interface PlanDay {
  day: string;
  focus: string;
  exercises: PlanExercise[];
}

export interface Plan {
  summary: string;
  goal: string;
  createdAt: string;
  days: PlanDay[];
  tips: string[];
}

export interface BadgeDef {
  key: string;
  label: string;
  description: string;
}

export const BADGES: BadgeDef[] = [
  {
    key: "FIRST_WORKOUT",
    label: "First rep",
    description: "Log your very first workout.",
  },
  {
    key: "STEP_GOAL",
    label: "Step goal",
    description: "Reach your daily step goal once.",
  },
  {
    key: "TEN_K",
    label: "10K club",
    description: "Walk 10,000 steps in a single day.",
  },
  {
    key: "STREAK_3",
    label: "3 day streak",
    description: "Stay active 3 days in a row.",
  },
  {
    key: "STREAK_7",
    label: "7 day streak",
    description: "Stay active 7 days in a row.",
  },
  {
    key: "WORKOUTS_10",
    label: "10 sessions",
    description: "Log 10 workouts in total.",
  },
  {
    key: "WORKOUTS_50",
    label: "50 sessions",
    description: "Log 50 workouts in total.",
  },
];

/* ------------------------------------------------------------------ */
/* Date helpers                                                        */
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

function isActiveDay(log: DayLog | undefined): boolean {
  return !!log && (log.steps > 0 || log.workouts.length > 0);
}

/**
 * Current streak of active days (steps > 0 or workouts logged).
 * Ends today if today is active, otherwise ends yesterday,
 * so an unfinished today never breaks the chain.
 */
export function computeStreak(logs: Record<string, DayLog>): number {
  let streak = 0;
  const cursor = new Date();
  if (!isActiveDay(logs[dateKey(cursor)])) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (isActiveDay(logs[dateKey(cursor)])) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Longest run of consecutive active days ever recorded. */
export function computeBestStreak(logs: Record<string, DayLog>): number {
  const activeKeys = Object.keys(logs)
    .filter((k) => isActiveDay(logs[k]))
    .sort();
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const key of activeKeys) {
    const time = parseDateKey(key).getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    if (prev !== null && Math.round((time - prev) / dayMs) === 1) {
      run += 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    prev = time;
  }
  return best;
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function ensureLog(
  logs: Record<string, DayLog>,
  date: string
): Record<string, DayLog> {
  if (logs[date]) return logs;
  return {
    ...logs,
    [date]: { date, steps: 0, workouts: [], note: "", updatedAt: nowIso() },
  };
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

interface FitnessState {
  goalSteps: number;
  goalWorkoutsPerWeek: number;
  bodyWeightKg: number;
  heightCm: number;
  logs: Record<string, DayLog>;
  stepGoalAwarded: string[];
  badges: string[];
  plan: Plan | null;
  /** Days wiped by a reset, kept so cloud sync can delete them server side. */
  clearedDays: string[];

  setGoalSteps: (n: number) => void;
  setGoalWorkouts: (n: number) => void;
  setBodyWeight: (n: number) => void;
  setHeight: (n: number) => void;
  setSteps: (date: string, steps: number) => void;
  addWorkout: (date: string, entry: WorkoutEntry) => void;
  removeWorkout: (date: string, id: string) => void;
  setNote: (date: string, note: string) => void;
  setPlan: (plan: Plan | null) => void;
  awardBadge: (key: string) => void;
  resetFitness: () => void;
}

export const useFitness = create<FitnessState>()(
  persist(
    (set, get) => ({
      goalSteps: 10000,
      goalWorkoutsPerWeek: 3,
      bodyWeightKg: 70,
      heightCm: 170,
      logs: {},
      stepGoalAwarded: [],
      badges: [],
      plan: null,
      clearedDays: [],

      setGoalSteps: (n) =>
        set({ goalSteps: Math.max(1, Math.round(n) || 1) }),

      setGoalWorkouts: (n) =>
        set({ goalWorkoutsPerWeek: Math.max(1, Math.round(n) || 1) }),

      setBodyWeight: (n) =>
        set({ bodyWeightKg: Math.min(500, Math.max(20, n)) }),

      setHeight: (n) => set({ heightCm: Math.min(280, Math.max(50, n)) }),

      setSteps: (date, steps) => {
        const state = get();
        const clean = Math.max(0, Math.round(steps) || 0);
        const logs = ensureLog(state.logs, date);
        const nextLogs: Record<string, DayLog> = {
          ...logs,
          [date]: { ...logs[date], steps: clean, updatedAt: nowIso() },
        };

        const nextBadges = [...state.badges];
        const nextAwarded = [...state.stepGoalAwarded];
        let changed = false;

        // Daily step goal crossed for the first time: +20 XP.
        if (clean >= state.goalSteps && !nextAwarded.includes(date)) {
          nextAwarded.push(date);
          useProfile.getState().addXp(20);
          changed = true;
          if (!nextBadges.includes("STEP_GOAL")) nextBadges.push("STEP_GOAL");
        }
        if (clean >= 10000 && !nextBadges.includes("TEN_K")) {
          nextBadges.push("TEN_K");
          changed = true;
        }

        set({
          logs: nextLogs,
          ...(changed ? { stepGoalAwarded: nextAwarded, badges: nextBadges } : {}),
        });
      },

      addWorkout: (date, entry) => {
        const state = get();
        const logs = ensureLog(state.logs, date);
        const log = logs[date];
        const nextLogs: Record<string, DayLog> = {
          ...logs,
          [date]: {
            ...log,
            workouts: [...log.workouts, entry],
            updatedAt: nowIso(),
          },
        };

        useProfile.getState().addXp(50);

        const nextBadges = [...state.badges];
        const push = (key: string) => {
          if (!nextBadges.includes(key)) nextBadges.push(key);
        };

        const totalWorkouts = Object.values(nextLogs).reduce(
          (acc, l) => acc + l.workouts.length,
          0
        );
        if (totalWorkouts >= 1) push("FIRST_WORKOUT");
        if (totalWorkouts >= 10) push("WORKOUTS_10");
        if (totalWorkouts >= 50) push("WORKOUTS_50");

        const streak = computeStreak(nextLogs);
        if (streak >= 3) push("STREAK_3");
        if (streak >= 7) push("STREAK_7");

        set({
          logs: nextLogs,
          ...(nextBadges.length !== state.badges.length
            ? { badges: nextBadges }
            : {}),
        });
      },

      removeWorkout: (date, id) =>
        set((s) => {
          const log = s.logs[date];
          if (!log) return {};
          return {
            logs: {
              ...s.logs,
              [date]: {
                ...log,
                workouts: log.workouts.filter((w) => w.id !== id),
                updatedAt: nowIso(),
              },
            },
          };
        }),

      setNote: (date, note) =>
        set((s) => {
          const logs = ensureLog(s.logs, date);
          return {
            logs: {
              ...logs,
              [date]: { ...logs[date], note, updatedAt: nowIso() },
            },
          };
        }),

      setPlan: (plan) => set({ plan }),

      awardBadge: (key) =>
        set((s) =>
          s.badges.includes(key) ? {} : { badges: [...s.badges, key] }
        ),

      resetFitness: () =>
        set((s) => ({
          goalSteps: 10000,
          goalWorkoutsPerWeek: 3,
          bodyWeightKg: 70,
          heightCm: 170,
          logs: {},
          stepGoalAwarded: [],
          badges: [],
          plan: null,
          clearedDays: [
            ...new Set([...s.clearedDays, ...Object.keys(s.logs)]),
          ].slice(-400),
        })),
    }),
    { name: "forge-fitness" }
  )
);

/** Helper for components: create a WorkoutEntry with a fresh id. */
export function newWorkout(
  data: Omit<WorkoutEntry, "id">
): WorkoutEntry {
  return { id: makeId(), ...data };
}
