"use client";

/**
 * Animated movement model: a stylized SVG mannequin that demonstrates
 * the exercise pattern on loop. Pure SVG plus CSS keyframes, so it works
 * fully offline with zero image assets.
 *
 * It is deliberately labeled a pattern preview in the UI: the figure
 * shows the movement family (squat, hinge, press...) so the user gets a
 * moving visual next to the written steps, not fake anatomy advice.
 */

import { useMemo, useState } from "react";
import { Pause, Play, PersonStanding } from "lucide-react";
import { PATTERN_LABELS, type ModelPattern } from "@/lib/exercise-pattern";

const BASE_DUR: Record<ModelPattern, number> = {
  squat: 3.4,
  pushup: 2.6,
  curl: 2.4,
  plank: 3.6,
  deadlift: 3.2,
  lunge: 3.2,
  press: 2.8,
  row: 2.8,
  crunch: 2.8,
  jack: 1.6,
  pullup: 2.6,
  stretch: 4.2,
  stand: 3.6,
};

const MODEL_CSS = `
.fm-part { transform-box: view-box; fill: none; }
.fm-torso { transform-origin: 118px 102px; }
.fm-thigh-f, .fm-thigh-b { transform-origin: 118px 102px; }
.fm-shin-f, .fm-shin-b { transform-origin: 120px 146px; }
.fm-upper-f, .fm-upper-b { transform-origin: 118px 54px; }
.fm-fore-f, .fm-fore-b { transform-origin: 121px 88px; }

/* dedicated poses */
.fp-root { transform-origin: 118px 102px; }
.fp-upper { transform-origin: 150px 146px; }
.fp-fore { transform-origin: 146px 168px; }
.fc-root { transform-origin: 118px 102px; }
.fc-torso { transform-origin: 100px 176px; }
.fr-upper { transform-origin: 142px 148px; }
.fr-fore { transform-origin: 140px 170px; }

/* front figure (jumping jack) */
.fj-upper-l { transform-origin: 108px 58px; }
.fj-upper-r { transform-origin: 132px 58px; }
.fj-thigh-l { transform-origin: 112px 102px; }
.fj-thigh-r { transform-origin: 128px 102px; }

.fmA, .fmA-root, .fmA-torso, .fmA-thigh-f, .fmA-thigh-b, .fmA-shin-f,
.fmA-shin-b, .fmA-upper-f, .fmA-upper-b, .fmA-fore-f, .fmA-fore-b,
.fpA-root, .fpA-upper, .fcA-torso, .frA-upper, .frA-fore,
.fjA-upper-l, .fjA-upper-r, .fjA-thigh-l, .fjA-thigh-r {
  animation-play-state: var(--fm-play, running);
}

/* SQUAT */
.fmA-squat-root { animation: fmSquatRoot var(--fm-dur, 3.4s) ease-in-out infinite; }
.fmA-squat-torso { animation: fmSquatTorso var(--fm-dur, 3.4s) ease-in-out infinite; }
.fmA-squat-thigh-f, .fmA-squat-thigh-b { animation: fmSquatThigh var(--fm-dur, 3.4s) ease-in-out infinite; }
.fmA-squat-shin-f, .fmA-squat-shin-b { animation: fmSquatShin var(--fm-dur, 3.4s) ease-in-out infinite; }
.fmA-squat-upper-f, .fmA-squat-upper-b { animation: fmSquatUpper var(--fm-dur, 3.4s) ease-in-out infinite; }
.fmA-squat-fore-f, .fmA-squat-fore-b { animation: fmSquatFore var(--fm-dur, 3.4s) ease-in-out infinite; }
@keyframes fmSquatRoot { 0%, 100% { transform: translateY(0); } 42%, 58% { transform: translateY(36px); } }
@keyframes fmSquatTorso { 0%, 100% { transform: rotate(0deg); } 42%, 58% { transform: rotate(26deg); } }
@keyframes fmSquatThigh { 0%, 100% { transform: rotate(0deg); } 42%, 58% { transform: rotate(-76deg); } }
@keyframes fmSquatShin { 0%, 100% { transform: rotate(0deg); } 42%, 58% { transform: rotate(84deg); } }
@keyframes fmSquatUpper { 0%, 100% { transform: rotate(0deg); } 42%, 58% { transform: rotate(84deg); } }
@keyframes fmSquatFore { 0%, 100% { transform: rotate(0deg); } 42%, 58% { transform: rotate(-6deg); } }

/* DEADLIFT (hinge) */
.fmA-deadlift-root { animation: fmDeadRoot var(--fm-dur, 3.2s) ease-in-out infinite; }
.fmA-deadlift-torso { animation: fmDeadTorso var(--fm-dur, 3.2s) ease-in-out infinite; }
.fmA-deadlift-thigh-f, .fmA-deadlift-thigh-b { animation: fmDeadThigh var(--fm-dur, 3.2s) ease-in-out infinite; }
.fmA-deadlift-shin-f, .fmA-deadlift-shin-b { animation: fmDeadShin var(--fm-dur, 3.2s) ease-in-out infinite; }
@keyframes fmDeadRoot { 0%, 100% { transform: translateY(0); } 45%, 55% { transform: translateY(10px); } }
@keyframes fmDeadTorso { 0%, 100% { transform: rotate(0deg); } 45%, 55% { transform: rotate(64deg); } }
@keyframes fmDeadThigh { 0%, 100% { transform: rotate(0deg); } 45%, 55% { transform: rotate(-26deg); } }
@keyframes fmDeadShin { 0%, 100% { transform: rotate(0deg); } 45%, 55% { transform: rotate(24deg); } }

/* LUNGE */
.fmA-lunge-root { animation: fmLungeRoot var(--fm-dur, 3.2s) ease-in-out infinite; }
.fmA-lunge-torso { animation: fmLungeTorso var(--fm-dur, 3.2s) ease-in-out infinite; }
.fmA-lunge-thigh-f { animation: fmLungeThighF var(--fm-dur, 3.2s) ease-in-out infinite; }
.fmA-lunge-shin-f { animation: fmLungeShinF var(--fm-dur, 3.2s) ease-in-out infinite; }
.fmA-lunge-thigh-b { animation: fmLungeThighB var(--fm-dur, 3.2s) ease-in-out infinite; }
.fmA-lunge-shin-b { animation: fmLungeShinB var(--fm-dur, 3.2s) ease-in-out infinite; }
@keyframes fmLungeRoot { 0%, 100% { transform: translateY(0); } 45%, 55% { transform: translateY(30px); } }
@keyframes fmLungeTorso { 0%, 100% { transform: rotate(0deg); } 45%, 55% { transform: rotate(8deg); } }
@keyframes fmLungeThighF { 0%, 100% { transform: rotate(0deg); } 45%, 55% { transform: rotate(-78deg); } }
@keyframes fmLungeShinF { 0%, 100% { transform: rotate(0deg); } 45%, 55% { transform: rotate(76deg); } }
@keyframes fmLungeThighB { 0%, 100% { transform: rotate(0deg); } 45%, 55% { transform: rotate(40deg); } }
@keyframes fmLungeShinB { 0%, 100% { transform: rotate(0deg); } 45%, 55% { transform: rotate(-105deg); } }

/* CURL */
.fmA-curl-upper-f, .fmA-curl-upper-b { animation: fmCurlUpper var(--fm-dur, 2.4s) ease-in-out infinite; }
.fmA-curl-fore-f, .fmA-curl-fore-b { animation: fmCurlFore var(--fm-dur, 2.4s) ease-in-out infinite; }
@keyframes fmCurlUpper { 0%, 100% { transform: rotate(0deg); } 45%, 55% { transform: rotate(6deg); } }
@keyframes fmCurlFore { 0%, 100% { transform: rotate(0deg); } 45%, 55% { transform: rotate(-125deg); } }

/* PRESS */
.fmA-press-upper-f, .fmA-press-upper-b { animation: fmPressUpper var(--fm-dur, 2.8s) ease-in-out infinite; }
.fmA-press-fore-f, .fmA-press-fore-b { animation: fmPressFore var(--fm-dur, 2.8s) ease-in-out infinite; }
@keyframes fmPressUpper { 0%, 100% { transform: rotate(0deg); } 45%, 55% { transform: rotate(-166deg); } }
@keyframes fmPressFore { 0%, 100% { transform: rotate(0deg); } 45%, 55% { transform: rotate(-6deg); } }

/* PULL UP */
.fmA-pullup-root { animation: fmPullRoot var(--fm-dur, 2.6s) ease-in-out infinite; }
.fmA-pullup-upper-f, .fmA-pullup-upper-b { animation: fmPullUpper var(--fm-dur, 2.6s) ease-in-out infinite; }
.fmA-pullup-fore-f, .fmA-pullup-fore-b { animation: fmPullFore var(--fm-dur, 2.6s) ease-in-out infinite; }
@keyframes fmPullRoot { 0%, 100% { transform: translateY(14px); } 45%, 55% { transform: translateY(0); } }
@keyframes fmPullUpper { 0%, 100% { transform: rotate(-166deg); } 45%, 55% { transform: rotate(-160deg); } }
@keyframes fmPullFore { 0%, 100% { transform: rotate(-8deg); } 45%, 55% { transform: rotate(-14deg); } }

/* STAND (neutral sway) */
.fmA-stand-root { animation: fmStandRoot var(--fm-dur, 3.6s) ease-in-out infinite; }
.fmA-stand-upper-f { animation: fmStandUpperF var(--fm-dur, 3.6s) ease-in-out infinite; }
.fmA-stand-upper-b { animation: fmStandUpperB var(--fm-dur, 3.6s) ease-in-out infinite; }
@keyframes fmStandRoot { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(2px); } }
@keyframes fmStandUpperF { 0%, 100% { transform: rotate(2deg); } 50% { transform: rotate(-2deg); } }
@keyframes fmStandUpperB { 0%, 100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }

/* STRETCH (slow full arm circles) */
.fmA-stretch-upper-f { animation: fmStretchUpperF var(--fm-dur, 4.2s) linear infinite; }
.fmA-stretch-upper-b { animation: fmStretchUpperB var(--fm-dur, 4.2s) linear infinite; }
.fmA-stretch-root { animation: fmStandRoot var(--fm-dur, 4.2s) ease-in-out infinite; }
@keyframes fmStretchUpperF { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes fmStretchUpperB { 0% { transform: rotate(0deg); } 100% { transform: rotate(-360deg); } }

/* PLANK (dedicated pose, breathing) */
.fpA-plank-root { animation: fmPlankRoot var(--fm-dur, 3.6s) ease-in-out infinite; }
@keyframes fmPlankRoot { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(2.5px); } }

/* PUSH UP (dedicated pose) */
.fpA-pushup-root { animation: fmPushRoot var(--fm-dur, 2.6s) ease-in-out infinite; }
.fpA-pushup-upper { animation: fmPushUpper var(--fm-dur, 2.6s) ease-in-out infinite; }
.fpA-pushup-fore { animation: fmPushFore var(--fm-dur, 2.6s) ease-in-out infinite; }
@keyframes fmPushRoot { 0%, 100% { transform: translateY(0); } 45%, 55% { transform: translateY(11px); } }
@keyframes fmPushUpper { 0%, 100% { transform: rotate(0deg); } 45%, 55% { transform: rotate(32deg); } }
@keyframes fmPushFore { 0%, 100% { transform: rotate(0deg); } 45%, 55% { transform: rotate(-26deg); } }

/* CRUNCH (dedicated lying pose) */
.fcA-crunch-torso { animation: fmCrunchTorso var(--fm-dur, 2.8s) ease-in-out infinite; }
@keyframes fmCrunchTorso { 0%, 100% { transform: rotate(0deg); } 45%, 55% { transform: rotate(42deg); } }

/* ROW (dedicated bent over pose) */
.frA-row-upper { animation: fmRowUpper var(--fm-dur, 2.8s) ease-in-out infinite; }
.frA-row-fore { animation: fmRowFore var(--fm-dur, 2.8s) ease-in-out infinite; }
@keyframes fmRowUpper { 0%, 100% { transform: rotate(0deg); } 45%, 55% { transform: rotate(46deg); } }
@keyframes fmRowFore { 0%, 100% { transform: rotate(0deg); } 45%, 55% { transform: rotate(-8deg); } }

/* JUMPING JACK (front figure) */
.fjA-jack-root { animation: fmJackRoot var(--fm-dur, 1.6s) ease-in-out infinite; }
.fjA-jack-upper-l { animation: fmJackUpperL var(--fm-dur, 1.6s) ease-in-out infinite; }
.fjA-jack-upper-r { animation: fmJackUpperR var(--fm-dur, 1.6s) ease-in-out infinite; }
.fjA-jack-thigh-l { animation: fmJackThighL var(--fm-dur, 1.6s) ease-in-out infinite; }
.fjA-jack-thigh-r { animation: fmJackThighR var(--fm-dur, 1.6s) ease-in-out infinite; }
@keyframes fmJackRoot { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes fmJackUpperL { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(150deg); } }
@keyframes fmJackUpperR { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-150deg); } }
@keyframes fmJackThighL { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(18deg); } }
@keyframes fmJackThighR { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-18deg); } }
`;

const anim = (pattern: ModelPattern, part: string) =>
  `fmA-${pattern}-${part}`;

/** Which parts animate per pattern on the standing side figure. */
function partClass(
  pattern: ModelPattern,
  part: "torso" | "thigh-f" | "thigh-b" | "shin-f" | "shin-b" | "upper-f" | "upper-b" | "fore-f" | "fore-b"
): string {
  // Only these patterns animate the given parts on the standing figure.
  const animated: ModelPattern[] = [
    "squat",
    "deadlift",
    "lunge",
    "curl",
    "press",
    "pullup",
    "stand",
    "stretch",
  ];
  if (!animated.includes(pattern)) return "";
  return ` ${anim(pattern, part)}`;
}

function StandingFigure({ pattern }: { pattern: ModelPattern }) {
  const stroke = { strokeLinecap: "round" as const, fill: "none" };
  return (
    <>
      {pattern === "pullup" ? (
        <line x1="88" y1="16" x2="152" y2="16" stroke="#C8FF2E" strokeWidth="5" opacity="0.55" />
      ) : null}
      <g className={`fm-part fm-root${pattern === "squat" ? ` ${anim(pattern, "root")}` : ""}${pattern === "deadlift" ? ` ${anim(pattern, "root")}` : ""}${pattern === "lunge" ? ` ${anim(pattern, "root")}` : ""}${pattern === "pullup" ? ` ${anim(pattern, "root")}` : ""}${pattern === "stand" || pattern === "stretch" ? ` ${anim(pattern, "root")}` : ""}`}>
        {/* back leg */}
        <g className={`fm-part fm-thigh-b${partClass(pattern, "thigh-b")}`}>
          <line x1="118" y1="102" x2="120" y2="146" stroke="#52525b" strokeWidth="7" {...stroke} />
          <g className={`fm-part fm-shin-b${partClass(pattern, "shin-b")}`}>
            <line x1="120" y1="146" x2="122" y2="180" stroke="#52525b" strokeWidth="6" {...stroke} />
            <line x1="122" y1="180" x2="136" y2="181" stroke="#52525b" strokeWidth="6" {...stroke} />
          </g>
        </g>
        {/* front leg */}
        <g className={`fm-part fm-thigh-f${partClass(pattern, "thigh-f")}`}>
          <line x1="118" y1="102" x2="120" y2="146" stroke="#C8FF2E" strokeWidth="7" {...stroke} />
          <g className={`fm-part fm-shin-f${partClass(pattern, "shin-f")}`}>
            <line x1="120" y1="146" x2="122" y2="180" stroke="#C8FF2E" strokeWidth="6" {...stroke} />
            <line x1="122" y1="180" x2="136" y2="181" stroke="#C8FF2E" strokeWidth="6" {...stroke} />
          </g>
        </g>
        {/* torso + head + arms */}
        <g className={`fm-part fm-torso${partClass(pattern, "torso")}`}>
          <line x1="118" y1="102" x2="118" y2="54" stroke="#e4e4e7" strokeWidth="10" {...stroke} />
          <circle cx="121" cy="36" r="11" stroke="#e4e4e7" strokeWidth="5" fill="#09090b" />
          {/* back arm */}
          <g className={`fm-part fm-upper-b${partClass(pattern, "upper-b")}`}>
            <line x1="118" y1="54" x2="121" y2="88" stroke="#52525b" strokeWidth="6" {...stroke} />
            <g className={`fm-part fm-fore-b${partClass(pattern, "fore-b")}`}>
              <line x1="121" y1="88" x2="124" y2="120" stroke="#52525b" strokeWidth="5" {...stroke} />
              <circle cx="124" cy="120" r="3.5" fill="#52525b" />
            </g>
          </g>
          {/* front arm */}
          <g className={`fm-part fm-upper-f${partClass(pattern, "upper-f")}`}>
            <line x1="118" y1="54" x2="121" y2="88" stroke="#C8FF2E" strokeWidth="6" {...stroke} />
            <g className={`fm-part fm-fore-f${partClass(pattern, "fore-f")}`}>
              <line x1="121" y1="88" x2="124" y2="120" stroke="#C8FF2E" strokeWidth="5" {...stroke} />
              <circle cx="124" cy="120" r="3.5" fill="#C8FF2E" />
            </g>
          </g>
        </g>
      </g>
    </>
  );
}

/** Push up / plank: dedicated horizontal pose, hands on the floor. */
function PlankFigure({ pattern }: { pattern: ModelPattern }) {
  const stroke = { strokeLinecap: "round" as const, fill: "none" };
  const push = pattern === "pushup";
  return (
    <g className={`fp-root ${push ? "fpA-pushup-root" : "fpA-plank-root"}`}>
      {/* back leg */}
      <line x1="95" y1="150" x2="52" y2="154" stroke="#52525b" strokeWidth="7" {...stroke} />
      <line x1="52" y1="154" x2="42" y2="157" stroke="#52525b" strokeWidth="6" {...stroke} />
      {/* front leg */}
      <line x1="95" y1="150" x2="52" y2="152" stroke="#C8FF2E" strokeWidth="7" {...stroke} />
      <line x1="52" y1="152" x2="42" y2="156" stroke="#C8FF2E" strokeWidth="6" {...stroke} />
      {/* torso */}
      <line x1="95" y1="150" x2="150" y2="146" stroke="#e4e4e7" strokeWidth="10" {...stroke} />
      <circle cx="163" cy="141" r="10.5" stroke="#e4e4e7" strokeWidth="5" fill="#09090b" />
      {/* back arm */}
      <g className={`fp-upper ${push ? "fpA-pushup-upper" : ""}`}>
        <line x1="150" y1="146" x2="146" y2="168" stroke="#52525b" strokeWidth="6" {...stroke} />
        <g className={`fp-fore ${push ? "fpA-pushup-fore" : ""}`}>
          <line x1="146" y1="168" x2="143" y2="186" stroke="#52525b" strokeWidth="5" {...stroke} />
        </g>
      </g>
      {/* front arm */}
      <g className={`fp-upper ${push ? "fpA-pushup-upper" : ""}`}>
        <line x1="150" y1="146" x2="148" y2="168" stroke="#C8FF2E" strokeWidth="6" {...stroke} />
        <g className={`fp-fore ${push ? "fpA-pushup-fore" : ""}`}>
          <line x1="148" y1="168" x2="145" y2="186" stroke="#C8FF2E" strokeWidth="5" {...stroke} />
        </g>
      </g>
    </g>
  );
}

/** Crunch: dedicated lying pose, torso curls up toward the knees. */
function CrunchFigure() {
  const stroke = { strokeLinecap: "round" as const, fill: "none" };
  return (
    <g className="fc-root">
      {/* legs: bent, knees up */}
      <line x1="100" y1="176" x2="128" y2="150" stroke="#52525b" strokeWidth="7" {...stroke} />
      <line x1="128" y1="150" x2="124" y2="182" stroke="#52525b" strokeWidth="6" {...stroke} />
      <line x1="124" y1="182" x2="138" y2="183" stroke="#52525b" strokeWidth="6" {...stroke} />
      <line x1="100" y1="176" x2="130" y2="148" stroke="#C8FF2E" strokeWidth="7" {...stroke} />
      <line x1="130" y1="148" x2="127" y2="182" stroke="#C8FF2E" strokeWidth="6" {...stroke} />
      {/* torso curls up */}
      <g className="fc-torso fcA-crunch-torso">
        <line x1="100" y1="176" x2="42" y2="172" stroke="#e4e4e7" strokeWidth="10" {...stroke} />
        <circle cx="30" cy="169" r="10.5" stroke="#e4e4e7" strokeWidth="5" fill="#09090b" />
        <line x1="46" y1="176" x2="62" y2="188" stroke="#C8FF2E" strokeWidth="5" {...stroke} />
      </g>
    </g>
  );
}

/** Row: dedicated bent over pose pulling the elbow back. */
function RowFigure() {
  const stroke = { strokeLinecap: "round" as const, fill: "none" };
  return (
    <g className="fc-root">
      {/* ground bar */}
      <line x1="96" y1="186" x2="176" y2="186" stroke="#C8FF2E" strokeWidth="5" opacity="0.55" {...stroke} />
      {/* legs */}
      <line x1="100" y1="122" x2="104" y2="152" stroke="#52525b" strokeWidth="7" {...stroke} />
      <line x1="104" y1="152" x2="106" y2="182" stroke="#52525b" strokeWidth="6" {...stroke} />
      <line x1="106" y1="182" x2="120" y2="183" stroke="#52525b" strokeWidth="6" {...stroke} />
      <line x1="100" y1="122" x2="106" y2="152" stroke="#C8FF2E" strokeWidth="7" {...stroke} />
      <line x1="106" y1="152" x2="108" y2="182" stroke="#C8FF2E" strokeWidth="6" {...stroke} />
      {/* bent torso */}
      <line x1="100" y1="122" x2="142" y2="148" stroke="#e4e4e7" strokeWidth="10" {...stroke} />
      <circle cx="155" cy="152" r="10.5" stroke="#e4e4e7" strokeWidth="5" fill="#09090b" />
      {/* arms pull the elbow back and up */}
      <g className="fr-upper frA-row-upper">
        <line x1="142" y1="148" x2="140" y2="170" stroke="#52525b" strokeWidth="6" {...stroke} />
        <g className="fr-fore frA-row-fore">
          <line x1="140" y1="170" x2="138" y2="186" stroke="#52525b" strokeWidth="5" {...stroke} />
          <circle cx="138" cy="186" r="3.5" fill="#52525b" />
        </g>
      </g>
      <g className="fr-upper frA-row-upper">
        <line x1="142" y1="148" x2="143" y2="170" stroke="#C8FF2E" strokeWidth="6" {...stroke} />
        <g className="fr-fore frA-row-fore">
          <line x1="143" y1="170" x2="141" y2="186" stroke="#C8FF2E" strokeWidth="5" {...stroke} />
          <circle cx="141" cy="186" r="3.5" fill="#C8FF2E" />
        </g>
      </g>
    </g>
  );
}

/** Jumping jack: front view figure, arms and legs spread. */
function JackFigure() {
  const stroke = { strokeLinecap: "round" as const, fill: "none" };
  return (
    <g className="fc-root fjA-jack-root">
      {/* legs */}
      <g className="fm-part fj-thigh-l fjA-jack-thigh-l">
        <line x1="112" y1="102" x2="110" y2="146" stroke="#C8FF2E" strokeWidth="7" {...stroke} />
        <line x1="110" y1="146" x2="109" y2="180" stroke="#C8FF2E" strokeWidth="6" {...stroke} />
        <line x1="109" y1="180" x2="99" y2="181" stroke="#C8FF2E" strokeWidth="6" {...stroke} />
      </g>
      <g className="fm-part fj-thigh-r fjA-jack-thigh-r">
        <line x1="128" y1="102" x2="130" y2="146" stroke="#52525b" strokeWidth="7" {...stroke} />
        <line x1="130" y1="146" x2="131" y2="180" stroke="#52525b" strokeWidth="6" {...stroke} />
        <line x1="131" y1="180" x2="141" y2="181" stroke="#52525b" strokeWidth="6" {...stroke} />
      </g>
      {/* torso + head */}
      <line x1="120" y1="102" x2="120" y2="56" stroke="#e4e4e7" strokeWidth="10" {...stroke} />
      <circle cx="120" cy="38" r="11" stroke="#e4e4e7" strokeWidth="5" fill="#09090b" />
      {/* arms */}
      <g className="fm-part fj-upper-l fjA-jack-upper-l">
        <line x1="108" y1="58" x2="104" y2="90" stroke="#C8FF2E" strokeWidth="6" {...stroke} />
        <line x1="104" y1="90" x2="102" y2="120" stroke="#C8FF2E" strokeWidth="5" {...stroke} />
        <circle cx="102" cy="120" r="3.5" fill="#C8FF2E" />
      </g>
      <g className="fm-part fj-upper-r fjA-jack-upper-r">
        <line x1="132" y1="58" x2="136" y2="90" stroke="#52525b" strokeWidth="6" {...stroke} />
        <line x1="136" y1="90" x2="138" y2="120" stroke="#52525b" strokeWidth="5" {...stroke} />
        <circle cx="138" cy="120" r="3.5" fill="#52525b" />
      </g>
    </g>
  );
}

function Figure({ pattern }: { pattern: ModelPattern }) {
  switch (pattern) {
    case "pushup":
    case "plank":
      return <PlankFigure pattern={pattern} />;
    case "crunch":
      return <CrunchFigure />;
    case "row":
      return <RowFigure />;
    case "jack":
      return <JackFigure />;
    default:
      return <StandingFigure pattern={pattern} />;
  }
}

const SPEEDS = [1, 1.5, 0.5] as const;

export function ExerciseModel({
  pattern,
  compact = false,
  className = "",
}: {
  pattern: ModelPattern;
  compact?: boolean;
  className?: string;
}) {
  const [playing, setPlaying] = useState(true);
  const [speedIdx, setSpeedIdx] = useState(0);
  const dur = useMemo(
    () => `${(BASE_DUR[pattern] / SPEEDS[speedIdx]).toFixed(2)}s`,
    [pattern, speedIdx]
  );

  return (
    <div
      className={`border border-border bg-secondary/30 ${className}`}
      role="img"
      aria-label={`Animated movement model: ${PATTERN_LABELS[pattern]}`}
    >
      <style dangerouslySetInnerHTML={{ __html: MODEL_CSS }} />
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <p className="flex items-center gap-1.5 font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <PersonStanding className="h-3.5 w-3.5 text-volt" aria-hidden />
          Model: {PATTERN_LABELS[pattern]}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause the model" : "Play the model"}
            className="flex h-8 w-8 items-center justify-center border border-border text-volt transition-colors hover:border-volt"
          >
            {playing ? (
              <Pause className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Play className="h-3.5 w-3.5" aria-hidden />
            )}
          </button>
          <button
            type="button"
            onClick={() => setSpeedIdx((i) => (i + 1) % SPEEDS.length)}
            aria-label="Change model speed"
            className="flex h-8 min-w-8 items-center justify-center border border-border px-1 font-head text-[10px] font-bold text-volt transition-colors hover:border-volt"
          >
            {SPEEDS[speedIdx]}x
          </button>
        </div>
      </div>
      <div className="flex justify-center px-2 py-2">
        <svg
          viewBox="0 0 240 200"
          className={compact ? "h-40 w-auto" : "h-52 w-auto sm:h-60"}
          style={
            {
              "--fm-dur": dur,
              "--fm-play": playing ? "running" : "paused",
            } as React.CSSProperties
          }
          aria-hidden
        >
          {/* floor + shadow */}
          <line x1="28" y1="186" x2="212" y2="186" stroke="#27272a" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="118" cy="188" rx="56" ry="4" fill="#C8FF2E" opacity="0.07" />
          <Figure pattern={pattern} />
        </svg>
      </div>
      {!compact ? (
        <p className="border-t border-border px-3 py-2 text-[11px] leading-snug text-muted-foreground">
          Stylized movement pattern on loop. Use it to picture the flow, the
          written steps below are the source of truth for form.
        </p>
      ) : null}
    </div>
  );
}
