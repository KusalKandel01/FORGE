/**
 * FORGE Skills: shared types for the built-in real life skill library.
 *
 * Every skill is static data that ships with the app, so the whole skills
 * library works fully offline with zero network. The AI guide builder
 * (custom skills) reuses these shapes in src/app/api/skills/guide.
 */

export const SKILL_CATEGORIES = [
  "Survival",
  "Money",
  "Everyday",
  "People",
  "Career",
  "Digital",
  "Body and Mind",
] as const;

export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

export type SkillDifficulty = "Beginner" | "Intermediate" | "Advanced";

export interface Skill {
  /** Stable unique id inside the pack, e.g. "sur-fire-no-matches". */
  id: string;
  title: string;
  category: SkillCategory;
  difficulty: SkillDifficulty;
  /** Honest estimate, e.g. "30 minutes of practice" or "one weekend". */
  timeToLearn: string;
  /** Why this skill matters in real life. 1 to 2 sentences. */
  why: string;
  /** 5 to 8 imperative how-to steps. One action per step. */
  steps: string[];
  /** 2 to 4 technique, safety or efficiency tips. */
  tips: string[];
  /** 2 to 3 common mistakes and why they hurt. */
  mistakes: string[];
  /** 3 to 5 proof-of-mastery checks the user ticks off. */
  checklist: string[];
}

/** An AI generated custom skill guide (stored in IndexedDB). */
export interface SkillGuide {
  id: string;
  /** The raw user request the guide was built from. */
  skill: string;
  title: string;
  category: SkillCategory;
  difficulty: SkillDifficulty;
  timeToLearn: string;
  why: string;
  steps: string[];
  tips: string[];
  mistakes: string[];
  /** Practice drills to repeat until the skill sticks. */
  drills: string[];
  /** Four entries: what to do in week 1, 2, 3 and 4. */
  fourWeekPlan: string[];
  checklist: string[];
  savedAt: string;
}
