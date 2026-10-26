"use client";

import { useState } from "react";
import {
  CalendarDays,
  Check,
  ClipboardList,
  Sparkles,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import type { Plan } from "./store";
import { useFitness } from "./store";

const GOALS = ["Build muscle", "Lose fat", "Build endurance", "General fitness"];
const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const EQUIPMENT = ["Bodyweight only", "Dumbbells at home", "Full gym"];

const inputClass = "h-11 w-full border-border bg-background";

export default function PlanCard() {
  const { toast } = useToast();
  const plan = useFitness((s) => s.plan);
  const setPlan = useFitness((s) => s.setPlan);

  const [goal, setGoal] = useState<string>(GOALS[0]);
  const [experience, setExperience] = useState<string>(LEVELS[0]);
  const [equipment, setEquipment] = useState<string>(EQUIPMENT[0]);
  const [daysPerWeek, setDaysPerWeek] = useState<number>(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/fitness/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, experience, daysPerWeek, equipment }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "The coach service could not be reached.");
      }
      const data = (await res.json()) as { plan?: Plan };
      if (!data.plan || !Array.isArray(data.plan.days) || data.plan.days.length === 0) {
        throw new Error("The plan response was incomplete. Try again.");
      }
      setPlan(data.plan);
      toast({
        title: "Plan ready",
        description: "Your weekly plan is saved on this device and works offline.",
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Plan generation failed. Try again."
      );
      toast({
        variant: "destructive",
        title: "Plan generation failed",
        description:
          "Plan generation needs internet. Your saved plan still works offline.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-2xl uppercase tracking-wide">
          <ClipboardList className="h-5 w-5 text-volt" aria-hidden />
          AI weekly plan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!plan && !loading && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Answer four questions and get a sensible weekly plan built for
              your setup. The plan is saved on this device. Generation needs
              internet once.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Goal
                </p>
                <Select value={goal} onValueChange={setGoal}>
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="Select goal" />
                  </SelectTrigger>
                  <SelectContent>
                    {GOALS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Experience
                </p>
                <Select value={experience} onValueChange={setExperience}>
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Equipment
                </p>
                <Select value={equipment} onValueChange={setEquipment}>
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="Select equipment" />
                  </SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Days per week: <span className="text-volt">{daysPerWeek}</span>
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <Slider
                    value={[daysPerWeek]}
                    min={2}
                    max={6}
                    step={1}
                    onValueChange={(v) => setDaysPerWeek(v[0] ?? 3)}
                    aria-label="Days per week"
                  />
                </div>
              </div>
            </div>
            <Button
              onClick={() => void generate()}
              disabled={loading}
              className="h-11 bg-volt font-head text-xs font-extrabold uppercase tracking-[0.2em] text-black hover:bg-volt/90"
            >
              <Sparkles className="mr-2 h-4 w-4" aria-hidden />
              Generate plan
            </Button>
          </div>
        )}

        {loading && (
          <div className="space-y-3" aria-live="polite">
            <p className="font-head text-xs font-extrabold uppercase tracking-[0.2em] text-volt">
              Building your plan...
            </p>
            <Skeleton className="h-4 w-3/4 bg-secondary" />
            <Skeleton className="h-4 w-1/2 bg-secondary" />
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-40 bg-secondary" />
              <Skeleton className="h-40 bg-secondary" />
            </div>
          </div>
        )}

        {!plan && !loading && error && (
          <div className="flex items-start gap-3 border border-ember/60 bg-ember/5 p-4">
            <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-ember" aria-hidden />
            <div>
              <p className="font-head text-xs font-extrabold uppercase tracking-[0.2em] text-ember">
                Plan generation needs internet
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Your saved plan still works offline. Check your connection
                and try again. {error}
              </p>
            </div>
          </div>
        )}

        {plan && !loading && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-2xl">
                <p className="flex items-center gap-2 font-head text-[11px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
                  <CalendarDays className="h-4 w-4 text-volt" aria-hidden />
                  {plan.goal} - {plan.days.length} days a week
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {plan.summary}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setPlan(null)}
                className="h-11 shrink-0 border-border font-head text-xs font-extrabold uppercase tracking-[0.2em]"
              >
                New plan
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {plan.days.map((day) => (
                <div key={day.day} className="border border-border bg-secondary/30 p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-display text-2xl uppercase tracking-wide">
                      {day.day}
                    </h3>
                    <span className="font-head text-[10px] font-bold uppercase tracking-widest text-volt">
                      {day.focus}
                    </span>
                  </div>
                  <ul className="mt-3 divide-y divide-border">
                    {day.exercises.map((ex, i) => (
                      <li
                        key={`${day.day}-${ex.name}-${i}`}
                        className="flex items-center justify-between gap-3 py-2"
                      >
                        <span className="text-sm">{ex.name}</span>
                        <span className="shrink-0 font-head text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                          {ex.sets} x {ex.reps} - rest {ex.restSec}s
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {plan.tips.length > 0 && (
              <div>
                <p className="font-head text-[11px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
                  Coach tips
                </p>
                <ul className="mt-3 space-y-2">
                  {plan.tips.map((tip, i) => (
                    <li key={`tip-${i}`} className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-volt" aria-hidden />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
