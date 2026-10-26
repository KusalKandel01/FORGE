/**
 * Tiny promise-based IndexedDB wrapper for the FORGE library.
 *
 * Database: "forge-books" (version 1). Object stores:
 *  - "meta"     keyPath "id": mirror of the shelf metadata
 *  - "texts"    out-of-line keys: bookId -> full plain text (gutenberg books)
 *  - "chapters" out-of-line keys: `${bookId}:${index}` -> chapter text (generated books)
 *  - "misc"     out-of-line keys: e.g. `${bookId}:outline` -> outline data
 *
 * Everything is promise based. When IndexedDB is not available (SSR, or a
 * browser that blocks storage), reads resolve to a safe fallback and writes
 * resolve as no-ops, so callers never need to feature-detect.
 */

const DB_NAME = "forge-books";
const DB_VERSION = 1;

const STORE_META = "meta";
const STORE_TEXTS = "texts";
const STORE_CHAPTERS = "chapters";
const STORE_MISC = "misc";

/** Shape of a book metadata record persisted alongside the shelf. */
export interface StoredBookMeta {
  id: string;
  title: string;
  author: string;
  cover: string | null;
  source: string;
  chapterCount: number | null;
  addedAt: string;
  progress: number;
  lastReadAt: string | null;
  offlineReady: boolean;
  description?: string;
}

/** Shape stored under `${bookId}:outline` in the misc store. */
export interface StoredOutline {
  description: string;
  chapterTitles: string[];
  genre?: string;
  /** companion = faithful walkthrough of a real published book. */
  mode?: "original" | "companion";
  author?: string;
}

function hasIdb(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_TEXTS)) {
        db.createObjectStore(STORE_TEXTS);
      }
      if (!db.objectStoreNames.contains(STORE_CHAPTERS)) {
        db.createObjectStore(STORE_CHAPTERS);
      }
      if (!db.objectStoreNames.contains(STORE_MISC)) {
        db.createObjectStore(STORE_MISC);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(req.error ?? new Error("Could not open the forge-books database"));
  });
}

/** Run one operation on a single store and resolve with its result. */
async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest,
  fallback: T
): Promise<T> {
  if (!hasIdb()) return fallback;
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      let result: unknown = fallback;
      const tx = db.transaction(storeName, mode);
      const req = run(tx.objectStore(storeName));
      req.onsuccess = () => {
        result = req.result;
      };
      tx.oncomplete = () => resolve(result as T);
      tx.onerror = () =>
        reject(tx.error ?? new Error("IndexedDB transaction failed"));
      tx.onabort = () =>
        reject(tx.error ?? new Error("IndexedDB transaction aborted"));
    });
  } finally {
    db.close();
  }
}

export async function putMeta(meta: StoredBookMeta): Promise<void> {
  try {
    await withStore(STORE_META, "readwrite", (s) => s.put(meta), undefined);
  } catch {
    // Storage failures must never break the reading UI.
  }
}

export async function getMeta(id: string): Promise<StoredBookMeta | null> {
  try {
    return (await withStore<StoredBookMeta | null>(
      STORE_META,
      "readonly",
      (s) => s.get(id),
      null
    )) as StoredBookMeta | null;
  } catch {
    return null;
  }
}

export async function deleteMeta(id: string): Promise<void> {
  try {
    await withStore(STORE_META, "readwrite", (s) => s.delete(id), undefined);
  } catch {
    // ignore
  }
}

export async function listMetas(): Promise<StoredBookMeta[]> {
  try {
    const all = await withStore<StoredBookMeta[]>(
      STORE_META,
      "readonly",
      (s) => s.getAll(),
      []
    );
    return Array.isArray(all) ? all : [];
  } catch {
    return [];
  }
}

export async function putText(bookId: string, text: string): Promise<void> {
  try {
    await withStore(STORE_TEXTS, "readwrite", (s) => s.put(text, bookId), undefined);
  } catch {
    // ignore
  }
}

export async function getText(bookId: string): Promise<string | null> {
  try {
    const value = await withStore<unknown>(
      STORE_TEXTS,
      "readonly",
      (s) => s.get(bookId),
      null
    );
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

function chapterKey(bookId: string, index: number): string {
  return `${bookId}:${index}`;
}

export async function putChapter(
  bookId: string,
  index: number,
  text: string
): Promise<void> {
  try {
    await withStore(
      STORE_CHAPTERS,
      "readwrite",
      (s) => s.put(text, chapterKey(bookId, index)),
      undefined
    );
  } catch {
    // ignore
  }
}

export async function getChapter(
  bookId: string,
  index: number
): Promise<string | null> {
  try {
    const value = await withStore<unknown>(
      STORE_CHAPTERS,
      "readonly",
      (s) => s.get(chapterKey(bookId, index)),
      null
    );
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

export async function putMisc(key: string, value: unknown): Promise<void> {
  try {
    await withStore(STORE_MISC, "readwrite", (s) => s.put(value, key), undefined);
  } catch {
    // ignore
  }
}

export async function getMisc<T = unknown>(key: string): Promise<T | null> {
  try {
    const value = await withStore<unknown>(
      STORE_MISC,
      "readonly",
      (s) => s.get(key),
      null
    );
    return (value as T) ?? null;
  } catch {
    return null;
  }
}

/**
 * Remove every trace of one book: meta, full text, all chapters and its
 * misc entries (outline). Chapters and misc use the `${bookId}:` key prefix,
 * so a single key range clears them in one transaction.
 */
export async function deleteBookEverywhere(id: string): Promise<void> {
  if (!hasIdb()) return;
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(
        [STORE_META, STORE_TEXTS, STORE_CHAPTERS, STORE_MISC],
        "readwrite"
      );
      tx.objectStore(STORE_META).delete(id);
      tx.objectStore(STORE_TEXTS).delete(id);
      const range = IDBKeyRange.bound(`${id}:`, `${id}:\uffff`, false, false);
      tx.objectStore(STORE_CHAPTERS).delete(range);
      tx.objectStore(STORE_MISC).delete(range);
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error ?? new Error("IndexedDB delete failed"));
      tx.onabort = () =>
        reject(tx.error ?? new Error("IndexedDB delete aborted"));
    });
  } finally {
    db.close();
  }
}

/** Wipe every store in the forge-books database. */
export async function clearAll(): Promise<void> {
  if (!hasIdb()) return;
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(
        [STORE_META, STORE_TEXTS, STORE_CHAPTERS, STORE_MISC],
        "readwrite"
      );
      tx.objectStore(STORE_META).clear();
      tx.objectStore(STORE_TEXTS).clear();
      tx.objectStore(STORE_CHAPTERS).clear();
      tx.objectStore(STORE_MISC).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB clear failed"));
      tx.onabort = () =>
        reject(tx.error ?? new Error("IndexedDB clear aborted"));
    });
  } finally {
    db.close();
  }
}
