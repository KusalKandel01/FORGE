"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function fmt(n: number, digits = 1): string {
  return Number(n.toFixed(digits)).toLocaleString();
}

function num(value: string): number | null {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
      >
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Result({
  value,
  caption,
}: {
  value: string;
  caption: string;
}) {
  return (
    <div className="border border-volt/40 bg-volt/5 p-4">
      <p className="font-display text-5xl leading-none text-volt">{value}</p>
      <p className="mt-2 font-head text-[11px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
        {caption}
      </p>
    </div>
  );
}

function EmptyHint() {
  return (
    <p className="border border-dashed border-border p-4 text-sm text-muted-foreground">
      Enter your numbers.
    </p>
  );
}

const inputClass = "h-11 border-border bg-background";

/* ------------------------------------------------------------------ */

function BmiTab() {
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");

  const result = useMemo(() => {
    const h = num(height);
    const w = num(weight);
    if (!h || !w || h <= 0 || w <= 0) return null;
    const bmi = w / Math.pow(h / 100, 2);
    const category =
      bmi < 18.5
        ? "Underweight"
        : bmi < 25
          ? "Normal"
          : bmi < 30
            ? "Overweight"
            : "Obese";
    return { bmi, category };
  }, [height, weight]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="bmi-h" label="Height (cm)">
          <Input
            id="bmi-h"
            type="number"
            inputMode="decimal"
            placeholder="170"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field id="bmi-w" label="Weight (kg)">
          <Input
            id="bmi-w"
            type="number"
            inputMode="decimal"
            placeholder="70"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
      {result ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Result value={fmt(result.bmi)} caption="Body mass index" />
          <Result
            value={result.category}
            caption="WHO category"
          />
        </div>
      ) : (
        <EmptyHint />
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">
        BMI ignores muscle mass. Use it as a rough compass, not a verdict.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const ONE_RM_TABLE = [95, 90, 85, 80, 75, 70];

function OneRmTab() {
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");

  const result = useMemo(() => {
    const w = num(weight);
    const r = num(reps);
    if (!w || !r || w <= 0 || r <= 0 || r > 20) return null;
    const oneRm = w * (1 + r / 30);
    const rows = ONE_RM_TABLE.map((pct) => {
      const load = (oneRm * pct) / 100;
      const approxReps = Math.max(1, Math.round(30 * (1 / (pct / 100) - 1)));
      return { pct, load, approxReps };
    });
    return { oneRm, rows };
  }, [reps, weight]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="rm-w" label="Weight lifted (kg)">
          <Input
            id="rm-w"
            type="number"
            inputMode="decimal"
            placeholder="100"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field id="rm-r" label="Reps completed">
          <Input
            id="rm-r"
            type="number"
            inputMode="numeric"
            placeholder="5"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
      {result ? (
        <>
          <Result value={fmt(result.oneRm)} caption="Estimated 1RM (Epley)" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {result.rows.map((row) => (
              <div
                key={row.pct}
                className="border border-border bg-secondary/30 p-3"
              >
                <p className="font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {row.pct}%
                </p>
                <p className="mt-1 font-display text-2xl leading-none">
                  {fmt(row.load)} kg
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  about {row.approxReps} reps
                </p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <EmptyHint />
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Epley formula works best below 10 reps. Never test a true 1RM without
        a spotter.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const ACTIVITIES = [
  { value: "1.2", label: "Sedentary (desk job)" },
  { value: "1.375", label: "Light (1-2 workouts a week)" },
  { value: "1.55", label: "Moderate (3-5 workouts a week)" },
  { value: "1.725", label: "Very active (daily training)" },
];

function CaloriesTab() {
  const [sex, setSex] = useState<string>("");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [activity, setActivity] = useState<string>("");

  const result = useMemo(() => {
    const a = num(age);
    const h = num(height);
    const w = num(weight);
    const factor = num(activity);
    if (!sex || !a || !h || !w || !factor) return null;
    if (a <= 0 || h <= 0 || w <= 0) return null;
    const bmr = 10 * w + 6.25 * h - 5 * a + (sex === "male" ? 5 : -161);
    const tdee = bmr * factor;
    return { bmr, tdee };
  }, [activity, age, height, sex, weight]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="cal-sex" label="Sex">
          <Select value={sex} onValueChange={setSex}>
            <SelectTrigger id="cal-sex" className="h-11 w-full border-border bg-background">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field id="cal-age" label="Age">
          <Input
            id="cal-age"
            type="number"
            inputMode="numeric"
            placeholder="30"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field id="cal-h" label="Height (cm)">
          <Input
            id="cal-h"
            type="number"
            inputMode="decimal"
            placeholder="170"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field id="cal-w" label="Weight (kg)">
          <Input
            id="cal-w"
            type="number"
            inputMode="decimal"
            placeholder="70"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className={inputClass}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field id="cal-act" label="Activity level">
            <Select value={activity} onValueChange={setActivity}>
              <SelectTrigger id="cal-act" className="h-11 w-full border-border bg-background">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITIES.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </div>
      {result ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Result value={fmt(result.bmr, 0)} caption="BMR at rest (kcal)" />
          <Result value={fmt(result.tdee, 0)} caption="TDEE maintenance (kcal)" />
          <Result value={fmt(result.tdee - 500, 0)} caption="Fat loss target, about TDEE minus 500" />
          <Result value={fmt(result.tdee + 300, 0)} caption="Muscle gain target, about TDEE plus 300" />
        </div>
      ) : (
        <EmptyHint />
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Mifflin-St Jeor estimates. Real needs vary. Adjust by how your weight
        actually moves over weeks.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function MacrosTab() {
  const [calories, setCalories] = useState("");
  const [weight, setWeight] = useState("");

  const result = useMemo(() => {
    const kcal = num(calories);
    const w = num(weight);
    if (!kcal || !w || kcal <= 0 || w <= 0) return null;
    const proteinG = 2.0 * w;
    const fatG = (kcal * 0.25) / 9;
    const carbsG = Math.max(0, (kcal - proteinG * 4 - fatG * 9) / 4);
    return { proteinG, fatG, carbsG };
  }, [calories, weight]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="mac-kcal" label="Daily calories (kcal)">
          <Input
            id="mac-kcal"
            type="number"
            inputMode="numeric"
            placeholder="2500"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field id="mac-w" label="Body weight (kg)">
          <Input
            id="mac-w"
            type="number"
            inputMode="decimal"
            placeholder="70"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
      {result ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Result value={`${fmt(result.proteinG, 0)} g`} caption="Protein, 2 g per kg" />
          <Result value={`${fmt(result.fatG, 0)} g`} caption="Fat, 25% of calories" />
          <Result value={`${fmt(result.carbsG, 0)} g`} caption="Carbs, what is left" />
        </div>
      ) : (
        <EmptyHint />
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">
        A simple baseline for training days. Hit protein first, then fill
        the rest however you like.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function WaterTab() {
  const [weight, setWeight] = useState("");
  const [minutes, setMinutes] = useState("");

  const result = useMemo(() => {
    const w = num(weight);
    const m = num(minutes);
    if (!w || w <= 0) return null;
    const liters = w * 0.033 + (m && m > 0 ? m / 30 : 0) * 0.35;
    return { liters };
  }, [minutes, weight]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="wat-w" label="Body weight (kg)">
          <Input
            id="wat-w"
            type="number"
            inputMode="decimal"
            placeholder="70"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field id="wat-m" label="Exercise today (min)">
          <Input
            id="wat-m"
            type="number"
            inputMode="numeric"
            placeholder="45"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
      {result ? (
        <Result
          value={`${fmt(result.liters, 2)} L`}
          caption="Rough daily water target"
        />
      ) : (
        <EmptyHint />
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Baseline of 33 ml per kg, plus 350 ml for every half hour of
        training. Thirst still wins.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function StepsTab() {
  const [weight, setWeight] = useState("");
  const [steps, setSteps] = useState("");
  const [targetKcal, setTargetKcal] = useState("");

  const result = useMemo(() => {
    const w = num(weight);
    const s = num(steps);
    const t = num(targetKcal);
    if (!w || w <= 0) return null;
    const kcalPerStep = 0.04 * (w / 70);
    const kcal = s && s > 0 ? s * kcalPerStep : null;
    const km = s && s > 0 ? s * 0.000762 : null;
    const stepsNeeded = t && t > 0 ? t / kcalPerStep : null;
    if (kcal === null && stepsNeeded === null) return null;
    return { kcal, km, stepsNeeded };
  }, [steps, targetKcal, weight]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="stp-w" label="Body weight (kg)">
          <Input
            id="stp-w"
            type="number"
            inputMode="decimal"
            placeholder="70"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field id="stp-s" label="Steps (optional)">
          <Input
            id="stp-s"
            type="number"
            inputMode="numeric"
            placeholder="10000"
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field id="stp-t" label="Target kcal (optional)">
          <Input
            id="stp-t"
            type="number"
            inputMode="numeric"
            placeholder="300"
            value={targetKcal}
            onChange={(e) => setTargetKcal(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
      {result ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {result.kcal !== null && (
            <Result value={fmt(result.kcal, 0)} caption="Kcal burned for those steps" />
          )}
          {result.km !== null && (
            <Result value={`${fmt(result.km, 2)} km`} caption="Distance covered" />
          )}
          {result.stepsNeeded !== null && (
            <Result
              value={fmt(result.stepsNeeded, 0)}
              caption="Steps needed for the target kcal"
            />
          )}
        </div>
      ) : (
        <EmptyHint />
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Rough walking math tuned to a 70 kg person. Faster pace burns more.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function PaceTab() {
  const [distance, setDistance] = useState("");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [unit, setUnit] = useState<"km" | "mi">("km");
  const [targetTime, setTargetTime] = useState("");

  const result = useMemo(() => {
    const d = num(distance);
    const h = num(hours) ?? 0;
    const m = num(minutes) ?? 0;
    const s = num(seconds) ?? 0;
    if (!d || d <= 0) return null;
    const totalSec = h * 3600 + m * 60 + s;
    if (totalSec <= 0) return null;
    const paceSecPerUnit = totalSec / d;
    const speed = d / (totalSec / 3600);
    const mmss = (sec: number) =>
      `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;
    const t = num(targetTime);
    const targetPace =
      t && t > 0 && d > 0 ? mmss((t * 60) / d) : null;
    return { pace: mmss(paceSecPerUnit), speed, targetPace };
  }, [distance, hours, minutes, seconds, targetTime]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Distance and time to pace and speed
        </p>
        <Select value={unit} onValueChange={(v) => setUnit(v as "km" | "mi")}>
          <SelectTrigger className="h-11 w-28 border-border bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="km">Kilometers</SelectItem>
            <SelectItem value="mi">Miles</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="pac-d" label={`Distance (${unit})`}>
          <Input
            id="pac-d"
            type="number"
            inputMode="decimal"
            placeholder={unit === "km" ? "5" : "3.1"}
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            className={inputClass}
          />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field id="pac-h" label="Hours">
            <Input
              id="pac-h"
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field id="pac-m" label="Minutes">
            <Input
              id="pac-m"
              type="number"
              inputMode="numeric"
              placeholder="25"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field id="pac-s" label="Seconds">
            <Input
              id="pac-s"
              type="number"
              inputMode="numeric"
              placeholder="30"
              value={seconds}
              onChange={(e) => setSeconds(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      </div>
      <Field id="pac-t" label={`Target finish time in minutes (optional)`}>
        <Input
          id="pac-t"
          type="number"
          inputMode="decimal"
          placeholder="25"
          value={targetTime}
          onChange={(e) => setTargetTime(e.target.value)}
          className={inputClass}
        />
      </Field>
      {result ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Result
            value={result.pace}
            caption={`Pace per ${unit}`}
          />
          <Result
            value={`${fmt(result.speed, 2)}`}
            caption={`Average speed in ${unit} per hour`}
          />
          {result.targetPace !== null && (
            <Result
              value={result.targetPace}
              caption={`Pace needed per ${unit} for the target time`}
            />
          )}
        </div>
      ) : (
        <EmptyHint />
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Pace is time per unit, speed is units per hour. Use the target box
        to see what pace your goal time asks for.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const TABS = [
  { value: "bmi", label: "BMI", content: <BmiTab /> },
  { value: "onerm", label: "1RM", content: <OneRmTab /> },
  { value: "calories", label: "Calories", content: <CaloriesTab /> },
  { value: "macros", label: "Macros", content: <MacrosTab /> },
  { value: "water", label: "Water", content: <WaterTab /> },
  { value: "pace", label: "Pace", content: <PaceTab /> },
  { value: "steps", label: "Steps", content: <StepsTab /> },
];

export default function Calculators() {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-2xl uppercase tracking-wide">
          <Calculator className="h-5 w-5 text-volt" aria-hidden />
          Calculators
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="bmi">
          <TabsList className="no-scrollbar h-auto w-full justify-start overflow-x-auto rounded-none bg-secondary p-1">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="font-head text-[11px] font-bold uppercase tracking-widest data-[state=active]:bg-volt data-[state=active]:text-black"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {TABS.map((tab) => (
            <TabsContent
              key={tab.value}
              value={tab.value}
              className="mt-4"
            >
              {tab.content}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
