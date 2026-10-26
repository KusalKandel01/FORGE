"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useProfile } from "@/lib/profile-store";
import { clearAllGuides as clearGuideIdb } from "@/lib/skills-cache";
import type { SkillCategory } from "./skills-types";

/**
 * Per-guide summary kept in localStorage ("forge-skills").
 * Full AI generated guide bodies live in IndexedDB
 * (src/lib/skills-cache.ts). Built-in pack skills need no storage.
 * Starts empty: no fake checkmarks, no seeded mastery.
 */
export interface GuideMeta {
  id: string;
  /** The raw user request the guide was built from. */
  skill: string;
  title: string;
  category: SkillCategory;
  savedAt: string;
}

interface SkillsState {
  /** Checked checklist item ids per skill id (built-in or generated). */
  checks: Record<string, string[]>;
  /** ISO date a skill reached full checklist completion. */
  masteredAt: Record<string, string>;
  /** AI generated guide metadata. */
  guides: GuideMeta[];
  /** Guard so mastery XP is awarded once per skill ever. */
  xpAwarded: string[];
  /** Guides deleted here, tombstones kept for honesty in exports. */
  removedGuideIds: string[];
  removedGuideAt: Record<string, string>;
  toggleCheck: (skillId: string, item: string, total: number) => void;
  clearChecks: (skillId: string) => void;
  addGuide: (meta: GuideMeta) => void;
  removeGuide: (id: string) => void;
  resetSkills: () => void;
}

const XP_PER_MASTERY = 25;

export const useSkillsStore = create<SkillsState>()(
  persist(
    (set, get) => ({
      checks: {},
      masteredAt: {},
      guides: [],
      xpAwarded: [],
      removedGuideIds: [],
      removedGuideAt: {},

      toggleCheck: (skillId, item, total) =>
        set((state) => {
          const current = state.checks[skillId] ?? [];
          const has = current.includes(item);
          const next = has
            ? current.filter((i) => i !== item)
            : [...current, item];

          const nextChecks = { ...state.checks, [skillId]: next };
          const nextMastered = { ...state.masteredAt };

          if (next.length >= total && total > 0) {
            // Fresh mastery: stamp it and pay XP once ever.
            if (!nextMastered[skillId]) {
              nextMastered[skillId] = new Date().toISOString();
            }
          } else {
            // Honest state: unchecking below full drops the badge (XP stays).
            delete nextMastered[skillId];
          }

          const justMastered =
            nextMastered[skillId] !== undefined &&
            state.masteredAt[skillId] === undefined &&
            !state.xpAwarded.includes(skillId);

          if (justMastered) {
            // XP side effect runs after the set() updater via microtask.
            setTimeout(() => useProfile.getState().addXp(XP_PER_MASTERY), 0);
          }

          return {
            checks: nextChecks,
            masteredAt: nextMastered,
            xpAwarded: justMastered
              ? [...state.xpAwarded, skillId]
              : state.xpAwarded,
          };
        }),

      clearChecks: (skillId) =>
        set((state) => {
          const nextChecks = { ...state.checks };
          delete nextChecks[skillId];
          const nextMastered = { ...state.masteredAt };
          delete nextMastered[skillId];
          return { checks: nextChecks, masteredAt: nextMastered };
        }),

      addGuide: (meta) =>
        set((state) => {
          const index = state.guides.findIndex((g) => g.id === meta.id);
          if (index === -1) {
            return { guides: [meta, ...state.guides] };
          }
          const next = [...state.guides];
          next[index] = { ...next[index], ...meta };
          return { guides: next };
        }),

      removeGuide: (id) =>
        set((state) => ({
          guides: state.guides.filter((g) => g.id !== id),
          removedGuideIds: [
            ...new Set([...state.removedGuideIds, id]),
          ].slice(-200),
          removedGuideAt: {
            ...state.removedGuideAt,
            [id]: new Date().toISOString(),
          },
        })),

      resetSkills: () => {
        set((state) => ({
          checks: {},
          masteredAt: {},
          guides: [],
          removedGuideIds: [
            ...new Set([
              ...state.removedGuideIds,
              ...state.guides.map((g) => g.id),
            ]),
          ].slice(-200),
          removedGuideAt: {
            ...state.removedGuideAt,
            ...Object.fromEntries(
              state.guides.map((g) => [g.id, new Date().toISOString()])
            ),
          },
        }));
        void clearGuideIdb();
      },
    }),
    {
      name: "forge-skills",
      version: 1,
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<SkillsState>;
        return {
          checks:
            state.checks && typeof state.checks === "object"
              ? state.checks
              : {},
          masteredAt:
            state.masteredAt && typeof state.masteredAt === "object"
              ? state.masteredAt
              : {},
          guides: Array.isArray(state.guides) ? state.guides : [],
          xpAwarded: Array.isArray(state.xpAwarded) ? state.xpAwarded : [],
          removedGuideIds: Array.isArray(state.removedGuideIds)
            ? state.removedGuideIds
            : [],
          removedGuideAt:
            state.removedGuideAt && typeof state.removedGuideAt === "object"
              ? state.removedGuideAt
              : {},
        } as SkillsState;
      },
    }
  )
);
