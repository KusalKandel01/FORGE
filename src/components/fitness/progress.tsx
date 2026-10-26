"use client";

import { useMemo } from "react";
import { BarChart3, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { dateKey, todayKey, useFitness, type DayLog } from "./store";

interface DaySlice {
  key: string;
  steps: number;
  workoutCount: number;
  kcal: number;
}

function sliceDays(
  logs: Record<string, DayLog>,
  count: number,
  endOffsetDaysAgo: number
): DaySlice[] {
  const out: DaySlice[] = [];
  const now = new Date();
  for (let i = endOffsetDaysAgo + count - 1; i >= endOffsetDaysAgo; i -= 1) {
    const cursor = new Date(now);
    cursor.setDate(now.getDate() - i);
    const key = dateKey(cursor);
    const log = logs[key];
    out.push({
      key,
      steps: log?.steps ?? 0,
      workoutCount: log?.workouts.length ?? 0,
      kcal:
        log?.workouts.reduce((acc, w) => acc + (w.calories || 0), 0) ?? 0,
    });
  }
  return out;
}

function StatBlock({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="border border-border bg-secondary/30 p-4">
      <p className="font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-display text-4xl leading-none">{value}</p>
      {sub && (
        <p className="mt-2 text-xs text-muted-foreground">{sub}</p>
      )}
    </div>
  );
}

export default function Progress() {
  const logs = useFitness((s) => s.logs);
  const goalSteps = useFitness((s) => s.goalSteps);
  const goalWorkouts = useFitness((s) => s.goalWorkoutsPerWeek);

  const today = todayKey();

  const last14 = useMemo(() => sliceDays(logs, 14, 0), [logs]);
  const last7 = useMemo(() => sliceDays(logs, 7, 0), [logs]);

  const hasChartData = last14.some((d) => d.steps > 0);
  const maxScale = Math.max(...last14.map((d) => d.steps), 1);

  const weekSteps = last7.reduce((acc, d) => acc + d.steps, 0);
  const weekWorkouts = last7.reduce((acc, d) => acc + d.workoutCount, 0);
  const weekKcal = last7.reduce((acc, d) => acc + d.kcal, 0);

  const allTime = useMemo(() => {
    const entries = Object.values(logs);
    const totalWorkouts = entries.reduce((a, l) => a + l.workouts.length, 0);
    const totalSteps = entries.reduce((a, l) => a + l.steps, 0);
    let bestDay: DaySlice | null = null;
    for (const log of entries) {
      const slice: DaySlice = {
        key: log.date,
        steps: log.steps,
        workoutCount: log.workouts.length,
        kcal: log.workouts.reduce((acc, w) => acc + (w.calories || 0), 0),
      };
      if (!bestDay || slice.steps > bestDay.steps) bestDay = slice;
    }
    return { totalWorkouts, totalSteps, bestDay };
  }, [logs]);

  const records = useMemo(() => {
    const byName = new Map<string, number>();
    for (const log of Object.values(logs)) {
      for (const w of log.workouts) {
        if (w.weightKg > 0) {
          byName.set(w.name, Math.max(byName.get(w.name) ?? 0, w.weightKg));
        }
      }
    }
    return [...byName.entries()]
      .map(([name, weightKg]) => ({ name, weightKg }))
      .sort((a, b) => b.weightKg - a.weightKg)
      .slice(0, 3);
  }, [logs]);

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-2xl uppercase tracking-wide">
          <BarChart3 className="h-5 w-5 text-volt" aria-hidden />
          Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 14 day steps chart, pure divs */}
        <div>
          <p className="font-head text-[11px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
            Last 14 days, steps
          </p>
          {hasChartData ? (
            <>
              <div className="mt-3 flex h-40 items-end gap-1">
                {last14.map((day) => {
                  const pct = Math.max(2, Math.round((day.steps / maxScale) * 100));
                  const isToday = day.key === today;
                  return (
                    <div
                      key={day.key}
                      className="flex h-full flex-1 items-end"
                      title={`${day.key}: ${day.steps.toLocaleString()} steps`}
                    >
                      <div
                        className={`w-full ${isToday ? "bg-volt" : "bg-secondary"}`}
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-1 flex gap-1">
                {last14.map((day) => (
                  <span
                    key={day.key}
                    className={`flex-1 text-center font-head text-[9px] font-bold uppercase tracking-widest ${
                      day.key === today ? "text-volt" : "text-muted-foreground"
                    }`}
                  >
                    {day.key.slice(8)}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Tallest bar = {maxScale.toLocaleString()} steps. Today is
                highlighted.
              </p>
            </>
          ) : (
            <p className="mt-3 border border-dashed border-border p-4 text-sm text-muted-foreground">
              No history yet. Your chart appears after your first day of
              logging.
            </p>
          )}
        </div>

        {/* Week + all time */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <p className="font-head text-[11px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
              This week
            </p>
            <StatBlock
              label="Steps"
              value={weekSteps.toLocaleString()}
              sub="Last 7 days combined"
            />
            <StatBlock
              label="Workouts"
              value={`${weekWorkouts} / ${goalWorkouts}`}
              sub={
                weekWorkouts >= goalWorkouts
                  ? "Weekly target reached."
                  : `${Math.max(0, goalWorkouts - weekWorkouts)} more to hit your weekly target.`
              }
            />
            <StatBlock
              label="Kcal from workouts"
              value={weekKcal.toLocaleString()}
              sub="Sum of calories you logged"
            />
          </div>

          <div className="space-y-3">
            <p className="font-head text-[11px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
              All time
            </p>
            <StatBlock
              label="Total workouts"
              value={allTime.totalWorkouts.toLocaleString()}
            />
            <StatBlock
              label="Total steps"
              value={allTime.totalSteps.toLocaleString()}
            />
            <StatBlock
              label="Best day"
              value={
                allTime.bestDay && allTime.bestDay.steps > 0
                  ? allTime.bestDay.steps.toLocaleString()
                  : "0"
              }
              sub={
                allTime.bestDay && allTime.bestDay.steps > 0
                  ? `Set on ${allTime.bestDay.key}`
                  : "No step record yet."
              }
            />
          </div>
        </div>

        {/* Personal records */}
        <div>
          <p className="flex items-center gap-2 font-head text-[11px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-volt" aria-hidden />
            Personal records, heaviest lifts
          </p>
          {records.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {records.map((rec, index) => (
                <li
                  key={rec.name}
                  className="flex items-center justify-between border border-border bg-secondary/30 p-3"
                >
                  <span className="flex items-center gap-3">
                    <span className="font-display text-2xl leading-none text-volt">
                      {index + 1}
                    </span>
                    <span className="font-head text-xs font-bold uppercase tracking-widest">
                      {rec.name}
                    </span>
                  </span>
                  <span className="font-display text-2xl leading-none">
                    {rec.weightKg.toLocaleString()} kg
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 border border-dashed border-border p-4 text-sm text-muted-foreground">
              No lifts logged yet. Add a weight to any exercise and your top
              3 appear here.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
