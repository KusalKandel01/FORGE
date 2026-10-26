"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Check, Flame, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MAX_ACTIVE_HABITS,
  type Habit,
  dateKey,
  isDone,
  streakFor,
  todayKey,
  useHabits,
} from "@/lib/habits-store";

/**
 * Daily habit tracker card. Fully client side, no API calls.
 * Reads the persisted "forge-habits" store and awards XP through it.
 */

const emptySubscribe = () => () => {};

export default function HabitCard() {
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const habits = useHabits((s) => s.habits);
  const checks = useHabits((s) => s.checks);
  const xpAwarded = useHabits((s) => s.xpAwarded);

  // Mounted gate so SSR markup always matches (persisted store read).
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!mounted) {
    return (
      <section
        aria-busy="true"
        className="border border-border bg-card p-5 md:p-6"
      >
        <h2 className="font-display text-3xl tracking-wide">DAILY HABITS</h2>
        <p className="mt-1 font-head text-xs font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
          Small reps, every day. That is the whole trick.
        </p>
        <div className="mt-5 space-y-3">
          <div className="h-2 bg-secondary" />
          <div className="h-11 bg-secondary" />
          <div className="h-11 bg-secondary" />
          <div className="h-11 bg-secondary" />
        </div>
      </section>
    );
  }

  const active = habits.filter((h) => !h.archivedAt);
  const today = todayKey();
  const doneToday = active.filter((h) => (checks[h.id] ?? []).includes(today));
  const percent =
    active.length === 0
      ? 0
      : Math.round((doneToday.length / active.length) * 100);
  const slotsLeft = MAX_ACTIVE_HABITS - active.length;
  const allBonusGuard = `alldone:${today}`;
  const bonusEarned = xpAwarded.includes(allBonusGuard);

  // Last 7 days ending today, oldest first.
  const last7: string[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7.push(dateKey(d));
  }

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) {
      setFormError("Give the habit a name first.");
      return;
    }
    const created = useHabits.getState().addHabit(clean);
    if (!created) {
      setFormError(
        active.length >= MAX_ACTIVE_HABITS
          ? "All 8 habit slots are in use. Remove one first."
          : "Habit name must be 1 to 60 characters."
      );
      return;
    }
    setName("");
    setFormError(null);
  };

  return (
    <section className="border border-border bg-card p-5 md:p-6">
      <header>
        <h2 className="font-display text-3xl tracking-wide">DAILY HABITS</h2>
        <p className="mt-1 font-head text-xs font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
          Small reps, every day. That is the whole trick.
        </p>
      </header>

      {active.length > 0 && (
        <div className="mt-5">
          <div className="flex items-end justify-between gap-4">
            <p className="font-head text-xs font-extrabold uppercase tracking-[0.2em]">
              {doneToday.length}/{active.length} done today
            </p>
            <p className="font-head text-xs font-extrabold uppercase tracking-[0.2em] text-volt">
              {percent}%
            </p>
          </div>
          <div
            role="progressbar"
            aria-label="Today's habit progress"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            className="mt-2 h-2 bg-secondary"
          >
            <div className="h-full bg-volt" style={{ width: `${percent}%` }} />
          </div>
          {bonusEarned && (
            <p className="mt-2 font-head text-[10px] font-extrabold uppercase tracking-[0.2em] text-volt">
              All habits done. Bonus +15 XP earned today.
            </p>
          )}
        </div>
      )}

      {active.length === 0 ? (
        <p className="mt-5 border border-dashed border-border bg-secondary/30 p-4 text-sm leading-relaxed text-muted-foreground">
          No habits yet. Start with one small thing you can do today.
        </p>
      ) : (
        <ul className="nice-scrollbar mt-5 max-h-96 space-y-3 overflow-y-auto pr-1">
          {active.map((h) => (
            <HabitRow
              key={h.id}
              habit={h}
              today={today}
              last7={last7}
              confirmOpen={confirmId === h.id}
              onAskConfirm={() => setConfirmId(h.id)}
              onCancelConfirm={() => setConfirmId(null)}
            />
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (formError) setFormError(null);
          }}
          maxLength={60}
          placeholder="e.g. Read 10 pages"
          aria-label="New habit name"
          disabled={slotsLeft === 0}
          className="h-11 border-border bg-background text-base"
        />
        <Button
          type="submit"
          disabled={slotsLeft === 0}
          className="hard-shadow-sm-volt h-11 shrink-0 bg-volt px-5 font-head text-xs font-extrabold uppercase tracking-[0.2em] text-black hover:bg-volt hover:text-black active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          Add
        </Button>
      </form>
      {formError ? (
        <p role="alert" className="mt-2 text-xs text-ember">
          {formError}
        </p>
      ) : (
        <p className="mt-2 font-head text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
          {active.length}/{MAX_ACTIVE_HABITS} habit slots used
        </p>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Row                                                                 */
/* ------------------------------------------------------------------ */

function HabitRow({
  habit,
  today,
  last7,
  confirmOpen,
  onAskConfirm,
  onCancelConfirm,
}: {
  habit: Habit;
  today: string;
  last7: string[];
  confirmOpen: boolean;
  onAskConfirm: () => void;
  onCancelConfirm: () => void;
}) {
  const done = isDone(habit.id, today);
  const streak = streakFor(habit.id);
  const hot = streak >= 3;

  return (
    <li className="border border-border bg-secondary/30 p-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => useHabits.getState().toggleCheck(habit.id, today)}
          aria-pressed={done}
          aria-label={
            done
              ? `Mark ${habit.name} as not done today`
              : `Mark ${habit.name} as done today`
          }
          className={`flex h-11 w-11 shrink-0 items-center justify-center border transition-colors ${
            done
              ? "border-volt bg-volt text-black"
              : "border-border bg-transparent hover:border-volt/70"
          }`}
        >
          {done && <Check className="h-5 w-5" strokeWidth={3} aria-hidden />}
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold md:text-base">
            {habit.name}
          </p>
          <p
            className={`mt-0.5 flex items-center gap-1.5 font-head text-[10px] font-extrabold uppercase tracking-[0.2em] ${
              hot ? "text-ember" : "text-muted-foreground"
            }`}
          >
            <Flame className="h-3.5 w-3.5" aria-hidden />
            {streak} day streak
          </p>
        </div>

        <DeleteButton
          name={habit.name}
          armed={confirmOpen}
          onArm={onAskConfirm}
          onDisarm={onCancelConfirm}
          onDelete={() => {
            useHabits.getState().removeHabit(habit.id);
            onCancelConfirm();
          }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="font-head text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
          Last 7 days
        </span>
        <div className="flex items-center gap-1" aria-hidden>
          {last7.map((k) => {
            const filled = isDone(habit.id, k);
            return (
              <span
                key={k}
                className={`h-2 w-2 ${
                  filled ? "bg-volt" : "border border-border bg-transparent"
                }`}
              />
            );
          })}
        </div>
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Two tap delete: first tap arms, second tap within 3s removes.       */
/* ------------------------------------------------------------------ */

function DeleteButton({
  name,
  armed,
  onArm,
  onDisarm,
  onDelete,
}: {
  name: string;
  armed: boolean;
  onArm: () => void;
  onDisarm: () => void;
  onDelete: () => void;
}) {
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(onDisarm, 3000);
    return () => clearTimeout(t);
  }, [armed, onDisarm]);

  return (
    <button
      type="button"
      onClick={armed ? onDelete : onArm}
      aria-label={armed ? `Confirm delete habit ${name}` : `Delete habit ${name}`}
      className={`flex h-11 w-11 shrink-0 items-center justify-center border transition-colors ${
        armed
          ? "border-ember bg-ember/10 text-ember"
          : "border-transparent text-muted-foreground hover:border-ember/50 hover:text-ember"
      }`}
    >
      <Trash2 className="h-4 w-4" aria-hidden />
    </button>
  );
}
