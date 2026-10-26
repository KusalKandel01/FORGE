/**
 * Global data reset helpers.
 *
 * Convention for the whole app:
 *  - every zustand persisted store name starts with "forge-"
 *    (forge-profile, forge-fitness, forge-library, forge-learn, forge-music,
 *    forge-skills, forge-flashcards, forge-habits, forge-sync)
 *  - every IndexedDB database starts with "forge-"
 *    (forge-books, forge-learn, forge-skills, forge-images)
 */
export const FORGE_STORAGE_PREFIX = "forge-";
export const FORGE_IDB_DATABASES = [
  "forge-books",
  "forge-learn",
  "forge-skills",
  "forge-images",
] as const;

export function clearForgeLocalStorage(): void {
  if (typeof window === "undefined") return;
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(FORGE_STORAGE_PREFIX)) keys.push(key);
  }
  keys.forEach((k) => window.localStorage.removeItem(k));
}

export function clearForgeSessionStorage(): void {
  if (typeof window === "undefined") return;
  const keys: string[] = [];
  for (let i = 0; i < window.sessionStorage.length; i++) {
    const key = window.sessionStorage.key(i);
    if (key && key.startsWith(FORGE_STORAGE_PREFIX)) keys.push(key);
  }
  keys.forEach((k) => window.sessionStorage.removeItem(k));
}

export function deleteIdbDatabase(name: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve();
      return;
    }
    let settled = false;
    const done = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    try {
      const req = indexedDB.deleteDatabase(name);
      req.onsuccess = done;
      req.onerror = done;
      req.onblocked = done;
      // Some browsers never fire events for missing databases.
      setTimeout(done, 2000);
    } catch {
      done();
    }
  });
}

export async function clearForgeIdb(): Promise<void> {
  await Promise.all(FORGE_IDB_DATABASES.map((name) => deleteIdbDatabase(name)));
}

/** Export every forge-* localStorage entry as a downloadable JSON file. */
export function exportForgeData(): void {
  if (typeof window === "undefined") return;
  const data: Record<string, unknown> = {};
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith(FORGE_STORAGE_PREFIX)) continue;
    try {
      data[key] = JSON.parse(window.localStorage.getItem(key) ?? "null");
    } catch {
      data[key] = window.localStorage.getItem(key);
    }
  }
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `forge-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Wipe everything FORGE stored on this device, then reload. */
export async function resetAllForgeData(): Promise<void> {
  // Read the sync code BEFORE wiping localStorage: if this device paired a
  // cloud bucket, the server copy must go too, otherwise the next sync
  // would pull the old data straight back.
  let syncKey: string | null = null;
  try {
    const raw = window.localStorage.getItem("forge-sync");
    if (raw) {
      const parsed = JSON.parse(raw) as {
        state?: { syncKey?: string | null };
      };
      syncKey = parsed.state?.syncKey ?? null;
    }
  } catch {
    // No readable sync state: nothing to wipe server side.
  }

  clearForgeLocalStorage();
  clearForgeSessionStorage();
  try {
    await clearForgeIdb();
  } catch {
    // ignore: best effort cleanup
  }

  if (syncKey) {
    try {
      await fetch("/api/sync", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncKey }),
      });
    } catch {
      // Offline: the bucket simply keeps existing server side. This device
      // is already unpaired (forge-sync was cleared), so it starts clean.
    }
  }

  window.location.reload();
}
