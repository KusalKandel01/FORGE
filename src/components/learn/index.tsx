"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  GraduationCap,
  Loader2,
  Sparkles,
  Trash2,
  WifiOff,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import AskPanel from "@/components/ai/ask-panel";
import {
  deleteLesson,
  getLesson,
  saveLesson,
  type Lesson,
  type LessonLevel,
} from "@/lib/learn-cache";
import LessonView from "./lesson-view";
import { useLearnStore } from "./store";

const LEVELS: { value: LessonLevel; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "expert", label: "Expert" },
];

const LABEL = "font-head text-xs font-extrabold uppercase tracking-[0.2em]";

const GENERATION_ERROR =
  "Generation needs internet. Saved lessons still work offline.";

/** Live seconds counter so a long generation never looks frozen. */
function ElapsedTimer() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span
      className="font-head text-xs font-bold tabular-nums tracking-widest text-muted-foreground"
      role="timer"
    >
      {seconds}s
    </span>
  );
}

export default function LearnHub() {
  const { toast } = useToast();
  const metaList = useLearnStore((s) => s.lessons);
  const upsertMeta = useLearnStore((s) => s.upsertMeta);
  const removeMeta = useLearnStore((s) => s.removeMeta);
  const resetLearn = useLearnStore((s) => s.resetLearn);

  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState<LessonLevel>("beginner");
  const [focus, setFocus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);

  const activeRef = useRef<HTMLDivElement | null>(null);

  const scrollToLesson = useCallback(() => {
    requestAnimationFrame(() => {
      activeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const generate = useCallback(
    async (rawTopic: string, rawLevel: LessonLevel, rawFocus?: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/learn/lesson", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: rawTopic,
            level: rawLevel,
            focus: rawFocus && rawFocus.length > 0 ? rawFocus : undefined,
          }),
          // A hung request must never spin the timer forever: 100s hard cap
          // (the tutor usually answers in 15-40s).
          signal: AbortSignal.timeout(100_000),
        });
        const data = (await res.json().catch(() => null)) as
          | { lesson?: Lesson; error?: string }
          | null;
        if (!res.ok || !data?.lesson) {
          throw new Error(data?.error ?? GENERATION_ERROR);
        }
        const lesson = data.lesson;
        await saveLesson(lesson);
        upsertMeta({
          id: lesson.id,
          topic: lesson.topic,
          level: lesson.level,
          title: lesson.title,
          savedAt: lesson.savedAt,
          completed: false,
          quizScore: null,
          quizTotal: null,
          notes: "",
        });
        setActiveLesson(lesson);
        setLoading(false);
        toast({ title: "Lesson ready", description: lesson.title });
        scrollToLesson();
      } catch {
        setLoading(false);
        setError(GENERATION_ERROR);
        toast({
          title: "Could not generate the lesson",
          description: GENERATION_ERROR,
        });
      }
    },
    [scrollToLesson, toast, upsertMeta]
  );

  const handleGenerate = () => {
    const trimmed = topic.trim();
    if (trimmed.length < 2) {
      setError("Type a topic first. Any subject works, from physics to cooking.");
      return;
    }
    void generate(trimmed, level, focus.trim() || undefined);
  };

  const handleRequestTopic = (nextTopic: string) => {
    setTopic(nextTopic);
    setFocus("");
    void generate(nextTopic, level);
  };

  const handleOpen = async (id: string) => {
    const lesson = await getLesson(id);
    if (!lesson) {
      toast({
        title: "Lesson file missing",
        description: "This lesson is no longer stored on this device.",
      });
      removeMeta(id);
      return;
    }
    setActiveLesson(lesson);
    setError(null);
    scrollToLesson();
  };

  const handleDelete = async (id: string) => {
    await deleteLesson(id);
    removeMeta(id);
    setActiveLesson((current) => (current?.id === id ? null : current));
    toast({
      title: "Lesson deleted",
      description: "Removed from this device.",
    });
  };

  const handleReset = () => {
    resetLearn();
    setActiveLesson(null);
    toast({
      title: "Learn data reset",
      description: "Lessons, notes and quiz scores are gone. XP stays.",
    });
  };

  const completedCount = metaList.filter((m) => m.completed).length;
  const activeMeta = activeLesson
    ? metaList.find((m) => m.id === activeLesson.id)
    : undefined;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10">
      {/* Header */}
      <div className="space-y-2">
        <p className="inline-block bg-volt px-3 py-1 font-head text-[11px] font-extrabold uppercase tracking-[0.25em] text-black">
          Study anything
        </p>
        <h1 className="font-display text-5xl tracking-wide">LEARN</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
          Any topic. Any difficulty. Explain it, quiz it, keep it.
        </p>
      </div>

      {/* Generator */}
      <Card className="border-border bg-card">
        <CardContent className="space-y-5 p-6">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-volt" aria-hidden />
            <h2 className={LABEL}>New lesson</h2>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="learn-topic"
              className={cn(LABEL, "text-muted-foreground")}
            >
              Topic
            </label>
            <Input
              id="learn-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleGenerate();
              }}
              placeholder="Type any topic. Quantum physics, Spanish cooking, machine learning, world history..."
              className="h-12 border-border bg-background text-base"
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <span
              id="learn-level-label"
              className={cn(LABEL, "text-muted-foreground")}
            >
              Level
            </span>
            <div
              role="group"
              aria-labelledby="learn-level-label"
              className="grid grid-cols-2 gap-2 sm:grid-cols-4"
            >
              {LEVELS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setLevel(l.value)}
                  aria-pressed={level === l.value}
                  className={cn(
                    "h-11 border font-head text-xs font-extrabold uppercase tracking-[0.2em] transition-colors",
                    level === l.value
                      ? "border-volt bg-volt text-black"
                      : "border-border bg-background text-muted-foreground hover:border-volt/60 hover:text-foreground"
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="learn-focus"
              className={cn(LABEL, "text-muted-foreground")}
            >
              Focus (optional)
            </label>
            <Input
              id="learn-focus"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleGenerate();
              }}
              placeholder="Optional: narrow the angle, e.g. for a job interview"
              className="h-12 border-border bg-background"
              autoComplete="off"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="h-12 bg-volt px-8 font-head text-xs font-extrabold uppercase tracking-[0.2em] text-black hover:bg-volt/90"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" aria-hidden />
              )}
              Generate lesson
            </Button>
            <p className="text-xs text-muted-foreground">
              Lessons save to this device and work offline.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
            >
              {error === GENERATION_ERROR ? (
                <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              )}
              <p>{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ask the tutor: superintelligent tutor and researcher, any field */}
      <AskPanel
        title="Ask the tutor"
        blurb="A superintelligent tutor and research analyst for every field that exists: physics, math, code, medicine, law, history, philosophy, languages, music, anything. It corrects false premises, shows its reasoning and says exactly what science knows versus what is still open."
        starters={[
          "Why does ice float?",
          "Explain compound interest with numbers",
          "What was the Bronze Age collapse?",
          "How does a CPU actually compute?",
        ]}
        endpoint="/api/learn/ask"
        buildContext={() => ({ level })}
        inputPlaceholder="Ask anything in any field. Research questions welcome..."
      />

      {/* Loading state */}
      {loading && (
        <Card className="border-border bg-card" aria-live="polite">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-volt">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                <span className={LABEL}>Composing your lesson...</span>
              </div>
              <ElapsedTimer />
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The tutor is writing a full lesson with a quiz. This usually
              takes 15 to 40 seconds and it is still working even when it
              feels slow. Your saved lessons keep working offline meanwhile.
            </p>
            <Skeleton className="h-9 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-3/5" />
          </CardContent>
        </Card>
      )}

      {/* Active lesson */}
      {!loading && activeLesson && (
        <div ref={activeRef} tabIndex={-1}>
          <LessonView
            key={activeLesson.id}
            lesson={activeLesson}
            meta={activeMeta}
            onRequestTopic={handleRequestTopic}
          />
        </div>
      )}

      {/* Your lessons */}
      <section aria-label="Your saved lessons">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-3xl tracking-wide">YOUR LESSONS</h2>
          <span className={cn(LABEL, "text-muted-foreground")}>
            {metaList.length} saved · {completedCount} completed
          </span>
        </div>

        {metaList.length === 0 ? (
          <Card className="border-dashed bg-card">
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <GraduationCap
                className="h-8 w-8 text-muted-foreground"
                aria-hidden
              />
              <p className={LABEL}>No lessons yet</p>
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                Generate your first one above. Every saved lesson works
                offline.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="nice-scrollbar grid max-h-96 gap-4 overflow-y-auto pr-1 md:grid-cols-2">
            {metaList.map((meta) => (
              <Card
                key={meta.id}
                className="border-border bg-card transition-colors hover:border-volt/70"
              >
                <CardContent className="flex h-full flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-head text-xs font-extrabold uppercase tracking-[0.2em]">
                        {meta.topic}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {meta.title}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="shrink-0 border-volt/60 font-head text-[10px] font-extrabold uppercase tracking-widest text-volt"
                    >
                      {meta.level}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {meta.completed && (
                      <span className="inline-flex items-center gap-1 border border-volt/60 px-2 py-0.5 font-head text-[10px] font-extrabold uppercase tracking-widest text-volt">
                        <Check className="h-3 w-3" aria-hidden /> Completed
                      </span>
                    )}
                    {meta.quizScore !== null && meta.quizTotal !== null && (
                      <span className="border border-border px-2 py-0.5 font-head text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                        Quiz {meta.quizScore}/{meta.quizTotal}
                      </span>
                    )}
                  </div>

                  <div className="mt-auto flex items-center gap-2">
                    <Button
                      onClick={() => void handleOpen(meta.id)}
                      className="h-11 flex-1 bg-volt font-head text-xs font-extrabold uppercase tracking-[0.2em] text-black hover:bg-volt/90"
                    >
                      Open
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label={`Delete lesson: ${meta.title}`}
                          className="h-11 w-11 shrink-0 border-border bg-background text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="font-display text-2xl tracking-wide">
                            Delete this lesson?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {meta.title} and its notes will be removed from this
                            device. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => void handleDelete(meta.id)}
                            className="bg-destructive font-head text-xs font-extrabold uppercase tracking-[0.2em] text-white hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Danger zone */}
      <Card className="border-destructive/40 bg-card">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className={cn(LABEL, "text-destructive")}>Danger zone</h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Reset learn data: deletes every saved lesson, note and quiz score
              on this device. XP you already earned stays.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="h-11 shrink-0 font-head text-xs font-extrabold uppercase tracking-[0.2em]"
              >
                Reset learn data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display text-2xl tracking-wide">
                  Reset all learn data?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Every saved lesson, note and quiz score on this device will be
                  deleted. XP earned from lessons stays on your profile. This
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleReset}
                  className="bg-destructive font-head text-xs font-extrabold uppercase tracking-[0.2em] text-white hover:bg-destructive/90"
                >
                  Reset
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
