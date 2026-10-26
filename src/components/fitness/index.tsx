"use client";

import { useState } from "react";
import {
  Dumbbell,
  Flame,
  Footprints,
  Scale,
  Target,
  Trash2,
  TriangleAlert,
  Zap,
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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { levelFromXp, useProfile } from "@/lib/profile-store";
import Calculators from "./calculators";
import ExerciseTutor from "./exercise-tutor";
import IntervalTimer from "./interval-timer";
import Motivation from "./motivation";
import Pedometer from "./pedometer";
import PlanCard from "./plan";
import Progress from "./progress";
import AskPanel from "@/components/ai/ask-panel";
import {
  computeStreak,
  newWorkout,
  todayKey,
  useFitness,
  type WorkoutEntry,
} from "./store";

const PRESETS = [
  "Push ups",
  "Squats",
  "Deadlift",
  "Bench press",
  "Pull ups",
  "Run",
  "Walk",
  "Plank",
  "Cycling",
] as const;

const QUICK_STEPS = [250, 500, 1000, 2500] as const;

const chipClass =
  "h-11 border border-border bg-secondary/40 px-3 font-head text-[11px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:border-volt hover:text-volt";

const inputClass = "h-11 border-border bg-background";

/** Stable empty list so the zustand selector never returns a fresh array. */
const EMPTY_WORKOUTS: WorkoutEntry[] = [];

function StatTile({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-head text-[11px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </p>
        <Icon className="h-4 w-4 shrink-0 text-volt" aria-hidden />
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function StepsCard() {
  const { toast } = useToast();
  const today = todayKey();

  const todaySteps = useFitness((s) => s.logs[today]?.steps ?? 0);
  const goalSteps = useFitness((s) => s.goalSteps);
  const bodyWeightKg = useFitness((s) => s.bodyWeightKg);
  const setGoalSteps = useFitness((s) => s.setGoalSteps);
  const setBodyWeight = useFitness((s) => s.setBodyWeight);
  const setSteps = useFitness((s) => s.setSteps);

  const [stepInput, setStepInput] = useState("");
  const [goalInput, setGoalInput] = useState(String(goalSteps));
  const [weightInput, setWeightInput] = useState(String(bodyWeightKg));

  const addSteps = (n: number) => {
    if (!Number.isFinite(n) || n <= 0) {
      toast({
        title: "Enter a number",
        description: "Type how many steps you want to add.",
      });
      return;
    }
    const clean = Math.round(n);
    setSteps(todayKey(), todaySteps + clean);
    setStepInput("");
    toast({
      title: "Steps logged",
      description: `+${clean.toLocaleString()} steps added to today.`,
    });
  };

  const saveGoal = () => {
    const v = parseInt(goalInput, 10);
    if (!Number.isFinite(v) || v <= 0) {
      toast({
        title: "Invalid goal",
        description: "Your step goal must be a positive number.",
      });
      return;
    }
    setGoalSteps(v);
    toast({
      title: "Step goal updated",
      description: `New daily goal: ${v.toLocaleString()} steps.`,
    });
  };

  const saveWeight = () => {
    const v = parseFloat(weightInput);
    if (!Number.isFinite(v) || v < 20 || v > 500) {
      toast({
        title: "Invalid weight",
        description: "Enter your body weight between 20 and 500 kg.",
      });
      return;
    }
    setBodyWeight(v);
    toast({
      title: "Body weight updated",
      description: `Estimates now use ${Math.round(v * 10) / 10} kg.`,
    });
  };

  const pct = Math.min(100, Math.round((todaySteps / goalSteps) * 100));
  const km = todaySteps * 0.000762;
  const kcal = todaySteps * 0.04 * (bodyWeightKg / 70);

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-2xl uppercase tracking-wide">
          <Footprints className="h-5 w-5 text-volt" aria-hidden />
          Steps
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex gap-2">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Add steps, e.g. 2500"
            aria-label="Steps to add today"
            value={stepInput}
            onChange={(e) => setStepInput(e.target.value)}
            className={`flex-1 ${inputClass}`}
          />
          <Button
            onClick={() => addSteps(parseFloat(stepInput))}
            className="h-11 shrink-0 bg-volt font-head text-xs font-extrabold uppercase tracking-[0.2em] text-black hover:bg-volt/90"
          >
            Log steps
          </Button>
        </div>

        <div>
          <p className="font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Quick add
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {QUICK_STEPS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => addSteps(q)}
                className={chipClass}
              >
                +{q.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="border border-border bg-secondary/30 p-3">
            <p className="font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Est. distance
            </p>
            <p className="mt-1 font-display text-3xl leading-none">
              {Number(km.toFixed(2)).toLocaleString()} km
            </p>
          </div>
          <div className="border border-border bg-secondary/30 p-3">
            <p className="font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Est. burn
            </p>
            <p className="mt-1 font-display text-3xl leading-none">
              {Number(kcal.toFixed(0)).toLocaleString()} kcal
            </p>
          </div>
          <p className="col-span-2 text-xs text-muted-foreground">
            Estimates. Distance assumes 0.76 m per step. Burn scales with
            your body weight.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="goal-steps"
              className="flex items-center gap-1.5 font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
            >
              <Target className="h-3.5 w-3.5" aria-hidden />
              Daily step goal
            </label>
            <div className="mt-1 flex gap-2">
              <Input
                id="goal-steps"
                type="number"
                inputMode="numeric"
                min={1}
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                className={`min-w-0 flex-1 ${inputClass}`}
              />
              <Button
                variant="outline"
                onClick={saveGoal}
                className="h-11 shrink-0 border-border font-head text-xs font-extrabold uppercase tracking-[0.2em]"
              >
                Save
              </Button>
            </div>
          </div>
          <div>
            <label
              htmlFor="body-weight"
              className="flex items-center gap-1.5 font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
            >
              <Scale className="h-3.5 w-3.5" aria-hidden />
              Body weight (kg)
            </label>
            <div className="mt-1 flex gap-2">
              <Input
                id="body-weight"
                type="number"
                inputMode="decimal"
                min={20}
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                className={`min-w-0 flex-1 ${inputClass}`}
              />
              <Button
                variant="outline"
                onClick={saveWeight}
                className="h-11 shrink-0 border-border font-head text-xs font-extrabold uppercase tracking-[0.2em]"
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

function WorkoutCard() {
  const { toast } = useToast();
  const today = todayKey();

  // Select the array reference itself (undefined when no log) so the
  // selector result stays referentially stable between store updates.
  const workouts = useFitness((s) => s.logs[today]?.workouts);
  const list = workouts ?? EMPTY_WORKOUTS;
  const addWorkout = useFitness((s) => s.addWorkout);
  const removeWorkout = useFitness((s) => s.removeWorkout);

  const [name, setName] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [duration, setDuration] = useState("");
  const [calories, setCalories] = useState("");

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast({
        title: "Name the exercise",
        description: "Type an exercise name or tap a preset below.",
      });
      return;
    }
    const setsV = Math.max(1, parseInt(sets, 10) || 1);
    const repsV = Math.max(0, parseInt(reps, 10) || 0);
    const weightV = Math.max(0, parseFloat(weight) || 0);
    const durV = Math.max(0, parseFloat(duration) || 0);
    const calRaw = parseFloat(calories);
    const calV =
      Number.isFinite(calRaw) && calRaw > 0
        ? Math.round(calRaw)
        : Math.round(durV * 7);

    const entry: WorkoutEntry = newWorkout({
      name: trimmed,
      sets: setsV,
      reps: repsV,
      weightKg: Math.round(weightV * 10) / 10,
      durationMin: Math.round(durV),
      calories: calV,
    });
    addWorkout(todayKey(), entry);
    toast({
      title: "Workout logged",
      description: `${trimmed} saved. +50 XP.`,
    });
    setName("");
    setSets("");
    setReps("");
    setWeight("");
    setDuration("");
    setCalories("");
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-2xl uppercase tracking-wide">
          <Dumbbell className="h-5 w-5 text-volt" aria-hidden />
          Workout log
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Presets
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setName(p)}
                className={chipClass}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Exercise name"
            aria-label="Exercise name"
            className={inputClass}
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              value={sets}
              onChange={(e) => setSets(e.target.value)}
              placeholder="Sets"
              aria-label="Sets"
              className={inputClass}
            />
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              placeholder="Reps"
              aria-label="Reps"
              className={inputClass}
            />
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="Weight kg"
              aria-label="Weight in kilograms"
              className={inputClass}
            />
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="Duration min"
              aria-label="Duration in minutes"
              className={inputClass}
            />
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              placeholder="Calories"
              aria-label="Calories, empty estimates from duration"
              className={inputClass}
            />
          </div>
          <Button
            onClick={submit}
            className="h-11 w-full bg-volt font-head text-xs font-extrabold uppercase tracking-[0.2em] text-black hover:bg-volt/90"
          >
            Add workout
          </Button>
          <p className="text-xs text-muted-foreground">
            Empty calories are estimated from duration at about 7 kcal per
            minute.
          </p>
        </div>

        <div>
          <p className="font-head text-[11px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
            Today, {list.length} logged
          </p>
          {list.length === 0 ? (
            <p className="mt-3 border border-dashed border-border p-4 text-sm text-muted-foreground">
              No workouts yet. Log your first one above.
            </p>
          ) : (
            <ul className="nice-scrollbar mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">
              {list.map((w) => (
                <li
                  key={w.id}
                  className="flex items-center justify-between gap-3 border border-border bg-secondary/30 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-head text-xs font-bold uppercase tracking-widest">
                      {w.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {w.sets} x {w.reps}
                      {w.weightKg > 0 ? ` x ${w.weightKg} kg` : ""}
                      {w.durationMin > 0 ? ` - ${w.durationMin} min` : ""}
                      {w.calories > 0 ? ` - ${w.calories} kcal` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeWorkout(today, w.id)}
                    aria-label={`Delete ${w.name}`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center border border-border text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

function DangerZone() {
  const { toast } = useToast();
  const resetFitness = useFitness((s) => s.resetFitness);

  const confirmReset = () => {
    resetFitness();
    toast({
      title: "Fitness data cleared",
      description:
        "Steps, workouts, badges, goals and plan are back to zero on this device.",
    });
  };

  return (
    <div className="border border-destructive/60 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 font-head text-xs font-extrabold uppercase tracking-[0.2em] text-destructive">
            <TriangleAlert className="h-4 w-4" aria-hidden />
            Danger zone
          </p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Wipe every fitness number on this device and start from zero
            again.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              className="h-11 font-head text-xs font-extrabold uppercase tracking-[0.2em]"
            >
              Reset fitness data
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display text-2xl uppercase tracking-wide">
                Reset fitness data?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Clears steps, workouts, badges, goals and plan on this
                device. XP resets from Settings.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="font-head text-xs font-extrabold uppercase tracking-[0.2em]">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmReset}
                className="bg-destructive font-head text-xs font-extrabold uppercase tracking-[0.2em] text-white hover:bg-destructive/90"
              >
                Reset everything
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export default function FitnessHub() {
  const today = todayKey();
  const todaySteps = useFitness((s) => s.logs[today]?.steps ?? 0);
  const goalSteps = useFitness((s) => s.goalSteps);
  const todayWorkouts = useFitness((s) => s.logs[today]?.workouts.length ?? 0);
  const logs = useFitness((s) => s.logs);
  const { xp } = useProfile();
  const level = levelFromXp(xp);
  const streak = computeStreak(logs);

  const stepsPct = Math.min(100, Math.round((todaySteps / goalSteps) * 100));

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10">
      <header>
        <h1 className="font-display text-5xl tracking-wide">TRAIN</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every number starts at zero. Log it, earn it.
        </p>
      </header>

      {/* Today dashboard */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Steps" icon={Footprints}>
          <p className="mt-2 font-display text-4xl leading-none md:text-5xl">
            {todaySteps.toLocaleString()}
          </p>
          <div className="mt-3 h-2 bg-secondary" role="presentation">
            <div className="h-2 bg-volt" style={{ width: `${stepsPct}%` }} />
          </div>
          <p className="mt-2 font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Goal {goalSteps.toLocaleString()}
          </p>
        </StatTile>

        <StatTile label="Workouts" icon={Dumbbell}>
          <p className="mt-2 font-display text-4xl leading-none md:text-5xl">
            {todayWorkouts}
          </p>
          <p className="mt-4 font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Logged today
          </p>
        </StatTile>

        <StatTile label="Day streak" icon={Flame}>
          <p className="mt-2 font-display text-4xl leading-none md:text-5xl">
            {streak}
          </p>
          <p className="mt-4 font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Active days in a row
          </p>
        </StatTile>

        <StatTile label="Total XP" icon={Zap}>
          <p className="mt-2 font-display text-4xl leading-none md:text-5xl">
            {xp.toLocaleString()}
          </p>
          <p className="mt-4 font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Level {level}
          </p>
        </StatTile>
      </div>

      {/* Steps + pedometer */}
      <div className="grid gap-4 md:grid-cols-2">
        <StepsCard />
        <Card className="border-border bg-card">
          <CardContent className="h-full">
            <Pedometer />
          </CardContent>
        </Card>
      </div>

      {/* Workout log + interval timer */}
      <div className="grid gap-4 md:grid-cols-2">
        <WorkoutCard />
        <Card className="border-border bg-card">
          <CardContent className="h-full">
            <IntervalTimer />
          </CardContent>
        </Card>
      </div>

      {/* Exercise tutor: step by step library + guided coach */}
      <ExerciseTutor />

      {/* AI plan */}
      <PlanCard />

      {/* Ask the coach: every legendary trainer combined into one */}
      <AskPanel
        title="Ask the coach"
        blurb="One coach forged from every legendary trainer in history, from Eugen Sandow and Jack LaLanne to Arnold, Mike Mentzer, Louie Simmons, Rippetoe, 5/3/1 and modern hypertrophy science. Form, programming, recovery, nutrition basics. Training questions only."
        starters={[
          "How do I start as a beginner?",
          "Fix my squat depth",
          "Best mass building plan?",
          "How often should I deload?",
        ]}
        endpoint="/api/fitness/ask"
        inputPlaceholder="Ask anything about training, form, programs or recovery..."
      />

      {/* Calculators */}
      <Calculators />

      {/* Progress */}
      <Progress />

      {/* Motivation */}
      <Motivation />

      {/* Danger zone */}
      <DangerZone />
    </section>
  );
}
