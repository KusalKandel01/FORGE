/**
 * Shared JSON helpers for AI routes.
 *
 * Models return slightly-off JSON often: code fences, prose around the
 * object, quiz options with 3 or 5 entries, out of range indices, string
 * numbers, broken escaping. Routes that trust the raw output randomly 502,
 * which is exactly what made the app feel broken. Every helper here is
 * defensive.
 */

import { jsonrepair } from "jsonrepair";

/** Pull the JSON object out of a model response: strips fences, slices to the outermost braces. */
export function extractJsonObject(text: string): unknown {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();
  }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object in response");
  }
  const slice = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch {
    // Models break JSON in many ways: unescaped newlines, trailing commas,
    // smart quotes, truncated output. jsonrepair fixes all of those.
    return JSON.parse(jsonrepair(slice));
  }
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function asStringArray(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim().slice(0, 500))
    .slice(0, max);
}

/** Force a quiz question to exactly 4 options, one valid answerIndex. */
export function normalizeQuizQuestion(raw: unknown):
  | {
      question: string;
      options: string[];
      answerIndex: number;
      explanation: string;
    }
  | null {
  const rec = asRecord(raw);
  if (!rec) {
    // Model returned a plain string question: unusable without options.
    return null;
  }
  const question =
    typeof rec.question === "string"
      ? rec.question.trim()
      : typeof rec.q === "string"
        ? rec.q.trim()
        : "";
  if (question.length === 0) return null;

  let optionsRaw: unknown[] = Array.isArray(rec.options)
    ? rec.options
    : Array.isArray(rec.choices)
      ? rec.choices
      : [];
  // Some models return options as an object map {A: ..., B: ...}.
  if (optionsRaw.length === 0 && rec.options && typeof rec.options === "object") {
    optionsRaw = Object.values(rec.options as Record<string, unknown>);
  }
  let options = optionsRaw
    .map((o) => {
      if (typeof o === "string" && o.trim().length > 0) return o.trim().slice(0, 200);
      if (typeof o === "number" || typeof o === "boolean") return String(o);
      const inner = asRecord(o);
      if (inner && typeof inner.text === "string") return inner.text.trim().slice(0, 200);
      return null;
    })
    .filter((o): o is string => o !== null);
  if (options.length < 2) return null;

  // Pad to exactly 4, or trim to exactly 4.
  const filler = [
    "None of the above",
    "Cannot be determined",
    "All of the above",
    "Not enough information",
  ];
  let fill = 0;
  while (options.length < 4 && fill < filler.length) {
    if (!options.includes(filler[fill])) options.push(filler[fill]);
    fill++;
  }
  options.length = 4;

  let answerIndex = -1;
  if (typeof rec.answerIndex === "number" && Number.isFinite(rec.answerIndex)) {
    answerIndex = Math.round(rec.answerIndex);
  } else if (typeof rec.correctIndex === "number") {
    answerIndex = Math.round(rec.correctIndex);
  } else if (typeof rec.answer === "number") {
    answerIndex = Math.round(rec.answer);
  } else if (typeof rec.answer === "string") {
    const ans = rec.answer.trim();
    const byText = options.findIndex((o) => o.toLowerCase() === ans.toLowerCase());
    if (byText >= 0) answerIndex = byText;
    else if (/^[a-dA-D]$/.test(ans)) answerIndex = ans.toLowerCase().charCodeAt(0) - 97;
    else {
      const asNum = parseInt(ans, 10);
      if (Number.isFinite(asNum)) answerIndex = asNum >= 1 && asNum <= 4 ? asNum - 1 : asNum;
    }
  }
  if (answerIndex < 0 || answerIndex > 3) answerIndex = 0;

  const explanation =
    typeof rec.explanation === "string" && rec.explanation.trim().length > 0
      ? rec.explanation.trim().slice(0, 600)
      : typeof rec.why === "string" && rec.why.trim().length > 0
        ? rec.why.trim().slice(0, 600)
        : "Review the lesson section that covers this question.";

  return { question: question.slice(0, 300), options, answerIndex, explanation };
}

/** Fix a {term, definition} pair. Accepts plain strings as term only. */
export function normalizeKeyTerm(
  raw: unknown
): { term: string; definition: string } | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const term =
    typeof rec.term === "string"
      ? rec.term.trim()
      : typeof rec.name === "string"
        ? rec.name.trim()
        : "";
  const definition =
    typeof rec.definition === "string"
      ? rec.definition.trim()
      : typeof rec.meaning === "string"
        ? rec.meaning.trim()
        : "";
  if (term.length === 0 || definition.length === 0) return null;
  return { term: term.slice(0, 100), definition: definition.slice(0, 600) };
}

/** Fix a {heading, content} section. Accepts plain strings too. */
export function normalizeSection(
  raw: unknown
): { heading: string; content: string } | null {
  // Some models return sections as plain strings: accept them.
  if (typeof raw === "string" && raw.trim().length > 0) {
    const text = raw.trim();
    const firstSentence = text.split(/[.!?]/)[0].trim().slice(0, 100);
    return {
      heading: firstSentence.length > 0 ? firstSentence : "Section",
      content: text,
    };
  }
  const rec = asRecord(raw);
  if (!rec) return null;
  const heading =
    typeof rec.heading === "string"
      ? rec.heading.trim()
      : typeof rec.title === "string"
        ? rec.title.trim()
        : "";
  const content =
    typeof rec.content === "string"
      ? rec.content.trim()
      : typeof rec.body === "string"
        ? rec.body.trim()
        : typeof rec.text === "string"
          ? rec.text.trim()
          : "";
  if (heading.length === 0 || content.length === 0) return null;
  return { heading: heading.slice(0, 160), content };
}
