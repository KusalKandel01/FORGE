/**
 * Promise-based IndexedDB cache for step by step tutorial illustrations.
 *
 * Database: "forge-images" (deleted by the global reset in
 * src/lib/reset-all.ts). Object store: "img" with keyPath "key".
 *
 * Generated illustrations are cached here so they load instantly, work
 * offline and are never paid for twice on the same device. Entries are
 * evicted FIFO once the store grows past MAX_ENTRIES. Every function is
 * SSR-guarded and fails silently: caching must never break the UI.
 */

const DB_NAME = "forge-images";
const STORE_NAME = "img";
const DB_VERSION = 1;
const MAX_ENTRIES = 80;

function isAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // Hard timeout: a connection that never releases (hidden onblocked)
    // must not freeze callers that await the open. 3s is generous.
    const timer = setTimeout(
      () => reject(new Error("forge-images open timed out")),
      3000
    );
    const settle = <T,>(fn: (v: T) => void, v: T) => {
      clearTimeout(timer);
      fn(v);
    };
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => settle(resolve, request.result);
    request.onerror = () =>
      settle(
        reject,
        request.error ?? new Error("Could not open forge-images")
      );
    request.onblocked = () =>
      settle(
        reject,
        new Error("forge-images open blocked by another connection")
      );
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
    return await requestToPromise(run(tx.objectStore(STORE_NAME)));
  } finally {
    database.close();
  }
}

export interface CachedImage {
  key: string;
  dataUrl: string;
  savedAt: number;
}

export async function getCachedImage(key: string): Promise<string | null> {
  try {
    const row = await withStore<CachedImage | undefined>("readonly", (store) =>
      store.get(key)
    );
    return row?.dataUrl ?? null;
  } catch {
    return null;
  }
}

export async function putCachedImage(
  key: string,
  dataUrl: string
): Promise<void> {
  try {
    const row: CachedImage = { key, dataUrl, savedAt: Date.now() };
    await withStore("readwrite", (store) => store.put(row));
    // FIFO eviction: drop the oldest entries past the cap.
    const keys = await withStore<IDBValidKey[]>("readwrite", (store) =>
      store.getAllKeys()
    );
    if (keys.length > MAX_ENTRIES) {
      const all = await withStore<CachedImage[]>("readwrite", (store) =>
        store.getAll()
      );
      all.sort((a, b) => a.savedAt - b.savedAt);
      const tx = await openDb();
      try {
        const write = tx.transaction(STORE_NAME, "readwrite");
        const store = write.objectStore(STORE_NAME);
        for (const stale of all.slice(0, all.length - MAX_ENTRIES)) {
          store.delete(stale.key);
        }
      } finally {
        tx.close();
      }
    }
  } catch {
    // Cache write failures are never user visible.
  }
}

export async function clearImageCache(): Promise<void> {
  try {
    await withStore("readwrite", (store) => store.clear());
  } catch {
    // Nothing to clean up if storage is missing.
  }
}
