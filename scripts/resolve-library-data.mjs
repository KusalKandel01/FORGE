/**
 * Verify library data against reachable endpoints (gutenberg.org + Wikipedia).
 * 1) Classics: confirm each Gutenberg id really is the expected book.
 * 2) Bestsellers: pull a real ISBN from each book's Wikipedia infobox,
 *    converted to ISBN-13, for covers.openlibrary.org URLs.
 * Prints JSON to stdout.
 */

const GB_CACHE = "https://www.gutenberg.org/cache/epub/";
const WIKI = "https://en.wikipedia.org/w/api.php?action=parse&prop=wikitext&section=0&format=json&formatversion=2&page=";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchOk(url, timeoutMs = 12000) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "FORGE-library-builder/1.0" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return res;
  } catch {
    return null;
  }
}

// --- 1) Classics: id + expected title fragment ---
const classics = [
  [64317, "great gatsby"],
  [2638, "crime and punishment"],
  [110, "tess"],
  [27, "far from the madding"],
  [17396, "secret garden"],
  [514, "little women"],
  [139, "lost world"],
  [558, "thirty-nine steps"],
  [2226, "kim"],
  [160, "awakening"],
  [242, "my antonia"],
  [209, "turn of the screw"],
  [78, "tarzan"],
  [9193, "woman in white"],
  [155, "moonstone"],
  [1150, "ivanhoe"],
  [228, "last of the mohicans"],
  [1338, "fathers and sons"],
  [4517, "ethan frome"],
  [2681, "idiot"],
  [1656, "apology"],
  [3330, "analects"],
  [1037, "prince and the pauper"],
  [2301, "dead souls"],
  [23700, "canterbury"],
];

// --- 2) Bestsellers: title, author, wikipedia page candidates ---
const bestsellers = [
  ["Atomic Habits", "James Clear", ["Atomic Habits"]],
  ["The Power of Habit", "Charles Duhigg", ["The Power of Habit"]],
  ["Deep Work", "Cal Newport", ["Deep Work"]],
  ["Digital Minimalism", "Cal Newport", ["Digital Minimalism"]],
  ["The 5 AM Club", "Robin Sharma", ["The 5 AM Club"]],
  ["The Compound Effect", "Darren Hardy", ["The Compound Effect"]],
  ["Discipline Is Destiny", "Ryan Holiday", ["Discipline Is Destiny"]],
  ["The War of Art", "Steven Pressfield", ["The War of Art"]],
  ["Rich Dad Poor Dad", "Robert T. Kiyosaki", ["Rich Dad Poor Dad"]],
  ["The Millionaire Next Door", "Thomas J. Stanley", ["The Millionaire Next Door"]],
  ["The Richest Man in Babylon", "George S. Clason", ["The Richest Man in Babylon"]],
  ["I Will Teach You to Be Rich", "Ramit Sethi", ["I Will Teach You to Be Rich"]],
  ["The Psychology of Money", "Morgan Housel", ["The Psychology of Money"]],
  ["Think and Grow Rich", "Napoleon Hill", ["Think and Grow Rich"]],
  ["The Intelligent Investor", "Benjamin Graham", ["The Intelligent Investor"]],
  ["Your Money or Your Life", "Vicki Robin", ["Your Money or Your Life"]],
  ["How to Talk to Anyone", "Leil Lowndes", ["How to Talk to Anyone"]],
  ["How to Win Friends and Influence People", "Dale Carnegie", ["How to Win Friends and Influence People"]],
  ["Never Split the Difference", "Chris Voss", ["Never Split the Difference"]],
  ["Crucial Conversations", "Kerry Patterson", ["Crucial Conversations"]],
  ["Influence: The Psychology of Persuasion", "Robert B. Cialdini", ["Influence: The Psychology of Persuasion", "Influence (book)"]],
  ["The Charisma Myth", "Olivia Fox Cabane", ["The Charisma Myth"]],
  ["Difficult Conversations", "Douglas Stone", ["Difficult Conversations"]],
  ["Just Listen", "Mark Goulston", ["Just Listen"]],
  ["Thinking, Fast and Slow", "Daniel Kahneman", ["Thinking, Fast and Slow"]],
  ["Flow: The Psychology of Optimal Experience", "Mihaly Csikszentmihalyi", ["Flow (psychology)", "Flow: The Psychology of Optimal Experience"]],
  ["Mindset: The New Psychology of Success", "Carol S. Dweck", ["Mindset (book)", "Mindset: The New Psychology of Success"]],
  ["The Obstacle Is the Way", "Ryan Holiday", ["The Obstacle Is the Way"]],
  ["Ego Is the Enemy", "Ryan Holiday", ["Ego Is the Enemy"]],
  ["The Courage to Be Disliked", "Ichiro Kishimi", ["The Courage to Be Disliked"]],
  ["Four Thousand Weeks", "Oliver Burkeman", ["Four Thousand Weeks"]],
  ["Indistractable", "Nir Eyal", ["Indistractable"]],
  ["Can't Hurt Me", "David Goggins", ["Can't Hurt Me"]],
  ["The Subtle Art of Not Giving a F*ck", "Mark Manson", ["The Subtle Art of Not Giving a F*ck"]],
  ["Grit: The Power of Passion and Perseverance", "Angela Duckworth", ["Grit: The Power of Passion and Perseverance", "Grit (book)"]],
  ["Man's Search for Meaning", "Viktor E. Frankl", ["Man's Search for Meaning"]],
  ["The Alchemist", "Paulo Coelho", ["The Alchemist (novel)"]],
  ["Ikigai", "Hector Garcia", ["Ikigai"]],
  ["The Boy, the Mole, the Fox and the Horse", "Charlie Mackesy", ["The Boy, the Mole, the Fox and the Horse"]],
  ["12 Rules for Life", "Jordan B. Peterson", ["12 Rules for Life"]],
  ["Start With Why", "Simon Sinek", ["Start With Why"]],
  ["The 7 Habits of Highly Effective People", "Stephen R. Covey", ["The 7 Habits of Highly Effective People"]],
  ["Essentialism: The Disciplined Pursuit of Less", "Greg McKeown", ["Essentialism (book)", "Essentialism: The Disciplined Pursuit of Less"]],
  ["The Lean Startup", "Eric Ries", ["The Lean Startup"]],
  ["Zero to One", "Peter Thiel", ["Zero to One"]],
  ["Steal Like an Artist", "Austin Kleon", ["Steal Like an Artist"]],
  ["Show Your Work!", "Austin Kleon", ["Show Your Work!"]],
  ["The First 20 Hours", "Josh Kaufman", ["The First 20 Hours"]],
];

function isbn10to13(isbn10) {
  const core = "978" + isbn10.slice(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(core[i]) * (i % 2 === 0 ? 1 : 3);
  const check = (10 - (sum % 10)) % 10;
  return core + check;
}

function extractIsbn(wikitext) {
  const matches = [];
  const re = /isbn\s*=\s*([0-9Xx][0-9Xx\-‐-―\s]{8,20})/gi;
  let m;
  while ((m = re.exec(wikitext)) !== null) {
    const raw = m[1].replace(/[^0-9Xx]/g, "").toUpperCase();
    if (raw.length === 13 && (raw.startsWith("978") || raw.startsWith("979"))) {
      matches.push(raw);
    } else if (raw.length === 10) {
      matches.push(isbn10to13(raw));
    }
  }
  return matches[0] ?? null;
}

async function main() {
  // Classics, batches of 5
  const classicsOut = [];
  for (let i = 0; i < classics.length; i += 5) {
    const slice = classics.slice(i, i + 5);
    const settled = await Promise.all(
      slice.map(async ([id, frag]) => {
        const res = await fetchOk(`${GB_CACHE}${id}/pg${id}.txt`);
        if (!res) return { id, ok: false, title: null, author: null };
        const text = await res.text();
        const head = text.slice(0, 3000);
        const title = head.match(/^Title:\s*(.+)$/m)?.[1]?.trim() ?? null;
        const author = head.match(/^Author:\s*(.+)$/m)?.[1]?.trim() ?? null;
        const ok = Boolean(title && title.toLowerCase().includes(frag));
        return { id, ok, title, author };
      })
    );
    classicsOut.push(...settled);
  }

  // Bestseller ISBNs, batches of 6
  const coversOut = [];
  for (let i = 0; i < bestsellers.length; i += 6) {
    const slice = bestsellers.slice(i, i + 6);
    const settled = await Promise.all(
      slice.map(async ([title, author, pages]) => {
        for (const page of pages) {
          const res = await fetchOk(WIKI + encodeURIComponent(page));
          if (!res) continue;
          try {
            const j = await res.json();
            const wt = j?.parse?.wikitext ?? "";
            if (!wt) continue;
            const isbn = extractIsbn(wt);
            if (isbn) return { title, author, isbn, wiki: page };
          } catch {
            continue;
          }
          await sleep(120);
        }
        return { title, author, isbn: null, wiki: null };
      })
    );
    coversOut.push(...settled);
  }

  console.log(JSON.stringify({ classics: classicsOut, covers: coversOut }, null, 2));
}

main();
