"use client";

import { useEffect } from "react";
import { initSyncEngine } from "@/lib/sync/engine";

/**
 * Starts the offline-first sync engine once per page load.
 * Renders nothing. Safe to mount anywhere in the client tree.
 */
export function SyncProvider() {
  useEffect(() => {
    const stop = initSyncEngine();
    return stop;
  }, []);
  return null;
}
