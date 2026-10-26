"use client";

import { useMemo } from "react";
import { BadgeCheck, Flame, Lock, Quote } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BADGES, computeBestStreak, computeStreak, useFitness } from "./store";

interface TrainingQuote {
  text: string;
  author: string;
}

/** 24 real training quotes. Changes with the day of the year. No emoji, no em dashes. */
const QUOTES: TrainingQuote[] = [
  {
    text: "Everybody wants to be a beast, but few are willing to train like one.",
    author: "Ronnie Coleman",
  },
  {
    text: "I hated every minute of training, but I said: do not quit. Suffer now and live the rest of your life as a champion.",
    author: "Muhammad Ali",
  },
  {
    text: "The difference between a successful person and others is not a lack of strength or knowledge, but rather a lack of will.",
    author: "Vince Lombardi",
  },
  {
    text: "It never gets easier. You just go faster.",
    author: "Greg LeMond",
  },
  {
    text: "You miss 100 percent of the shots you never take.",
    author: "Wayne Gretzky",
  },
  {
    text: "The only place where success comes before work is in the dictionary.",
    author: "Vidal Sassoon",
  },
  {
    text: "Strength does not come from winning. Your struggles develop your strengths.",
    author: "Arnold Schwarzenegger",
  },
  {
    text: "What hurts today makes you stronger tomorrow.",
    author: "Jay Cutler",
  },
  {
    text: "If it does not challenge you, it does not change you.",
    author: "Fred DeVito",
  },
  {
    text: "Motivation gets you going. Discipline keeps you growing.",
    author: "John C. Maxwell",
  },
  {
    text: "A one hour workout is 4 percent of your day. No excuses.",
    author: "Richard Branson",
  },
  {
    text: "Long-term consistency beats short-term intensity.",
    author: "Bruce Lee",
  },
  {
    text: "Nothing is particularly hard if you divide it into small jobs.",
    author: "Henry Ford",
  },
  {
    text: "Great things come from hard work and perseverance. No excuses.",
    author: "Kobe Bryant",
  },
  {
    text: "I have failed over and over and over again in my life. And that is why I succeed.",
    author: "Michael Jordan",
  },
  {
    text: "A champion is defined not by their wins, but by how they can recover when they fall.",
    author: "Serena Williams",
  },
  {
    text: "If you do not believe in yourself, nothing is possible. If you do, anything is.",
    author: "Usain Bolt",
  },
  {
    text: "If you have a body, you are an athlete.",
    author: "Bill Bowerman",
  },
  {
    text: "Take care of your body. It is the only place you have to live.",
    author: "Jim Rohn",
  },
  {
    text: "Success is not always about greatness. It is about consistency. Consistent hard work gains success.",
    author: "Dwayne Johnson",
  },
  {
    text: "Nobody cares what you did yesterday. What have you done today?",
    author: "David Goggins",
  },
  {
    text: "Exercise is king. Nutrition is queen. Put them together and you have a kingdom.",
    author: "Jack LaLanne",
  },
  {
    text: "We all have dreams. To make dreams come into reality takes determination, dedication, self-discipline and effort.",
    author: "Jesse Owens",
  },
  {
    text: "Once you have wrestled, everything else in life is easier.",
    author: "Dan Gable",
  },
  {
    text: "The last three or four reps is what makes the muscle grow.",
    author: "Arnold Schwarzenegger",
  },
  {
    text: "You have to be at your strongest when you are feeling at your weakest.",
    author: "Dwayne Johnson",
  },
  {
    text: "Pain is temporary. It may last a minute, or an hour, or a day, or a year, but eventually it will subside and something else will take its place.",
    author: "Lance Armstrong",
  },
  {
    text: "If you want something you have never had, you must be willing to do something you have never done.",
    author: "Thomas Jefferson",
  },
  {
    text: "A year from now you may wish you had started today.",
    author: "Karen Lamb",
  },
  {
    text: "The body achieves what the mind believes.",
    author: "Napoleon Hill",
  },
  {
    text: "Discipline is choosing between what you want now and what you want most.",
    author: "Abraham Lincoln",
  },
  {
    text: "Success is not final, failure is not fatal. It is the courage to continue that counts.",
    author: "Winston Churchill",
  },
  {
    text: "Do something today that your future self will thank you for.",
    author: "Sean Patrick Flanery",
  },
  {
    text: "The pain you feel today will be the strength you feel tomorrow.",
    author: "Stephen Richards",
  },
  {
    text: "Motivation is what gets you started. Habit is what keeps you going.",
    author: "Jim Ryun",
  },
  {
    text: "Champions keep playing until they get it right.",
    author: "Billie Jean King",
  },
  {
    text: "Hard work beats talent when talent does not work hard.",
    author: "Tim Notke",
  },
  {
    text: "Fall seven times, stand up eight.",
    author: "Japanese proverb",
  },
  {
    text: "Great things come from hard work and perseverance. No excuses.",
    author: "Kobe Bryant",
  },
];

function dayOfYear(now: Date): number {
  const start = new Date(now.getFullYear(), 0, 0);
  const ms = now.getTime() - start.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

export default function Motivation() {
  const logs = useFitness((s) => s.logs);
  const badges = useFitness((s) => s.badges);

  const quote = useMemo(() => {
    const index = dayOfYear(new Date()) % QUOTES.length;
    return QUOTES[index];
  }, []);

  const streak = computeStreak(logs);
  const best = computeBestStreak(logs);

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-2xl uppercase tracking-wide">
          <Flame className="h-5 w-5 text-volt" aria-hidden />
          Motivation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Daily quote */}
        <figure className="border-l-4 border-volt bg-secondary/30 p-5">
          <Quote className="h-4 w-4 text-volt" aria-hidden />
          <blockquote className="mt-3 font-display text-2xl leading-snug tracking-wide md:text-3xl">
            {quote.text}
          </blockquote>
          <figcaption className="mt-3 font-head text-[11px] font-extrabold uppercase tracking-[0.2em] text-volt">
            {quote.author}
          </figcaption>
        </figure>

        {/* Streaks */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-4 border border-border bg-secondary/30 p-4">
            <Flame className="h-8 w-8 shrink-0 text-volt" aria-hidden />
            <div>
              <p className="font-display text-4xl leading-none">{streak}</p>
              <p className="mt-1 font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Day streak
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 border border-border bg-secondary/30 p-4">
            <BadgeCheck className="h-8 w-8 shrink-0 text-volt" aria-hidden />
            <div>
              <p className="font-display text-4xl leading-none">{best}</p>
              <p className="mt-1 font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Best streak
              </p>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div>
          <p className="font-head text-[11px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
            Badges, {badges.length} of {BADGES.length} earned
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BADGES.map((badge) => {
              const earned = badges.includes(badge.key);
              return (
                <div
                  key={badge.key}
                  className={
                    earned
                      ? "bg-volt p-3 text-black"
                      : "border border-border p-3 text-muted-foreground"
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-head text-xs font-extrabold uppercase tracking-[0.2em]">
                      {badge.label}
                    </p>
                    {earned ? (
                      <BadgeCheck className="h-4 w-4 shrink-0" aria-hidden />
                    ) : (
                      <Lock className="h-4 w-4 shrink-0" aria-hidden />
                    )}
                  </div>
                  <p
                    className={`mt-1.5 text-xs leading-relaxed ${
                      earned ? "text-black/80" : "text-muted-foreground"
                    }`}
                  >
                    {badge.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
