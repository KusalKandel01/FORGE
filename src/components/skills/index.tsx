"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Check,
  Loader2,
  Search,
  Sparkles,
  Trash2,
  Wrench,
} from "lucide-react";
import { StepImages } from "@/components/shared/step-images";
import { TopicMedia } from "@/components/shared/topic-media";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { deleteGuide, getGuide, saveGuide } from "@/lib/skills-cache";
import {
  ALL_SKILLS,
  SKILL_CATEGORY_COUNTS,
  SKILL_CATEGORIES,
  type Skill,
  type SkillCategory,
} from "./skills-data";
import type { SkillGuide } from "./skills-types";
import { useSkillsStore } from "./store";

const LABEL = "font-head text-xs font-extrabold uppercase tracking-[0.2em]";
const XP_PER_MASTERY = 25;

/** One card in the skill grid. */
function SkillCard({
  id,
  title,
  category,
  difficulty,
  timeToLearn,
  checklist,
  checks,
  mastered,
  onOpen,
}: {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  timeToLearn: string;
  checklist: string[];
  checks: string[];
  mastered: boolean;
  onOpen: () => void;
}) {
  const done = checklist.filter((item) => checks.includes(item)).length;
  const percent =
    checklist.length > 0 ? Math.round((done / checklist.length) * 100) : 0;

  return (
    <Card className="flex flex-col border-border bg-card transition-colors hover:border-volt/70">
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-head text-sm font-bold leading-snug">{title}</p>
          {mastered && (
            <Badge variant="outline" className="shrink-0 border-volt text-volt">
              <Check className="h-3 w-3" aria-hidden /> MASTERED
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="border-border text-muted-foreground">
            {category}
          </Badge>
          <Badge variant="outline" className="border-border text-muted-foreground">
            {difficulty}
          </Badge>
          <Badge variant="outline" className="border-border text-muted-foreground">
            {timeToLearn}
          </Badge>
        </div>
        <div>
          <div className="h-1.5 w-full bg-secondary" aria-hidden>
            <div className="h-1.5 bg-volt" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {done} of {checklist.length} proofs checked
          </p>
        </div>
        <Button
          onClick={onOpen}
          aria-label={`Open the ${title} guide`}
          className="mt-auto h-11 bg-volt px-4 font-head text-xs font-extrabold uppercase tracking-[0.2em] text-black hover:bg-volt/90"
        >
          {mastered ? "Review skill" : done > 0 ? "Keep learning" : "Learn it"}
        </Button>
      </CardContent>
    </Card>
  );
}

interface DetailShape {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  timeToLearn: string;
  why: string;
  steps: string[];
  tips: string[];
  mistakes: string[];
  drills?: string[];
  fourWeekPlan?: string[];
  checklist: string[];
  isGuide?: boolean;
}

/** Full step by step guide dialog, shared by built-in skills and AI guides. */
function SkillDetailDialog({
  detail,
  checks,
  mastered,
  onToggle,
  onClose,
}: {
  detail: DetailShape | null;
  checks: string[];
  mastered: boolean;
  onToggle: (item: string) => void;
  onClose: () => void;
}) {
  if (!detail) return null;
  const done = detail.checklist.filter((item) => checks.includes(item)).length;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-border bg-card nice-scrollbar sm:max-w-2xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="border-volt text-volt">
              {detail.category}
            </Badge>
            <Badge variant="outline" className="border-border text-muted-foreground">
              {detail.difficulty}
            </Badge>
            <Badge variant="outline" className="border-border text-muted-foreground">
              {detail.timeToLearn}
            </Badge>
            {mastered && (
              <Badge variant="outline" className="border-volt text-volt">
                <BadgeCheck className="h-3 w-3" aria-hidden /> MASTERED
              </Badge>
            )}
          </div>
          <DialogTitle className="font-display text-3xl uppercase tracking-wide">
            {detail.title}
          </DialogTitle>
          <DialogDescription className="border-l-2 border-volt pl-3 text-sm leading-relaxed text-foreground">
            {detail.why}
          </DialogDescription>
        </DialogHeader>

        {/* Real online media first: an actual how-to video and real photos
            of the skill being done, pulled from the web. The step diagrams
            below stay as the precise reference. */}
        <TopicMedia query={`how to ${detail.title.toLowerCase()}`} />

        <div className="space-y-6">
          <section aria-label="Steps">
            <StepImages
              kind="skill"
              id={detail.id}
              title={detail.title}
              steps={detail.steps}
              numberedBadge
            />
          </section>

          {detail.drills && detail.drills.length > 0 && (
            <section aria-label="Practice drills">
              <h3 className={LABEL}>Practice drills</h3>
              <ul className="mt-3 space-y-2">
                {detail.drills.map((drill, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed">
                    <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-volt" aria-hidden />
                    <span>{drill}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {detail.fourWeekPlan && detail.fourWeekPlan.length > 0 && (
            <section aria-label="Four week plan">
              <h3 className={LABEL}>Four week plan</h3>
              <ol className="mt-3 space-y-2">
                {detail.fourWeekPlan.map((week, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed">
                    <span
                      aria-hidden
                      className="shrink-0 font-head text-xs font-extrabold uppercase tracking-widest text-volt"
                    >
                      W{i + 1}
                    </span>
                    <span>{week}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section aria-label="Tips" className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className={LABEL}>Tips</h3>
              <ul className="mt-3 space-y-2">
                {detail.tips.map((tip, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-volt" aria-hidden />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className={LABEL}>Common mistakes</h3>
              <ul className="mt-3 space-y-2">
                {detail.mistakes.map((mistake, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
                  >
                    <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 bg-destructive" />
                    <span>{mistake}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section aria-label="Proof of mastery checklist">
            <div className="flex items-center justify-between gap-2">
              <h3 className={LABEL}>Prove it ({done} of {detail.checklist.length})</h3>
              {mastered && (
                <span className="font-head text-xs font-extrabold uppercase tracking-widest text-volt">
                  Mastered
                </span>
              )}
            </div>
            <div className="mt-3 space-y-2">
              {detail.checklist.map((item) => {
                const checked = checks.includes(item);
                return (
                  <label
                    key={item}
                    className={`flex min-h-11 cursor-pointer items-start gap-3 border p-3 text-sm leading-relaxed transition-colors ${
                      checked
                        ? "border-volt bg-volt/10 text-foreground"
                        : "border-border bg-background hover:border-volt/60"
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => onToggle(item)}
                      className="mt-0.5"
                      aria-label={`Proof: ${item}`}
                    />
                    <span>{item}</span>
                  </label>
                );
              })}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Check every proof to master this skill and earn {XP_PER_MASTERY} XP.
              Unchecking drops the badge, the XP you earned stays.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SkillsHub() {
  const { toast } = useToast();
  const checksMap = useSkillsStore((s) => s.checks);
  const masteredAt = useSkillsStore((s) => s.masteredAt);
  const guideMetas = useSkillsStore((s) => s.guides);
  const toggleCheck = useSkillsStore((s) => s.toggleCheck);
  const addGuide = useSkillsStore((s) => s.addGuide);
  const removeGuide = useSkillsStore((s) => s.removeGuide);
  const resetSkills = useSkillsStore((s) => s.resetSkills);

  const [category, setCategory] = useState<SkillCategory | "All">("All");
  const [search, setSearch] = useState("");
  const [openSkill, setOpenSkill] = useState<Skill | null>(null);
  const [openGuide, setOpenGuide] = useState<SkillGuide | null>(null);
  const [guideLoading, setGuideLoading] = useState(false);

  const [skillInput, setSkillInput] = useState("");
  const [contextInput, setContextInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const tokens = search
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length >= 2);
    return ALL_SKILLS.filter((s) => {
      if (category !== "All" && s.category !== category) return false;
      if (tokens.length === 0) return true;
      const haystack = `${s.title} ${s.why} ${s.steps.join(" ")}`.toLowerCase();
      return tokens.every((t) => haystack.includes(t));
    });
  }, [category, search]);

  const masteredCount =
    ALL_SKILLS.filter((s) => masteredAt[s.id]).length +
    guideMetas.filter((g) => masteredAt[g.id]).length;

  const handleToggle = (detail: DetailShape, item: string) => {
    const wasMastered = Boolean(useSkillsStore.getState().masteredAt[detail.id]);
    toggleCheck(detail.id, item, detail.checklist.length);
    const nowMastered = Boolean(useSkillsStore.getState().masteredAt[detail.id]);
    if (nowMastered && !wasMastered) {
      toast({
        title: "Skill mastered",
        description: `${detail.title}: every proof checked. +${XP_PER_MASTERY} XP.`,
      });
    }
  };

  const runGenerate = async () => {
    const skill = skillInput.trim();
    if (skill.length < 2) {
      setGenerateError("Describe the skill you want (at least 2 characters).");
      return;
    }
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch("/api/skills/guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skill,
          context: contextInput.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { guide?: SkillGuide; error?: string };
      if (!res.ok || !data.guide) {
        setGenerateError(data.error ?? "Generation failed. Try again in a moment.");
        return;
      }
      const guide = data.guide;
      void saveGuide(guide);
      addGuide({
        id: guide.id,
        skill: guide.skill,
        title: guide.title,
        category: guide.category,
        savedAt: guide.savedAt,
      });
      setSkillInput("");
      setContextInput("");
      setOpenGuide(guide);
      toast({
        title: "Guide ready",
        description: `"${guide.title}" was built and saved to your skills.`,
      });
    } catch {
      setGenerateError(
        "Generation needs internet. Every built-in skill keeps working offline."
      );
    } finally {
      setGenerating(false);
    }
  };

  const openGuideById = async (id: string) => {
    setGuideLoading(true);
    setOpenGuide(null);
    const guide = await getGuide(id);
    setGuideLoading(false);
    if (guide) {
      setOpenGuide(guide);
    } else {
      toast({
        title: "Guide unavailable",
        description: "This guide is not saved on this device anymore.",
      });
    }
  };

  const handleRemoveGuide = async (id: string, title: string) => {
    await deleteGuide(id);
    removeGuide(id);
    if (openGuide?.id === id) setOpenGuide(null);
    toast({
      title: "Guide removed",
      description: `"${title}" was removed from your skills.`,
    });
  };

  const handleReset = async () => {
    resetSkills();
    setOpenSkill(null);
    setOpenGuide(null);
    toast({
      title: "Skills reset",
      description: "Checklists, mastery badges and custom guides were cleared.",
    });
  };

  const openDetail: DetailShape | null = openSkill
    ? {
        id: openSkill.id,
        title: openSkill.title,
        category: openSkill.category,
        difficulty: openSkill.difficulty,
        timeToLearn: openSkill.timeToLearn,
        why: openSkill.why,
        steps: openSkill.steps,
        tips: openSkill.tips,
        mistakes: openSkill.mistakes,
        checklist: openSkill.checklist,
      }
    : openGuide
      ? {
          id: openGuide.id,
          title: openGuide.title,
          category: openGuide.category,
          difficulty: openGuide.difficulty,
          timeToLearn: openGuide.timeToLearn,
          why: openGuide.why,
          steps: openGuide.steps,
          tips: openGuide.tips,
          mistakes: openGuide.mistakes,
          drills: openGuide.drills,
          fourWeekPlan: openGuide.fourWeekPlan,
          checklist: openGuide.checklist,
          isGuide: true,
        }
      : null;

  const activeDetail = guideLoading ? null : openDetail;
  const activeChecks = activeDetail ? (checksMap[activeDetail.id] ?? []) : [];
  const activeMastered = activeDetail
    ? Boolean(masteredAt[activeDetail.id])
    : false;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10">
      {/* Header */}
      <header>
        <p className="mb-3 inline-block bg-volt px-3 py-1 font-head text-[11px] font-extrabold uppercase tracking-[0.25em] text-black">
          Real life. Real capability.
        </p>
        <h1 className="font-display text-5xl uppercase tracking-wide">Skills</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          The abilities that keep you alive, paid, healthy and respected:
          survival, money, everyday competence, people skills, career moves and
          digital defense. Learn them once, use them forever, prove each one
          with your own checklist.
        </p>
      </header>

      {/* Stats */}
      <section aria-label="Your skill stats" className="grid grid-cols-3 gap-4">
        {[
          { label: "Skills built in", value: `${ALL_SKILLS.length}` },
          {
            label: "Mastered by you",
            value: `${masteredCount}`,
          },
          { label: "Custom guides", value: `${guideMetas.length}` },
        ].map((stat) => (
          <Card key={stat.label} className="border-border bg-card">
            <CardContent className="p-4">
              <p className="font-display text-3xl tracking-wide">{stat.value}</p>
              <p className="mt-1 font-head text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {stat.label}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* AI builder */}
      <section aria-label="Build a custom skill guide">
        <Card className="border-border bg-card">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-volt" aria-hidden />
              <h2 className="font-display text-2xl uppercase tracking-wide">
                Missing a skill? Build it.
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Name any skill and the skills master writes a full guide: steps,
              drills, a four week plan and a proof checklist. It saves for
              offline once built.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="forge-skill-input" className={LABEL}>
                  The skill
                </Label>
                <Input
                  id="forge-skill-input"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  placeholder="e.g. Cook for a week on 30 dollars"
                  className="h-11 border-border bg-background"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !generating) {
                      void runGenerate();
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="forge-skill-context" className={LABEL}>
                  Your situation (optional)
                </Label>
                <Input
                  id="forge-skill-context"
                  value={contextInput}
                  onChange={(e) => setContextInput(e.target.value)}
                  placeholder="e.g. total beginner, one hot plate only"
                  className="h-11 border-border bg-background"
                />
              </div>
            </div>
            {generating && (
              <p className="flex items-center gap-2 text-sm text-volt" role="status">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Building your guide: steps, drills, four week plan and proofs.
                This takes 10 to 30 seconds.
              </p>
            )}
            {generateError && (
              <p className="text-sm font-bold text-destructive" role="alert">
                {generateError}
              </p>
            )}
            <Button
              onClick={() => void runGenerate()}
              disabled={generating}
              className="h-11 bg-volt px-6 font-head text-xs font-extrabold uppercase tracking-[0.2em] text-black hover:bg-volt/90"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden />
              )}
              {generating ? "Building..." : "Build my guide"}
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Built-in library */}
      <section aria-label="Built-in skill library" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-3xl uppercase tracking-wide">
            The library
          </h2>
          <p className="text-xs text-muted-foreground">
            {filtered.length} of {ALL_SKILLS.length} skills shown
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search skills, e.g. water, money, sleep"
            aria-label="Search the skill library"
            className="h-11 flex-1 border-border bg-background"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategory("All")}
            aria-pressed={category === "All"}
            className={`h-11 border px-4 font-head text-[10px] font-extrabold uppercase tracking-widest transition-colors ${
              category === "All"
                ? "border-volt bg-volt text-black"
                : "border-border bg-background text-muted-foreground hover:border-volt hover:text-volt"
            }`}
          >
            All {ALL_SKILLS.length}
          </button>
          {SKILL_CATEGORY_COUNTS.map(({ category: c, count }) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
              className={`h-11 border px-4 font-head text-[10px] font-extrabold uppercase tracking-widest transition-colors ${
                category === c
                  ? "border-volt bg-volt text-black"
                  : "border-border bg-background text-muted-foreground hover:border-volt hover:text-volt"
              }`}
            >
              {c} {count}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 border border-dashed border-border bg-secondary/30 px-6 py-10 text-center">
            <Wrench className="h-6 w-6 text-volt" aria-hidden />
            <p className="max-w-md text-sm text-muted-foreground">
              No built-in skill matches that. Build it as a custom guide above
              and it becomes yours forever.
            </p>
          </div>
        ) : (
          <div className="nice-scrollbar max-h-[36rem] overflow-y-auto pr-1">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((skill) => (
                <SkillCard
                  key={skill.id}
                  id={skill.id}
                  title={skill.title}
                  category={skill.category}
                  difficulty={skill.difficulty}
                  timeToLearn={skill.timeToLearn}
                  checklist={skill.checklist}
                  checks={checksMap[skill.id] ?? []}
                  mastered={Boolean(masteredAt[skill.id])}
                  onOpen={() => setOpenSkill(skill)}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Custom guides */}
      <section aria-label="Your custom guides" className="space-y-4">
        <h2 className="font-display text-3xl uppercase tracking-wide">
          Your custom guides
        </h2>
        {guideMetas.length === 0 ? (
          <Card className="border-dashed border-border bg-card">
            <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
              <Sparkles className="h-6 w-6 text-volt" aria-hidden />
              <p className="text-sm text-muted-foreground">
                No custom guides yet. Name any skill above and the skills
                master builds it with you.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="nice-scrollbar max-h-96 overflow-y-auto pr-1">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {guideMetas.map((g) => {
                const guideMastered = Boolean(masteredAt[g.id]);
                const guideChecks = checksMap[g.id] ?? [];
                return (
                  <Card
                    key={g.id}
                    className="flex flex-col border-border bg-card"
                  >
                    <CardContent className="flex flex-1 flex-col gap-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-head text-sm font-bold leading-snug">
                          {g.title}
                        </p>
                        {guideMastered && (
                          <Badge
                            variant="outline"
                            className="shrink-0 border-volt text-volt"
                          >
                            <Check className="h-3 w-3" aria-hidden /> MASTERED
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Built from: {g.skill}
                      </p>
                      <div className="mt-auto flex gap-2 pt-2">
                        <Button
                          onClick={() => void openGuideById(g.id)}
                          className="h-11 min-w-0 flex-1 bg-volt px-3 font-head text-xs font-extrabold uppercase tracking-[0.2em] text-black hover:bg-volt/90"
                        >
                          Open guide
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              className="h-11 w-11 shrink-0 border-border text-destructive hover:text-destructive"
                              aria-label={`Remove ${g.title}`}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="font-display text-2xl uppercase tracking-wide">
                                Remove guide
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Remove &quot;{g.title}&quot;? The saved guide
                                and its checklist on this device are deleted
                                too. This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Keep it</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-white hover:bg-destructive/90"
                                onClick={() =>
                                  void handleRemoveGuide(g.id, g.title)
                                }
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {guideChecks.length} proof
                        {guideChecks.length === 1 ? "" : "s"} checked
                        {g.category ? ` - ${g.category}` : ""}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Danger zone */}
      <section aria-label="Skills data">
        <Card className="border-destructive/40 bg-card">
          <CardContent className="flex flex-col items-start justify-between gap-4 p-4 sm:flex-row sm:items-center sm:p-6">
            <div>
              <h3 className={`${LABEL} text-destructive`}>
                Reset skills data
              </h3>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Clears every checklist, mastery badge and custom guide on this
                device. Your XP stays.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="h-11 shrink-0 px-4 font-head text-xs font-extrabold uppercase tracking-[0.2em]"
                >
                  Reset skills
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-display text-2xl uppercase tracking-wide">
                    Reset skills data
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This wipes all checklists, mastery badges and custom
                    guides on this device. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep my progress</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-white hover:bg-destructive/90"
                    onClick={() => void handleReset()}
                  >
                    Reset everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </section>

      {activeDetail && (
        <SkillDetailDialog
          detail={activeDetail}
          checks={activeChecks}
          mastered={activeMastered}
          onToggle={(item) => void handleToggle(activeDetail, item)}
          onClose={() => {
            setOpenSkill(null);
            setOpenGuide(null);
          }}
        />
      )}

      {guideLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
          <Skeleton className="h-10 w-10 rounded-none" />
        </div>
      )}
    </div>
  );
}
