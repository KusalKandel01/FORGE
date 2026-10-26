/**
 * FORGE Skills: aggregation of every built-in skill pack.
 *
 * The whole library is static data that ships with the app, so the skills
 * hub works fully offline. Category counts are computed once at module
 * load and are always real numbers, never hand written.
 */

import type { Skill, SkillCategory } from "./skills-types";
import { SKILL_CATEGORIES } from "./skills-types";
import { SURVIVAL_SKILLS } from "./skills-survival";
import { MONEY_CAREER_SKILLS } from "./skills-money-career";
import { EVERYDAY_BODY_SKILLS } from "./skills-everyday-body";
import { PEOPLE_DIGITAL_SKILLS } from "./skills-people-digital";

export const ALL_SKILLS: Skill[] = [
  ...SURVIVAL_SKILLS,
  ...MONEY_CAREER_SKILLS,
  ...EVERYDAY_BODY_SKILLS,
  ...PEOPLE_DIGITAL_SKILLS,
];

export const SKILLS_BY_CATEGORY: Record<SkillCategory, Skill[]> =
  SKILL_CATEGORIES.reduce(
    (acc, category) => {
      acc[category] = ALL_SKILLS.filter((s) => s.category === category);
      return acc;
    },
    {} as Record<SkillCategory, Skill[]>
  );

export const SKILL_CATEGORY_COUNTS: { category: SkillCategory; count: number }[] =
  SKILL_CATEGORIES.map((category) => ({
    category,
    count: SKILLS_BY_CATEGORY[category].length,
  }));

export { SKILL_CATEGORIES };
export type { Skill, SkillCategory };
