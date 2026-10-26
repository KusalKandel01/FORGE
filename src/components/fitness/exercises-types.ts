/**
 * FORGE exercise tutor shared types. Static data, ships with the app,
 * works fully offline. Every exercise entry is a real movement with a
 * real step by step tutorial written for a home beginner.
 *
 * MET values are approximations from the Compendium of Physical
 * Activities and only feed the calorie estimate in the coach.
 */

export type ExerciseCategory =
  | "Warm-up"
  | "Home"
  | "Core"
  | "Gym"
  | "Dumbbell"
  | "Barbell"
  | "Machine"
  | "Kettlebell"
  | "Band"
  | "Calisthenics"
  | "Plyometric"
  | "Cardio"
  | "Conditioning"
  | "Yoga"
  | "Stretching"
  | "Mobility";

export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  equipment: string;
  difficulty: Difficulty;
  primary: string[];
  secondary: string[];
  met: number;
  /** The full tutorial, one string per numbered step. */
  steps: string[];
  tips: string[];
  mistakes: string[];
  breathing: string;
  prescription: { sets: string; reps: string; rest: string };
  /** Sensible defaults when the user coaches a single exercise. */
  sessionDefault: {
    mode: "reps" | "time";
    reps?: number;
    workSec?: number;
    restSec: number;
  };
}

export interface ProgramBlock {
  exerciseId: string;
  sets: number;
  reps?: number;
  workSec?: number;
  restSec: number;
}

export interface Program {
  id: string;
  name: string;
  level: Difficulty;
  focus: string;
  description: string;
  blocks: ProgramBlock[];
}
