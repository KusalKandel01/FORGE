"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Dumbbell,
  FastForward,
  Pause,
  Play,
  Plus,
  Search,
  Square,
  Timer,
  Volume2,
  VolumeX,
  Wind,
  X,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { StepImages } from "@/components/shared/step-images";
import { TopicMedia } from "@/components/shared/topic-media";
import { newWorkout, todayKey, useFitness } from "./store";
import {
  blockFromExercise,
  blockSummary,
  blockWorkSeconds,
  buildCoachSteps,
  CATEGORIES,
  estimateCalories,
  EXERCISES,
  getExercise,
  plannedSeconds,
  PROGRAMS,
  type Exercise,
  type ExerciseCategory,
  type Program,
  type ProgramBlock,
} from "./exercises";

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

const chipClass =
  "h-11 border border-border bg-secondary/40 px-3 font-head text-[11px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:border-volt hover:text-volt";

const voltBtn =
  "h-11 bg-volt font-head text-xs font-extrabold uppercase tracking-[0.2em] text-black hover:bg-volt/90";

const outlineBtn =
  "h-11 border-border font-head text-xs font-extrabold uppercase tracking-[0.2em]";

function playTone(
  ctx: AudioContext,
  at: number,
  freq: number,
  dur: number
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.25, at + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(at);
  osc.stop(at + dur + 0.05);
}

function fmtClock(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = Math.round(totalSec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/* Guided coach player (full screen overlay)                           */
/* ------------------------------------------------------------------ */

interface PlayerState {
  phase: "PREP" | "WORK" | "REST" | "DONE";
  idx: number;
  seconds: number;
}

interface PlayerProps {
  title: string;
  blocks: ProgramBlock[];
  onClose: () => void;
}

function TutorPlayer({ title, blocks, onClose }: PlayerProps) {
  const { toast } = useToast();
  const steps = useMemo(() => buildCoachSteps(blocks), [blocks]);
  const stepsRef = useRef(steps);
  useEffect(() => {
    stepsRef.current = steps;
  }, [steps]);

  const bodyWeightKg = useFitness((s) => s.bodyWeightKg);
  const addWorkout = useFitness((s) => s.addWorkout);

  const [timer, setTimer] = useState<PlayerState>({
    phase: "PREP",
    idx: 0,
    seconds: 5,
  });
  const [running, setRunning] = useState(false);
  const [saved, setSaved] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const voiceRef = useRef(true);

  const timerRef = useRef<PlayerState>(timer);
  const audioRef = useRef<AudioContext | null>(null);

  const applyTimer = useCallback((next: PlayerState) => {
    timerRef.current = next;
    setTimer(next);
  }, []);

  const ensureAudio = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!audioRef.current) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return;
      audioRef.current = new Ctor();
    }
    void audioRef.current.resume();
  }, []);

  const beep = useCallback((kind: "phase" | "done" | "tick") => {
    const ctx = audioRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    if (kind === "phase") {
      for (let i = 0; i < 3; i += 1) playTone(ctx, now + i * 0.18, 880, 0.09);
    } else if (kind === "tick") {
      playTone(ctx, now, 660, 0.06);
    } else {
      playTone(ctx, now, 660, 0.7);
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined") return;
    if (!voiceRef.current) return;
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1;
    window.speechSynthesis.speak(utter);
  }, []);

  const toggleVoice = () => {
    const next = !voiceRef.current;
    voiceRef.current = next;
    setVoiceOn(next);
    if (!next && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  // Body scroll lock while the coach is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const beginWork = useCallback(
    (i: number) => {
      const st = stepsRef.current[i];
      if (!st) return;
      applyTimer({
        phase: "WORK",
        idx: i,
        seconds: st.mode === "time" ? (st.workSec ?? 30) : 0,
      });
      beep("phase");
      if (!st.isFirstOfExercise) {
        const scheme =
          st.mode === "time" ? `${st.workSec} seconds` : `${st.reps} reps`;
        speak(`Set ${st.setNum}. ${scheme}`);
      }
    },
    [applyTimer, beep, speak]
  );

  const announceStep = useCallback(
    (i: number) => {
      const st = stepsRef.current[i];
      if (!st) return;
      const scheme =
        st.mode === "time" ? `${st.workSec} seconds` : `${st.reps} reps`;
      speak(`${st.exercise.name}. ${st.setTotal} sets of ${scheme}.`);
    },
    [speak]
  );

  const enterStep = useCallback(
    (i: number) => {
      const st = stepsRef.current[i];
      if (!st) return;
      if (st.isFirstOfExercise) {
        applyTimer({ phase: "PREP", idx: i, seconds: 5 });
        announceStep(i);
      } else {
        beginWork(i);
      }
    },
    [announceStep, applyTimer, beginWork]
  );

  const finishSet = useCallback(() => {
    const cur = timerRef.current;
    if (cur.idx >= stepsRef.current.length - 1) {
      applyTimer({ phase: "DONE", idx: cur.idx, seconds: 0 });
      beep("done");
      speak("Session complete. Great work.");
      return;
    }
    const next = stepsRef.current[cur.idx + 1];
    if (next.restSec > 0) {
      applyTimer({ phase: "REST", idx: cur.idx, seconds: next.restSec });
      speak(
        next.isFirstOfExercise
          ? `Rest. Next up, ${next.exercise.name}.`
          : "Rest"
      );
    } else {
      enterStep(cur.idx + 1);
    }
  }, [applyTimer, beep, enterStep, speak]);

  // 1 second tick. State updates inside the interval callback are fine.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const cur = timerRef.current;
      const st = stepsRef.current[cur.idx];
      if (cur.phase === "PREP") {
        if (cur.seconds > 1) {
          applyTimer({ ...cur, seconds: cur.seconds - 1 });
          if (cur.seconds - 1 <= 3) beep("tick");
        } else {
          beginWork(cur.idx);
        }
      } else if (cur.phase === "WORK" && st && st.mode === "time") {
        if (cur.seconds > 1) {
          applyTimer({ ...cur, seconds: cur.seconds - 1 });
          if (cur.seconds - 1 <= 3) beep("tick");
        } else {
          finishSet();
        }
      } else if (cur.phase === "WORK") {
        // Rep counted set: count the seconds up until the user taps done.
        applyTimer({ ...cur, seconds: cur.seconds + 1 });
      } else if (cur.phase === "REST") {
        if (cur.seconds > 1) {
          applyTimer({ ...cur, seconds: cur.seconds - 1 });
          if (cur.seconds - 1 <= 3) beep("tick");
        } else {
          enterStep(cur.idx + 1);
        }
      }
    }, 1000);
    return () => clearInterval(id);
  }, [applyTimer, beep, beginWork, enterStep, finishSet, running]);

  const skip = () => {
    const cur = timerRef.current;
    if (cur.phase === "DONE") return;
    ensureAudio();
    if (cur.phase === "PREP") beginWork(cur.idx);
    else if (cur.phase === "WORK") finishSet();
    else if (cur.phase === "REST") enterStep(cur.idx + 1);
  };

  const start = () => {
    ensureAudio();
    setRunning(true);
    announceStep(timerRef.current.idx);
  };

  const total = steps.length;
  const completed = timer.phase === "DONE" ? total : timer.idx;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  const curStep = steps[timer.idx];
  const nextStep = steps[timer.idx + 1];
  const displayEx =
    timer.phase === "REST" && nextStep ? nextStep.exercise : curStep?.exercise;

  const estKcal = useMemo(() => {
    return blocks.reduce((acc, b) => {
      const ex = getExercise(b.exerciseId);
      if (!ex) return acc;
      return acc + estimateCalories(ex.met, bodyWeightKg, blockWorkSeconds(b) / 60);
    }, 0);
  }, [blocks, bodyWeightKg]);

  const aboutMin = Math.max(1, Math.round(plannedSeconds(blocks) / 60));

  const saveSession = () => {
    const day = todayKey();
    blocks.forEach((b) => {
      const ex = getExercise(b.exerciseId);
      if (!ex) return;
      const workMin = Math.max(1, Math.round(blockWorkSeconds(b) / 60));
      addWorkout(
        day,
        newWorkout({
          name: ex.name,
          sets: b.sets,
          reps: b.reps ?? 0,
          weightKg: 0,
          durationMin: workMin,
          calories: estimateCalories(ex.met, bodyWeightKg, workMin),
        })
      );
    });
    setSaved(true);
    toast({
      title: "Session saved",
      description: `${blocks.length} exercises added to today's log.`,
    });
  };

  const phaseLabel =
    timer.phase === "PREP"
      ? "Get ready"
      : timer.phase === "WORK"
        ? curStep?.mode === "time"
          ? "Work"
          : "Reps"
        : timer.phase === "REST"
          ? "Rest"
          : "Done";
  const phaseColor =
    timer.phase === "WORK"
      ? "text-volt"
      : timer.phase === "REST"
        ? "text-ember"
        : "text-muted-foreground";

  const clock =
    timer.phase === "WORK" && curStep?.mode === "reps"
      ? `${timer.seconds}`
      : fmtClock(timer.seconds);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Guided workout, ${title}`}
      className="fixed inset-0 z-50 flex flex-col bg-background"
    >
      {/* progress */}
      <div className="h-1.5 shrink-0 bg-secondary">
        <div className="h-1.5 bg-volt transition-all" style={{ width: `${pct}%` }} />
      </div>

      {/* top bar */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <p className="truncate font-head text-[11px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
          {title}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            onClick={toggleVoice}
            aria-pressed={voiceOn}
            aria-label={voiceOn ? "Turn voice cues off" : "Turn voice cues on"}
            className="h-10 w-10 border-border p-0"
          >
            {voiceOn ? (
              <Volume2 className="h-4 w-4" aria-hidden />
            ) : (
              <VolumeX className="h-4 w-4" aria-hidden />
            )}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                aria-label="End session"
                className="h-10 w-10 border-border p-0 hover:border-destructive hover:text-destructive"
              >
                <Square className="h-4 w-4" aria-hidden />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display text-2xl uppercase tracking-wide">
                  End the session?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Sets you already finished stay finished. You can save what
                  you did from the final screen, or close without saving.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="font-head text-xs font-extrabold uppercase tracking-[0.2em]">
                  Keep going
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={onClose}
                  className="bg-destructive font-head text-xs font-extrabold uppercase tracking-[0.2em] text-white hover:bg-destructive/90"
                >
                  End session
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* main stage */}
      {timer.phase === "DONE" ? (
        <div className="nice-scrollbar flex-1 overflow-y-auto px-4 py-8">
          <div className="mx-auto max-w-xl space-y-6 text-center">
            <p className="font-head text-xs font-extrabold uppercase tracking-[0.3em] text-volt">
              Session complete
            </p>
            <h2 className="font-display text-5xl uppercase tracking-wide">
              You did it
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="border border-border bg-card p-4">
                <p className="font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Sets done
                </p>
                <p className="mt-1 font-display text-4xl leading-none">{total}</p>
              </div>
              <div className="border border-border bg-card p-4">
                <p className="font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  About
                </p>
                <p className="mt-1 font-display text-4xl leading-none">
                  {aboutMin} min
                </p>
              </div>
              <div className="border border-border bg-card p-4">
                <p className="font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Est. burn
                </p>
                <p className="mt-1 font-display text-4xl leading-none">
                  {estKcal} kcal
                </p>
              </div>
            </div>
            <ul className="space-y-2 text-left">
              {blocks.map((b, i) => {
                const ex = getExercise(b.exerciseId);
                if (!ex) return null;
                return (
                  <li
                    key={`${b.exerciseId}-${i}`}
                    className="flex items-center justify-between gap-3 border border-border bg-secondary/30 p-3"
                  >
                    <span className="truncate font-head text-xs font-bold uppercase tracking-widest">
                      {ex.name}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {blockSummary(b)}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={saveSession}
                disabled={saved}
                className={`flex-1 ${voltBtn}`}
              >
                {saved ? (
                  <>
                    <Check className="mr-2 h-4 w-4" aria-hidden />
                    Saved to log
                  </>
                ) : (
                  "Save to workout log"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                className={`flex-1 ${outlineBtn}`}
              >
                Close
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Saving logs every exercise to today and earns XP for each one,
              exactly like manual logging.
            </p>
          </div>
        </div>
      ) : (
        <div className="nice-scrollbar flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-2xl">
            {/* phase + clock */}
            <div className="flex flex-col items-center border border-border bg-secondary/30 py-8">
              <p
                className={`font-head text-xs font-extrabold uppercase tracking-[0.3em] ${phaseColor}`}
                aria-live="polite"
              >
                {phaseLabel}
              </p>
              <p
                role="timer"
                aria-live="off"
                className={`mt-2 font-display text-8xl leading-none tabular-nums ${phaseColor}`}
              >
                {clock}
              </p>
              {timer.phase === "WORK" && curStep?.mode === "reps" ? (
                <p className="mt-2 font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Seconds elapsed, tap done set below
                </p>
              ) : null}
              {curStep ? (
                <>
                  <p className="mt-4 font-display text-3xl uppercase tracking-wide">
                    {timer.phase === "REST" && nextStep
                      ? nextStep.exercise.name
                      : curStep.exercise.name}
                  </p>
                  <p className="mt-1 font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Set {curStep.setNum} of {curStep.setTotal} - Move{" "}
                    {curStep.blockIndex + 1} of {curStep.blockTotal}
                  </p>
                </>
              ) : null}
              {timer.phase === "REST" && nextStep ? (
                <p className="mt-3 font-head text-[10px] font-bold uppercase tracking-widest text-ember">
                  Next up after this rest
                </p>
              ) : null}
            </div>

            {/* reps mode: done button */}
            {timer.phase === "WORK" && curStep?.mode === "reps" ? (
              <Button onClick={finishSet} className={`mt-4 h-14 w-full ${voltBtn}`}>
                <Check className="mr-2 h-5 w-5" aria-hidden />
                Done set
              </Button>
            ) : null}

            {/* the step by step tutorial: model + text */}
            {displayEx ? (
              <div className="mt-4 border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-head text-[11px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
                    How to do it
                  </p>
                  <p className="font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {displayEx.equipment}
                  </p>
                </div>
                <ol className="nice-scrollbar mt-3 max-h-56 space-y-3 overflow-y-auto pr-1">
                  {displayEx.steps.map((s, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="font-display text-2xl leading-none text-volt">
                        {i + 1}
                      </span>
                      <p className="text-sm leading-relaxed">{s}</p>
                    </li>
                  ))}
                </ol>
                <p className="mt-3 flex items-start gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                  <Wind className="mt-0.5 h-3.5 w-3.5 shrink-0 text-volt" aria-hidden />
                  {displayEx.breathing}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* controls */}
      {timer.phase !== "DONE" ? (
        <div className="shrink-0 border-t border-border px-4 py-4">
          <div className="mx-auto flex max-w-2xl gap-2">
            <Button
              onClick={() => (running ? setRunning(false) : start())}
              className={`flex-1 ${voltBtn}`}
            >
              {running ? (
                <>
                  <Pause className="mr-2 h-4 w-4" aria-hidden />
                  Pause
                </>
              ) : timer.idx === 0 && timer.phase === "PREP" && timer.seconds === 5 && !running ? (
                <>
                  <Play className="mr-2 h-4 w-4" aria-hidden />
                  Start
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" aria-hidden />
                  Resume
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={skip}
              className={`flex-1 ${outlineBtn}`}
            >
              <FastForward className="mr-2 h-4 w-4" aria-hidden />
              Skip
            </Button>
          </div>
          <p className="mx-auto mt-2 max-w-2xl text-center text-xs text-muted-foreground">
            Set {Math.min(completed + (timer.phase === "REST" ? 1 : 0) + 1, total)}{" "}
            of {total} overall. Voice cues and beeps work offline.
          </p>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step by step tutorial dialog                                        */
/* ------------------------------------------------------------------ */

function ExerciseDetail({
  exercise,
  onCoachNow,
  onAdd,
}: {
  exercise: Exercise;
  onCoachNow: () => void;
  onAdd: () => void;
}) {
  return (
    <DialogContent className="nice-scrollbar max-h-[85vh] max-w-2xl overflow-y-auto border-border bg-card">
      <DialogHeader>
        <DialogTitle className="font-display text-3xl uppercase tracking-wide">
          {exercise.name}
        </DialogTitle>
      </DialogHeader>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="border-volt text-volt">
          {exercise.category}
        </Badge>
        <Badge variant="outline" className="border-border">
          {exercise.difficulty}
        </Badge>
        <Badge variant="outline" className="border-border">
          {exercise.equipment}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {exercise.primary.map((m) => (
          <span
            key={m}
            className="border border-volt/60 px-2 py-1 text-[11px] font-bold uppercase tracking-widest text-volt"
          >
            {m}
          </span>
        ))}
        {exercise.secondary.map((m) => (
          <span
            key={m}
            className="border border-border px-2 py-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
          >
            {m}
          </span>
        ))}
      </div>

      {/* Real online media only: actual form videos and photos from the
          web, so the movement is easy to copy. No drawn figures. */}
      <TopicMedia query={`how to do ${exercise.name} proper form`} />

      <StepImages
        kind="exercise"
        id={exercise.id}
        title={exercise.name}
        steps={exercise.steps}
      />

      <p className="flex items-start gap-2 border border-border bg-secondary/30 p-3 text-sm">
        <Wind className="mt-0.5 h-4 w-4 shrink-0 text-volt" aria-hidden />
        <span>
          <span className="font-head text-xs font-bold uppercase tracking-widest">
            Breathing:{" "}
          </span>
          {exercise.breathing}
        </span>
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="border border-border bg-secondary/30 p-3">
          <p className="font-head text-[10px] font-bold uppercase tracking-widest text-volt">
            Form tips
          </p>
          <ul className="mt-2 space-y-2">
            {exercise.tips.map((t, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-volt" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="border border-border bg-secondary/30 p-3">
          <p className="font-head text-[10px] font-bold uppercase tracking-widest text-destructive">
            Common mistakes
          </p>
          <ul className="mt-2 space-y-2">
            {exercise.mistakes.map((m, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
                {m}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="border border-border p-3 text-center">
          <p className="font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Sets
          </p>
          <p className="mt-1 font-display text-xl">{exercise.prescription.sets}</p>
        </div>
        <div className="border border-border p-3 text-center">
          <p className="font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Reps
          </p>
          <p className="mt-1 font-display text-xl">{exercise.prescription.reps}</p>
        </div>
        <div className="border border-border p-3 text-center">
          <p className="font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Rest
          </p>
          <p className="mt-1 font-display text-xl">{exercise.prescription.rest}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={onCoachNow} className={`flex-1 ${voltBtn}`}>
          <Play className="mr-2 h-4 w-4" aria-hidden />
          Coach me now
        </Button>
        <Button
          variant="outline"
          onClick={onAdd}
          className={`flex-1 ${outlineBtn}`}
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          Add to session
        </Button>
      </div>
    </DialogContent>
  );
}

/* ------------------------------------------------------------------ */
/* Library section                                                     */
/* ------------------------------------------------------------------ */

export default function ExerciseTutor() {
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<"All" | ExerciseCategory>("All");
  const [detail, setDetail] = useState<Exercise | null>(null);
  const [session, setSession] = useState<ProgramBlock[]>([]);
  const [player, setPlayer] = useState<{ title: string; blocks: ProgramBlock[] } | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EXERCISES.filter((e) => {
      if (cat !== "All" && e.category !== cat) return false;
      if (!q) return true;
      const hay = [
        e.name,
        e.category,
        e.equipment,
        e.difficulty,
        ...e.primary,
        ...e.secondary,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [cat, query]);

  const countFor = (c: ExerciseCategory) =>
    EXERCISES.filter((e) => e.category === c).length;

  const addToSession = (ex: Exercise) => {
    setSession((s) => [...s, blockFromExercise(ex)]);
    toast({
      title: "Added to session",
      description: `${ex.name} joined your session. Start it any time.`,
    });
  };

  const startProgram = (p: Program) => {
    setPlayer({ title: p.name, blocks: p.blocks });
  };

  const startSession = () => {
    if (session.length === 0) return;
    setPlayer({ title: "Your session", blocks: session });
  };

  const sessionMinutes = Math.max(
    1,
    Math.round(plannedSeconds(session) / 60)
  );

  return (
    <section className="space-y-6">
      <header>
        <h2 className="flex items-center gap-3 font-display text-4xl uppercase tracking-wide">
          <Dumbbell className="h-7 w-7 text-volt" aria-hidden />
          Exercise tutor
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Every movement taught step by step, like a coach standing next to
          you. {EXERCISES.length} exercises and {PROGRAMS.length} coached
          programs, all stored on your device and working offline.
        </p>
      </header>

      {/* Coached programs */}
      <div>
        <p className="font-head text-[11px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
          Coached programs
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PROGRAMS.map((p) => (
            <div
              key={p.id}
              className="flex flex-col border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-head text-xs font-bold uppercase tracking-widest">
                  {p.name}
                </p>
                <Badge
                  variant="outline"
                  className={`shrink-0 ${
                    p.level === "Beginner"
                      ? "border-volt text-volt"
                      : "border-border"
                  }`}
                >
                  {p.level}
                </Badge>
              </div>
              <p className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {p.focus}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {p.description}
              </p>
              <p className="mt-3 font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {p.blocks.length} moves - about{" "}
                {Math.max(1, Math.round(plannedSeconds(p.blocks) / 60))} min
              </p>
              <Button
                onClick={() => startProgram(p)}
                className={`mt-4 w-full ${voltBtn}`}
              >
                <Play className="mr-2 h-4 w-4" aria-hidden />
                Start coach
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Session builder */}
      {session.length > 0 ? (
        <Card className="border-volt bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-2xl uppercase tracking-wide">
              <Timer className="h-5 w-5 text-volt" aria-hidden />
              Your session, {session.length} moves, about {sessionMinutes} min
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="nice-scrollbar flex max-h-32 flex-wrap gap-2 overflow-y-auto">
              {session.map((b, i) => {
                const ex = getExercise(b.exerciseId);
                if (!ex) return null;
                return (
                  <li
                    key={`${b.exerciseId}-${i}`}
                    className="flex items-center gap-2 border border-border bg-secondary/40 px-3 py-2"
                  >
                    <span className="font-head text-[11px] font-bold uppercase tracking-widest">
                      {ex.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {blockSummary(b)}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${ex.name} from session`}
                      onClick={() =>
                        setSession((s) => s.filter((_, j) => j !== i))
                      }
                      className="flex h-6 w-6 items-center justify-center text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={startSession} className={`flex-1 ${voltBtn}`}>
                <Play className="mr-2 h-4 w-4" aria-hidden />
                Start session
              </Button>
              <Button
                variant="outline"
                onClick={() => setSession([])}
                className={`flex-1 ${outlineBtn}`}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Library controls */}
      <div className="space-y-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movements, muscles or gear, e.g. shoulders"
            aria-label="Search the exercise library"
            className="h-11 border-border bg-background pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCat("All")}
            className={`${chipClass} ${
              cat === "All" ? "border-volt text-volt" : ""
            }`}
          >
            All {EXERCISES.length}
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={`${chipClass} ${
                cat === c ? "border-volt text-volt" : ""
              }`}
            >
              {c} {countFor(c)}
            </button>
          ))}
        </div>
      </div>

      {/* Library grid */}
      {filtered.length === 0 ? (
        <p className="border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nothing matches that search. Try shoulders, plank, stairs or dumbbell.
        </p>
      ) : (
        <div className="nice-scrollbar max-h-[560px] overflow-y-auto pr-1">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((ex) => (
              <div
                key={ex.id}
                className="flex flex-col border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-head text-xs font-bold uppercase tracking-widest">
                    {ex.name}
                  </p>
                  <Badge
                    variant="outline"
                    className={`shrink-0 ${
                      ex.difficulty === "Beginner"
                        ? "border-volt text-volt"
                        : "border-border"
                    }`}
                  >
                    {ex.difficulty}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {ex.primary.join(", ")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {ex.equipment}
                </p>
                <p className="mt-2 font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {ex.prescription.sets} - {ex.prescription.reps}
                </p>
                <div className="mt-auto flex gap-2 pt-3">
                  <Button
                    variant="outline"
                    onClick={() => setDetail(ex)}
                    className={`flex-1 ${outlineBtn}`}
                  >
                    Tutorial
                  </Button>
                  <Button
                    onClick={() => addToSession(ex)}
                    aria-label={`Add ${ex.name} to session`}
                    className={`w-11 shrink-0 p-0 ${voltBtn}`}
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={detail !== null} onOpenChange={(o) => !o && setDetail(null)}>
        {detail ? (
          <ExerciseDetail
            exercise={detail}
            onCoachNow={() => {
              const ex = detail;
              setDetail(null);
              setPlayer({
                title: ex.name,
                blocks: [blockFromExercise(ex)],
              });
            }}
            onAdd={() => addToSession(detail)}
          />
        ) : null}
      </Dialog>

      {/* Coach overlay */}
      {player ? (
        <TutorPlayer
          key={`${player.title}-${player.blocks.length}-${session.length}`}
          title={player.title}
          blocks={player.blocks}
          onClose={() => setPlayer(null)}
        />
      ) : null}
    </section>
  );
}
