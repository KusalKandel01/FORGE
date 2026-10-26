/**
 * Resolve ISBN-13s for bestsellers by scraping the ISBN out of the standard
 * Wikipedia article HTML (the api.php endpoint rate limits, the article
 * pages usually do not). Falls back to nothing; caller fills gaps.
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const books = [
  ["Atomic Habits", ["Atomic_Habits"]],
  ["The Power of Habit", ["The_Power_of_Habit"]],
  ["Deep Work", ["Deep_Work"]],
  ["Digital Minimalism", ["Digital_Minimalism"]],
  ["The 5 AM Club", ["The_5_AM_Club"]],
  ["The Compound Effect", ["The_Compound_Effect"]],
  ["Discipline Is Destiny", ["Discipline_Is_Destiny"]],
  ["The War of Art", ["The_War_of_Art"]],
  ["Rich Dad Poor Dad", ["Rich_Dad_Poor_Dad"]],
  ["The Millionaire Next Door", ["The_Millionaire_Next_Door"]],
  ["The Richest Man in Babylon", ["The_Richest_Man_in_Babylon"]],
  ["I Will Teach You to Be Rich", ["I_Will_Teach_You_to_Be_Rich"]],
  ["The Psychology of Money", ["The_Psychology_of_Money"]],
  ["Think and Grow Rich", ["Think_and_Grow_Rich"]],
  ["The Intelligent Investor", ["The_Intelligent_Investor"]],
  ["Your Money or Your Life", ["Your_Money_or_Your_Life"]],
  ["How to Talk to Anyone", ["How_to_Talk_to_Anyone"]],
  ["How to Win Friends and Influence People", ["How_to_Win_Friends_and_Influence_People"]],
  ["Never Split the Difference", ["Never_Split_the_Difference"]],
  ["Crucial Conversations", ["Crucial_Conversations"]],
  ["Influence: The Psychology of Persuasion", ["Influence:_The_Psychology_of_Persuasion", "Influence_(book)"]],
  ["The Charisma Myth", ["The_Charisma_Myth"]],
  ["Difficult Conversations", ["Difficult_Conversations"]],
  ["Just Listen", ["Just_Listen"]],
  ["Thinking, Fast and Slow", ["Thinking,_Fast_and_Slow"]],
  ["Flow: The Psychology of Optimal Experience", ["Flow_(psychology)"]],
  ["Mindset: The New Psychology of Success", ["Mindset_(book)"]],
  ["The Obstacle Is the Way", ["The_Obstacle_Is_the_Way"]],
  ["Ego Is the Enemy", ["Ego_Is_the_Enemy"]],
  ["The Courage to Be Disliked", ["The_Courage_to_Be_Disliked"]],
  ["Four Thousand Weeks", ["Four_Thousand_Weeks"]],
  ["Indistractable", ["Indistractable"]],
  ["Can't Hurt Me", ["Can%27t_Hurt_Me"]],
  ["The Subtle Art of Not Giving a F*ck", ["The_Subtle_Art_of_Not_Giving_a_F*ck"]],
  ["Grit: The Power of Passion and Perseverance", ["Grit:_The_Power_of_Passion_and_Perseverance"]],
  ["Man's Search for Meaning", ["Man%27s_Search_for_Meaning"]],
  ["The Alchemist", ["The_Alchemist_(novel)"]],
  ["Ikigai", ["Ikigai"]],
  ["The Boy, the Mole, the Fox and the Horse", ["The_Boy,_the_Mole,_the_Fox_and_the_Horse"]],
  ["12 Rules for Life", ["12_Rules_for_Life"]],
  ["Start With Why", ["Start_With_Why"]],
  ["The 7 Habits of Highly Effective People", ["The_7_Habits_of_Highly_Effective_People"]],
  ["Essentialism: The Disciplined Pursuit of Less", ["Essentialism_(book)"]],
  ["The Lean Startup", ["The_Lean_Startup"]],
  ["Zero to One", ["Zero_to_One"]],
  ["Steal Like an Artist", ["Steal_Like_an_Artist"]],
  ["Show Your Work!", ["Show_Your_Work!"]],
  ["The First 20 Hours", ["The_First_20_Hours"]],
];

function isbn10to13(isbn10) {
  const core = "978" + isbn10.slice(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(core[i]) * (i % 2 === 0 ? 1 : 3);
  return core + ((10 - (sum % 10)) % 10);
}

function extractIsbns(html) {
  const out = [];
  const re = /ISBN[^0-9Xx]{0,20}((?:97[89][0-9Xx\-]{10,16})|([0-9][0-9Xx\-]{8,13}))/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].replace(/[^0-9Xx]/g, "").toUpperCase();
    if (raw.length === 13 && (raw.startsWith("978") || raw.startsWith("979"))) out.push(raw);
    else if (raw.length === 10) out.push(isbn10to13(raw));
  }
  return [...new Set(out)];
}

async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (FORGE-library-builder/1.0)" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function main() {
  const out = [];
  for (let i = 0; i < books.length; i += 4) {
    const slice = books.slice(i, i + 4);
    const settled = await Promise.all(
      slice.map(async ([title, pages]) => {
        for (const page of pages) {
          const html = await fetchPage(`https://en.wikipedia.org/wiki/${page}`);
          if (!html) continue;
          const isbns = extractIsbns(html.slice(0, 120000));
          if (isbns.length > 0) return { title, isbn: isbns[0], all: isbns.slice(0, 4), wiki: page };
          await sleep(150);
        }
        return { title, isbn: null, all: [], wiki: null };
      })
    );
    out.push(...settled);
    await sleep(400);
  }
  console.log(JSON.stringify(out, null, 2));
}

main();
