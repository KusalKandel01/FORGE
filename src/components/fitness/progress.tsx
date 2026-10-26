"use client";

import { Fragment, useMemo } from "react";
import { BarChart3, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
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

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

interface HeatCell {
  key: string;
  steps: number;
  workoutCount: number;
  weekday: number;
  month: number;
}

/**
 * Heatmap cell fill for one day. Intensity comes from steps vs the daily
 * step goal; a logged workout adds a 2px white top edge marker.
 */
function heatCellClasses(
  steps: number,
  workoutCount: number,
  goalSteps: number
): string {
  if (steps <= 0 && workoutCount === 0) {
    return "border border-border bg-transparent";
  }
  let fill = "bg-volt/15";
  if (steps >= goalSteps) {
    fill = "bg-volt";
  } else if (steps * 2 >= goalSteps) {
    fill = "bg-volt/40";
  }
  return workoutCount > 0 ? `${fill} border-t-2 border-t-white` : fill;
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

  // 84 day cells ending today, 12 columns of 7. Cells are filled column
  // major (index = column * 7 + row), so every row keeps one fixed weekday
  // and today is always the bottom right cell. Same local date keys as the
  // store via dateKey.
  const heatmap = useMemo(() => {
    const now = new Date();
    const cells: HeatCell[] = [];
    for (let i = 0; i < 84; i += 1) {
      const cursor = new Date(now);
      cursor.setDate(now.getDate() - (83 - i));
      const key = dateKey(cursor);
      const log = logs[key];
      cells.push({
        key,
        steps: log?.steps ?? 0,
        workoutCount: log?.workouts.length ?? 0,
        weekday: cursor.getDay(),
        month: cursor.getMonth(),
      });
    }
    const rowWeekdays = cells.slice(0, 7).map((c) => WEEKDAY_SHORT[c.weekday]);
    const colMonths: (string | null)[] = [];
    for (let c = 0; c < 12; c += 1) {
      const top = cells[c * 7];
      const prev = c > 0 ? cells[(c - 1) * 7] : null;
      colMonths.push(
        prev && prev.month === top.month ? null : MONTH_SHORT[top.month]
      );
    }
    const loggedDays = cells.filter(
      (c) => c.steps > 0 || c.workoutCount > 0
    ).length;
    return { cells, rowWeekdays, colMonths, loggedDays };
  }, [logs]);

  // Last 8 rolling weeks of workout minutes. Week 7 is the last 7 days
  // including today ("Now"), week 0 is the 7 days ending 49 days ago
  // ("W-7"). Buckets reuse the store's local dateKey so they line up with
  // every other block on the page.
  const weeklyVolume = useMemo(() => {
    const now = new Date();
    const dayMinutes: number[] = [];
    const dayWorkouts: number[] = [];
    for (let i = 55; i >= 0; i -= 1) {
      const cursor = new Date(now);
      cursor.setDate(now.getDate() - i);
      const key = dateKey(cursor);
      const log = logs[key];
      dayMinutes.push(
        log?.workouts.reduce((acc, w) => acc + (w.durationMin || 0), 0) ?? 0
      );
      dayWorkouts.push(log?.workouts.length ?? 0);
    }
    const weeks: { label: string; minutes: number; workouts: number }[] = [];
    for (let w = 0; w < 8; w += 1) {
      const start = w * 7;
      weeks.push({
        label: w === 7 ? "Now" : `W-${7 - w}`,
        minutes: dayMinutes.slice(start, start + 7).reduce((a, b) => a + b, 0),
        workouts: dayWorkouts
          .slice(start, start + 7)
          .reduce((a, b) => a + b, 0),
      });
    }
    return weeks;
  }, [logs]);

  const volumeTotal = weeklyVolume.reduce((acc, w) => acc + w.minutes, 0);

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

        {/* 12 week steps heatmap, pure divs */}
        <div>
          <p className="font-head text-[11px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
            Last 12 weeks, steps
          </p>
          {heatmap.loggedDays > 0 ? (
            <>
              <div
                className="mt-3 w-fit"
                role="img"
                aria-label="Heatmap of your daily steps over the last 12 weeks, one square per day"
                style={{
                  display: "grid",
                  gridTemplateColumns: "26px repeat(12, 12px)",
                  gridTemplateRows: "12px repeat(7, 12px)",
                  gap: "2px",
                }}
              >
                <div />
                {heatmap.colMonths.map((label, c) => (
                  <div
                    key={`month-${c}`}
                    className="whitespace-nowrap font-head text-[9px] font-bold uppercase leading-none text-muted-foreground"
                  >
                    {label}
                  </div>
                ))}
                {heatmap.rowWeekdays.map((label, r) => (
                  <Fragment key={`row-${r}`}>
                    <div className="pr-1 text-right font-head text-[9px] font-bold uppercase leading-none text-muted-foreground">
                      {label}
                    </div>
                    {Array.from({ length: 12 }, (_, c) => {
                      const cell = heatmap.cells[c * 7 + r];
                      return (
                        <div
                          key={cell.key}
                          title={`${cell.key}: ${cell.steps.toLocaleString()} steps, ${cell.workoutCount} ${cell.workoutCount === 1 ? "workout" : "workouts"}`}
                          className={heatCellClasses(
                            cell.steps,
                            cell.workoutCount,
                            goalSteps
                          )}
                        />
                      );
                    })}
                  </Fragment>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span
                    className="h-3 w-3 border border-border bg-transparent"
                    aria-hidden
                  />
                  No log
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="h-3 w-3 bg-volt/15" aria-hidden />
                  Some steps
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="h-3 w-3 bg-volt/40" aria-hidden />
                  Half of goal
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="h-3 w-3 bg-volt" aria-hidden />
                  Goal reached
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                White top edge = a logged workout. The grid covers the last 12
                weeks ending today.
              </p>
            </>
          ) : (
            <p className="mt-3 border border-dashed border-border p-4 text-sm text-muted-foreground">
              No days logged in the last 12 weeks yet. Your heatmap appears
              after your first day of logging.
            </p>
          )}
        </div>

        {/* Weekly workout volume, recharts */}
        <div>
          <p className="font-head text-[11px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
            Last 8 weeks, workout minutes
          </p>
          <div className="mt-3">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={weeklyVolume}
                margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
              >
                <CartesianGrid stroke="#27272a" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#a1a1aa", fontSize: 11 }}
                  interval={0}
                />
                <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "#09090b",
                    border: "1px solid #27272a",
                    borderRadius: 0,
                    color: "#fff",
                  }}
                  itemStyle={{ color: "#fff" }}
                  labelStyle={{ color: "#a1a1aa" }}
                  cursor={{ fill: "rgba(200,255,46,0.08)" }}
                  formatter={(value) => `${value} min`}
                />
                <Bar dataKey="minutes" name="Minutes" fill="#c8ff2e" radius={0} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {volumeTotal > 0
              ? "Total minutes from logged workouts in each rolling 7 day window. Now = the last 7 days."
              : "No workouts logged in the last 8 weeks yet. Bars appear as you log sessions."}
          </p>
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
