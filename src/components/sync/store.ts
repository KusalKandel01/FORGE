"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Cloud sync state. Persisted under "forge-sync" so the pairing and the
 * sync cursor survive reloads. The global reset clears it like every
 * other forge-* key, which also unpairs the device.
 *
 * No email, no password: the syncKey (FORGE-XXXX-XXXX) is the credential.
 */
export interface SyncState {
  /** Random id for THIS browser/PWA install. */
  deviceId: string;
  /** The shared bucket code. Null until the user pairs. */
  syncKey: string | null;
  pairedAt: string | null;
  /** Server clock of the last successful sync. The pull cursor. */
  lastSyncAt: string | null;
  lastError: string | null;
  syncing: boolean;
  /** Whole-entity change stamps (entity:state -> ISO of last local change). */
  entityStamps: Record<string, string>;
  /**
   * Whole entities with local changes that have not been confirmed uploaded
   * yet. Persisted, and independent of clock comparisons, so a device with
   * a skewed clock can never silently skip uploading its own changes.
   */
  pendingWhole: string[];
  /** One-way markers: this tombstone / immutable record was uploaded. */
  sentKeys: Record<string, true>;

  ensureDeviceId: () => string;
  markWholeChange: (entity: string) => void;
  markWholePushed: (entities: string[]) => void;
  setSyncing: (v: boolean) => void;
  setError: (message: string | null) => void;
  setCursor: (iso: string | null) => void;
  markSent: (keys: string[]) => void;
  setStamp: (key: string, iso: string) => void;
  adoptKey: (syncKey: string, created: boolean) => void;
  unpair: () => void;
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      deviceId: "",
      syncKey: null,
      pairedAt: null,
      lastSyncAt: null,
      lastError: null,
      syncing: false,
      entityStamps: {},
      pendingWhole: [],
      sentKeys: {},

      ensureDeviceId: () => {
        const existing = get().deviceId;
        if (existing) return existing;
        const id = makeId();
        set({ deviceId: id });
        return id;
      },

      markWholeChange: (entity) =>
        set((s) => ({
          entityStamps: { ...s.entityStamps, [`${entity}:state`]: new Date().toISOString() },
          pendingWhole: s.pendingWhole.includes(entity)
            ? s.pendingWhole
            : [...s.pendingWhole, entity],
        })),

      markWholePushed: (entities) =>
        set((s) => ({
          pendingWhole: s.pendingWhole.filter((e) => !entities.includes(e)),
        })),

      setSyncing: (v) => set({ syncing: v }),

      setError: (message) => set({ lastError: message }),

      setCursor: (iso) => set({ lastSyncAt: iso }),

      markSent: (keys) =>
        set((s) => {
          const next = { ...s.sentKeys };
          for (const k of keys) next[k] = true;
          return { sentKeys: next };
        }),

      setStamp: (key, iso) =>
        set((s) => ({ entityStamps: { ...s.entityStamps, [key]: iso } })),

      adoptKey: (syncKey, created) =>
        set({
          syncKey,
          pairedAt: new Date().toISOString(),
          // Fresh cursor: the next sync is a full two-way merge.
          lastSyncAt: null,
          lastError: null,
          // A created bucket should upload existing local data; a linked
          // bucket should download first. Stamps only exist after a local
          // change, so leaving them empty keeps "create" pushing (stamps are
          // set by the engine on create) and "link" pulling.
          entityStamps: created ? get().entityStamps : {},
          sentKeys: {},
        }),

      unpair: () =>
        set({
          syncKey: null,
          pairedAt: null,
          lastSyncAt: null,
          lastError: null,
          entityStamps: {},
          pendingWhole: [],
          sentKeys: {},
        }),
    }),
    { name: "forge-sync" }
  )
);
