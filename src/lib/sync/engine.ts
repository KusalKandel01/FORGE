"use client";

import { useProfile } from "@/lib/profile-store";
import { useFitness, type DayLog, type Plan } from "@/components/fitness/store";
import {
  useLibrary,
  type ShelfMeta,
  type Bookmark,
  type Highlight,
} from "@/components/library/store";
import { useLearnStore, type LessonMeta } from "@/components/learn/store";
import { useMusic, type Favorite } from "@/components/music/store";
import {
  useFlashcards,
  type Deck,
} from "@/lib/flashcards-store";
import { useHabits, type Habit } from "@/lib/habits-store";
import {
  getChapter,
  getMisc,
  putChapter,
  putMeta,
  putMisc,
  deleteBookEverywhere,
} from "@/lib/book-cache";
import { deleteLesson, getLesson, saveLesson, type Lesson } from "@/lib/learn-cache";
import { useSyncStore } from "@/components/sync/store";

/**
 * FORGE offline-first sync engine.
 *
 * How it works:
 *  - Every store write happens locally first, so everything keeps working
 *    with no connection (the app is offline-first by design).
 *  - Each piece of data carries its own change timestamp, so two devices
 *    can merge without a central clock: newest write wins per record.
 *  - syncNow() pushes everything newer than the last sync cursor, then
 *    pulls everything the other devices changed. Deletions travel as
 *    tombstones so they spread to every device.
 *  - Triggers: coming back online, app focus, a 90 s idle timer, and a
 *    short debounce after any local change.
 *
 * Synced entities:
 *  profile          whole XP value            (merged with max, XP never shrinks)
 *  fitness-meta     goals, badges, plan       (whole record, newest wins)
 *  fitness-day      one record per day        (newest wins per day)
 *  library-meta     font size + tombstones    (union merge)
 *  library-book     one record per shelf book (newest wins per book)
 *  library-marks    bookmarks + highlights    (union merge, minus removed ids)
 *  book-outline     generated book outline    (immutable once written)
 *  book-chapter     generated chapter text    (immutable once written)
 *  learn-meta       XP guards + tombstones    (union merge)
 *  lesson-meta      one record per lesson     (newest wins per lesson)
 *  lesson-body      full lesson content       (immutable once written)
 *  music            last source, volume, favorites (newest wins + union favorites)
 *  habits           habit list, checks, XP guards (union merge, checks only grow)
 *  flashcards-meta  XP guards + deck tombstones (union merge)
 *  flashcards-deck  one record per deck       (newest wins per deck)
 *
 * Deliberately NOT synced: full Gutenberg book texts (free to re-download),
 * and IndexedDB-only caches that rebuild themselves.
 */

const WHOLE_ENTITIES = [
  "profile",
  "fitness-meta",
  "library-meta",
  "library-marks",
  "learn-meta",
  "music",
  "habits",
  "flashcards-meta",
] as const;

const MAX_CHANGES_PER_SYNC = 400;

interface OutgoingChange {
  entity: string;
  recordId: string;
  payload: string;
  updatedAt: string;
  deleted?: boolean;
}

interface PullRecord {
  entity: string;
  recordId: string;
  payload: string;
  updatedAt: string;
  deleted: boolean;
}

const EPOCH = "1970-01-01T00:00:00.000Z";

/** True when a ISO-ish stamp string is newer than another (missing = old). */
function isNewer(a: string | null | undefined, b: string): boolean {
  return (a ?? EPOCH) > b;
}

function deviceLabel(): string {
  if (typeof navigator === "undefined") return "Device";
  return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
    ? "Phone"
    : "Desktop";
}

/* ------------------------------------------------------------------ */
/* Change collection (what this device wants to upload)                */
/* ------------------------------------------------------------------ */

async function collectChanges(): Promise<{
  changes: OutgoingChange[];
  sentKeys: string[];
  stamps: Array<[string, string]>;
  pushedWhole: string[];
}> {
  const sync = useSyncStore.getState();
  const cursor = sync.lastSyncAt ?? "";
  const now = new Date().toISOString();
  const changes: OutgoingChange[] = [];
  const sentKeys: string[] = [];
  const stamps: Array<[string, string]> = [];
  const pushedWhole: string[] = [];

  const push = (change: OutgoingChange) => {
    if (changes.length < MAX_CHANGES_PER_SYNC) changes.push(change);
  };

  // Whole-entity states: push when their stamp is newer than the cursor.
  const fitness = useFitness.getState();
  const library = useLibrary.getState();
  const learn = useLearnStore.getState();
  const music = useMusic.getState();
  const habits = useHabits.getState();
  const flash = useFlashcards.getState();
  const profiles: Record<string, () => unknown> = {
    profile: () => ({ xp: useProfile.getState().xp }),
    "fitness-meta": () => ({
      goalSteps: fitness.goalSteps,
      goalWorkoutsPerWeek: fitness.goalWorkoutsPerWeek,
      bodyWeightKg: fitness.bodyWeightKg,
      heightCm: fitness.heightCm,
      stepGoalAwarded: fitness.stepGoalAwarded,
      badges: fitness.badges,
      plan: fitness.plan,
    }),
    "library-meta": () => ({
      fontSize: library.fontSize,
      booksXpAwarded: library.booksXpAwarded,
      removedBookIds: library.removedBookIds,
      removedBookAt: library.removedBookAt,
    }),
    "learn-meta": () => ({
      xpAwarded: learn.xpAwarded,
      removedLessonIds: learn.removedLessonIds,
      removedLessonAt: learn.removedLessonAt,
    }),
    "library-marks": () => {
      const cleared = new Set(library.clearedBookIds);
      const marks: Record<
        string,
        { bookmarks: Bookmark[]; highlights: Highlight[] }
      > = {};
      const bookIds = new Set([
        ...Object.keys(library.bookmarks),
        ...Object.keys(library.highlights),
      ]);
      for (const bookId of bookIds) {
        if (cleared.has(bookId)) continue;
        const bookmarks = library.bookmarks[bookId] ?? [];
        const highlights = library.highlights[bookId] ?? [];
        if (bookmarks.length === 0 && highlights.length === 0) continue;
        marks[bookId] = { bookmarks, highlights };
      }
      return {
        marks,
        removedMarkIds: library.removedMarkIds,
        clearedBookIds: library.clearedBookIds,
        clearedBookAt: library.clearedBookAt,
      };
    },
    music: () => ({
      type: music.type,
      id: music.id,
      volume: music.volume,
      shuffle: music.shuffle,
      favorites: music.favorites,
      removedFavoriteKeys: music.removedFavoriteKeys ?? [],
    }),
    habits: () => ({
      habits: habits.habits,
      checks: habits.checks,
      xpAwarded: habits.xpAwarded,
    }),
    "flashcards-meta": () => ({
      xpAwarded: flash.xpAwarded,
      tombstones: flash.tombstones,
    }),
  };

  for (const entity of WHOLE_ENTITIES) {
    const stamp = sync.entityStamps[`${entity}:state`];
    if (!stamp) continue;
    // Push when the entity is locally dirty (reliable regardless of clock
    // skew) or its stamp is newer than the cursor.
    const isPending = sync.pendingWhole.includes(entity);
    if (!isPending && !(stamp > cursor)) continue;
    push({
      entity,
      recordId: "state",
      payload: JSON.stringify(profiles[entity]()),
      updatedAt: stamp,
    });
    stamps.push([`${entity}:state`, stamp]);
    pushedWhole.push(entity);
  }

  // Fitness days: one record per day, stamp lives in the day itself.
  for (const log of Object.values(fitness.logs)) {
    const stamp = log.updatedAt ?? `${log.date}T12:00:00.000Z`;
    if (!(stamp > cursor)) continue;
    push({
      entity: "fitness-day",
      recordId: log.date,
      payload: JSON.stringify(log),
      updatedAt: stamp,
    });
  }

  // Library books.
  for (const book of library.shelf) {
    const stamp = book.touchedAt ?? book.addedAt;
    if (!(stamp > cursor)) continue;
    push({
      entity: "library-book",
      recordId: book.id,
      payload: JSON.stringify(book),
      updatedAt: stamp,
    });
  }

  // Lesson metas (summaries, notes, quiz scores).
  for (const meta of learn.lessons) {
    const stamp = meta.updatedAt ?? meta.savedAt;
    if (!(stamp > cursor)) continue;
    push({
      entity: "lesson-meta",
      recordId: meta.id,
      payload: JSON.stringify(meta),
      updatedAt: stamp,
    });
  }

  // Lesson bodies: immutable, upload once. They live in IndexedDB.
  for (const meta of learn.lessons) {
    const key = `sent:lesson-body:${meta.id}`;
    if (sync.sentKeys[key]) continue;
    const body = await getLesson(meta.id);
    if (!body) continue;
    push({
      entity: "lesson-body",
      recordId: meta.id,
      payload: JSON.stringify(body),
      updatedAt: meta.savedAt,
    });
    sentKeys.push(key);
  }

  // Flashcard decks: one record per deck, the deck carries its own stamp.
  for (const deck of flash.decks) {
    const stamp = deck.updatedAt ?? deck.createdAt;
    if (!(stamp > cursor)) continue;
    push({
      entity: "flashcards-deck",
      recordId: deck.id,
      payload: JSON.stringify(deck),
      updatedAt: stamp,
    });
  }

  // Deleted decks travel as tombstones, exactly once.
  for (const id of flash.tombstones) {
    const key = `tomb:flashcards-deck:${id}`;
    if (sync.sentKeys[key]) continue;
    push({
      entity: "flashcards-deck",
      recordId: id,
      payload: "{}",
      updatedAt: now,
      deleted: true,
    });
    sentKeys.push(key);
  }

  // Generated books: outline plus any cached chapters, immutable once written.
  for (const book of library.shelf) {
    if (book.source !== "generated") continue;
    const outlineKey = `sent:book-outline:${book.id}`;
    if (!sync.sentKeys[outlineKey]) {
      const outline = await getMisc<{ description: string; chapterTitles: string[]; genre?: string }>(
        `${book.id}:outline`
      );
      if (outline) {
        push({
          entity: "book-outline",
          recordId: book.id,
          payload: JSON.stringify(outline),
          updatedAt: book.addedAt,
        });
        sentKeys.push(outlineKey);
      }
    }
    const chapterCount = book.chapterCount ?? 10;
    for (let i = 0; i < chapterCount; i++) {
      const key = `sent:book-chapter:${book.id}:${i}`;
      if (sync.sentKeys[key]) continue;
      const text = await getChapter(book.id, i);
      if (text === null) continue; // not generated yet; try again next sync
      push({
        entity: "book-chapter",
        recordId: `${book.id}:${i}`,
        payload: JSON.stringify(text),
        updatedAt: book.addedAt,
      });
      sentKeys.push(key);
    }
  }

  // Tombstones: deletions must reach the server exactly once.
  for (const date of fitness.clearedDays) {
    const key = `tomb:fitness-day:${date}`;
    if (sync.sentKeys[key]) continue;
    push({
      entity: "fitness-day",
      recordId: date,
      payload: "{}",
      updatedAt: now,
      deleted: true,
    });
    sentKeys.push(key);
  }

  for (const id of library.removedBookIds) {
    if (sync.sentKeys[`tomb:library-book:${id}`]) continue;
    const stamp = library.removedBookAt[id] ?? now;
    push({
      entity: "library-book",
      recordId: id,
      payload: "{}",
      updatedAt: stamp,
      deleted: true,
    });
    sentKeys.push(`tomb:library-book:${id}`);
    if (id.startsWith("gen-")) {
      // Generated books always have 10 chapters.
      push({
        entity: "book-outline",
        recordId: id,
        payload: "{}",
        updatedAt: stamp,
        deleted: true,
      });
      sentKeys.push(`tomb:book-outline:${id}`);
      for (let i = 0; i < 10; i++) {
        push({
          entity: "book-chapter",
          recordId: `${id}:${i}`,
          payload: "{}",
          updatedAt: stamp,
          deleted: true,
        });
        sentKeys.push(`tomb:book-chapter:${id}:${i}`);
      }
    }
  }

  for (const id of learn.removedLessonIds) {
    const stamp = learn.removedLessonAt[id] ?? now;
    if (!sync.sentKeys[`tomb:lesson-meta:${id}`]) {
      push({
        entity: "lesson-meta",
        recordId: id,
        payload: "{}",
        updatedAt: stamp,
        deleted: true,
      });
      sentKeys.push(`tomb:lesson-meta:${id}`);
    }
    if (!sync.sentKeys[`tomb:lesson-body:${id}`]) {
      push({
        entity: "lesson-body",
        recordId: id,
        payload: "{}",
        updatedAt: stamp,
        deleted: true,
      });
      sentKeys.push(`tomb:lesson-body:${id}`);
    }
  }

  return { changes, sentKeys, stamps, pushedWhole };
}

/* ------------------------------------------------------------------ */
/* Appliers (merge pulled records into local stores)                   */
/* ------------------------------------------------------------------ */

function unionArrays<T>(a: T[], b: unknown): T[] {
  if (!Array.isArray(b)) return a;
  return [...new Set([...a, ...(b as T[])])];
}

async function applyRecord(rec: PullRecord): Promise<void> {
  const stampKey = `${rec.entity}:${rec.recordId}`;
  try {
    switch (rec.entity) {
      case "profile": {
        const data = JSON.parse(rec.payload) as { xp?: unknown };
        if (typeof data?.xp === "number") {
          const xp = Math.max(0, Math.round(data.xp));
          // XP only ever grows, so merging with max is safe.
          useProfile.setState((s) => ({ xp: Math.max(s.xp, xp) }));
          useSyncStore.getState().setStamp(stampKey, rec.updatedAt);
        }
        return;
      }

      case "fitness-meta": {
        const d = JSON.parse(rec.payload) as Record<string, unknown>;
        const patch: Partial<{
          goalSteps: number;
          goalWorkoutsPerWeek: number;
          bodyWeightKg: number;
          heightCm: number;
          stepGoalAwarded: string[];
          badges: string[];
          plan: Plan | null;
        }> = {};
        if (typeof d.goalSteps === "number") patch.goalSteps = d.goalSteps;
        if (typeof d.goalWorkoutsPerWeek === "number")
          patch.goalWorkoutsPerWeek = d.goalWorkoutsPerWeek;
        if (typeof d.bodyWeightKg === "number") patch.bodyWeightKg = d.bodyWeightKg;
        if (typeof d.heightCm === "number") patch.heightCm = d.heightCm;
        if (Array.isArray(d.stepGoalAwarded))
          patch.stepGoalAwarded = d.stepGoalAwarded as string[];
        if (Array.isArray(d.badges)) patch.badges = d.badges as string[];
        patch.plan = (d.plan as Plan | null) ?? null;
        useFitness.setState(patch);
        useSyncStore.getState().setStamp(stampKey, rec.updatedAt);
        return;
      }

      case "fitness-day": {
        if (rec.deleted) {
          useFitness.setState((s) => {
            if (!s.logs[rec.recordId]) return {};
            const logs = { ...s.logs };
            delete logs[rec.recordId];
            return { logs };
          });
          useSyncStore.getState().markSent([`tomb:fitness-day:${rec.recordId}`]);
          return;
        }
        const day = JSON.parse(rec.payload) as Partial<DayLog>;
        if (typeof day?.date !== "string") return;
        const date = day.date;
        useFitness.setState((s) => {
          const current = s.logs[date];
          // Local copy is newer or equal: keep it, it will push later.
          if (current && !isNewer(day.updatedAt, current.updatedAt ?? EPOCH))
            return {};
          return { logs: { ...s.logs, [date]: { ...day, date } as DayLog } };
        });
        return;
      }

      case "library-meta": {
        const d = JSON.parse(rec.payload) as Record<string, unknown>;
        useLibrary.setState((s) => ({
          fontSize:
            typeof d.fontSize === "number" ? d.fontSize : s.fontSize,
          booksXpAwarded: unionArrays(s.booksXpAwarded, d.booksXpAwarded),
          removedBookIds: unionArrays(s.removedBookIds, d.removedBookIds),
          removedBookAt: {
            ...s.removedBookAt,
            ...((d.removedBookAt as Record<string, string>) ?? {}),
          },
        }));
        useSyncStore.getState().setStamp(stampKey, rec.updatedAt);
        return;
      }

      case "library-book": {
        if (rec.deleted) {
          useLibrary.setState((s) => ({
            shelf: s.shelf.filter((b) => b.id !== rec.recordId),
            removedBookIds: [...new Set([...s.removedBookIds, rec.recordId])],
          }));
          void deleteBookEverywhere(rec.recordId);
          useSyncStore.getState().markSent([`tomb:library-book:${rec.recordId}`]);
          return;
        }
        const meta = JSON.parse(rec.payload) as Partial<ShelfMeta>;
        if (typeof meta?.id !== "string" && meta.id !== undefined) return;
        useLibrary.setState((s) => {
          if (s.removedBookIds.includes(rec.recordId)) return {}; // tombstoned
          const current = s.shelf.find((b) => b.id === rec.recordId);
          const incomingStamp = meta.touchedAt ?? meta.addedAt ?? EPOCH;
          if (
            current &&
            !isNewer(
              incomingStamp,
              current.touchedAt ?? current.addedAt ?? EPOCH
            )
          ) {
            return {};
          }
          return {
            shelf: [
              { ...meta, id: rec.recordId } as ShelfMeta,
              ...s.shelf.filter((b) => b.id !== rec.recordId),
            ],
          };
        });
        const saved = useLibrary
          .getState()
          .shelf.find((b) => b.id === rec.recordId);
        if (saved) void putMeta({ ...saved });
        return;
      }

      case "book-outline": {
        if (rec.deleted) {
          useSyncStore.getState().markSent([`tomb:book-outline:${rec.recordId}`]);
          return; // the library-book tombstone removes local files
        }
        const outline = JSON.parse(rec.payload);
        if (outline && typeof outline === "object") {
          await putMisc(`${rec.recordId}:outline`, outline);
          useSyncStore.getState().markSent([`sent:book-outline:${rec.recordId}`]);
        }
        return;
      }

      case "book-chapter": {
        if (rec.deleted) {
          useSyncStore.getState().markSent([`tomb:book-chapter:${rec.recordId}`]);
          return;
        }
        const text = JSON.parse(rec.payload);
        if (typeof text === "string") {
          const sep = rec.recordId.lastIndexOf(":");
          const bookId = rec.recordId.slice(0, sep);
          const index = parseInt(rec.recordId.slice(sep + 1), 10);
          if (bookId && Number.isInteger(index)) {
            await putChapter(bookId, index, text);
            useSyncStore
              .getState()
              .markSent([`sent:book-chapter:${rec.recordId}`]);
          }
        }
        return;
      }

      case "learn-meta": {
        const d = JSON.parse(rec.payload) as Record<string, unknown>;
        useLearnStore.setState((s) => ({
          xpAwarded: {
            lessonComplete: unionArrays(
              s.xpAwarded.lessonComplete,
              (d.xpAwarded as { lessonComplete?: string[] })?.lessonComplete
            ),
            perfectQuiz: unionArrays(
              s.xpAwarded.perfectQuiz,
              (d.xpAwarded as { perfectQuiz?: string[] })?.perfectQuiz
            ),
          },
          removedLessonIds: unionArrays(s.removedLessonIds, d.removedLessonIds),
          removedLessonAt: {
            ...s.removedLessonAt,
            ...((d.removedLessonAt as Record<string, string>) ?? {}),
          },
        }));
        useSyncStore.getState().setStamp(stampKey, rec.updatedAt);
        return;
      }

      case "lesson-meta": {
        if (rec.deleted) {
          useLearnStore.setState((s) => ({
            lessons: s.lessons.filter((l) => l.id !== rec.recordId),
            removedLessonIds: [
              ...new Set([...s.removedLessonIds, rec.recordId]),
            ],
          }));
          void deleteLesson(rec.recordId);
          useSyncStore
            .getState()
            .markSent([
              `tomb:lesson-meta:${rec.recordId}`,
              `tomb:lesson-body:${rec.recordId}`,
            ]);
          return;
        }
        const meta = JSON.parse(rec.payload) as Partial<LessonMeta> | null;
        if (!meta) return;
        useLearnStore.setState((s) => {
          if (s.removedLessonIds.includes(rec.recordId)) return {}; // tombstoned
          const current = s.lessons.find((l) => l.id === rec.recordId);
          const incomingStamp = meta.updatedAt ?? meta.savedAt ?? EPOCH;
          if (
            current &&
            !isNewer(incomingStamp, current.updatedAt ?? current.savedAt ?? EPOCH)
          ) {
            return {};
          }
          return {
            lessons: [
              { ...meta, id: rec.recordId } as LessonMeta,
              ...s.lessons.filter((l) => l.id !== rec.recordId),
            ],
          };
        });
        return;
      }

      case "lesson-body": {
        if (rec.deleted) {
          useSyncStore.getState().markSent([`tomb:lesson-body:${rec.recordId}`]);
          return;
        }
        const lesson = JSON.parse(rec.payload) as Partial<Lesson> | null;
        if (!lesson || typeof lesson.id !== "string") return;
        await saveLesson(lesson as Lesson);
        // Make sure a meta row exists so the lesson shows up in the list.
        useLearnStore.setState((s) => {
          if (s.removedLessonIds.includes(rec.recordId)) return {};
          if (s.lessons.some((l) => l.id === rec.recordId)) return {};
          const l = lesson as {
            topic?: string;
            level?: "beginner" | "intermediate" | "advanced" | "expert";
            title?: string;
            savedAt?: string;
          };
          return {
            lessons: [
              {
                id: rec.recordId,
                topic: l.topic ?? "Lesson",
                level: l.level ?? "beginner",
                title: l.title ?? "Lesson",
                savedAt: l.savedAt ?? rec.updatedAt,
                completed: false,
                quizScore: null,
                quizTotal: null,
                notes: "",
                updatedAt: l.savedAt ?? rec.updatedAt,
              },
              ...s.lessons,
            ],
          };
        });
        useSyncStore.getState().markSent([`sent:lesson-body:${rec.recordId}`]);
        return;
      }

      case "music": {
        const d = JSON.parse(rec.payload) as Record<string, unknown>;
        useMusic.setState((s) => {
          const removedKeys = new Set(
            unionArrays(s.removedFavoriteKeys ?? [], d.removedFavoriteKeys)
          );
          const favorites = [...s.favorites];
          for (const raw of Array.isArray(d.favorites) ? d.favorites : []) {
            const f = raw as Favorite;
            if (
              !f ||
              typeof f.id !== "string" ||
              (f.type !== "playlist" && f.type !== "video")
            ) {
              continue;
            }
            if (removedKeys.has(`${f.type}:${f.id}`)) continue;
            if (!favorites.some((x) => x.type === f.type && x.id === f.id)) {
              favorites.unshift(f);
            }
          }
          return {
            // Player state is newest wins; favorites are union merged and
            // filtered by every removal this bucket knows about.
            favorites: favorites.filter(
              (f) => !removedKeys.has(`${f.type}:${f.id}`)
            ),
            removedFavoriteKeys: [...removedKeys].slice(-400),
            type: d.type === "playlist" || d.type === "video" ? d.type : null,
            id: typeof d.id === "string" ? d.id : null,
            volume: typeof d.volume === "number" ? d.volume : s.volume,
            shuffle: d.shuffle === true,
          };
        });
        useSyncStore.getState().setStamp(stampKey, rec.updatedAt);
        return;
      }

      case "habits": {
        const d = JSON.parse(rec.payload) as {
          habits?: Habit[];
          checks?: Record<string, string[]>;
          xpAwarded?: string[];
        };
        useHabits.setState((s) => {
          // Habits union by id. Once archived, a habit stays archived.
          const byId = new Map(s.habits.map((h) => [h.id, h]));
          for (const raw of Array.isArray(d.habits) ? d.habits : []) {
            if (
              !raw ||
              typeof raw.id !== "string" ||
              typeof raw.name !== "string" ||
              typeof raw.createdAt !== "string"
            ) {
              continue;
            }
            const local = byId.get(raw.id);
            if (!local) {
              byId.set(raw.id, {
                id: raw.id,
                name: raw.name,
                createdAt: raw.createdAt,
                archivedAt: raw.archivedAt ?? null,
              });
            } else {
              byId.set(raw.id, {
                ...local,
                name: local.archivedAt ? local.name : raw.name,
                archivedAt: local.archivedAt ?? raw.archivedAt ?? null,
              });
            }
          }
          // Checked days only grow: a check on any device counts everywhere.
          const checks: Record<string, string[]> = { ...s.checks };
          for (const [habitId, days] of Object.entries(d.checks ?? {})) {
            if (!Array.isArray(days)) continue;
            const clean = days.filter((k) => typeof k === "string");
            checks[habitId] = [
              ...new Set([...(checks[habitId] ?? []), ...clean]),
            ].sort();
          }
          return {
            habits: [...byId.values()],
            checks,
            xpAwarded: unionArrays(s.xpAwarded, d.xpAwarded),
          };
        });
        useSyncStore.getState().setStamp(stampKey, rec.updatedAt);
        return;
      }

      case "flashcards-meta": {
        const d = JSON.parse(rec.payload) as {
          xpAwarded?: string[];
          tombstones?: string[];
        };
        useFlashcards.setState((s) => ({
          xpAwarded: unionArrays(s.xpAwarded, d.xpAwarded),
          tombstones: unionArrays(s.tombstones, d.tombstones),
        }));
        useSyncStore.getState().setStamp(stampKey, rec.updatedAt);
        return;
      }

      case "flashcards-deck": {
        if (rec.deleted) {
          useFlashcards.setState((s) => ({
            decks: s.decks.filter((deck) => deck.id !== rec.recordId),
            tombstones: [...new Set([...s.tombstones, rec.recordId])].slice(
              -400
            ),
          }));
          useSyncStore
            .getState()
            .markSent([`tomb:flashcards-deck:${rec.recordId}`]);
          return;
        }
        const deck = JSON.parse(rec.payload) as Partial<Deck> | null;
        if (!deck || typeof deck.id !== "string" || !Array.isArray(deck.cards)) {
          return;
        }
        useFlashcards.setState((s) => {
          if (s.tombstones.includes(rec.recordId)) return {}; // deleted elsewhere
          const current = s.decks.find((d) => d.id === rec.recordId);
          const incomingStamp = deck.updatedAt ?? deck.createdAt ?? EPOCH;
          if (
            current &&
            !isNewer(incomingStamp, current.updatedAt ?? current.createdAt ?? EPOCH)
          ) {
            return {};
          }
          return {
            decks: [
              deck as Deck,
              ...s.decks.filter((d) => d.id !== rec.recordId),
            ],
          };
        });
        return;
      }

      case "library-marks": {
        const d = JSON.parse(rec.payload) as {
          marks?: Record<
            string,
            { bookmarks?: Bookmark[]; highlights?: Highlight[] }
          >;
          removedMarkIds?: string[];
          clearedBookIds?: string[];
          clearedBookAt?: Record<string, string>;
        };
        useLibrary.setState((s) => {
          const removedIds = new Set(
            unionArrays(s.removedMarkIds, d.removedMarkIds)
          );
          const clearedIds = unionArrays(s.clearedBookIds, d.clearedBookIds);
          const cleared = new Set(clearedIds);
          const remoteMarks = d.marks ?? {};
          const bookmarks: Record<string, Bookmark[]> = {};
          const highlights: Record<string, Highlight[]> = {};
          const bookIds = new Set([
            ...Object.keys(s.bookmarks),
            ...Object.keys(s.highlights),
            ...Object.keys(remoteMarks),
          ]);
          for (const bookId of bookIds) {
            if (cleared.has(bookId)) continue;
            const localMarks = s.bookmarks[bookId] ?? [];
            const localHighs = s.highlights[bookId] ?? [];
            const remoteBook = remoteMarks[bookId];
            const remoteList = Array.isArray(remoteBook?.bookmarks)
              ? remoteBook.bookmarks
              : [];
            const remoteHighList = Array.isArray(remoteBook?.highlights)
              ? remoteBook.highlights
              : [];
            const mergedMarks = [
              ...new Map(
                [...localMarks, ...remoteList]
                  .filter(
                    (m) =>
                      m &&
                      typeof m.id === "string" &&
                      !removedIds.has(m.id)
                  )
                  .map((m) => [m.id, m])
              ).values(),
            ].sort((a, b) => a.page - b.page);
            const mergedHighs = [
              ...new Map(
                [...localHighs, ...remoteHighList]
                  .filter(
                    (h) =>
                      h &&
                      typeof h.id === "string" &&
                      !removedIds.has(h.id)
                  )
                  .map((h) => [h.id, h])
              ).values(),
            ];
            if (mergedMarks.length) bookmarks[bookId] = mergedMarks;
            if (mergedHighs.length) highlights[bookId] = mergedHighs;
          }
          return {
            bookmarks,
            highlights,
            removedMarkIds: [...removedIds].slice(-400),
            clearedBookIds: clearedIds.slice(-200),
            clearedBookAt: { ...s.clearedBookAt, ...(d.clearedBookAt ?? {}) },
          };
        });
        useSyncStore.getState().setStamp(stampKey, rec.updatedAt);
        return;
      }
    }
  } catch {
    // One malformed record must never break the whole sync.
  }
}

/* ------------------------------------------------------------------ */
/* The sync round                                                      */
/* ------------------------------------------------------------------ */

export async function syncNow(
  reason = "manual"
): Promise<{ ok: boolean; error?: string }> {
  const sync = useSyncStore.getState();
  if (typeof window === "undefined") return { ok: false, error: "no window" };
  if (!sync.syncKey) return { ok: false, error: "Not paired" };
  if (sync.syncing) return { ok: false, error: "Sync already running" };
  if (!navigator.onLine) {
    useSyncStore
      .getState()
      .setError("Offline. Changes are queued and will upload when you reconnect.");
    return { ok: false, error: "offline" };
  }

  useSyncStore.getState().setSyncing(true);
  try {
    const { changes, sentKeys, stamps, pushedWhole } = await collectChanges();
    const deviceId =
      useSyncStore.getState().deviceId || useSyncStore.getState().ensureDeviceId();

    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        syncKey: sync.syncKey,
        deviceId,
        deviceName: deviceLabel(),
        since: sync.lastSyncAt,
        changes,
      }),
    });

    if (res.status === 401) {
      useSyncStore.getState().unpair();
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      const message = data.error ?? "Sync code is no longer valid.";
      useSyncStore.getState().setError(message);
      return { ok: false, error: message };
    }
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      const message = data.error ?? "Sync failed. Will retry automatically.";
      useSyncStore.getState().setError(message);
      return { ok: false, error: message };
    }

    const data = (await res.json()) as {
      serverTime: string;
      records: PullRecord[];
    };

    // Apply pulled records without re-marking local data as changed.
    applying = true;
    try {
      for (const rec of data.records) {
        await applyRecord(rec);
      }
    } finally {
      applying = false;
    }

    if (sentKeys.length) useSyncStore.getState().markSent(sentKeys);
    // Only clear the dirty flags AFTER the server accepted the round.
    if (pushedWhole.length) {
      useSyncStore.getState().markWholePushed(pushedWhole);
    }
    for (const [key, iso] of stamps) {
      useSyncStore.getState().setStamp(key, iso);
    }
    useSyncStore.getState().setCursor(data.serverTime);
    useSyncStore.getState().setError(null);
    return { ok: true };
  } catch (err) {
    // Surface the real cause in the console; the toast stays friendly.
    console.warn("FORGE sync failed:", err);
    const message = "Sync failed. Changes stay queued on this device.";
    useSyncStore.getState().setError(message);
    return { ok: false, error: message };
  } finally {
    useSyncStore.getState().setSyncing(false);
    void reason;
  }
}

/* ------------------------------------------------------------------ */
/* Pairing helpers (used by the Settings page)                         */
/* ------------------------------------------------------------------ */

/** Create a fresh sync bucket and upload this device's current data. */
export async function createSyncBucket(): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/sync/pair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const data = (await res.json().catch(() => ({}))) as {
      syncKey?: string;
      error?: string;
    };
    if (!res.ok || !data.syncKey) {
      return { ok: false, error: data.error ?? "Could not create a sync code." };
    }
    useSyncStore.getState().adoptKey(data.syncKey, true);
    // Stamp every whole entity so existing local data uploads to the new
    // bucket, and mark them pending so the upload never depends on clocks.
    const now = new Date().toISOString();
    const stamps: Record<string, string> = {};
    for (const entity of WHOLE_ENTITIES) stamps[`${entity}:state`] = now;
    useSyncStore.setState((s) => ({
      entityStamps: { ...s.entityStamps, ...stamps },
      pendingWhole: [...new Set([...s.pendingWhole, ...WHOLE_ENTITIES])],
    }));
    void syncNow("created");
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Could not reach the server. Check your connection.",
    };
  }
}

/** Link this device to an existing bucket with a code, then merge both ways. */
export async function linkSyncBucket(
  rawCode: string
): Promise<{ ok: boolean; error?: string }> {
  const code = rawCode.trim().toUpperCase().replace(/\s+/g, "");
  if (!/^FORGE-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
    return { ok: false, error: "Codes look like FORGE-XXXX-XXXX." };
  }
  try {
    const res = await fetch("/api/sync/pair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ syncKey: code }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      syncKey?: string;
      error?: string;
    };
    if (!res.ok || !data.syncKey) {
      return { ok: false, error: data.error ?? "That code did not work." };
    }
    useSyncStore.getState().adoptKey(data.syncKey, false);
    void syncNow("linked");
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Could not reach the server. Check your connection.",
    };
  }
}

export function unpairDevice(): void {
  useSyncStore.getState().unpair();
}

/** Delete the server copy of this bucket, then unpair this device. */
export async function wipeServerCopy(): Promise<{ ok: boolean; error?: string }> {
  const sync = useSyncStore.getState();
  if (!sync.syncKey) return { ok: false, error: "Not paired" };
  try {
    const res = await fetch("/api/sync", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ syncKey: sync.syncKey }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: data.error ?? "Could not wipe the server copy." };
    }
    useSyncStore.getState().unpair();
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Could not reach the server. Check your connection.",
    };
  }
}

/* ------------------------------------------------------------------ */
/* Engine lifecycle                                                    */
/* ------------------------------------------------------------------ */

let started = false;
let applying = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let idleTimer: ReturnType<typeof setInterval> | null = null;

/** Cheap check without touching IndexedDB: is anything waiting to upload? */
function hasPendingQuick(): boolean {
  const sync = useSyncStore.getState();
  if (!sync.syncKey) return false;
  const cursor = sync.lastSyncAt ?? "";

  // Dirty whole entities always count, whatever the clocks say.
  if (sync.pendingWhole.length > 0) return true;

  for (const entity of WHOLE_ENTITIES) {
    const stamp = sync.entityStamps[`${entity}:state`];
    if (stamp && stamp > cursor) return true;
  }

  const fitness = useFitness.getState();
  if (fitness.clearedDays.some((d) => !sync.sentKeys[`tomb:fitness-day:${d}`]))
    return true;
  for (const log of Object.values(fitness.logs)) {
    if ((log.updatedAt ?? `${log.date}T12:00:00.000Z`) > cursor) return true;
  }

  const library = useLibrary.getState();
  if (library.removedBookIds.some((id) => !sync.sentKeys[`tomb:library-book:${id}`]))
    return true;
  for (const book of library.shelf) {
    if ((book.touchedAt ?? book.addedAt) > cursor) return true;
  }

  const learn = useLearnStore.getState();
  if (learn.removedLessonIds.some((id) => !sync.sentKeys[`tomb:lesson-meta:${id}`]))
    return true;
  for (const lesson of learn.lessons) {
    if ((lesson.updatedAt ?? lesson.savedAt) > cursor) return true;
  }

  const flash = useFlashcards.getState();
  if (flash.tombstones.some((id) => !sync.sentKeys[`tomb:flashcards-deck:${id}`]))
    return true;
  for (const deck of flash.decks) {
    if ((deck.updatedAt ?? deck.createdAt) > cursor) return true;
  }

  return false;
}

function scheduleSync(delayMs = 3500): void {
  if (typeof window === "undefined") return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    if (hasPendingQuick()) void syncNow("debounce");
  }, delayMs);
}

/**
 * Start the engine exactly once per page load. Returns a cleanup function.
 */
export function initSyncEngine(): () => void {
  if (typeof window === "undefined") return () => {};
  if (started) return () => {};
  started = true;

  useSyncStore.getState().ensureDeviceId();

  // Any change in any store stamps the matching whole-entity state and
  // schedules an upload a few seconds out. Per-record data (days, books,
  // lessons) carries its own timestamps, so only the stamp matters here.
  const offs: Array<() => void> = [];
  const watch = (
    store: { subscribe: (fn: () => void) => () => void },
    entity: string
  ) => {
    offs.push(
      store.subscribe(() => {
        if (applying) return;
        useSyncStore.getState().markWholeChange(entity);
        scheduleSync();
      })
    );
  };
  watch(useProfile, "profile");
  watch(useFitness, "fitness-meta");
  watch(useLibrary, "library-meta");
  watch(useLibrary, "library-marks");
  watch(useLearnStore, "learn-meta");
  watch(useMusic, "music");
  watch(useHabits, "habits");
  watch(useFlashcards, "flashcards-meta");

  const onOnline = () => void syncNow("online");
  const onVisible = () => {
    if (document.visibilityState === "visible") void syncNow("visible");
  };
  window.addEventListener("online", onOnline);
  document.addEventListener("visibilitychange", onVisible);

  idleTimer = setInterval(() => {
    if (hasPendingQuick()) void syncNow("interval");
  }, 90_000);

  // Initial sync shortly after mount so stores finish rehydrating.
  const initial = setTimeout(() => {
    if (useSyncStore.getState().syncKey) void syncNow("init");
  }, 2000);

  return () => {
    offs.forEach((off) => off());
    window.removeEventListener("online", onOnline);
    document.removeEventListener("visibilitychange", onVisible);
    if (idleTimer) clearInterval(idleTimer);
    if (debounceTimer) clearTimeout(debounceTimer);
    clearTimeout(initial);
    started = false;
  };
}

// engine build marker: stamps-on-change v2

