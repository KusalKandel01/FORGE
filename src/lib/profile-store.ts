import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Shared profile: XP earned from real user activity only.
 * Never seeded with fake values. Starts at 0.
 *
 * XP sources:
 *  - Fitness: logging workouts, hitting the daily step goal
 *  - Learn: completing a lesson, acing a quiz
 *
 * Storage key: "forge-profile" (cleared by global reset).
 */
export function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
}

export function xpForLevel(level: number): number {
  return Math.pow(Math.max(0, level - 1), 2) * 100;
}

interface ProfileState {
  xp: number;
  addXp: (amount: number) => void;
  resetXp: () => void;
}

export const useProfile = create<ProfileState>()(
  persist(
    (set) => ({
      xp: 0,
      addXp: (amount) =>
        set((s) => ({ xp: Math.max(0, Math.round(s.xp + amount)) })),
      resetXp: () => set({ xp: 0 }),
    }),
    { name: "forge-profile" }
  )
);
