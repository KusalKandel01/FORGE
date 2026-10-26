"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Phase = "READY" | "WORK" | "REST" | "DONE";

interface TimerState {
  phase: Phase;
  remaining: number;
  round: number;
}

const DEFAULT_WORK = 30;
const DEFAULT_REST = 30;
const DEFAULT_ROUNDS = 8;

function clampInt(value: string, fallback: number, min: number, max: number) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function playTone(ctx: AudioContext, at: number, freq: number, dur: number) {
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

export default function IntervalTimer() {
  const [workS, setWorkS] = useState(DEFAULT_WORK);
  const [restS, setRestS] = useState(DEFAULT_REST);
  const [roundsN, setRoundsN] = useState(DEFAULT_ROUNDS);

  const [timer, setTimer] = useState<TimerState>({
    phase: "READY",
    remaining: DEFAULT_WORK,
    round: 1,
  });
  const [running, setRunning] = useState(false);

  const timerRef = useRef<TimerState>(timer);
  const audioRef = useRef<AudioContext | null>(null);

  const applyTimer = useCallback((next: TimerState) => {
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

  /** 3 short beeps on phase change, 1 long beep when the session is done. */
  const beep = useCallback((kind: "phase" | "done") => {
    const ctx = audioRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    if (kind === "phase") {
      for (let i = 0; i < 3; i += 1) {
        playTone(ctx, now + i * 0.18, 880, 0.09);
      }
    } else {
      playTone(ctx, now, 660, 0.7);
    }
  }, []);

  const toggleRun = useCallback(() => {
    if (running) {
      setRunning(false);
      return;
    }
    ensureAudio();
    const cur = timerRef.current;
    if (cur.phase === "READY" || cur.phase === "DONE") {
      applyTimer({ phase: "WORK", remaining: workS, round: 1 });
      beep("phase");
    }
    setRunning(true);
  }, [applyTimer, beep, ensureAudio, running, workS]);

  const reset = useCallback(() => {
    setRunning(false);
    applyTimer({ phase: "READY", remaining: workS, round: 1 });
  }, [applyTimer, workS]);

  // 1 second tick. State updates inside the interval callback are fine.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const cur = timerRef.current;
      if (cur.phase === "DONE") {
        setRunning(false);
        return;
      }
      if (cur.remaining > 1) {
        applyTimer({ ...cur, remaining: cur.remaining - 1 });
        return;
      }
      // Current phase just finished.
      if (cur.phase === "WORK") {
        if (cur.round >= roundsN) {
          applyTimer({ phase: "DONE", remaining: 0, round: cur.round });
          beep("done");
          setRunning(false);
        } else {
          applyTimer({ phase: "REST", remaining: restS, round: cur.round });
          beep("phase");
        }
      } else if (cur.phase === "REST") {
        applyTimer({ phase: "WORK", remaining: workS, round: cur.round + 1 });
        beep("phase");
      }
    }, 1000);
    return () => clearInterval(id);
  }, [applyTimer, beep, restS, roundsN, running, workS]);

  const setWork = (value: string) => {
    const next = clampInt(value, DEFAULT_WORK, 1, 600);
    setWorkS(next);
    if (timerRef.current.phase === "READY") {
      applyTimer({ ...timerRef.current, remaining: next });
    }
  };

  const setRest = (value: string) => {
    setRestS(clampInt(value, DEFAULT_REST, 1, 600));
  };

  const setRounds = (value: string) => {
    setRoundsN(clampInt(value, DEFAULT_ROUNDS, 1, 50));
  };

  const PRESETS: { label: string; work: number; rest: number; rounds: number }[] = [
    { label: "Tabata", work: 20, rest: 10, rounds: 8 },
    { label: "HIIT 40/20", work: 40, rest: 20, rounds: 8 },
    { label: "Circuit 45/15", work: 45, rest: 15, rounds: 10 },
    { label: "Strength 60/90", work: 60, rest: 90, rounds: 5 },
    { label: "EMOM 60/0s", work: 60, rest: 10, rounds: 10 },
  ];

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setWorkS(p.work);
    setRestS(p.rest);
    setRoundsN(p.rounds);
    setRunning(false);
    applyTimer({ phase: "READY", remaining: p.work, round: 1 });
  };

  const minutes = Math.floor(timer.remaining / 60);
  const seconds = timer.remaining % 60;
  const display = `${minutes}:${String(seconds).padStart(2, "0")}`;

  const totalRemaining = (() => {
    const { phase, remaining, round } = timer;
    if (phase === "DONE") return 0;
    if (phase === "READY") return roundsN * workS + (roundsN - 1) * restS;
    if (phase === "WORK") {
      const afterThis = remaining + (round >= roundsN ? 0 : restS);
      const cyclesLeft = roundsN - round;
      return afterThis + cyclesLeft * workS + Math.max(0, cyclesLeft - 1) * restS;
    }
    const cyclesLeft = roundsN - round;
    return remaining + cyclesLeft * workS + Math.max(0, cyclesLeft - 1) * restS;
  })();

  const phaseColor =
    timer.phase === "WORK"
      ? "text-volt"
      : timer.phase === "REST"
        ? "text-muted-foreground"
        : "text-foreground";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <p className="font-head text-[11px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
          Interval timer
        </p>
        <Timer className="h-4 w-4 text-volt" aria-hidden />
      </div>

      <div className="mt-6 flex flex-1 flex-col items-center justify-center border border-border bg-secondary/30 py-8">
        <p
          className={`font-head text-xs font-extrabold uppercase tracking-[0.3em] ${phaseColor}`}
        >
          {timer.phase}
        </p>
        <p
          role="timer"
          aria-live="off"
          className={`mt-2 font-display text-7xl leading-none tabular-nums md:text-8xl ${phaseColor}`}
        >
          {display}
        </p>
        <p className="mt-3 font-head text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Round {Math.min(timer.round, roundsN)} of {roundsN}
          {timer.phase !== "DONE" && totalRemaining > 0
            ? ` - about ${Math.ceil(totalRemaining / 60)} min left`
            : ""}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => applyPreset(p)}
            className="h-9 border border-border px-3 font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:border-volt hover:text-volt"
            title={`Work ${p.work}s, rest ${p.rest}s, ${p.rounds} rounds`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div>
          <label
            htmlFor="timer-work"
            className="font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
          >
            Work (s)
          </label>
          <Input
            id="timer-work"
            type="number"
            min={1}
            max={600}
            value={workS}
            onChange={(e) => setWork(e.target.value)}
            className="mt-1 h-11 border-border bg-background"
          />
        </div>
        <div>
          <label
            htmlFor="timer-rest"
            className="font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
          >
            Rest (s)
          </label>
          <Input
            id="timer-rest"
            type="number"
            min={1}
            max={600}
            value={restS}
            onChange={(e) => setRest(e.target.value)}
            className="mt-1 h-11 border-border bg-background"
          />
        </div>
        <div>
          <label
            htmlFor="timer-rounds"
            className="font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
          >
            Rounds
          </label>
          <Input
            id="timer-rounds"
            type="number"
            min={1}
            max={50}
            value={roundsN}
            onChange={(e) => setRounds(e.target.value)}
            className="mt-1 h-11 border-border bg-background"
          />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Button
          onClick={toggleRun}
          className="h-11 flex-1 bg-volt font-head text-xs font-extrabold uppercase tracking-[0.2em] text-black hover:bg-volt/90"
        >
          {running ? (
            <>
              <Pause className="mr-2 h-4 w-4" aria-hidden />
              Pause
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" aria-hidden />
              {timer.phase === "REST" || timer.phase === "WORK"
                ? "Resume"
                : "Start"}
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={reset}
          className="h-11 flex-1 border-border font-head text-xs font-extrabold uppercase tracking-[0.2em]"
        >
          <RotateCcw className="mr-2 h-4 w-4" aria-hidden />
          Reset
        </Button>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Beeps play on every phase change. Runs entirely offline, but the tab
        must stay open while you train.
      </p>
    </div>
  );
}
