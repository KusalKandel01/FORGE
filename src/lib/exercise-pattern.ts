/**
 * Movement pattern detection for the animated exercise model.
 *
 * Every exercise in the data packs is mapped to one of a handful of
 * movement patterns the model can animate. The model is an honest
 * stylized pattern preview (it says so in the UI), so a match only
 * needs the right movement family, not perfect anatomy.
 */

export type ModelPattern =
  | "squat"
  | "pushup"
  | "curl"
  | "plank"
  | "deadlift"
  | "lunge"
  | "press"
  | "row"
  | "crunch"
  | "jack"
  | "pullup"
  | "stretch"
  | "stand";

export const PATTERN_LABELS: Record<ModelPattern, string> = {
  squat: "Squat pattern",
  pushup: "Push up pattern",
  curl: "Arm curl pattern",
  plank: "Hold pattern",
  deadlift: "Hinge pattern",
  lunge: "Lunge pattern",
  press: "Overhead press pattern",
  row: "Row pattern",
  crunch: "Floor core pattern",
  jack: "Jumping jack pattern",
  pullup: "Pull up pattern",
  stretch: "Mobility pattern",
  stand: "Neutral stance",
};

const SIDE_CATEGORY_MOBILITY = ["yoga", "stretch", "mobility", "warm-up"];

export function patternForExercise(
  name: string,
  category: string
): ModelPattern {
  const n = name.toLowerCase();
  const c = category.toLowerCase();

  if (/squat/.test(n) && !/split/.test(n)) return "squat";
  if (/push[- ]?up|press[- ]?up/.test(n)) return "pushup";
  if (/curl/.test(n)) return "curl";
  if (/plank/.test(n)) return "plank";
  if (/deadlift|kettlebell swing|good morning|hip hinge/.test(n))
    return "deadlift";
  if (/lunge|split squat|step[- ]?up/.test(n)) return "lunge";
  if (/shoulder press|overhead press|military press|push press|arnold|lateral raise|front raise|fly|clean and press|thruster/.test(n))
    return "press";
  if (/row(?!ing machine)/.test(n)) return "row";
  if (/crunch|sit[- ]?up|leg raise|hollow|v[- ]?up/.test(n)) return "crunch";
  if (/jumping jack|star jump|seal jack/.test(n)) return "jack";
  if (/pull[- ]?up|chin[- ]?up/.test(n)) return "pullup";
  if (/burpee|thruster/.test(n)) return "squat";
  if (/mountain climber/.test(n)) return "plank";
  if (/\bdips?\b|bench dip/.test(n)) return "pushup";
  if (/glute bridge|hip thrust/.test(n)) return "crunch";
  if (/run|jog|walk|march|sprint|bike|cycling|jump rope|skipping|rowing machine|burpee/.test(n))
    return "stand";
  if (
    /stretch|yoga|mobility|foam|warm up|cool down|drill/.test(n) ||
    SIDE_CATEGORY_MOBILITY.some((k) => c.includes(k))
  )
    return "stretch";

  return "stand";
}
