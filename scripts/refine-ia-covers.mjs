/** Refine archive.org picks for specific books; print top candidates per query. */
const books = [
  ["The Psychology of Money", ["title:(\"psychology of money\") AND creator:(\"housel\")", "title:(\"psychology of money morgan housel\")"]],
  ["The Alchemist", ["title:(\"the alchemist\") AND creator:(\"coelho\")"]],
  ["How to Talk to Anyone", ["title:(\"how to talk to anyone\") AND creator:(\"lowndes\")"]],
  ["12 Rules for Life", ["title:(\"12 rules for life\") AND creator:(\"peterson\")"]],
  ["The Subtle Art of Not Giving a F*ck", ["title:(\"subtle art of not giving\") AND creator:(\"manson\")"]],
  ["How to Win Friends and Influence People", ["title:(\"how to win friends and influence people\") AND creator:(\"carnegie\")"]],
  ["Four Thousand Weeks", ["title:(\"four thousand weeks\")", "title:(\"four thousand weeks\") AND creator:(\"burkeman\")"]],
  ["The Boy, the Mole, the Fox and the Horse", ["title:(\"boy mole fox horse\")", "title:(\"the boy the mole the fox and the horse\")"]],
  ["The War of Art", ["title:(\"the war of art\") AND creator:(\"pressfield\")"]],
  ["Digital Minimalism", ["title:(\"digital minimalism\") AND creator:(\"newport\")"]],
  ["The 5 AM Club", ["title:(\"the 5 am club\") AND creator:(\"sharma\")"]],
  ["Discipline Is Destiny", ["title:(\"discipline is destiny\") AND creator:(\"holiday\")"]],
  ["The Courage to Be Disliked", ["title:(\"courage to be disliked\")"]],
  ["Indistractable", ["title:(\"indistractable\") AND creator:(\"eyal\")"]],
  ["Can't Hurt Me", ["title:(\"can't hurt me\") AND creator:(\"goggins\")"]],
  ["Man's Search for Meaning", ["title:(\"man's search for meaning\") AND creator:(\"frankl\")"]],
];

async function fetchJson(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "FORGE-library-builder/1.0" },
      signal: AbortSignal.timeout(14000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function main() {
  for (const [title, queries] of books) {
    console.log("\n== " + title);
    for (const q of queries) {
      const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(q + " AND mediatype:texts")}&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=isbn&sort%5B%5D=downloads+desc&rows=5&page=1&output=json`;
      const j = await fetchJson(url);
      const docs = j?.response?.docs ?? [];
      for (const d of docs) {
        const isbn = Array.isArray(d.isbn) ? d.isbn[0] : d.isbn;
        console.log("  ", d.identifier, "|", String(d.title ?? "").slice(0, 60), "|", isbn ?? "-");
      }
      if (docs.length === 0) console.log("   (no hits)");
      await new Promise((r) => setTimeout(r, 250));
    }
  }
}

main();
