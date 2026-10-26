import { NextResponse } from "next/server";
import { findRealVideos } from "@/lib/real-media";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/media/video?q=<topic>
 * Real YouTube videos for a topic, found with web search. Returns up to
 * three embeddable watch ids plus a YouTube results-page URL that always
 * works even when every embed is blocked.
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

  const lookup = await findRealVideos(q);
  return NextResponse.json(lookup);
}
