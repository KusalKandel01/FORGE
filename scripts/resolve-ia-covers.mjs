/**
 * Resolve each bestseller to an archive.org lending edition + cover image.
 * archive.org item covers: https://archive.org/services/img/{identifier}
 * Prints JSON to stdout.
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const books = [
  ["Atomic Habits", "James Clear"],
  ["The Power of Habit", "Charles Duhigg"],
  ["Deep Work", "Cal Newport"],
  ["Digital Minimalism", "Cal Newport"],
  ["The 5 AM Club", "Robin Sharma"],
  ["The Compound Effect", "Darren Hardy"],
  ["Discipline Is Destiny", "Ryan Holiday"],
  ["The War of Art", "Steven Pressfield"],
  ["Rich Dad Poor Dad", "Robert T. Kiyosaki"],
  ["The Millionaire Next Door", "Thomas J. Stanley"],
  ["The Richest Man in Babylon", "George S. Clason"],
  ["I Will Teach You to Be Rich", "Ramit Sethi"],
  ["The Psychology of Money", "Morgan Housel"],
  ["Think and Grow Rich", "Napoleon Hill"],
  ["The Intelligent Investor", "Benjamin Graham"],
  ["Your Money or Your Life", "Vicki Robin"],
  ["How to Talk to Anyone", "Leil Lowndes"],
  ["How to Win Friends and Influence People", "Dale Carnegie"],
  ["Never Split the Difference", "Chris Voss"],
  ["Crucial Conversations", "Kerry Patterson"],
  ["Influence: The Psychology of Persuasion", "Robert Cialdini"],
  ["The Charisma Myth", "Olivia Fox Cabane"],
  ["Difficult Conversations", "Douglas Stone"],
  ["Just Listen", "Mark Goulston"],
  ["Thinking, Fast and Slow", "Daniel Kahneman"],
  ["Flow: The Psychology of Optimal Experience", "Mihaly Csikszentmihalyi"],
  ["Mindset: The New Psychology of Success", "Carol Dweck"],
  ["The Obstacle Is the Way", "Ryan Holiday"],
  ["Ego Is the Enemy", "Ryan Holiday"],
  ["The Courage to Be Disliked", "Ichiro Kishimi"],
  ["Four Thousand Weeks", "Oliver Burkeman"],
  ["Indistractable", "Nir Eyal"],
  ["Can't Hurt Me", "David Goggins"],
  ["The Subtle Art of Not Giving a F*ck", "Mark Manson"],
  ["Grit: The Power of Passion and Perseverance", "Angela Duckworth"],
  ["Man's Search for Meaning", "Viktor Frankl"],
  ["The Alchemist", "Paulo Coelho"],
  ["Ikigai", "Hector Garcia"],
  ["The Boy, the Mole, the Fox and the Horse", "Charlie Mackesy"],
  ["12 Rules for Life", "Jordan Peterson"],
  ["Start With Why", "Simon Sinek"],
  ["The 7 Habits of Highly Effective People", "Stephen Covey"],
  ["Essentialism: The Disciplined Pursuit of Less", "Greg McKeown"],
  ["The Lean Startup", "Eric Ries"],
  ["Zero to One", "Peter Thiel"],
  ["Steal Like an Artist", "Austin Kleon"],
  ["Show Your Work!", "Austin Kleon"],
  ["The First 20 Hours", "Josh Kaufman"],
];

async function fetchJson(url, timeoutMs = 14000) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "FORGE-library-builder/1.0" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function main() {
  const out = [];
  for (let i = 0; i < books.length; i += 4) {
    const slice = books.slice(i, i + 4);
    const settled = await Promise.all(
      slice.map(async ([title, author]) => {
        const authorLast = author.split(" ").slice(-1)[0];
        const q = encodeURIComponent(
          `title:("${title}") AND creator:("${authorLast}") AND mediatype:texts`
        );
        const j = await fetchJson(
          `https://archive.org/advancedsearch.php?q=${q}&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=creator&fl%5B%5D=isbn&fl%5B%5D=lending%5Fedition&sort%5B%5D=downloads+desc&rows=4&page=1&output=json`
        );
        const docs = j?.response?.docs ?? [];
        if (docs.length === 0) {
          // retry without author constraint
          const q2 = encodeURIComponent(`title:("${title}") AND mediatype:texts`);
          const j2 = await fetchJson(
            `https://archive.org/advancedsearch.php?q=${q2}&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=isbn&sort%5B%5D=downloads+desc&rows=4&page=1&output=json`
          );
          const docs2 = j2?.response?.docs ?? [];
          if (docs2.length === 0) return { title, author, identifier: null };
          const pick = docs2[0];
          return {
            title,
            author,
            identifier: pick.identifier,
            found: pick.title,
            isbn: Array.isArray(pick.isbn) ? pick.isbn[0] : pick.isbn ?? null,
          };
        }
        const pick = docs[0];
        return {
          title,
          author,
          identifier: pick.identifier,
          found: pick.title,
          isbn: Array.isArray(pick.isbn) ? pick.isbn[0] : pick.isbn ?? null,
        };
      })
    );
    out.push(...settled);
    await sleep(300);
  }
  console.log(JSON.stringify(out, null, 2));
}

main();
