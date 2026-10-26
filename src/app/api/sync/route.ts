import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

/**
 * FORGE cloud sync endpoint.
 *
 * One round trip does both halves of the sync:
 *  1. PUSH: the client sends everything that changed locally since its last
 *     sync. The server keeps the newest version of every record
 *     (last write wins, comparing client timestamps).
 *  2. PULL: the response carries every record in the bucket updated after
 *     the client's "since" cursor, so the client can merge what other
 *     devices changed.
 *
 * There are no accounts: the syncKey is the only credential. It is a random
 * code generated on the user's first device; entering it on another device
 * links that device to the same data bucket.
 */

export const runtime = "nodejs";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

const changeSchema = z.object({
  entity: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/, "entity must be lowercase alphanumeric"),
  recordId: z.string().min(1).max(160),
  /** JSON encoded payload. */
  payload: z.string().max(2_000_000),
  /** Client clock of the change, ISO string. */
  updatedAt: z
    .string()
    .refine((v) => ISO_DATE.test(v), "updatedAt must be an ISO date"),
  deleted: z.boolean().optional(),
});

const pushSchema = z.object({
  syncKey: z.string().min(6).max(32),
  deviceId: z.string().min(6).max(64),
  deviceName: z.string().max(80).optional(),
  /** ISO cursor of the client's last successful sync, null for a first sync. */
  since: z.string().nullable().optional(),
  changes: z.array(changeSchema).max(400),
});

/** Small alphabet without lookalike characters (no 0/O/1/I). */
const KEY_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function generateSyncKey(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => KEY_ALPHABET[b % KEY_ALPHABET.length]);
  return `FORGE-${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}`;
}

function normalizeKey(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = pushSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid sync payload." },
      { status: 400 }
    );
  }

  const { syncKey, deviceId, deviceName, changes } = parsed.data;
  const sinceRaw = parsed.data.since;
  const since =
    typeof sinceRaw === "string" && ISO_DATE.test(sinceRaw)
      ? new Date(sinceRaw)
      : null;

  const user = await db.syncUser.findUnique({
    where: { syncKey: normalizeKey(syncKey) },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json(
      { error: "Unknown sync code. Check it or create a new one." },
      { status: 401 }
    );
  }

  // Register / refresh the device so the bucket knows its readers.
  try {
    await db.device.upsert({
      where: { id: deviceId },
      create: { id: deviceId, userId: user.id, name: deviceName ?? null },
      update: { lastSeen: new Date(), name: deviceName ?? undefined },
    });
  } catch {
    // Device bookkeeping must never block a sync.
  }

  // PUSH: apply every change that is newer than what we already store.
  for (const change of changes) {
    const incomingAt = new Date(change.updatedAt);
    if (Number.isNaN(incomingAt.getTime())) continue;
    try {
      const existing = await db.syncRecord.findUnique({
        where: {
          userId_entity_recordId: {
            userId: user.id,
            entity: change.entity,
            recordId: change.recordId,
          },
        },
        select: { updatedAt: true },
      });
      if (existing && existing.updatedAt.getTime() >= incomingAt.getTime()) {
        // Server already has an equal or newer version: keep it.
        continue;
      }
      await db.syncRecord.upsert({
        where: {
          userId_entity_recordId: {
            userId: user.id,
            entity: change.entity,
            recordId: change.recordId,
          },
        },
        create: {
          userId: user.id,
          entity: change.entity,
          recordId: change.recordId,
          payload: change.payload,
          updatedAt: incomingAt,
          deleted: change.deleted ?? false,
        },
        update: {
          payload: change.payload,
          updatedAt: incomingAt,
          deleted: change.deleted ?? false,
        },
      });
    } catch {
      // A single bad record must not fail the whole sync.
    }
  }

  // PULL: everything updated after the client's cursor.
  let rows;
  try {
    rows = await db.syncRecord.findMany({
      where: {
        userId: user.id,
        ...(since ? { updatedAt: { gt: since } } : {}),
      },
      orderBy: { updatedAt: "asc" },
      take: 500,
      select: {
        entity: true,
        recordId: true,
        payload: true,
        updatedAt: true,
        deleted: true,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not read the sync bucket." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    serverTime: new Date().toISOString(),
    records: rows.map((r) => ({
      entity: r.entity,
      recordId: r.recordId,
      payload: r.payload,
      updatedAt: r.updatedAt.toISOString(),
      deleted: r.deleted,
    })),
  });
}

/** Wipe the server copy of a bucket. The sync code itself stays valid. */
export async function DELETE(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = z
    .object({ syncKey: z.string().min(6).max(32) })
    .safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid sync code." }, { status: 400 });
  }

  const user = await db.syncUser.findUnique({
    where: { syncKey: normalizeKey(parsed.data.syncKey) },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Unknown sync code." }, { status: 404 });
  }

  try {
    await db.syncRecord.deleteMany({ where: { userId: user.id } });
  } catch {
    return NextResponse.json(
      { error: "Could not wipe the server copy." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
