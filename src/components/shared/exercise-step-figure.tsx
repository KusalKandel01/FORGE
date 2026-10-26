"use client";

/**
 * Static per step exercise diagrams, rendered from the same joint geometry
 * as the animated movement model.
 *
 * Why not AI images for exercises: the image model paints garbled caption
 * text onto instructional illustrations and takes 20-60s per step on a cold
 * cache. These diagrams are deterministic SVG poses interpolated along the
 * movement pattern (step 1 = start position, last step = finish position),
 * so they are instant, offline safe, always legible and contain zero text.
 */

import { PersonStanding } from "lucide-react";
import { patternForExercise, type ModelPattern } from "@/lib/exercise-pattern";

/** One static pose: rotations in degrees, root offset in px. */
interface JointPose {
  root?: number;
  torso?: number;
  thighF?: number;
  thighB?: number;
  shinF?: number;
  shinB?: number;
  upperF?: number;
  upperB?: number;
  foreF?: number;
  foreB?: number;
  // dedicated horizontal pose (plank / push up)
  hRoot?: number;
  hUpper?: number;
  hFore?: number;
  // dedicated lying pose (crunch)
  cTorso?: number;
  // dedicated bent pose (row)
  rUpper?: number;
  rFore?: number;
  // front figure (jumping jack)
  jRoot?: number;
  jUpperL?: number;
  jUpperR?: number;
  jThighL?: number;
  jThighR?: number;
}

const POSES: Record<ModelPattern, { start: JointPose; end: JointPose }> = {
  squat: {
    start: {},
    end: { root: 36, torso: 26, thighF: -76, thighB: -76, shinF: 84, shinB: 84, upperF: 84, upperB: 84, foreF: -6, foreB: -6 },
  },
  deadlift: {
    start: {},
    end: { root: 10, torso: 64, thighF: -26, thighB: -26, shinF: 24, shinB: 24 },
  },
  lunge: {
    start: {},
    end: { root: 30, torso: 8, thighF: -78, shinF: 76, thighB: 40, shinB: -105 },
  },
  curl: {
    start: {},
    end: { upperF: 6, upperB: 6, foreF: -125, foreB: -125 },
  },
  press: {
    start: {},
    end: { upperF: -166, upperB: -166, foreF: -6, foreB: -6 },
  },
  pullup: {
    start: { root: 14, upperF: -166, upperB: -166, foreF: -8, foreB: -8 },
    end: { root: 0, upperF: -160, upperB: -160, foreF: -14, foreB: -14 },
  },
  stand: {
    start: {},
    end: { root: 2, upperF: -2, upperB: 2 },
  },
  stretch: {
    start: {},
    end: { upperF: 360, upperB: -360 },
  },
  plank: {
    start: {},
    end: { hRoot: 2.5 },
  },
  pushup: {
    start: {},
    end: { hRoot: 11, hUpper: 32, hFore: -26 },
  },
  crunch: {
    start: {},
    end: { cTorso: 42 },
  },
  row: {
    start: {},
    end: { rUpper: 46, rFore: -8 },
  },
  jack: {
    start: {},
    end: { jRoot: -6, jUpperL: 150, jUpperR: -150, jThighL: 18, jThighR: -18 },
  },
};

const VOLT = "#C8FF2E";
const DIM = "#52525b";
const LIGHT = "#e4e4e7";

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Mirror the model's ease-in-out cycle: slow start, slow finish. */
function ease(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return 0.5 - 0.5 * Math.cos(Math.PI * c);
}

function poseAt(
  pattern: ModelPattern,
  stepIndex: number,
  totalSteps: number
): JointPose {
  const { start, end } = POSES[pattern];
  const t = totalSteps > 1 ? stepIndex / (totalSteps - 1) : 0;
  const p = ease(t);
  const out: JointPose = {};
  for (const key of Object.keys(end) as (keyof JointPose)[]) {
    out[key] = lerp(start[key] ?? 0, end[key] ?? 0, p);
  }
  return out;
}

const rot = (a: number, cx: number, cy: number) =>
  `rotate(${a.toFixed(2)} ${cx} ${cy})`;

/** Standing side figure with inline joint transforms. */
function StandingPose({ pose, pattern }: { pose: JointPose; pattern: ModelPattern }) {
  const stroke = { strokeLinecap: "round" as const, fill: "none" };
  return (
    <g transform={`translate(0 ${pose.root?.toFixed(2) ?? 0})`}>
      {pattern === "pullup" ? (
        <line x1="88" y1="16" x2="152" y2="16" stroke={VOLT} strokeWidth="5" opacity="0.55" {...stroke} />
      ) : null}
      {/* back leg */}
      <g transform={rot(pose.thighB ?? 0, 118, 102)}>
        <line x1="118" y1="102" x2="120" y2="146" stroke={DIM} strokeWidth="7" {...stroke} />
        <g transform={rot(pose.shinB ?? 0, 120, 146)}>
          <line x1="120" y1="146" x2="122" y2="180" stroke={DIM} strokeWidth="6" {...stroke} />
          <line x1="122" y1="180" x2="136" y2="181" stroke={DIM} strokeWidth="6" {...stroke} />
        </g>
      </g>
      {/* front leg */}
      <g transform={rot(pose.thighF ?? 0, 118, 102)}>
        <line x1="118" y1="102" x2="120" y2="146" stroke={VOLT} strokeWidth="7" {...stroke} />
        <g transform={rot(pose.shinF ?? 0, 120, 146)}>
          <line x1="120" y1="146" x2="122" y2="180" stroke={VOLT} strokeWidth="6" {...stroke} />
          <line x1="122" y1="180" x2="136" y2="181" stroke={VOLT} strokeWidth="6" {...stroke} />
        </g>
      </g>
      {/* torso + head + arms */}
      <g transform={rot(pose.torso ?? 0, 118, 102)}>
        <line x1="118" y1="102" x2="118" y2="54" stroke={LIGHT} strokeWidth="10" {...stroke} />
        <circle cx="121" cy="36" r="11" stroke={LIGHT} strokeWidth="5" fill="#09090b" />
        <g transform={rot(pose.upperB ?? 0, 118, 54)}>
          <line x1="118" y1="54" x2="121" y2="88" stroke={DIM} strokeWidth="6" {...stroke} />
          <g transform={rot(pose.foreB ?? 0, 121, 88)}>
            <line x1="121" y1="88" x2="124" y2="120" stroke={DIM} strokeWidth="5" {...stroke} />
            <circle cx="124" cy="120" r="3.5" fill={DIM} />
          </g>
        </g>
        <g transform={rot(pose.upperF ?? 0, 118, 54)}>
          <line x1="118" y1="54" x2="121" y2="88" stroke={VOLT} strokeWidth="6" {...stroke} />
          <g transform={rot(pose.foreF ?? 0, 121, 88)}>
            <line x1="121" y1="88" x2="124" y2="120" stroke={VOLT} strokeWidth="5" {...stroke} />
            <circle cx="124" cy="120" r="3.5" fill={VOLT} />
          </g>
        </g>
      </g>
    </g>
  );
}

/** Horizontal pose (plank / push up) with inline transforms. */
function HorizontalPose({ pose }: { pose: JointPose }) {
  const stroke = { strokeLinecap: "round" as const, fill: "none" };
  const lift = pose.hRoot ?? 0;
  return (
    <g transform={`translate(0 ${lift.toFixed(2)})`}>
      <line x1="95" y1="150" x2="52" y2="154" stroke={DIM} strokeWidth="7" {...stroke} />
      <line x1="52" y1="154" x2="42" y2="157" stroke={DIM} strokeWidth="6" {...stroke} />
      <line x1="95" y1="150" x2="52" y2="152" stroke={VOLT} strokeWidth="7" {...stroke} />
      <line x1="52" y1="152" x2="42" y2="156" stroke={VOLT} strokeWidth="6" {...stroke} />
      <line x1="95" y1="150" x2="150" y2="146" stroke={LIGHT} strokeWidth="10" {...stroke} />
      <circle cx="163" cy="141" r="10.5" stroke={LIGHT} strokeWidth="5" fill="#09090b" />
      <g transform={rot(pose.hUpper ?? 0, 150, 146)}>
        <line x1="150" y1="146" x2="146" y2="168" stroke={DIM} strokeWidth="6" {...stroke} />
        <g transform={rot(pose.hFore ?? 0, 146, 168)}>
          <line x1="146" y1="168" x2="143" y2="186" stroke={DIM} strokeWidth="5" {...stroke} />
        </g>
      </g>
      <g transform={rot(pose.hUpper ?? 0, 150, 146)}>
        <line x1="150" y1="146" x2="148" y2="168" stroke={VOLT} strokeWidth="6" {...stroke} />
        <g transform={rot(pose.hFore ?? 0, 148, 168)}>
          <line x1="148" y1="168" x2="145" y2="186" stroke={VOLT} strokeWidth="5" {...stroke} />
        </g>
      </g>
    </g>
  );
}

/** Crunch pose: lying, torso curls toward the knees. */
function CrunchPose({ pose }: { pose: JointPose }) {
  const stroke = { strokeLinecap: "round" as const, fill: "none" };
  return (
    <g>
      <line x1="100" y1="176" x2="128" y2="150" stroke={DIM} strokeWidth="7" {...stroke} />
      <line x1="128" y1="150" x2="124" y2="182" stroke={DIM} strokeWidth="6" {...stroke} />
      <line x1="124" y1="182" x2="138" y2="183" stroke={DIM} strokeWidth="6" {...stroke} />
      <line x1="100" y1="176" x2="130" y2="148" stroke={VOLT} strokeWidth="7" {...stroke} />
      <line x1="130" y1="148" x2="127" y2="182" stroke={VOLT} strokeWidth="6" {...stroke} />
      <g transform={rot(pose.cTorso ?? 0, 100, 176)}>
        <line x1="100" y1="176" x2="42" y2="172" stroke={LIGHT} strokeWidth="10" {...stroke} />
        <circle cx="30" cy="169" r="10.5" stroke={LIGHT} strokeWidth="5" fill="#09090b" />
        <line x1="46" y1="176" x2="62" y2="188" stroke={VOLT} strokeWidth="5" {...stroke} />
      </g>
    </g>
  );
}

/** Row pose: bent over, elbow drives back. */
function RowPose({ pose }: { pose: JointPose }) {
  const stroke = { strokeLinecap: "round" as const, fill: "none" };
  return (
    <g>
      <line x1="96" y1="186" x2="176" y2="186" stroke={VOLT} strokeWidth="5" opacity="0.55" {...stroke} />
      <line x1="100" y1="122" x2="104" y2="152" stroke={DIM} strokeWidth="7" {...stroke} />
      <line x1="104" y1="152" x2="106" y2="182" stroke={DIM} strokeWidth="6" {...stroke} />
      <line x1="106" y1="182" x2="120" y2="183" stroke={DIM} strokeWidth="6" {...stroke} />
      <line x1="100" y1="122" x2="106" y2="152" stroke={VOLT} strokeWidth="7" {...stroke} />
      <line x1="106" y1="152" x2="108" y2="182" stroke={VOLT} strokeWidth="6" {...stroke} />
      <line x1="100" y1="122" x2="142" y2="148" stroke={LIGHT} strokeWidth="10" {...stroke} />
      <circle cx="155" cy="152" r="10.5" stroke={LIGHT} strokeWidth="5" fill="#09090b" />
      <g transform={rot(pose.rUpper ?? 0, 142, 148)}>
        <line x1="142" y1="148" x2="140" y2="170" stroke={DIM} strokeWidth="6" {...stroke} />
        <g transform={rot(pose.rFore ?? 0, 140, 170)}>
          <line x1="140" y1="170" x2="138" y2="186" stroke={DIM} strokeWidth="5" {...stroke} />
          <circle cx="138" cy="186" r="3.5" fill={DIM} />
        </g>
      </g>
      <g transform={rot(pose.rUpper ?? 0, 142, 148)}>
        <line x1="142" y1="148" x2="143" y2="170" stroke={VOLT} strokeWidth="6" {...stroke} />
        <g transform={rot(pose.rFore ?? 0, 143, 170)}>
          <line x1="143" y1="170" x2="141" y2="186" stroke={VOLT} strokeWidth="5" {...stroke} />
          <circle cx="141" cy="186" r="3.5" fill={VOLT} />
        </g>
      </g>
    </g>
  );
}

/** Jumping jack front figure with inline transforms. */
function JackPose({ pose }: { pose: JointPose }) {
  const stroke = { strokeLinecap: "round" as const, fill: "none" };
  return (
    <g transform={`translate(0 ${(pose.jRoot ?? 0).toFixed(2)})`}>
      <g transform={rot(pose.jThighL ?? 0, 112, 102)}>
        <line x1="112" y1="102" x2="110" y2="146" stroke={VOLT} strokeWidth="7" {...stroke} />
        <line x1="110" y1="146" x2="109" y2="180" stroke={VOLT} strokeWidth="6" {...stroke} />
        <line x1="109" y1="180" x2="99" y2="181" stroke={VOLT} strokeWidth="6" {...stroke} />
      </g>
      <g transform={rot(pose.jThighR ?? 0, 128, 102)}>
        <line x1="128" y1="102" x2="130" y2="146" stroke={DIM} strokeWidth="7" {...stroke} />
        <line x1="130" y1="146" x2="131" y2="180" stroke={DIM} strokeWidth="6" {...stroke} />
        <line x1="131" y1="180" x2="141" y2="181" stroke={DIM} strokeWidth="6" {...stroke} />
      </g>
      <line x1="120" y1="102" x2="120" y2="56" stroke={LIGHT} strokeWidth="10" {...stroke} />
      <circle cx="120" cy="38" r="11" stroke={LIGHT} strokeWidth="5" fill="#09090b" />
      <g transform={rot(pose.jUpperL ?? 0, 108, 58)}>
        <line x1="108" y1="58" x2="104" y2="90" stroke={VOLT} strokeWidth="6" {...stroke} />
        <line x1="104" y1="90" x2="102" y2="120" stroke={VOLT} strokeWidth="5" {...stroke} />
        <circle cx="102" cy="120" r="3.5" fill={VOLT} />
      </g>
      <g transform={rot(pose.jUpperR ?? 0, 132, 58)}>
        <line x1="132" y1="58" x2="136" y2="90" stroke={DIM} strokeWidth="6" {...stroke} />
        <line x1="136" y1="90" x2="138" y2="120" stroke={DIM} strokeWidth="5" {...stroke} />
        <circle cx="138" cy="120" r="3.5" fill={DIM} />
      </g>
    </g>
  );
}

/** One static diagram: the movement pattern frozen at this step's phase. */
export function ExerciseStepFigure({
  exerciseName,
  category,
  stepIndex,
  totalSteps,
}: {
  exerciseName: string;
  category: string;
  stepIndex: number;
  totalSteps: number;
}) {
  const pattern = patternForExercise(exerciseName, category);
  const pose = poseAt(pattern, stepIndex, totalSteps);
  return (
    <svg
      viewBox="0 0 240 200"
      className="h-44 w-full border border-border bg-secondary/30"
      role="img"
      aria-label={`Step ${stepIndex + 1} position diagram for ${exerciseName}`}
    >
      <line x1="28" y1="186" x2="212" y2="186" stroke="#27272a" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="118" cy="188" rx="56" ry="4" fill={VOLT} opacity="0.07" />
      {pattern === "pushup" || pattern === "plank" ? (
        <HorizontalPose pose={pose} />
      ) : pattern === "crunch" ? (
        <CrunchPose pose={pose} />
      ) : pattern === "row" ? (
        <RowPose pose={pose} />
      ) : pattern === "jack" ? (
        <JackPose pose={pose} />
      ) : (
        <StandingPose pose={pose} pattern={pattern} />
      )}
    </svg>
  );
}

/**
 * Exercise tutorial step list: every written step pairs with a static
 * position diagram. Instant, offline, zero text inside the picture.
 */
export function ExerciseStepImages({
  exerciseName,
  category,
  steps,
}: {
  exerciseName: string;
  category: string;
  steps: string[];
}) {
  if (steps.length === 0) return null;
  return (
    <div>
      <p className="flex items-center gap-1.5 font-head text-[11px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
        <PersonStanding className="h-3.5 w-3.5 text-volt" aria-hidden />
        Step by step, with pictures
      </p>
      <ol className="mt-3 space-y-4">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="font-display text-2xl leading-none text-volt">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-relaxed">{step}</p>
              <div className="mt-2 max-w-[240px]">
                <ExerciseStepFigure
                  exerciseName={exerciseName}
                  category={category}
                  stepIndex={i}
                  totalSteps={steps.length}
                />
              </div>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs leading-snug text-muted-foreground">
        Position diagrams follow the movement model above: first step is the
        start position, the last step is the finish. The written steps are the
        source of truth for form.
      </p>
    </div>
  );
}
