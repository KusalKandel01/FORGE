"use client";

import { useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Download,
  GraduationCap,
  HardDrive,
  Music2,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { exportForgeData, resetAllForgeData } from "@/lib/reset-all";
import { SyncCard } from "@/components/settings/sync-card";

const OFFLINE_ITEMS = [
  {
    icon: HardDrive,
    title: "Train",
    body: "Fully offline. Step logs, workouts, calculators, timer and streaks all run on your device.",
  },
  {
    icon: BookOpen,
    title: "Library",
    body: "Every book you open or save is kept on your device and stays readable offline.",
  },
  {
    icon: GraduationCap,
    title: "Learn",
    body: "Lessons you generate are saved to your device. Reread and redo quizzes offline.",
  },
  {
    icon: Music2,
    title: "Music",
    body: "Needs internet. YouTube streams require a connection.",
  },
];

export function SettingsPage() {
  const [confirmText, setConfirmText] = useState("");

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10">
      <div>
        <h1 className="font-display text-4xl tracking-wide md:text-5xl">
          SETTINGS
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your data lives in this browser only. Cloud sync is opt-in with a
          code.
        </p>
      </div>

      <SyncCard />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-head text-xs font-extrabold uppercase tracking-[0.2em]">
            <WifiOff className="h-4 w-4 text-volt" /> Offline support
          </CardTitle>
          <CardDescription>
            What works without a connection after you have used the app once.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {OFFLINE_ITEMS.map((item) => (
            <div
              key={item.title}
              className="flex gap-3 border border-border bg-secondary/40 p-3"
            >
              <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-volt" aria-hidden />
              <div>
                <p className="font-head text-xs font-extrabold uppercase tracking-widest">
                  {item.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-head text-xs font-extrabold uppercase tracking-[0.2em]">
            <Download className="h-4 w-4 text-volt" /> Backup
          </CardTitle>
          <CardDescription>
            Download every log, note and setting stored on this device as a JSON
            file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={exportForgeData}
            className="h-11 font-head text-xs font-extrabold uppercase tracking-[0.2em]"
          >
            <Download className="mr-2 h-4 w-4" /> Export my data
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-head text-xs font-extrabold uppercase tracking-[0.2em] text-destructive">
            <AlertTriangle className="h-4 w-4" /> Danger zone
          </CardTitle>
          <CardDescription>
            Reset everything back to zero: workouts, steps, streaks, XP, saved
            books, lessons, notes and music settings. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="h-12 font-head text-sm font-extrabold uppercase tracking-[0.2em]"
              >
                Reset everything
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display text-2xl tracking-wide">
                  RESET ALL PROGRESS?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This wipes every log, saved book, lesson, note and XP value on
                  this device and restarts the app. Type RESET to confirm.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder="TYPE RESET"
                aria-label="Type RESET to confirm"
                className="h-11 w-full border border-input bg-background px-3 font-head text-sm font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-ring"
              />
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setConfirmText("")}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={confirmText !== "RESET"}
                  onClick={(e) => {
                    if (confirmText !== "RESET") {
                      e.preventDefault();
                      return;
                    }
                    void resetAllForgeData();
                  }}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  Yes, wipe it all
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
