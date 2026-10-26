import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SourceType = "playlist" | "video";

interface MusicState {
  type: SourceType | null;
  id: string | null;
  volume: number;
  shuffle: boolean;
  setSource: (type: SourceType, id: string) => void;
  clearSource: () => void;
  setVolume: (v: number) => void;
  setShuffle: (s: boolean) => void;
  resetMusic: () => void;
}

/** Persisted with key "forge-music" so the last playlist survives reloads. */
export const useMusic = create<MusicState>()(
  persist(
    (set) => ({
      type: null,
      id: null,
      volume: 80,
      shuffle: false,
      setSource: (type, id) => set({ type, id }),
      clearSource: () => set({ type: null, id: null }),
      setVolume: (volume) => set({ volume }),
      setShuffle: (shuffle) => set({ shuffle }),
      resetMusic: () =>
        set({ type: null, id: null, volume: 80, shuffle: false }),
    }),
    { name: "forge-music" }
  )
);

export const RADIO_MIXES = [
  { id: "RDJGwWNGJdvx8", label: "Pop energy" },
  { id: "RDOPf0YbXqDm0", label: "Funk and groove" },
  { id: "RDkJQP7kiw5Fk", label: "Latin heat" },
  { id: "RD9bZkp7q19f0", label: "Party classics" },
  { id: "RDfJ9rUzIMcZQ", label: "Rock legends" },
  { id: "RDRgKAFK5djSk", label: "Feel good" },
] as const;

/** Accepts full YouTube URLs, bare playlist IDs or video IDs. */
export function parseSource(
  raw: string
): { type: SourceType; id: string } | null {
  const s = raw.trim();
  if (!s) return null;
  const listMatch = s.match(/[?&]list=([A-Za-z0-9_-]+)/);
  const videoMatch = s.match(
    /(?:[?&]v=|youtu\.be\/|\/shorts\/|\/embed\/)([A-Za-z0-9_-]{11})/
  );
  if (listMatch) return { type: "playlist", id: listMatch[1] };
  if (/^(PL|RD|UU|LL|FL|OL)[A-Za-z0-9_-]{10,}$/.test(s)) {
    return { type: "playlist", id: s };
  }
  if (videoMatch) return { type: "video", id: videoMatch[1] };
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return { type: "video", id: s };
  return null;
}
