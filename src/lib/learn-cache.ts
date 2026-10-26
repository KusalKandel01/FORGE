/**
 * Promise-based IndexedDB cache for the LEARN module.
 *
 * Database: "forge-learn" (the global reset in src/lib/reset-all.ts and
 * resetLearn() in the learn store both delete it).
 * Object store: "lessons" with keyPath "id".
 *
 * Full Lesson objects live here so saved lessons work completely offline.
 * Every function is SSR-guarded: on the server (typeof indexedDB ===
 * "undefined") calls resolve harmlessly without touching storage.
 */

export interface LessonSection {
  heading: string;
  content: string;
}

export interface LessonKeyTerm {
  term: string;
  definition: string;
}

export interface QuizQuestion {
  question: string;
  /** Exactly 4 answer strings. */
  options: string[];
  /** Index into options (0-3) pointing at the correct answer. */
  answerIndex: number;
  explanation: string;
}

export type LessonLevel = "beginner" | "intermediate" | "advanced" | "expert";

export interface Lesson {
  id: string;
  topic: string;
  level: LessonLevel;
  title: string;
  summary: string;
  sections: LessonSection[];
  keyTerms: LessonKeyTerm[];
  examples: string[];
  quiz: QuizQuestion[];
  nextTopics: string[];
  savedAt: string;
}

const DB_NAME = "forge-learn";
const STORE_NAME = "lessons";
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
      reject(request.error ?? new Error("Could not open forge-learn"));
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
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const database = await openDb();
  try {
    const tx = database.transaction(STORE_NAME, mode);
    return await requestToPromise(action(tx.objectStore(STORE_NAME)));
  } finally {
    database.close();
  }
}

/** Persist a full lesson. Resolves silently if storage is unavailable. */
export async function saveLesson(lesson: Lesson): Promise<void> {
  if (!isAvailable()) return;
  try {
    await withStore("readwrite", (store) => store.put(lesson));
  } catch {
    // Storage unavailable or full: the lesson still renders in memory.
  }
}

/** Load one lesson by id, or undefined when missing/unavailable. */
export async function getLesson(id: string): Promise<Lesson | undefined> {
  if (!isAvailable()) return undefined;
  try {
    const lesson = await withStore("readonly", (store) =>
      store.get(id) as IDBRequest<Lesson | undefined>
    );
    return lesson;
  } catch {
    return undefined;
  }
}

/** Load every stored lesson. Returns [] when empty/unavailable. */
export async function listLessons(): Promise<Lesson[]> {
  if (!isAvailable()) return [];
  try {
    const all = await withStore("readonly", (store) =>
      store.getAll() as IDBRequest<Lesson[]>
    );
    return Array.isArray(all) ? all : [];
  } catch {
    return [];
  }
}

/** Delete one lesson by id. Resolves silently on failure. */
export async function deleteLesson(id: string): Promise<void> {
  if (!isAvailable()) return;
  try {
    await withStore("readwrite", (store) => store.delete(id));
  } catch {
    // Ignore: best effort delete.
  }
}

/** Wipe the whole lessons store. Used by resetLearn() in the store. */
export async function clearAll(): Promise<void> {
  if (!isAvailable()) return;
  try {
    await withStore("readwrite", (store) => store.clear());
  } catch {
    // Ignore: best effort cleanup.
  }
}
