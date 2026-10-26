/**
 * Promise-based IndexedDB cache for the SKILLS module.
 *
 * Database: "forge-skills" (deleted by the global reset in
 * src/lib/reset-all.ts and by resetSkills() in the skills store).
 * Object store: "guides" with keyPath "id".
 *
 * AI generated custom skill guides live here so they keep working fully
 * offline once built. Built-in pack skills are static data and need no
 * storage. Every function is SSR-guarded: on the server (typeof indexedDB
 * === "undefined") calls resolve harmlessly without touching storage.
 */

import type { SkillGuide } from "@/components/skills/skills-types";

const DB_NAME = "forge-skills";
const STORE_NAME = "guides";
const DB_VERSION = 1;

function isAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Could not open forge-skills"));
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  if (!isAvailable()) {
    throw new Error("IndexedDB is not available");
  }
  const database = await openDb();
  try {
    const tx = database.transaction(STORE_NAME, mode);
    const result = await requestToPromise(run(tx.objectStore(STORE_NAME)));
    return result;
  } finally {
    database.close();
  }
}

/** Save or overwrite a generated guide. Fails silently offline. */
export async function saveGuide(guide: SkillGuide): Promise<void> {
  try {
    await withStore("readwrite", (store) => store.put(guide));
  } catch {
    // Storage unavailable: the guide still shows for this session.
  }
}

export async function getGuide(id: string): Promise<SkillGuide | null> {
  try {
    const guide = await withStore<SkillGuide | undefined>("readonly", (store) =>
      store.get(id)
    );
    return guide ?? null;
  } catch {
    return null;
  }
}

export async function listGuides(): Promise<SkillGuide[]> {
  try {
    const all = await withStore<SkillGuide[]>("readonly", (store) =>
      store.getAll()
    );
    return all.sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
  } catch {
    return [];
  }
}

export async function deleteGuide(id: string): Promise<void> {
  try {
    await withStore("readwrite", (store) => store.delete(id));
  } catch {
    // Nothing to clean up if storage is missing.
  }
}

export async function clearAllGuides(): Promise<void> {
  try {
    await withStore("readwrite", (store) => store.clear());
  } catch {
    // Nothing to clean up if storage is missing.
  }
}
