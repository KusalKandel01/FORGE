import { NextResponse } from "next/server";
import { findRealImages } from "@/lib/real-media";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/media/image?q=<natural language>&count=1..8
 * Real photographs found on the open web, re-hosted on a reachable OSS
 * CDN. Cached in memory + MediaCache table, so a repeated query is instant.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json(
      { error: "Give the media finder something to look for." },
      { status: 400 }
    );
  }
  const rawCount = parseInt(searchParams.get("count") ?? "4", 10);
  const count = Math.min(8, Math.max(1, Number.isNaN(rawCount) ? 4 : rawCount));
  // skip lets the client page through the found photos ("find another
  // picture") without hammering the search API again.
  const rawSkip = parseInt(searchParams.get("skip") ?? "0", 10);
  const skip = Math.min(8, Math.max(0, Number.isNaN(rawSkip) ? 0 : rawSkip));

  const found = await findRealImages(q, Math.min(10, count + skip));
  const images = found.slice(skip);
  return NextResponse.json({ images });
}
