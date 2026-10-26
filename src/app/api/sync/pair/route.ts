import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

/**
 * Pair a device with a FORGE sync bucket.
 *
 * POST without a code  -> creates a fresh bucket and returns its code.
 * POST with a code     -> validates the code so another device can link up.
 *
 * The code is the only credential (no email, no password). It is generated
 * from an unambiguous alphabet so it can be copied by hand.
 */

export const runtime = "nodejs";

const KEY_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const KEY_PATTERN = /^FORGE-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

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
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = z
    .object({ syncKey: z.string().max(32).optional() })
    .safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const requested = parsed.data.syncKey;

  if (requested) {
    const key = normalizeKey(requested);
    if (!KEY_PATTERN.test(key)) {
      return NextResponse.json(
        { error: "Sync codes look like FORGE-XXXX-XXXX." },
        { status: 400 }
      );
    }
    const user = await db.syncUser.findUnique({
      where: { syncKey: key },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json(
        { error: "No sync bucket found for that code." },
        { status: 404 }
      );
    }
    return NextResponse.json({ syncKey: key });
  }

  // Create a new bucket with a unique code.
  for (let attempt = 0; attempt < 5; attempt++) {
    const key = generateSyncKey();
    try {
      await db.syncUser.create({ data: { syncKey: key } });
      return NextResponse.json({ syncKey: key });
    } catch {
      // Code collision (astronomically rare): retry.
    }
  }

  return NextResponse.json(
    { error: "Could not create a sync bucket right now." },
    { status: 502 }
  );
}
