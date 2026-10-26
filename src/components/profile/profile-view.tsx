"use client";

import {
  Award,
  BookOpen,
  Dumbbell,
  Flame,
  GraduationCap,
  Lock,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

import {
  BADGES,
  computeBestStreak,
  computeStreak,
  useFitness,
} from "@/components/fitness/store";
import { useLibrary } from "@/components/library/store";
import { useLearnStore } from "@/components/learn/store";
import { useSkillsStore } from "@/components/skills/store";
import { levelFromXp, useProfile, xpForLevel } from "@/lib/profile-store";

/**
 * Profile dashboard. Read-only view over the persisted stores:
 * every number here comes from real logged user activity.
 * Parent must render this inside <ClientOnly> (stores live in localStorage).
 */

const KICKER =
  "font-head text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground";

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  accent?: "volt" | "ember";
}) {
  return (
    <div className="border border-border bg-background p-4">
      <div className="flex items-center gap-2">
        <Icon
          className={
            accent === "volt"
              ? "h-3.5 w-3.5 text-volt"
              : accent === "ember"
                ? "h-3.5 w-3.5 text-ember"
                : "h-3.5 w-3.5 text-muted-foreground"
          }
          aria-hidden
        />
        <span className={KICKER}>{label}</span>
      </div>
      <p className="mt-2 font-display text-4xl leading-none">{value}</p>
      <p className="mt-2 font-head text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
        {sub}
      </p>
    </div>
  );
}

export default function ProfileView() {
  const xp = useProfile((s) => s.xp);
  const logs = useFitness((s) => s.logs);
  const badges = useFitness((s) => s.badges);
  const shelf = useLibrary((s) => s.shelf);
  const booksXpAwarded = useLibrary((s) => s.booksXpAwarded);
  const lessons = useLearnStore((s) => s.lessons);
  const masteredAt = useSkillsStore((s) => s.masteredAt);

  /* Level math, exactly per profile-store helpers:
     xpForLevel(level) = (level-1)^2 * 100, so the bar fills
     from xpForLevel(level) up to xpForLevel(level + 1). */
  const level = levelFromXp(xp);
  const levelBaseXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const levelSpan = Math.max(1, nextLevelXp - levelBaseXp);
  const xpIntoLevel = Math.min(Math.max(0, xp - levelBaseXp), levelSpan);
  const progressPct = Math.round((xpIntoLevel / levelSpan) * 100);

  /* Train: sums across every logged day. */
  const dayLogs = Object.values(logs);
  const totalWorkouts = dayLogs.reduce((acc, l) => acc + l.workouts.length, 0);
  const totalSteps = dayLogs.reduce((acc, l) => acc + l.steps, 0);
  const streak = computeStreak(logs);
  const bestStreak = computeBestStreak(logs);

  /* Read: a book counts as finished if it earned its finish XP mark,
     or sits on the shelf at full progress. Union of both keeps it honest. */
  const finishedIds = new Set<string>(booksXpAwarded);
  for (const book of shelf) {
    if (book.progress >= 0.999) finishedIds.add(book.id);
  }
  const booksFinished = finishedIds.size;

  /* Learn: completed lessons + aggregate quiz accuracy (only real quizzes). */
  const completedLessons = lessons.filter((l) => l.completed).length;
  let quizScoreSum = 0;
  let quizTotalSum = 0;
  for (const lesson of lessons) {
    if (
      typeof lesson.quizTotal === "number" &&
      lesson.quizTotal > 0 &&
      typeof lesson.quizScore === "number"
    ) {
      quizScoreSum += lesson.quizScore;
      quizTotalSum += lesson.quizTotal;
    }
  }
  const quizAccuracyPct =
    quizTotalSum > 0 ? Math.round((quizScoreSum / quizTotalSum) * 100) : null;

  /* Skills: mastery stamps from full checklist completion. */
  const masteredCount = Object.keys(masteredAt).length;

  const earnedKeys = new Set(badges);

  return (
    <section
      aria-label="Profile dashboard"
      className="border border-border bg-card p-5 md:p-6"
    >
      {/* Header: level + XP progress */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className={KICKER}>Profile</p>
          <p className="mt-1 font-display text-6xl leading-none md:text-7xl">
            LVL {level}
          </p>
          <p className="mt-2 font-head text-xs font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
            Forged from real work
          </p>
        </div>

        <div className="w-full md:max-w-sm">
          <div className="flex items-baseline justify-between gap-2">
            <span className={KICKER}>Total XP</span>
            <span className="font-display text-2xl leading-none text-volt">
              {xp.toLocaleString()}
            </span>
          </div>
          <div
            className="mt-2 h-2 w-full bg-secondary"
            role="progressbar"
            aria-label="Progress to next level"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPct}
          >
            <div className="h-full bg-volt" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="mt-2 font-head text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
            {xp.toLocaleString()} / {nextLevelXp.toLocaleString()} XP TO LVL{" "}
            {level + 1}
          </p>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          icon={Dumbbell}
          label="Train"
          value={totalWorkouts.toLocaleString()}
          sub={`${totalSteps.toLocaleString()} steps`}
        />
        <StatTile
          icon={BookOpen}
          label="Read"
          value={booksFinished.toLocaleString()}
          sub={`${shelf.length.toLocaleString()} on shelf`}
        />
        <StatTile
          icon={GraduationCap}
          label="Learn"
          value={completedLessons.toLocaleString()}
          sub={
            quizAccuracyPct !== null
              ? `${quizAccuracyPct}% quiz avg`
              : "No quizzes yet"
          }
        />
        <StatTile
          icon={Wrench}
          label="Skills"
          value={masteredCount.toLocaleString()}
          sub="Mastered"
        />
        <StatTile
          icon={Flame}
          label="Streak"
          accent="ember"
          value={streak.toLocaleString()}
          sub={`Best ${bestStreak.toLocaleString()} ${bestStreak === 1 ? "day" : "days"}`}
        />
        <StatTile
          icon={Zap}
          label="XP Total"
          accent="volt"
          value={xp.toLocaleString()}
          sub="Lifetime"
        />
      </div>

      {/* Badges: earned through real logged work only */}
      <div className="mt-6 border-t border-border pt-6">
        <p className="font-head text-xs font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
          Badges
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {BADGES.map((badge) => {
            const earned = earnedKeys.has(badge.key);
            return (
              <div
                key={badge.key}
                className={
                  earned
                    ? "border border-volt bg-volt p-4 text-black"
                    : "border border-border bg-background p-4 text-muted-foreground"
                }
              >
                <div className="flex items-center gap-2">
                  {earned ? (
                    <Award className="h-4 w-4" aria-hidden />
                  ) : (
                    <Lock className="h-4 w-4" aria-hidden />
                  )}
                  <span className="font-head text-xs font-extrabold uppercase tracking-[0.2em]">
                    {badge.label}
                  </span>
                </div>
                <p
                  className={
                    earned
                      ? "mt-2 text-xs text-black/70"
                      : "mt-2 text-xs text-muted-foreground"
                  }
                >
                  {badge.description}
                </p>
                <p className="mt-2 font-head text-[10px] font-extrabold uppercase tracking-[0.2em]">
                  {earned ? "Earned" : "Locked"}
                </p>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Badges come from real logged work in Train.
        </p>
      </div>
    </section>
  );
}
