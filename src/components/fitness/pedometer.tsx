"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, Save, Square, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { todayKey, useFitness } from "./store";

const STEP_GAP_MS = 300;
const PEAK_THRESHOLD = 1.15;
const LOW_THRESHOLD = 0.6;

type DeviceMotionCtor = {
  new (): DeviceMotionEvent;
  requestPermission?: () => Promise<"granted" | "denied">;
};

export default function Pedometer() {
  const { toast } = useToast();
  const goalSteps = useFitness((s) => s.goalSteps);
  const setSteps = useFitness((s) => s.setSteps);

  // Mounted inside ClientOnly, so window exists on first render.
  const [supported] = useState(
    () => typeof window !== "undefined" && "DeviceMotionEvent" in window
  );
  const [running, setRunning] = useState(false);
  const [count, setCount] = useState(0);

  const countRef = useRef(0);
  const lastStepAtRef = useRef(0);
  const aboveRef = useRef(false);
  const baselineRef = useRef(9.81);
  const runningRef = useRef(false);

  /**
   * Stable handler: only touches refs and a setState inside the
   * device-motion event callback (allowed for streaming input).
   */
  const onMotion = useCallback((event: DeviceMotionEvent) => {
    if (!runningRef.current) return;
    const acc = event.accelerationIncludingGravity;
    if (!acc || acc.x === null || acc.y === null || acc.z === null) return;
    const mag = Math.sqrt(
      (acc.x ?? 0) * (acc.x ?? 0) +
        (acc.y ?? 0) * (acc.y ?? 0) +
        (acc.z ?? 0) * (acc.z ?? 0)
    );

    // Slow rolling baseline so holding the phone at any angle works.
    baselineRef.current = baselineRef.current * 0.98 + mag * 0.02;

    const now = performance.now();
    if (
      !aboveRef.current &&
      mag > baselineRef.current + PEAK_THRESHOLD &&
      now - lastStepAtRef.current > STEP_GAP_MS
    ) {
      aboveRef.current = true;
      lastStepAtRef.current = now;
      countRef.current += 1;
      setCount(countRef.current);
    } else if (mag < baselineRef.current + LOW_THRESHOLD) {
      aboveRef.current = false;
    }
  }, []);

  const stop = useCallback(() => {
    window.removeEventListener("devicemotion", onMotion);
    runningRef.current = false;
    setRunning(false);
  }, [onMotion]);

  const start = useCallback(async () => {
    if (runningRef.current) return;
    const Ctor = (
      window as unknown as { DeviceMotionEvent?: DeviceMotionCtor }
    ).DeviceMotionEvent;
    if (!Ctor) {
      toast({
        title: "Motion tracking unavailable",
        description:
          "Motion tracking is not available on this device. Log your steps manually instead.",
      });
      return;
    }
    // iOS requires an explicit user-gesture permission request.
    if (typeof Ctor.requestPermission === "function") {
      try {
        const result = await Ctor.requestPermission();
        if (result !== "granted") {
          toast({
            title: "Motion access denied",
            description:
              "Allow motion access in your browser settings, or log steps manually.",
          });
          return;
        }
      } catch {
        toast({
          title: "Motion access unavailable",
          description:
            "This browser refused motion access. Log your steps manually instead.",
        });
        return;
      }
    }
    countRef.current = 0;
    lastStepAtRef.current = 0;
    aboveRef.current = false;
    baselineRef.current = 9.81;
    setCount(0);
    runningRef.current = true;
    setRunning(true);
    window.addEventListener("devicemotion", onMotion, { passive: true });
  }, [onMotion, toast]);

  // Always detach the listener on unmount.
  useEffect(() => {
    return () => {
      window.removeEventListener("devicemotion", onMotion);
      runningRef.current = false;
    };
  }, [onMotion]);

  const save = useCallback(() => {
    const n = countRef.current;
    if (n <= 0) return;
    const date = todayKey();
    const current = useFitness.getState().logs[date]?.steps ?? 0;
    setSteps(date, current + n);
    stop();
    countRef.current = 0;
    setCount(0);
    toast({
      title: "Steps saved",
      description: `${n.toLocaleString()} steps added to today. Goal: ${goalSteps.toLocaleString()}.`,
    });
  }, [goalSteps, setSteps, stop, toast]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <p className="font-head text-[11px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
          Pedometer
        </p>
        <Activity className="h-4 w-4 text-volt" aria-hidden />
      </div>

      {supported ? (
        <>
          <div className="mt-6 flex flex-1 flex-col items-center justify-center border border-border bg-secondary/30 py-8">
            <p className="font-display text-7xl leading-none">{count}</p>
            <p className="mt-2 font-head text-[11px] font-extrabold uppercase tracking-[0.25em] text-muted-foreground">
              Steps this session
            </p>
            {running && (
              <p className="mt-3 flex items-center gap-1.5 font-head text-[10px] font-bold uppercase tracking-widest text-volt">
                <span
                  className="h-1.5 w-1.5 animate-pulse bg-volt"
                  aria-hidden
                />
                Listening for steps
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {running ? (
              <Button
                variant="outline"
                onClick={stop}
                className="h-11 flex-1 border-border font-head text-xs font-extrabold uppercase tracking-[0.2em]"
              >
                <Square className="mr-2 h-4 w-4" aria-hidden />
                Stop
              </Button>
            ) : (
              <Button
                onClick={() => void start()}
                className="h-11 flex-1 bg-volt font-head text-xs font-extrabold uppercase tracking-[0.2em] text-black hover:bg-volt/90"
              >
                <Play className="mr-2 h-4 w-4" aria-hidden />
                Start counting
              </Button>
            )}
            <Button
              variant="outline"
              onClick={save}
              disabled={count === 0}
              className="h-11 flex-1 border-border font-head text-xs font-extrabold uppercase tracking-[0.2em] disabled:opacity-40"
            >
              <Save className="mr-2 h-4 w-4" aria-hidden />
              Save {count} steps
            </Button>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Counts on device. Nothing is uploaded. Works offline. Keep the
            phone in your pocket or hand and move naturally.
          </p>
        </>
      ) : (
        <div className="mt-6 flex flex-1 flex-col items-center justify-center border border-border bg-secondary/30 p-6 text-center">
          <Activity className="h-8 w-8 text-muted-foreground" aria-hidden />
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Motion tracking is not available on this device. Log your steps
            manually instead.
          </p>
        </div>
      )}
    </div>
  );
}
