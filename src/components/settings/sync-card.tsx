"use client";

import { useEffect, useState } from "react";
import { formatDistance } from "date-fns";
import {
  Check,
  Cloud,
  CloudUpload,
  Copy,
  Link2,
  Loader2,
  RefreshCw,
  Trash2,
  Unplug,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { useSyncStore } from "@/components/sync/store";
import {
  createSyncBucket,
  linkSyncBucket,
  syncNow,
  unpairDevice,
  wipeServerCopy,
} from "@/lib/sync/engine";

/**
 * Cloud sync card for the Settings page.
 * Pairing = a random code, no account. The code links any number of
 * devices to the same data bucket; the server merges by timestamp.
 */
export function SyncCard() {
  const syncKey = useSyncStore((s) => s.syncKey);
  const pairedAt = useSyncStore((s) => s.pairedAt);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  const lastError = useSyncStore((s) => s.lastError);
  const syncing = useSyncStore((s) => s.syncing);

  const [creating, setCreating] = useState(false);
  const [linking, setLinking] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [copied, setCopied] = useState(false);
  // Ticks every 30 s so the "last synced" label stays fresh.
  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const syncLabel = lastSyncAt
    ? formatDistance(new Date(lastSyncAt), new Date(nowTs), {
        addSuffix: true,
      })
    : null;

  const onCreate = async () => {
    setCreating(true);
    const result = await createSyncBucket();
    setCreating(false);
    if (result.ok) {
      toast.success("Sync code created. This device now backs up to the cloud.");
    } else {
      toast.error(result.error ?? "Could not create a sync code.");
    }
  };

  const onLink = async () => {
    setLinking(true);
    const result = await linkSyncBucket(codeInput);
    setLinking(false);
    if (result.ok) {
      setCodeInput("");
      toast.success("Linked. Your data is merging now.");
    } else {
      toast.error(result.error ?? "That code did not work.");
    }
  };

  const onSyncNow = async () => {
    const result = await syncNow("manual");
    if (result.ok) {
      toast.success("Synced.");
    } else {
      toast.error(result.error ?? "Sync failed.");
    }
  };

  const onWipe = async () => {
    const result = await wipeServerCopy();
    if (result.ok) {
      toast.success("Server copy deleted and this device unpaired.");
    } else {
      toast.error(result.error ?? "Could not wipe the server copy.");
    }
  };

  const copyCode = async () => {
    if (!syncKey) return;
    try {
      await navigator.clipboard.writeText(syncKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed. Write the code down instead.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-head text-xs font-extrabold uppercase tracking-[0.2em]">
          <Cloud className="h-4 w-4 text-volt" /> Cloud sync
        </CardTitle>
        <CardDescription>
          Optional. Everything already works offline on this device. Pair with
          a code to back your logs up to the server and carry them to any
          other device. No account, no email.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!syncKey ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border border-border bg-secondary/40 p-4">
              <p className="font-head text-xs font-extrabold uppercase tracking-[0.2em]">
                New to sync
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Generate a code for this device. Your existing data uploads
                right away.
              </p>
              <Button
                onClick={onCreate}
                disabled={creating}
                className="mt-3 h-11 bg-volt font-head text-xs font-extrabold uppercase tracking-[0.2em] text-black hover:bg-volt hover:text-black"
              >
                {creating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CloudUpload className="mr-2 h-4 w-4" />
                )}
                Create sync code
              </Button>
            </div>
            <div className="border border-border bg-secondary/40 p-4">
              <p className="font-head text-xs font-extrabold uppercase tracking-[0.2em]">
                Have a code
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter the code from your other device to pull its data here
                and keep both in sync.
              </p>
              <div className="mt-3 flex gap-2">
                <Input
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  placeholder="FORGE-XXXX-XXXX"
                  aria-label="Sync code"
                  className="h-11 border-input bg-background font-head text-sm font-bold tracking-widest"
                />
                <Button
                  onClick={onLink}
                  disabled={linking || codeInput.trim().length < 6}
                  className="h-11 shrink-0 bg-volt font-head text-xs font-extrabold uppercase tracking-[0.2em] text-black hover:bg-volt hover:text-black"
                >
                  {linking ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Link2 className="mr-2 h-4 w-4" />
                  )}
                  Link
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 border border-volt/50 bg-volt/5 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-head text-[11px] font-extrabold uppercase tracking-[0.25em] text-muted-foreground">
                  Your sync code
                </p>
                <p className="mt-1 font-display text-2xl tracking-[0.12em] text-volt">
                  {syncKey}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Enter this code on another device to sync with it. Anyone
                  with this code can read your data, so keep it private.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={copyCode}
                className="h-11 font-head text-xs font-extrabold uppercase tracking-[0.2em]"
              >
                {copied ? (
                  <Check className="mr-2 h-4 w-4 text-volt" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="border border-border bg-secondary/40 p-3">
                <p className="font-head text-[11px] font-extrabold uppercase tracking-[0.25em] text-muted-foreground">
                  Last sync
                </p>
                <p className="mt-1 text-sm font-bold">
                  {syncing
                    ? "Syncing now..."
                    : syncLabel
                      ? syncLabel
                      : "Not yet synced"}
                </p>
              </div>
              <div className="border border-border bg-secondary/40 p-3">
                <p className="font-head text-[11px] font-extrabold uppercase tracking-[0.25em] text-muted-foreground">
                  Paired since
                </p>
                <p className="mt-1 text-sm font-bold">
                  {pairedAt
                    ? formatDistance(new Date(pairedAt), new Date(nowTs), {
                        addSuffix: true,
                      })
                    : "Unknown"}
                </p>
              </div>
              <div className="border border-border bg-secondary/40 p-3">
                <p className="font-head text-[11px] font-extrabold uppercase tracking-[0.25em] text-muted-foreground">
                  Status
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-bold">
                  {syncing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-volt" />{" "}
                      Syncing
                    </>
                  ) : lastError ? (
                    <>
                      <WifiOff className="h-4 w-4 text-ember" /> Queued
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 text-volt" /> Up to date
                    </>
                  )}
                </p>
              </div>
            </div>

            {lastError && (
              <p className="border border-ember/50 bg-ember/5 p-3 text-sm text-ember">
                {lastError} Anything you did offline is safe on this device
                and uploads on the next successful sync.
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={onSyncNow}
                disabled={syncing}
                className="h-11 bg-volt font-head text-xs font-extrabold uppercase tracking-[0.2em] text-black hover:bg-volt hover:text-black"
              >
                {syncing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Sync now
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  unpairDevice();
                  toast.success("Unpaired. Server data is untouched.");
                }}
                className="h-11 border-border font-head text-xs font-extrabold uppercase tracking-[0.2em]"
              >
                <Unplug className="mr-2 h-4 w-4" /> Unpair this device
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="h-11 font-head text-xs font-extrabold uppercase tracking-[0.2em]"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete server copy
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-display text-2xl tracking-wide">
                      DELETE SERVER COPY?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes every synced record from the server and
                      unpairs this device. Data already stored on this device
                      stays. Other paired devices keep working offline and
                      will re-upload their data on their next sync. This
                      cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onWipe}
                      className="bg-destructive text-white hover:bg-destructive/90"
                    >
                      Delete it
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
