import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SourceType = "playlist" | "video";

/** A saved video or playlist, shown in the FAVORITES list. */
export interface Favorite {
  type: SourceType;
  id: string;
  /** Human readable name, or the raw ID when no real title was available. */
  label: string;
  /** ISO timestamp of when it was saved. */
  addedAt: string;
}

interface MusicState {
  type: SourceType | null;
  id: string | null;
  volume: number;
  shuffle: boolean;
  favorites: Favorite[];
  setSource: (type: SourceType, id: string) => void;
  clearSource: () => void;
  setVolume: (v: number) => void;
  setShuffle: (s: boolean) => void;
  addFavorite: (type: SourceType, id: string, label: string) => void;
  removeFavorite: (type: SourceType, id: string) => void;
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
      favorites: [],
      setSource: (type, id) => set({ type, id }),
      clearSource: () => set({ type: null, id: null }),
      setVolume: (volume) => set({ volume }),
      setShuffle: (shuffle) => set({ shuffle }),
      // Newest first. Silently skips a type+id pair that is already saved.
      addFavorite: (type, id, label) =>
        set((s) => {
          if (s.favorites.some((f) => f.type === type && f.id === id)) {
            return s;
          }
          const entry: Favorite = {
            type,
            id,
            label: label.trim() || id,
            addedAt: new Date().toISOString(),
          };
          return { favorites: [entry, ...s.favorites] };
        }),
      removeFavorite: (type, id) =>
        set((s) => ({
          favorites: s.favorites.filter(
            (f) => !(f.type === type && f.id === id)
          ),
        })),
      resetMusic: () =>
        set({
          type: null,
          id: null,
          volume: 80,
          shuffle: false,
          favorites: [],
        }),
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
