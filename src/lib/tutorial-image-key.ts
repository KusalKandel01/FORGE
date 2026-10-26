/**
 * Stable cache key for step by step tutorial photos.
 *
 * Used by the client (IndexedDB cache in the "forge-images" database) so
 * one real web photo is reused for a given (kind, id, step, step text).
 * The text hash makes the key change if the step copy ever changes, so
 * stale photos are never shown for rewritten steps.
 */

export type TutorialImageKind = "exercise" | "skill";

/**
 * Bump when the photo lookup changes in a way that must invalidate
 * every cached photo in device IndexedDB entries.
 */
const KEY_VERSION = "v3";

/** Tiny deterministic string hash (djb2 xor variant), hex encoded. */
function hashText(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h) ^ text.charCodeAt(i);
    h = h >>> 0; // keep it uint32
  }
  return h.toString(16).padStart(8, "0");
}

export function tutorialImageKey(
  kind: TutorialImageKind,
  id: string,
  stepIndex: number,
  stepText: string
): string {
  const safeId = id.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").slice(0, 60);
  return `${KEY_VERSION}-${kind}-${safeId}-s${stepIndex}-${hashText(
    stepText.trim()
  )}`;
}
