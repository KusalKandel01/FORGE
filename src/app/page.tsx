"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  ArrowRight,
  BookOpen,
  Dumbbell,
  GraduationCap,
  Home,
  Music2,
  RotateCcw,
  Settings as SettingsIcon,
  ShieldCheck,
  Wifi,
  WifiOff,
  Wrench,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClientOnly } from "@/components/client-only";
import { levelFromXp, useProfile } from "@/lib/profile-store";
import FitnessHub from "@/components/fitness";
import MusicPlayer from "@/components/music";
import LibraryHub from "@/components/library";
import LearnHub from "@/components/learn";
import SkillsHub from "@/components/skills";
import ProfileView from "@/components/profile/profile-view";
import HabitCard from "@/components/habits/habit-card";
import { TermsPage, PrivacyPage } from "@/components/legal/legal-pages";
import { SettingsPage } from "@/components/settings";
import { SwRegister } from "@/components/sw-register";
import { SyncProvider } from "@/components/sync/sync-provider";

const ROUTES = [
  "",
  "fitness",
  "music",
  "library",
  "learn",
  "skills",
  "settings",
  "terms",
  "privacy",
] as const;
type Route = (typeof ROUTES)[number];

const NAV = [
  { id: "", label: "Home", icon: Home },
  { id: "fitness", label: "Train", icon: Dumbbell },
  { id: "music", label: "Music", icon: Music2 },
  { id: "library", label: "Books", icon: BookOpen },
  { id: "learn", label: "Learn", icon: GraduationCap },
  { id: "skills", label: "Skills", icon: Wrench },
] as const;

const MODULES = [
  {
    id: "fitness",
    icon: Dumbbell,
    name: "TRAIN",
    desc: "Step tracker with a built-in pedometer, workout logging, gym calculators, an interval timer, streaks and progress charts. Works fully offline.",
    cta: "Start training",
  },
  {
    id: "library",
    icon: BookOpen,
    name: "LIBRARY",
    desc: "Free public domain classics, a bestsellers shelf with Deep Dive guides and borrow links, bookmarks, highlights and a clean offline reader.",
    cta: "Open the library",
  },
  {
    id: "learn",
    icon: GraduationCap,
    name: "LEARN",
    desc: "Any topic at any difficulty, from beginner basics to expert depth. Lessons come with key terms, examples, a quiz and your own notes.",
    cta: "Learn something",
  },
  {
    id: "skills",
    icon: Wrench,
    name: "SKILLS",
    desc: "Real life capability: survival, money, everyday competence, people skills, career and digital defense, each with a proof checklist you master.",
    cta: "Build real skills",
  },
  {
    id: "music",
    icon: Music2,
    name: "MUSIC",
    desc: "Bring your own YouTube playlists or spin a random radio mix. A clean player built for training sessions and study blocks.",
    cta: "Open the player",
  },
] as const;

const PRINCIPLES = [
  {
    icon: ShieldCheck,
    title: "Private by design",
    body: "No accounts, no tracking, no ads. Every log lives in your browser on your device.",
  },
  {
    icon: WifiOff,
    title: "Built for offline",
    body: "Train anywhere with no signal. Books and lessons you opened stay saved for offline.",
  },
  {
    icon: RotateCcw,
    title: "Starts at zero",
    body: "Every counter is 0 on day one. You build the numbers yourself, and you can wipe them anytime.",
  },
] as const;

function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function getSnapshotHash(): string {
  const h = window.location.hash.replace(/^#\/?/, "").replace(/\/$/, "");
  return (ROUTES as readonly string[]).includes(h) ? h : "";
}

function useHashRoute() {
  const hash = useSyncExternalStore(
    subscribeHash,
    getSnapshotHash,
    () => "" as string
  );
  const route = hash as Route;

  useEffect(() => {
    if (hash !== "") window.scrollTo({ top: 0 });
  }, [hash]);

  const navigate = useCallback((r: string) => {
    const target = (ROUTES as readonly string[]).includes(r) ? r : "";
    window.location.hash = target ? `#/${target}` : "#/";
  }, []);

  return { route, navigate };
}

function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function useOnline() {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true
  );
}

type NavigateFn = (route: string) => void;

function Header({ route, navigate }: { route: Route; navigate: NavigateFn }) {
  const { xp } = useProfile();
  const level = levelFromXp(xp);
  const online = useOnline();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4">
        <button
          onClick={() => navigate("")}
          className="flex items-center gap-2"
          aria-label="FORGE home"
        >
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center bg-volt font-display text-xl text-black"
          >
            F
          </span>
          <span className="font-display text-2xl tracking-[0.08em]">FORGE</span>
        </button>

        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Primary navigation"
        >
          {NAV.slice(1).map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              aria-current={route === item.id ? "page" : undefined}
              className={`px-3 py-2 font-head text-xs font-extrabold uppercase tracking-[0.18em] transition-colors ${
                route === item.id
                  ? "bg-volt text-black"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <span
            className="hidden items-center gap-1 border border-border px-2 py-1 font-head text-[11px] font-extrabold uppercase tracking-widest sm:flex"
            title="XP earned from your logged activity"
          >
            <Zap className="h-3.5 w-3.5 text-volt" aria-hidden />
            {xp} XP
          </span>
          <span
            className="hidden border border-border px-2 py-1 font-head text-[11px] font-extrabold uppercase tracking-widest sm:block"
            title="Your level from real XP"
          >
            LVL {level}
          </span>
          {online ? (
            <Wifi className="h-4 w-4 text-muted-foreground" aria-label="Online" />
          ) : (
            <span className="flex items-center gap-1 border border-ember/60 px-2 py-1 text-[11px] font-bold uppercase tracking-widest text-ember">
              <WifiOff className="h-3.5 w-3.5" aria-hidden /> Offline
            </span>
          )}
          <button
            onClick={() => navigate("settings")}
            aria-label="Settings"
            className={`flex h-10 w-10 items-center justify-center border border-border transition-colors hover:bg-secondary ${
              route === "settings" ? "text-volt" : "text-muted-foreground"
            }`}
          >
            <SettingsIcon className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </header>
  );
}

function HomeView({ navigate }: { navigate: NavigateFn }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4">
      <section className="relative overflow-hidden border-b border-border py-14 md:py-24">
        <div
          aria-hidden
          className="text-stroke pointer-events-none absolute -right-8 top-2 select-none font-display text-[30vw] leading-none md:text-[15rem]"
        >
          FORGE
        </div>
        <div className="relative">
          <p className="mb-5 inline-block bg-volt px-3 py-1 font-head text-[11px] font-extrabold uppercase tracking-[0.25em] text-black">
            One stop. Zero excuses.
          </p>
          <h1 className="max-w-4xl font-display text-6xl leading-[0.95] tracking-wide md:text-8xl">
            TRAIN. READ. LEARN.
            <br />
            <span className="text-volt">ONE PLACE.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            FORGE is a single hub for workouts, free books, study sessions and
            real life skills. Fitness tracking works fully offline, books and
            guides you open stay on your device, and every number starts at
            zero for you to build.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              onClick={() => navigate("fitness")}
              className="hard-shadow-sm-volt h-12 bg-volt px-6 font-head text-sm font-extrabold uppercase tracking-[0.2em] text-black hover:bg-volt hover:text-black active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              Start training
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("library")}
              className="hard-shadow-sm-white h-12 border-border bg-background px-6 font-head text-sm font-extrabold uppercase tracking-[0.2em] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              Open the library
            </Button>
          </div>
        </div>
      </section>

      <section
        aria-label="Your profile"
        className="border-y border-border py-10"
      >
        <ClientOnly>
          <ProfileView />
        </ClientOnly>
      </section>

      <section
        aria-label="Modules"
        className="grid gap-4 py-10 md:grid-cols-3"
      >
        {MODULES.map((m) => (
          <Card
            key={m.id}
            className="group flex flex-col border-border bg-card transition-colors hover:border-volt/70"
          >
            <CardContent className="flex flex-1 flex-col p-6">
              <span
                aria-hidden
                className="mb-4 flex h-11 w-11 items-center justify-center bg-volt text-black"
              >
                <m.icon className="h-5 w-5" />
              </span>
              <h2 className="font-display text-3xl tracking-wide">{m.name}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                {m.desc}
              </p>
              <button
                onClick={() => navigate(m.id)}
                className="mt-5 flex items-center gap-2 self-start font-head text-xs font-extrabold uppercase tracking-[0.2em] text-volt hover:underline"
              >
                {m.cta}
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                  aria-hidden
                />
              </button>
            </CardContent>
          </Card>
        ))}
      </section>

      <section aria-label="Daily habits" className="pb-10">
        <ClientOnly>
          <HabitCard />
        </ClientOnly>
      </section>

      <section
        aria-label="How FORGE works"
        className="grid gap-4 pb-14 md:grid-cols-3"
      >
        {PRINCIPLES.map((p) => (
          <div
            key={p.title}
            className="border border-border bg-secondary/30 p-5"
          >
            <p.icon className="h-5 w-5 text-volt" aria-hidden />
            <h3 className="mt-3 font-head text-xs font-extrabold uppercase tracking-[0.2em]">
              {p.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {p.body}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}

function SiteFooter({ navigate }: { navigate: NavigateFn }) {
  const online = useOnline();
  return (
    <footer className="mt-auto border-t border-border bg-card">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="flex h-7 w-7 items-center justify-center bg-volt font-display text-lg text-black"
            >
              F
            </span>
            <span className="font-display text-xl tracking-[0.08em]">FORGE</span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
            One hub for training, reading and learning. Built to work offline.
          </p>
        </div>

        <nav aria-label="Footer explore">
          <h3 className="font-head text-[11px] font-extrabold uppercase tracking-[0.25em] text-muted-foreground">
            Explore
          </h3>
          <ul className="mt-3 space-y-2">
            {NAV.slice(1).map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => navigate(item.id)}
                  className="font-head text-xs font-bold uppercase tracking-widest hover:text-volt hover:underline"
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Footer legal">
          <h3 className="font-head text-[11px] font-extrabold uppercase tracking-[0.25em] text-muted-foreground">
            Legal
          </h3>
          <ul className="mt-3 space-y-2">
            <li>
              <button
                onClick={() => navigate("terms")}
                className="font-head text-xs font-bold uppercase tracking-widest hover:text-volt hover:underline"
              >
                Terms of Service
              </button>
            </li>
            <li>
              <button
                onClick={() => navigate("privacy")}
                className="font-head text-xs font-bold uppercase tracking-widest hover:text-volt hover:underline"
              >
                Privacy Policy
              </button>
            </li>
          </ul>
        </nav>

        <div>
          <h3 className="font-head text-[11px] font-extrabold uppercase tracking-[0.25em] text-muted-foreground">
            Data
          </h3>
          <button
            onClick={() => navigate("settings")}
            className="mt-3 font-head text-xs font-bold uppercase tracking-widest hover:text-volt hover:underline"
          >
            Settings and reset
          </button>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            All progress is stored on this device only.
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            {online ? (
              <>
                <Wifi className="h-3.5 w-3.5 text-volt" aria-hidden /> Online
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-ember" aria-hidden />{" "}
                Offline mode
              </>
            )}
          </p>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} FORGE</span>
          <span>No accounts. No tracking. No fake numbers.</span>
        </div>
      </div>
    </footer>
  );
}

function MobileNav({ route, navigate }: { route: Route; navigate: NavigateFn }) {
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="grid grid-cols-6">
        {NAV.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.id)}
            aria-current={route === item.id ? "page" : undefined}
            className={`flex h-16 flex-col items-center justify-center gap-1 ${
              route === item.id ? "text-volt" : "text-muted-foreground"
            }`}
          >
            <item.icon className="h-5 w-5" aria-hidden />
            <span className="font-head text-[10px] font-bold uppercase tracking-widest">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}

export default function Page() {
  const { route, navigate } = useHashRoute();

  useEffect(() => {
    const titles: Record<string, string> = {
      "": "FORGE - Train, Read, Learn",
      fitness: "Train | FORGE",
      music: "Music | FORGE",
      library: "Library | FORGE",
      learn: "Learn | FORGE",
      skills: "Skills | FORGE",
      settings: "Settings | FORGE",
      terms: "Terms of Service | FORGE",
      privacy: "Privacy Policy | FORGE",
    };
    document.title = titles[route] ?? "FORGE - Train, Read, Learn";
  }, [route]);

  return (
    <div className="flex min-h-screen flex-col">
      <SwRegister />
      <SyncProvider />
      <Header route={route} navigate={navigate} />

      <main className="flex-1 pb-20 md:pb-0">
        {route === "" && <HomeView navigate={navigate} />}
        {route === "fitness" && (
          <ClientOnly>
            <FitnessHub />
          </ClientOnly>
        )}
        {route === "music" && (
          <ClientOnly>
            <MusicPlayer />
          </ClientOnly>
        )}
        {route === "library" && (
          <ClientOnly>
            <LibraryHub />
          </ClientOnly>
        )}
        {route === "learn" && (
          <ClientOnly>
            <LearnHub />
          </ClientOnly>
        )}
        {route === "skills" && (
          <ClientOnly>
            <SkillsHub />
          </ClientOnly>
        )}
        {route === "settings" && <SettingsPage />}
        {route === "terms" && <TermsPage />}
        {route === "privacy" && <PrivacyPage />}
      </main>

      <SiteFooter navigate={navigate} />
      <MobileNav route={route} navigate={navigate} />
    </div>
  );
}
