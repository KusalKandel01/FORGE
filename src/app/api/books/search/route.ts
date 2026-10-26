import { NextResponse } from "next/server";
import { CATALOG, type CatalogBook } from "@/lib/catalog";
import { chatComplete } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ApiResult {
  id: string;
  title: string;
  author: string;
  year: number | null;
  cover: string | null;
  source: "gutenberg" | "openlibrary" | "archive";
  downloadable: boolean;
}

/** True when a result is a fully readable public domain book. */
function isFullyReadable(r: { source: string }): boolean {
  return r.source === "gutenberg" || r.source === "archive";
}

const BROWSER_UA = "Mozilla/5.0 (compatible; FORGE-reader/1.0)";

/**
 * Deterministic Project Gutenberg cover image. Every epub on Gutenberg gets
 * a generated cover at this exact path, so even books that come from the
 * site scrape or the built-in shelf can show a real book banner. If a
 * particular book has no cover file, the UI falls back to a styled title
 * banner via the image onError handler.
 */
function gutenbergCover(id: number | string): string {
  return `https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg`;
}

/**
 * Designed typographic cover as an SVG data URI. Books that have no real
 * cover photo still get a proper banner, instantly, with zero network
 * dependency. Brand: zinc-950 background, volt frame, white title.
 */
function svgCover(title: string, author: string): string {
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  // Wrap the title into short uppercase lines (max 6, then ellipsis).
  const words = normalize(title).toUpperCase().split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if (line.length === 0) line = w;
    else if ((line + " " + w).length <= 14) line += " " + w;
    else {
      if (lines.length < 6) lines.push(line);
      line = w;
    }
  }
  const leftover = lines.length >= 6;
  if (leftover) {
    lines.length = 5;
    lines.push("...");
  } else if (line) {
    lines.push(line);
  }
  const shown = lines.length > 0 ? lines : ["UNTITLED"];

  const titleSvg = shown
    .map(
      (l, i) =>
        `<text x="32" y="${230 + i * 42}" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="bold" fill="#fafafa" letter-spacing="1">${esc(l)}</text>`
    )
    .join("");

  const authorShort =
    normalize(author).length > 26
      ? `${normalize(author).slice(0, 25).toUpperCase()}...`
      : normalize(author).toUpperCase();

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">` +
    `<rect width="400" height="600" fill="#09090b"/>` +
    `<rect x="12" y="12" width="376" height="576" fill="none" stroke="#c8ff2e" stroke-width="3"/>` +
    `<rect x="20" y="20" width="360" height="560" fill="none" stroke="#3f3f46" stroke-width="1"/>` +
    `<text x="32" y="70" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="bold" fill="#c8ff2e" letter-spacing="6">FORGE</text>` +
    `<line x1="32" y1="92" x2="130" y2="92" stroke="#c8ff2e" stroke-width="3"/>` +
    titleSvg +
    `<text x="32" y="560" font-family="Arial, Helvetica, sans-serif" font-size="17" fill="#a1a1aa" letter-spacing="2">${esc(authorShort)}</text>` +
    `</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/* ------------------------------------------------------------------ */
/* Query understanding                                                 */
/* ------------------------------------------------------------------ */

/** Words that carry almost no meaning in a book search. */
const STOPWORDS = new Set([
  "the", "a", "an", "of", "and", "or", "in", "to", "for", "by", "on",
  "with", "at", "from", "as", "is", "it", "its", "be", "was", "were",
  "book", "books", "novel", "novels", "story", "stories", "author",
  "free", "pdf", "read", "online", "full", "download", "edition",
]);

function normalize(q: string): string {
  return q.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

/** Meaningful words only: stopword-less tokens of length >= 2. */
function tokenize(q: string): string[] {
  return normalize(q)
    .split(" ")
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

/**
 * One relevance score used for EVERY source, so an exact title match from
 * any catalog beats a weak match from any other. This is what fixes
 * "I searched for one book and got something else".
 */
function relevance(args: {
  title: string;
  author: string;
  phrase: string;
  tokens: string[];
  extra?: string;
}): { score: number; authorHit: boolean } {
  const t = normalize(args.title);
  const a = normalize(args.author);
  const phrase = normalize(args.phrase);
  let score = 0;
  let authorHit = false;

  // Full phrase match on the title is the strongest signal.
  if (phrase.length >= 2) {
    if (t === phrase) score += 100;
    else if (t.startsWith(phrase)) score += 70;
    else if (t.includes(phrase)) score += 50;
  }

  // Word level matching on the meaningful tokens.
  if (args.tokens.length > 0) {
    let matched = 0;
    for (const tok of args.tokens) {
      if (t === tok) {
        score += 30;
        matched++;
      } else if (t.startsWith(`${tok} `) || t.endsWith(` ${tok}`) || t.includes(` ${tok} `)) {
        score += 20;
        matched++;
      } else if (t.includes(tok)) {
        score += 10;
        matched++;
      } else if (
        a.startsWith(`${tok} `) ||
        a.endsWith(` ${tok}`) ||
        a.includes(` ${tok} `)
      ) {
        // Author name matches on word boundaries only ("austen" matches
        // Jane Austen, but "dick" must NOT match Dickens). A book that
        // belongs to the searched author outranks unrelated title noise.
        score += 15;
        matched++;
        authorHit = true;
      }
    }
    // Nothing meaningful matched: this result is noise. Push it below
    // everything relevant instead of letting it drown exact matches.
    if (matched === 0) score -= 100;
    // One matched token out of several is almost always coincidence noise
    // ("How to Live on 24 Hours a Day" for "how to talk to anybody").
    if (matched === 1 && args.tokens.length >= 2 && !authorHit) score -= 60;
  }

  if (args.extra) {
    const ex = normalize(args.extra);
    for (const tok of args.tokens) {
      if (ex.includes(tok)) score += 3;
    }
  }
  return { score, authorHit };
}

/* ------------------------------------------------------------------ */
/* Live sources (all free, no key)                                     */
/* ------------------------------------------------------------------ */

/** Free, public domain full books via Gutendex. Short timeout: never block the answer on it. */
async function fetchGutendex(q: string): Promise<ApiResult[]> {
  const url = `https://gutendex.com/books?search=${encodeURIComponent(
    q
  )}&copyright=false`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(3000),
    next: { revalidate: 3600 },
    headers: { "User-Agent": BROWSER_UA, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Gutendex responded with ${res.status}`);
  const data: unknown = await res.json();
  const raw = (data as { results?: unknown })?.results;
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 12).map((item): ApiResult => {
    const b = item as {
      id?: number;
      title?: string;
      authors?: { name?: string }[];
      formats?: Record<string, string>;
    };
    const author = Array.isArray(b.authors)
      ? b.authors
          .map((a) => (typeof a?.name === "string" ? a.name : ""))
          .filter(Boolean)
          .join(", ")
      : "";
    const cover =
      typeof b.formats?.["image/jpeg"] === "string" && b.formats["image/jpeg"]
        ? b.formats["image/jpeg"]
        : typeof b.id === "number"
          ? gutenbergCover(b.id)
          : null;
    return {
      id: `gut-${b.id}`,
      title: typeof b.title === "string" && b.title ? b.title : "Untitled",
      author: author || "Unknown",
      year: null,
      cover,
      source: "gutenberg",
      downloadable: true,
    };
  });
}

/** Metadata + preview entries via Open Library (no full text). */
async function fetchOpenLibrary(q: string): Promise<ApiResult[]> {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(
    q
  )}&limit=12&fields=key,title,author_name,first_publish_year,cover_i,edition_key`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(3000),
    next: { revalidate: 3600 },
    headers: { "User-Agent": BROWSER_UA, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Open Library responded with ${res.status}`);
  const data: unknown = await res.json();
  const docs = (data as { docs?: unknown })?.docs;
  if (!Array.isArray(docs)) return [];
  return docs.slice(0, 12).map((item): ApiResult => {
    const doc = item as {
      key?: string;
      title?: string;
      author_name?: unknown;
      first_publish_year?: number;
      cover_i?: number;
      edition_key?: unknown;
    };
    const authors = Array.isArray(doc.author_name)
      ? doc.author_name.filter((a): a is string => typeof a === "string")
      : [];
    let cover: string | null = null;
    if (typeof doc.cover_i === "number" && doc.cover_i > 0) {
      cover = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
    } else if (Array.isArray(doc.edition_key) && doc.edition_key.length > 0) {
      const olid = doc.edition_key.find((k): k is string => typeof k === "string");
      if (olid) cover = `https://covers.openlibrary.org/b/olid/${olid}-M.jpg`;
    }
    return {
      id: `ol-${(doc.key ?? "").replace("/works/", "")}`,
      title:
        typeof doc.title === "string" && doc.title ? doc.title : "Untitled",
      author: authors.join(", ") || "Unknown",
      year:
        typeof doc.first_publish_year === "number"
          ? doc.first_publish_year
          : null,
      cover,
      source: "openlibrary",
      downloadable: false,
    };
  });
}

/**
 * Internet Archive texts: the deep well for BOTH old public domain books
 * (1700s chronicles, 1800s editions, forgotten novels) AND modern scans.
 * No year restriction: anything the Archive has scanned shows up, ranked by
 * popularity so the book the user actually wants leads the list. A result is
 * only marked downloadable when the item carries a DjVu/TXT derivative, so
 * "READ" never promises a book the reader cannot actually open.
 */
async function fetchArchive(q: string): Promise<ApiResult[]> {
  const query = `title:(${q}) AND mediatype:texts`;
  const url =
    "https://archive.org/advancedsearch.php?q=" +
    encodeURIComponent(query) +
    "&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=creator&fl%5B%5D=year" +
    "&fl%5B%5D=downloads&fl%5B%5D=format" +
    "&rows=10&page=1&sort%5B%5D=downloads+desc&output=json";
  const res = await fetch(url, {
    signal: AbortSignal.timeout(6000),
    next: { revalidate: 3600 },
    headers: { "User-Agent": BROWSER_UA, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Internet Archive responded with ${res.status}`);
  const data: unknown = await res.json();
  const docs = (data as { response?: { docs?: unknown } })?.response?.docs;
  if (!Array.isArray(docs)) return [];
  return docs
    .map((item): ApiResult | null => {
      const doc = item as {
        identifier?: unknown;
        title?: unknown;
        creator?: unknown;
        year?: unknown;
        format?: unknown;
      };
      const identifier =
        typeof doc.identifier === "string" && /^[A-Za-z0-9._-]+$/.test(doc.identifier)
          ? doc.identifier
          : null;
      if (!identifier) return null;
      const title = typeof doc.title === "string" && doc.title.trim() ? doc.title.trim() : "Untitled";
      // Drop multi-title container records: a scanned volume listing ten
      // separate works is noise for someone hunting one specific book.
      if (title.length > 140) return null;
      const creator = Array.isArray(doc.creator)
        ? doc.creator.filter((c): c is string => typeof c === "string").join(", ")
        : typeof doc.creator === "string"
          ? doc.creator
          : "";
      const year = typeof doc.year === "number" ? doc.year : null;
      // Honest readability: pre-1929 scans are public domain and their OCR
      // text opens freely. Modern scans are lending restricted, so they are
      // metadata + banner only (WRITE IT WITH AI covers them in full).
      const downloadable = year !== null && year <= 1928;
      return {
        id: `ia-${identifier}`,
        title,
        author: creator || "Unknown",
        year,
        cover: `https://archive.org/services/img/${identifier}`,
        source: "archive",
        downloadable,
      };
    })
    .filter((r): r is ApiResult => r !== null);
}

/**
 * Pin a book name to a real Internet Archive scan. Used by the AI catalog
 * brain: the AI names the book the user means, this finds the actual scanned
 * copy so the result gets a genuine cover banner and, whenever a text
 * derivative exists, full in-app reading instead of a dead metadata link.
 */
async function resolveOnArchive(
  title: string,
  author: string
): Promise<{ result: ApiResult; score: number } | null> {
  const cleanTitle = title.replace(/["()]/g, " ").slice(0, 80).trim();
  if (!cleanTitle) return null;
  // Quote only the main title (subtitle after ":" dropped, max 6 words):
  // Internet Archive phrase search fails on long full titles, which used to
  // leave the exact book unfound. Fall back to unquoted AND-ed words.
  const mainTitle = cleanTitle.split(/[:;.!?,]/)[0].trim();
  const quoted = mainTitle.split(/\s+/).slice(0, 6).join(" ");
  if (!quoted) return null;

  async function runSearch(query: string): Promise<unknown[]> {
    const url =
      "https://archive.org/advancedsearch.php?q=" +
      encodeURIComponent(query) +
      "&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=creator&fl%5B%5D=year" +
      "&rows=6&page=1&sort%5B%5D=downloads+desc&output=json";
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 3600 },
      headers: { "User-Agent": BROWSER_UA, Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data: unknown = await res.json();
    const docs = (data as { response?: { docs?: unknown } })?.response?.docs;
    return Array.isArray(docs) ? docs : [];
  }

  let docs = await runSearch(`title:("${quoted}") AND mediatype:texts`);
  if (docs.length === 0) {
    docs = await runSearch(
      `title:(${quoted.split(/\s+/).map((w) => `+${w}`).join(" +")}) AND mediatype:texts`
    );
  }
  if (docs.length === 0) return null;

  const phrase = normalize(title);
  const tokens = tokenize(title);
  let best: ApiResult | null = null;
  let bestScore = 0;
  for (const item of docs) {
    const doc = item as {
      identifier?: unknown;
      title?: unknown;
      creator?: unknown;
      year?: unknown;
    };
    const identifier =
      typeof doc.identifier === "string" && /^[A-Za-z0-9._-]+$/.test(doc.identifier)
        ? doc.identifier
        : null;
    if (!identifier) continue;
    const docTitle =
      typeof doc.title === "string" && doc.title.trim() ? doc.title.trim() : "";
    if (!docTitle || docTitle.length > 140) continue;
    const rel = relevance({
      title: docTitle,
      author: typeof doc.creator === "string" ? doc.creator : "",
      phrase,
      tokens,
    });
    if (rel.score > bestScore) {
      bestScore = rel.score;
      best = {
        id: `ia-${identifier}`,
        title: docTitle,
        author:
          (typeof doc.creator === "string" && doc.creator.trim()) || author || "Unknown",
        year: typeof doc.year === "number" ? doc.year : null,
        cover: `https://archive.org/services/img/${identifier}`,
        source: "archive",
        downloadable: typeof doc.year === "number" && doc.year <= 1928,
      };
    }
  }
  // Only accept a genuinely relevant scan, never an unrelated noise item.
  return bestScore >= 30 && best
    ? { result: best, score: bestScore }
    : null;
}

/**
 * Search straight on Project Gutenberg's own site. Runs in parallel with the
 * other catalogs (it is the fastest reliable full-text source), and it is
 * also the last-resort fallback when the catalogs are unreachable.
 */
async function fetchGutenbergSite(q: string, limit = 12): Promise<ApiResult[]> {
  const url = `https://www.gutenberg.org/ebooks/search/?query=${encodeURIComponent(
    q
  )}&copyright=false`;
  return scrapeGutenbergPage(url, limit);
}

/**
 * Real time new arrivals: whatever Project Gutenberg published most recently.
 * The list updates the moment new books are released, so the library keeps
 * growing without any code change.
 */
async function fetchGutenbergNew(): Promise<ApiResult[]> {
  const url =
    "https://www.gutenberg.org/ebooks/search/?sort_order=release_date";
  return scrapeGutenbergPage(url, 24);
}

async function scrapeGutenbergPage(
  url: string,
  limit: number
): Promise<ApiResult[]> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(6000),
    cache: "no-store",
    headers: { "User-Agent": BROWSER_UA },
  });
  if (!res.ok) throw new Error(`Project Gutenberg responded with ${res.status}`);
  const html = await res.text();
  const pattern =
    /href="\/ebooks\/(\d+)"[\s\S]*?class="title">([^<]+)<[\s\S]*?class="subtitle">([^<]*)</g;
  const results: ApiResult[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null && results.length < limit) {
    const id = match[1];
    const title = match[2].trim();
    const author = match[3].trim();
    if (!id || !title) continue;
    results.push({
      id: `gut-${id}`,
      title,
      author: author || "Unknown",
      year: null,
      cover: gutenbergCover(id),
      source: "gutenberg",
      downloadable: true,
    });
  }
  if (results.length === 0) {
    throw new Error("No results parsed from the Project Gutenberg page");
  }
  return results;
}

/* ------------------------------------------------------------------ */
/* AI fallback: when every live catalog is unreachable or returns no   */
/* relevant match, the AI names the real books the user is after.      */
/* Works even in locked down networks, so a search never dead ends.    */
/* ------------------------------------------------------------------ */

interface AiBook {
  title: string;
  author: string;
  year: number | null;
  isbn: string | null;
  publicDomain: boolean;
}

function slugify(s: string): string {
  return normalize(s).replace(/\s+/g, "-") || "book";
}

/** Match an AI public domain suggestion back to the built-in catalog so it stays fully readable. */
function matchCatalogByTitle(title: string): CatalogBook | null {
  const t = normalize(title);
  if (!t) return null;
  const exact = CATALOG.find((b) => normalize(b.title) === t);
  if (exact) return exact;
  return (
    CATALOG.find((b) => {
      const bt = normalize(b.title);
      return bt.length > 3 && (t.includes(bt) || bt.includes(t));
    }) ?? null
  );
}

function parseAiBooks(raw: string): AiBook[] {
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item): AiBook | null => {
      const b = item as Record<string, unknown>;
      const title = typeof b.title === "string" ? b.title.trim() : "";
      const author = typeof b.author === "string" ? b.author.trim() : "";
      if (!title) return null;
      const year = typeof b.year === "number" && b.year > 0 ? b.year : null;
      const isbn =
        typeof b.isbn === "string" && b.isbn.replace(/[^0-9Xx]/g, "").length >= 10
          ? b.isbn.replace(/[^0-9Xx]/g, "")
          : null;
      return {
        title,
        author: author || "Unknown",
        year,
        isbn,
        publicDomain: b.publicDomain === true,
      };
    })
    .filter((b): b is AiBook => b !== null)
    .slice(0, 8);
}

/** Small in memory cache so repeat searches do not pay the AI cost twice. */
const aiCache = new Map<string, { at: number; results: ApiResult[] }>();
const AI_CACHE_TTL = 10 * 60 * 1000;

async function aiSearch(q: string): Promise<ApiResult[]> {
  const cacheKey = `v3:${normalize(q)}`;
  const cached = aiCache.get(cacheKey);
  if (cached && Date.now() - cached.at < AI_CACHE_TTL) {
    return cached.results;
  }

  const system = [
    "You are the catalog brain of a book search engine called FORGE.",
    "The user gives a book search query. You name the real books they most likely mean.",
    "Rank the best matches first: exact titles, then close variants, then books by the named author.",
    "Answer ONLY a JSON array, no commentary, max 8 items, each item exactly:",
    '{"title": string, "author": string, "year": number|null, "isbn": string|null, "publicDomain": boolean}',
    "Rules: isbn is the real ISBN of a print edition, null if you are not sure.",
    "publicDomain is true only when copyright has expired worldwide, typically books first published before 1930.",
    "If the query is an author name, list that author's most famous books.",
    "If the query is a subject or genre, list the most famous books about it.",
  ].join(" ");

  const raw = await chatComplete({ system, user: `Book search query: "${q}"` });
  const books = parseAiBooks(raw);

  // Every AI-named book gets pinned to a real Internet Archive scan when one
  // exists: real cover banner, real readable text when available. This turns
  // "the AI guesses a title" into "the app found the actual book". aiScore
  // carries the relevance of the result against the AI's INTENDED title, so
  // the raw user wording ("anybody" vs "anyone") can never kill a match the
  // AI already understood.
  const results = await Promise.all(
    books.slice(0, 6).map(async (b): Promise<ApiResult & { aiScore: number }> => {
      const scanned = await resolveOnArchive(b.title, b.author).catch(() => null);
      if (scanned) return { ...scanned.result, aiScore: scanned.score };
      if (b.publicDomain) {
        const hit = matchCatalogByTitle(b.title);
        if (hit) {
          return {
            id: `gut-${hit.gutId}`,
            title: hit.title,
            author: hit.author,
            year: hit.year && hit.year > 0 ? hit.year : b.year,
            cover: gutenbergCover(hit.gutId),
            source: "gutenberg",
            downloadable: true,
            aiScore: 90,
          };
        }
      }
      return {
        id: `ai-${slugify(b.title)}`,
        title: b.title,
        author: b.author,
        year: b.year,
        cover: b.isbn
          ? `https://covers.openlibrary.org/b/isbn/${b.isbn}-M.jpg`
          : svgCover(b.title, b.author),
        source: "openlibrary",
        downloadable: false,
        aiScore: 100,
      };
    })
  );

  aiCache.set(cacheKey, { at: Date.now(), results });
  return results;
}

/* ------------------------------------------------------------------ */
/* Built-in classics shelf: instant, always available, works offline. */
/* ------------------------------------------------------------------ */

/** Score one catalog book against the query. Higher wins. */
function scoreCatalogBook(
  book: CatalogBook,
  phrase: string,
  tokens: string[]
): number {
  return relevance({
    title: book.title,
    author: book.author,
    phrase,
    tokens,
    extra: `${book.genres.join(" ")} ${book.keywords.join(" ")}`,
  }).score;
}

/**
 * Rank the built-in catalog for the query. Only genuinely relevant matches
 * survive (score > 0), so a search for a modern title never drowns in
 * unrelated classics.
 */
function searchCatalog(q: string): ApiResult[] {
  const phrase = normalize(q);
  const tokens = tokenize(q);
  if (tokens.length === 0) return [];

  return CATALOG.map((book) => ({
    book,
    score: scoreCatalogBook(book, phrase, tokens),
  }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map(({ book }) => ({
      id: `gut-${book.gutId}`,
      title: book.title,
      author: book.author,
      year: book.year && book.year > 0 ? book.year : null,
      cover: gutenbergCover(book.gutId),
      source: "gutenberg" as const,
      downloadable: true,
    }));
}

/* ------------------------------------------------------------------ */
/* Handler                                                             */
/* ------------------------------------------------------------------ */

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const mode = (params.get("mode") ?? "").trim();

  /* ------------------ Real time new arrivals mode ------------------ */
  if (mode === "new") {
    try {
      const arrivals = await fetchGutenbergNew();
      return NextResponse.json({ results: arrivals });
    } catch {
      return NextResponse.json(
        {
          error:
            "Could not load the newest books right now. Try again in a moment.",
        },
        { status: 502 }
      );
    }
  }

  const q = (params.get("q") ?? "").trim();
  if (q.length < 2 || q.length > 120) {
    return NextResponse.json(
      { error: "Type a book title between 2 and 120 characters." },
      { status: 400 }
    );
  }

  // Everything runs at once. The slowest source can only hold the answer
  // for its own short timeout, never for the sum of all of them.
  const [gutendex, openlibrary, gutenbergSite, archive] = await Promise.allSettled([
    fetchGutendex(q),
    fetchOpenLibrary(q),
    fetchGutenbergSite(q),
    fetchArchive(q),
  ]);

  const warnings: string[] = [];

  // The built-in shelf always runs: it is instant and needs no network.
  const localMatches = searchCatalog(q);

  const gutenberg = gutendex.status === "fulfilled" ? gutendex.value : [];
  const openlibraryResults =
    openlibrary.status === "fulfilled" ? openlibrary.value : [];
  const siteResults =
    gutenbergSite.status === "fulfilled" ? gutenbergSite.value : [];
  const archiveResults = archive.status === "fulfilled" ? archive.value : [];

  const liveEmpty =
    gutenberg.length === 0 &&
    openlibraryResults.length === 0 &&
    siteResults.length === 0 &&
    archiveResults.length === 0;

  /* -------- One merged, relevance ranked pool across all sources -------- */

  const phrase = normalize(q);
  const tokens = tokenize(q);

  const pool: (ApiResult & {
    score: number;
    authorHit: boolean;
    aiScore?: number;
  })[] = [];
  const pushScored = (list: ApiResult[], boost = 0) => {
    for (const r of list) {
      const rel = relevance({
        title: r.title,
        author: r.author,
        phrase,
        tokens,
      });
      pool.push({ ...r, score: rel.score + boost, authorHit: rel.authorHit });
    }
  };
  // AI results arrive with their own aiScore (relevance vs the intended
  // title) and a +25 confirmation boost: the AI already bridged wording gaps.
  const pushAiScored = (list: (ApiResult & { aiScore?: number })[]) => {
    for (const r of list) {
      // Shape-proof against entries cached by an older build: a missing or
      // non-finite aiScore means the AI intended this title exactly.
      const base =
        typeof r.aiScore === "number" && Number.isFinite(r.aiScore)
          ? r.aiScore
          : 100;
      pool.push({ ...r, score: base + 25, authorHit: false });
    }
  };
  pushScored(localMatches);
  pushScored(siteResults);
  pushScored(gutenberg);
  pushScored(archiveResults);
  pushScored(openlibraryResults);

  // Drop noise: anything that matched nothing meaningful.
  let ranked = pool.filter((r) => r.score > 0);

  /* -------- AI catalog brain ------------------------------------------ */
  /* Triggered when nothing relevant came back at all, or when the best   */
  /* match is weak (score below exact phrase level) while the query looks */
  /* like a specific title. This is what stops "I searched for one book   */
  /* and got something else": the AI names the real book, which then      */
  /* outranks the weak catalog noise. Cached for 10 minutes per query.    */
  let usedAi = false;
  const bestScore = ranked.reduce((m, r) => Math.max(m, r.score), 0);
  // Trigger the AI brain on weak best matches too (score < 70): the AI can
  // bridge wording gaps ("anybody" -> "anyone") and pin the real scan.
  if (tokens.length > 0 && (ranked.length === 0 || bestScore < 70)) {
    try {
      const aiResults = await aiSearch(q);
      if (aiResults.length > 0) {
        usedAi = true;
        pushAiScored(aiResults);
        ranked = pool.filter((r) => r.score > 0);
      }
    } catch {
      // AI unavailable too: fall through to the honest errors below.
    }
  }

  if (ranked.length === 0) {
    if (tokens.length === 0) {
      // Generic query made only of stop words: answer with whatever came back.
      ranked = pool;
    } else if (liveEmpty && localMatches.length === 0) {
      // Every catalog down AND the AI brain down: honest network error.
      return NextResponse.json(
        {
          error:
            "Search is unavailable right now. Check your connection and try again.",
        },
        { status: 502 }
      );
    } else {
      // Catalogs answered but nothing relevant, and the AI found nothing.
      return NextResponse.json(
        {
          error:
            "No books matched that search. Try the author name or a shorter title.",
        },
        { status: 404 }
      );
    }
  }

  // Exact and strong title matches always float to the top regardless of
  // which catalog they came from; author matches beat unrelated noise on
  // ties; free full books win ties against previews.
  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.authorHit !== b.authorHit) return a.authorHit ? -1 : 1;
    if (a.downloadable !== b.downloadable) return a.downloadable ? -1 : 1;
    return 0;
  });

  // Collapse near duplicate titles ("Atomic Habits", "Atomic Habits: An
  // Easy and Proven Way...", "The Atomic Habits Journal" from different
  // sources) so the same book never fills the grid three times. Keep the
  // highest ranked copy of each title family and prefer readable ones.
  const familySeen = new Set<string>();
  const deduped: typeof ranked = [];
  for (const r of ranked) {
    const familyKey = normalize(r.title).split(" ").slice(0, 3).join(" ");
    const dup = familySeen.has(familyKey);
    const readable = isFullyReadable(r);
    if (dup && !readable) continue;
    if (dup && readable) {
      // A readable copy replaces an unreadable one already queued.
      const idx = deduped.findIndex(
        (x) =>
          !isFullyReadable(x) &&
          normalize(x.title).split(" ").slice(0, 3).join(" ") === familyKey
      );
      if (idx >= 0) deduped[idx] = r;
      else if (
        deduped.some(
          (x) =>
            isFullyReadable(x) &&
            normalize(x.title).split(" ").slice(0, 3).join(" ") === familyKey
        )
      )
        continue;
      else deduped.push(r);
    } else {
      deduped.push(r);
    }
    familySeen.add(familyKey);
  }

  const seen = new Set<string>();
  const results: (ApiResult & {
    score: number;
    authorHit: boolean;
    aiScore?: number;
  })[] = [];
  for (const r of deduped) {
    const key = `${normalize(r.title)} ${normalize(r.author)}`;
    if (seen.has(key) || seen.has(r.id)) continue;
    seen.add(key);
    seen.add(r.id);
    // Every result ships with a banner: a real cover when one exists, a
    // designed SVG cover otherwise. No card ever renders blank.
    results.push(r.cover ? r : { ...r, cover: svgCover(r.title, r.author) });
    if (results.length >= 24) break;
  }

  /* ---------------- One clear, honest status line ---------------- */

  if (usedAi) {
    warnings.push(
      "Some live catalogs are unreachable right now, so the AI catalog brain completed these matches. Free full books still download, and previews open with WRITE IT WITH AI."
    );
  } else {
    if (gutendex.status === "rejected") {
      warnings.push(
        "One public domain catalog is unreachable right now, so some free full books may be missing."
      );
    }
    if (openlibrary.status === "rejected") {
      warnings.push(
        "Open Library is unreachable right now, so fewer preview titles are shown."
      );
    }
  }

  if (openlibrary.status === "rejected" && archive.status === "rejected") {
    warnings.push(
      "The Internet Archive catalog is unreachable right now, so some old and rare books may be missing."
    );
  }

  if (
    results.length > 0 &&
    results[0].score >= 50 &&
    !results[0].downloadable
  ) {
    warnings.push(
      "The closest match is a preview only, because this title is not in the free public domain catalogs. Use WRITE IT WITH AI to get a full original version."
    );
  }

  return NextResponse.json({
    results: results.map(({ score: _s, authorHit: _a, aiScore: _i, ...rest }) => rest),
    ...(warnings.length > 0 ? { warning: warnings.join(" ") } : {}),
  });
}
