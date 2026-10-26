"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookMarked,
  Check,
  FlaskConical,
  ListChecks,
  ListTree,
  NotebookPen,
  RotateCcw,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { TopicMedia } from "@/components/shared/topic-media";
import { cn } from "@/lib/utils";
import type { Lesson } from "@/lib/learn-cache";
import { useLearnStore, type LessonMeta } from "./store";

const LABEL = "font-head text-xs font-extrabold uppercase tracking-[0.2em]";

interface LessonViewProps {
  lesson: Lesson;
  meta?: LessonMeta;
  onRequestTopic: (topic: string) => void;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function twoDigit(index: number): string {
  return String(index + 1).padStart(2, "0");
}

export default function LessonView({ lesson, meta, onRequestTopic }: LessonViewProps) {
  const { toast } = useToast();
  const setNotes = useLearnStore((s) => s.setNotes);
  const setQuizScore = useLearnStore((s) => s.setQuizScore);
  const markCompleted = useLearnStore((s) => s.markCompleted);

  const [qIndex, setQIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const [notes, setLocalNotes] = useState(meta?.notes ?? "");
  const notesRef = useRef(meta?.notes ?? "");
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = lesson.quiz.length;
  const question = lesson.quiz[qIndex];
  const completed = meta?.completed ?? false;
  const answered = picked !== null;
  const isLast = qIndex >= total - 1;
  const perfect = score === total && total > 0;

  // Flush pending note edits when the lesson unmounts.
  useEffect(() => {
    return () => {
      if (notesTimer.current) {
        clearTimeout(notesTimer.current);
        setNotes(lesson.id, notesRef.current);
      }
    };
  }, [lesson.id, setNotes]);

  const handlePick = (index: number) => {
    if (answered || finished) return;
    setPicked(index);
    if (question && index === question.answerIndex) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (!answered || !question) return;
    if (isLast) {
      setFinished(true);
      setQuizScore(lesson.id, score, total);
      if (perfect) {
        toast({
          title: "Perfect score",
          description: "Every answer correct. +10 XP added to your profile.",
        });
      }
    } else {
      setQIndex((i) => i + 1);
      setPicked(null);
    }
  };

  const handleResetQuiz = () => {
    setQIndex(0);
    setPicked(null);
    setScore(0);
    setFinished(false);
  };

  const handleNotesChange = (value: string) => {
    setLocalNotes(value);
    notesRef.current = value;
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => {
      notesTimer.current = null;
      setNotes(lesson.id, notesRef.current);
    }, 600);
  };

  const handleComplete = () => {
    if (completed) return;
    markCompleted(lesson.id);
    toast({
      title: "Lesson complete",
      description: "Marked as done. +30 XP added to your profile.",
    });
  };

  return (
    <Card className="border-border bg-card">
      <CardContent className="space-y-10 p-6">
        {/* Header */}
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-volt/60 font-head text-[10px] font-extrabold uppercase tracking-widest text-volt"
            >
              {lesson.level}
            </Badge>
            <span className={cn(LABEL, "text-muted-foreground")}>
              {lesson.topic}
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              Saved {formatDate(lesson.savedAt)}
            </span>
          </div>
          <h2 className="font-display text-3xl uppercase tracking-wide">
            {lesson.title}
          </h2>
        </header>

        {/* Summary */}
        <p className="border-l-2 border-volt pl-4 text-base leading-relaxed text-muted-foreground">
          {lesson.summary}
        </p>

        {/* Real online media: an actual explainer video and real photos of
            the topic, found on the web, so it is easy to picture it. */}
        <TopicMedia query={`${lesson.title} explained`} />

        {/* Sections */}
        <section aria-label="Lesson sections" className="space-y-6">
          <div className="flex items-center gap-2">
            <ListTree className="h-4 w-4 text-volt" aria-hidden />
            <h3 className={LABEL}>Sections</h3>
          </div>
          <div className="space-y-8">
            {lesson.sections.map((section, i) => (
              <div key={i} className="space-y-3">
                <div className="flex items-baseline gap-3">
                  <span
                    aria-hidden
                    className="font-display text-2xl leading-none text-volt"
                  >
                    {twoDigit(i)}
                  </span>
                  <h4 className="font-head text-sm font-extrabold uppercase tracking-[0.2em]">
                    {section.heading}
                  </h4>
                </div>
                <div className="space-y-3">
                  {section.content.split("\n\n").map((para, pIndex) => (
                    <p
                      key={pIndex}
                      className="text-sm leading-relaxed text-muted-foreground"
                    >
                      {para}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Key terms */}
        {lesson.keyTerms.length > 0 && (
          <section aria-label="Key terms" className="space-y-4">
            <div className="flex items-center gap-2">
              <BookMarked className="h-4 w-4 text-volt" aria-hidden />
              <h3 className={LABEL}>Key terms</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {lesson.keyTerms.map((kt) => (
                <div
                  key={kt.term}
                  className="border border-border bg-secondary/30 p-4"
                >
                  <p className="font-head text-sm font-extrabold text-volt">
                    {kt.term}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {kt.definition}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Examples */}
        {lesson.examples.length > 0 && (
          <section aria-label="Examples" className="space-y-4">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-volt" aria-hidden />
              <h3 className={LABEL}>Examples</h3>
            </div>
            <ol className="space-y-3">
              {lesson.examples.map((example, i) => (
                <li key={i} className="flex gap-4">
                  <span
                    aria-hidden
                    className="font-display text-2xl leading-none text-volt"
                  >
                    {twoDigit(i)}
                  </span>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {example}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Quiz */}
        {question && (
          <section
            aria-label="Quiz"
            className="space-y-4 border border-border bg-secondary/30 p-4 sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-volt" aria-hidden />
                <h3 className={LABEL}>Test yourself</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="border border-border px-2 py-1 font-head text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                  Score {score}/{total}
                </span>
                <Button
                  variant="outline"
                  onClick={handleResetQuiz}
                  className="h-11 border-border bg-background px-4 font-head text-xs font-extrabold uppercase tracking-[0.2em] hover:bg-secondary"
                >
                  <RotateCcw className="mr-2 h-4 w-4" aria-hidden /> Reset quiz
                </Button>
              </div>
            </div>

            {finished ? (
              <div className="space-y-3 py-4 text-center">
                <p className={cn(LABEL, "text-muted-foreground")}>Result</p>
                <p className="font-display text-4xl tracking-wide">
                  You scored {score} / {total}
                </p>
                {perfect ? (
                  <p className="text-sm font-semibold text-volt">
                    Flawless run. Every answer correct. +10 XP.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Reset the quiz to try for a perfect run.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className={cn(LABEL, "text-muted-foreground")}>
                  Question {qIndex + 1} of {total}
                </p>
                <h4 className="text-lg font-semibold leading-snug">
                  {question.question}
                </h4>
                <div className="space-y-2">
                  {question.options.map((option, i) => {
                    const isCorrect = i === question.answerIndex;
                    const isPicked = picked === i;
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={answered}
                        onClick={() => handlePick(i)}
                        aria-pressed={answered ? isPicked : undefined}
                        className={cn(
                          "flex h-11 w-full items-center gap-3 border px-4 text-left text-sm transition-colors",
                          !answered &&
                            "border-border bg-background hover:border-volt hover:bg-secondary",
                          answered &&
                            isCorrect &&
                            "border-volt bg-volt font-semibold text-black",
                          answered &&
                            isPicked &&
                            !isCorrect &&
                            "border-destructive text-destructive",
                          answered &&
                            !isCorrect &&
                            !isPicked &&
                            "border-border text-muted-foreground"
                        )}
                      >
                        <span
                          aria-hidden
                          className="font-head text-xs font-extrabold"
                        >
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="flex-1">{option}</span>
                        {answered && isCorrect && (
                          <Check className="h-4 w-4 shrink-0" aria-hidden />
                        )}
                        {answered && isPicked && !isCorrect && (
                          <X className="h-4 w-4 shrink-0" aria-hidden />
                        )}
                      </button>
                    );
                  })}
                </div>

                {answered && (
                  <div className="space-y-4">
                    <div className="border-l-2 border-volt pl-4">
                      <p className="font-head text-[10px] font-extrabold uppercase tracking-widest text-volt">
                        Explanation
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {question.explanation}
                      </p>
                    </div>
                    <Button
                      onClick={handleNext}
                      className="h-11 bg-volt px-6 font-head text-xs font-extrabold uppercase tracking-[0.2em] text-black hover:bg-volt/90"
                    >
                      {isLast ? "See results" : "Next question"}
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Next steps */}
        {lesson.nextTopics.length > 0 && (
          <section aria-label="Next steps" className="space-y-4">
            <div className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-volt" aria-hidden />
              <h3 className={LABEL}>Next steps</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Tap a topic to generate that lesson next.
            </p>
            <div className="flex flex-wrap gap-2">
              {lesson.nextTopics.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => onRequestTopic(topic)}
                  className="h-10 border border-border bg-background px-4 font-head text-xs font-extrabold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:border-volt hover:text-volt"
                >
                  {topic}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Notes */}
        <section aria-label="My notes" className="space-y-3">
          <div className="flex items-center gap-2">
            <NotebookPen className="h-4 w-4 text-volt" aria-hidden />
            <h3 className={LABEL}>My notes</h3>
          </div>
          <Textarea
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Write your own notes. They save automatically on this device."
            aria-label="My notes"
            className="min-h-[120px] border-border bg-background text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Saved on this device. Works offline.
          </p>
        </section>

        {/* Complete */}
        <div className="flex flex-wrap items-center gap-4 border-t border-border pt-6">
          {completed ? (
            <span className="inline-flex h-11 items-center gap-2 border border-volt/60 px-4 font-head text-xs font-extrabold uppercase tracking-[0.2em] text-volt">
              <Check className="h-4 w-4" aria-hidden /> Completed
            </span>
          ) : (
            <Button
              onClick={handleComplete}
              className="h-11 bg-volt px-6 font-head text-xs font-extrabold uppercase tracking-[0.2em] text-black hover:bg-volt/90"
            >
              <Check className="mr-2 h-4 w-4" aria-hidden /> Mark lesson
              complete
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            Completing a lesson adds +30 XP the first time.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
