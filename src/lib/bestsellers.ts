/**
 * FORGE bestseller shelf: modern, world famous, still in copyright books.
 * These are NOT in the free classics catalog, so the shelf gives two honest
 * ways to read each one:
 *   1. A readable AI Deep Dive walkthrough (built by /api/books/generate).
 *   2. Legal borrow links: the exact Archive.org lending edition, Open
 *      Library, Libby and Google Books.
 * Covers are real images of real editions:
 *   - iaId: https://archive.org/services/img/{iaId} (scan of the edition)
 *   - olIsbn: https://covers.openlibrary.org/b/isbn/{olIsbn}-L.jpg
 * Both fail gracefully: the UI shows a styled title banner instead.
 */

export type BestsellerCategory =
  | "habits"
  | "money"
  | "people"
  | "mind"
  | "grit"
  | "growth";

export interface BestsellerBook {
  id: string;
  title: string;
  author: string;
  year: number;
  category: BestsellerCategory;
  /** One honest line about what the book actually teaches. */
  blurb: string;
  /** Archive.org identifier of a real edition, for cover + borrow link. */
  iaId?: string;
  /** ISBN-13 fallback for Open Library covers when no IA edition is used. */
  olIsbn?: string;
}

export const BESTSELLER_CATEGORIES: {
  id: BestsellerCategory | "all";
  label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "habits", label: "Habits and Discipline" },
  { id: "money", label: "Money and Wealth" },
  { id: "people", label: "People Skills" },
  { id: "mind", label: "Mind and Focus" },
  { id: "grit", label: "Grit and Courage" },
  { id: "growth", label: "Growth and Work" },
];

export const BESTSELLERS: BestsellerBook[] = [
  // --- Habits and discipline ---
  {
    id: "atomic-habits",
    title: "Atomic Habits",
    author: "James Clear",
    year: 2018,
    category: "habits",
    blurb:
      "Tiny changes, remarkable results. A four part system for building good habits, breaking bad ones and getting 1 percent better every day.",
    iaId: "atomichabitseasy0000clea",
  },
  {
    id: "power-of-habit",
    title: "The Power of Habit",
    author: "Charles Duhigg",
    year: 2012,
    category: "habits",
    blurb:
      "Why we do what we do in life and business. The habit loop of cue, routine and reward, and how to redesign it.",
    iaId: "powerofhabitwhyw0000duhi_f9g7",
  },
  {
    id: "deep-work",
    title: "Deep Work",
    author: "Cal Newport",
    year: 2016,
    category: "habits",
    blurb:
      "Rules for focused success in a distracted world. How to train concentration and turn it into a real advantage.",
    iaId: "deepworkrulesfor0000newp",
  },
  {
    id: "digital-minimalism",
    title: "Digital Minimalism",
    author: "Cal Newport",
    year: 2019,
    category: "habits",
    blurb:
      "Choosing a focused life in a noisy world. A 30 day declutter and a philosophy for keeping technology in its place.",
    iaId: "cal-newport-digital-minimalism-choosing-a-focused-life-in-a-noisy",
  },
  {
    id: "the-5am-club",
    title: "The 5 AM Club",
    author: "Robin Sharma",
    year: 2018,
    category: "habits",
    blurb:
      "Own your morning, elevate your life. A method built around the 20/20/20 formula and a victory hour before the world wakes up.",
    iaId: "5amclubownyourmo0000robi",
  },
  {
    id: "compound-effect",
    title: "The Compound Effect",
    author: "Darren Hardy",
    year: 2010,
    category: "habits",
    blurb:
      "Small smart choices, repeated consistently, multiply into massive results. The math behind daily decisions.",
    iaId: "compoundeffectmu00hard",
  },
  {
    id: "discipline-is-destiny",
    title: "Discipline Is Destiny",
    author: "Ryan Holiday",
    year: 2022,
    category: "habits",
    blurb:
      "Stoic self control as the deciding force of a life, told through the habits of athletes, generals and writers who mastered themselves.",
    iaId: "discipline-is-destiny-ryan-holiday",
  },
  {
    id: "war-of-art",
    title: "The War of Art",
    author: "Steven Pressfield",
    year: 2002,
    category: "habits",
    blurb:
      "Break through the blocks and win your inner creative battles. Names the Resistance and shows how to defeat it daily.",
    iaId: "warofartbreakthr0000pres",
  },

  // --- Money and wealth ---
  {
    id: "rich-dad-poor-dad",
    title: "Rich Dad Poor Dad",
    author: "Robert T. Kiyosaki",
    year: 1997,
    category: "money",
    blurb:
      "What the rich teach their kids about money that schools do not. Assets versus liabilities, and money working for you.",
    iaId: "richdadpoordadwh0000kiyo_t8n6",
  },
  {
    id: "millionaire-next-door",
    title: "The Millionaire Next Door",
    author: "Thomas J. Stanley and William D. Danko",
    year: 1996,
    category: "money",
    blurb:
      "The surprising secrets of America's wealthy: most live below their means, and the research shows exactly how.",
    iaId: "millionairenextd0000stan_h7f0",
  },
  {
    id: "richest-man-babylon",
    title: "The Richest Man in Babylon",
    author: "George S. Clason",
    year: 1926,
    category: "money",
    blurb:
      "Timeless money laws told as Babylonian parables: pay yourself first, make gold work for you, guard it from fools.",
    iaId: "isbn_9798395421142",
  },
  {
    id: "i-will-teach-you-rich",
    title: "I Will Teach You to Be Rich",
    author: "Ramit Sethi",
    year: 2006,
    category: "money",
    blurb:
      "A practical 6 week program: automate savings, invest simply, and spend guilt free on what you love.",
    iaId: "iwillteachyoutob0000seth",
  },
  {
    id: "psychology-of-money",
    title: "The Psychology of Money",
    author: "Morgan Housel",
    year: 2020,
    category: "money",
    blurb:
      "Timeless lessons on wealth, greed and happiness. Doing well with money has more to do with behavior than spreadsheets.",
    iaId: "the-psychology-of-money-morgan-housel_202603",
  },
  {
    id: "think-and-grow-rich",
    title: "Think and Grow Rich",
    author: "Napoleon Hill",
    year: 1937,
    category: "money",
    blurb:
      "The classic of success literature: desire, faith, persistence and the master mind, drawn from studying hundreds of achievers.",
    iaId: "thinkgrowrichthe00hill",
  },
  {
    id: "intelligent-investor",
    title: "The Intelligent Investor",
    author: "Benjamin Graham",
    year: 1949,
    category: "money",
    blurb:
      "The value investing bible: margin of safety, Mr. Market, and a temperament framework that outlasts every fad.",
    iaId: "intelligentinves0000pysh",
  },
  {
    id: "your-money-or-your-life",
    title: "Your Money or Your Life",
    author: "Vicki Robin and Joe Dominguez",
    year: 1992,
    category: "money",
    blurb:
      "Nine steps to transform your relationship with money: track every hour traded, and buy back your life.",
    iaId: "yourmoneyoryourl0000robi",
  },

  // --- People skills ---
  {
    id: "how-to-talk-to-anyone",
    title: "How to Talk to Anyone",
    author: "Leil Lowndes",
    year: 2003,
    category: "people",
    blurb:
      "92 little tricks for big success in relationships. Concrete conversation moves you can use tonight.",
    iaId: "howtotalktoanyon0000lown",
  },
  {
    id: "how-to-win-friends",
    title: "How to Win Friends and Influence People",
    author: "Dale Carnegie",
    year: 1936,
    category: "people",
    blurb:
      "The all time classic on handling people: become genuinely interested, admit faults, let others save face.",
    iaId: "howtowinfriendsi00carn",
  },
  {
    id: "never-split-the-difference",
    title: "Never Split the Difference",
    author: "Chris Voss",
    year: 2016,
    category: "people",
    blurb:
      "Negotiation from an FBI hostage negotiator: tactical empathy, mirroring, calibrated questions, and the power of no.",
    iaId: "neversplitdiffer0000voss",
  },
  {
    id: "crucial-conversations",
    title: "Crucial Conversations",
    author: "Kerry Patterson, Joseph Grenny and Ron McMillan",
    year: 2002,
    category: "people",
    blurb:
      "Tools for talking when stakes are high: keep safety, master your stories, and turn tense talks into results.",
    iaId: "crucialconversat00patt",
  },
  {
    id: "influence",
    title: "Influence: The Psychology of Persuasion",
    author: "Robert B. Cialdini",
    year: 1984,
    category: "people",
    blurb:
      "The seven levers of persuasion: reciprocity, commitment, social proof, authority, liking, scarcity and unity.",
    iaId: "influencepsychol00cial",
  },
  {
    id: "charisma-myth",
    title: "The Charisma Myth",
    author: "Olivia Fox Cabane",
    year: 2012,
    category: "people",
    blurb:
      "Charisma is a skill, not a gift: presence, power and warmth, trained with practical mental exercises.",
    iaId: "the-charisma-myth-how-anyone-can-master-the-art-and-science-of-personal-magnetism_202401",
  },
  {
    id: "difficult-conversations",
    title: "Difficult Conversations",
    author: "Douglas Stone, Bruce Patton and Sheila Heen",
    year: 1999,
    category: "people",
    blurb:
      "How to discuss what matters most: the three conversations underneath every hard talk, from Harvard negotiators.",
    iaId: "difficultconvers00doug",
  },
  {
    id: "just-listen",
    title: "Just Listen",
    author: "Mark Goulston",
    year: 2010,
    category: "people",
    blurb:
      "Discover the secret to getting through to absolutely anyone: make people feel heard first, and everything after gets easier.",
    iaId: "justlistendiscov0000goul",
  },

  // --- Mind and focus ---
  {
    id: "thinking-fast-and-slow",
    title: "Thinking, Fast and Slow",
    author: "Daniel Kahneman",
    year: 2011,
    category: "mind",
    blurb:
      "A lifetime of research on the two systems that drive how we think, and the biases that trip both of them.",
    iaId: "thinkingfastslow0000kahn_b1q8",
  },
  {
    id: "flow",
    title: "Flow: The Psychology of Optimal Experience",
    author: "Mihaly Csikszentmihalyi",
    year: 1990,
    category: "mind",
    blurb:
      "The science of the state where time disappears, and how to engineer more of it into work and life.",
    iaId: "flow-the-psychology-of-optimal-experience",
  },
  {
    id: "mindset",
    title: "Mindset: The New Psychology of Success",
    author: "Carol S. Dweck",
    year: 2006,
    category: "mind",
    blurb:
      "Fixed versus growth mindset: how what you believe about ability shapes learning, sport, business and parenting.",
    iaId: "mindsetnewpsycho0000dwec_g9z4",
  },
  {
    id: "obstacle-is-the-way",
    title: "The Obstacle Is the Way",
    author: "Ryan Holiday",
    year: 2014,
    category: "mind",
    blurb:
      "Stoic strategy for hard times: perceive clearly, act with energy, and turn every blocker into the path itself.",
    iaId: "obstacleiswaytim0000holi",
  },
  {
    id: "ego-is-the-enemy",
    title: "Ego Is the Enemy",
    author: "Ryan Holiday",
    year: 2016,
    category: "mind",
    blurb:
      "Aspire, succeed, fail: the cases for staying humble, ambitious and resilient, with ego as the quiet saboteur.",
    iaId: "egoisenemy0000holi",
  },
  {
    id: "courage-to-be-disliked",
    title: "The Courage to Be Disliked",
    author: "Ichiro Kishimi and Fumitake Koga",
    year: 2013,
    category: "mind",
    blurb:
      "A dialogue between philosopher and youth on Adlerian psychology: free yourself from other people's approval.",
    iaId: "the-courage-to-be-disliked_202210",
  },
  {
    id: "four-thousand-weeks",
    title: "Four Thousand Weeks",
    author: "Oliver Burkeman",
    year: 2021,
    category: "mind",
    blurb:
      "Time management for mortals: the average life is about four thousand weeks, and accepting that is the real productivity hack.",
    olIsbn: "9780593185549",
  },
  {
    id: "indistractable",
    title: "Indistractable",
    author: "Nir Eyal",
    year: 2019,
    category: "mind",
    blurb:
      "How to control your attention and choose your life: master internal triggers, make time for traction, hack back distractions.",
    iaId: "indistractable-how-to-control-your-attent-nir-eyal",
  },

  // --- Grit and courage ---
  {
    id: "cant-hurt-me",
    title: "Can't Hurt Me",
    author: "David Goggins",
    year: 2018,
    category: "grit",
    blurb:
      "Master your mind and defy the odds: from abused, overweight exterminator to the fittest man alive, through the 40 percent rule.",
    iaId: "cant-hurt-me-master-your-mind-and-defy-the-odds_",
  },
  {
    id: "subtle-art",
    title: "The Subtle Art of Not Giving a F*ck",
    author: "Mark Manson",
    year: 2016,
    category: "grit",
    blurb:
      "A counterintuitive approach to living a good life: choose what actually deserves your care, and accept the rest.",
    iaId: "the-subtle-art-of-not-giving-mark-manson-we-lib.org",
  },
  {
    id: "grit",
    title: "Grit: The Power of Passion and Perseverance",
    author: "Angela Duckworth",
    year: 2016,
    category: "grit",
    blurb:
      "The research case that effort counts twice: talent times effort, and how to build staying power.",
    iaId: "gritpowerofpassi0000duck_f0a2",
  },
  {
    id: "mans-search-for-meaning",
    title: "Man's Search for Meaning",
    author: "Viktor E. Frankl",
    year: 1946,
    category: "grit",
    blurb:
      "A psychiatrist's testimony from the camps and the therapy it built: those with a why can bear almost any how.",
    iaId: "manssearchformea0000fran_p2h1",
  },
  {
    id: "the-alchemist",
    title: "The Alchemist",
    author: "Paulo Coelho",
    year: 1988,
    category: "grit",
    blurb:
      "A shepherd boy's journey to his Personal Legend. The novel that told a generation to follow the omens.",
    iaId: "alchemist0000coel",
  },
  {
    id: "ikigai",
    title: "Ikigai: The Japanese Secret to a Long and Happy Life",
    author: "Hector Garcia and Francesc Miralles",
    year: 2016,
    category: "grit",
    blurb:
      "What keeps Okinawa's centenarians going: purpose, movement, community and a reason to wake up each morning.",
    iaId: "ikigaijapanesese0000garc",
  },
  {
    id: "boy-mole-fox-horse",
    title: "The Boy, the Mole, the Fox and the Horse",
    author: "Charlie Mackesy",
    year: 2019,
    category: "grit",
    blurb:
      "A short, gentle book of drawings and dialogue about kindness, courage and asking for help.",
    olIsbn: "9780062976581",
  },
  {
    id: "12-rules-for-life",
    title: "12 Rules for Life",
    author: "Jordan B. Peterson",
    year: 2018,
    category: "grit",
    blurb:
      "An antidote to chaos: stand up straight, tell the truth, compare yourself to who you were yesterday.",
    olIsbn: "9780345816023",
  },

  // --- Growth and work ---
  {
    id: "start-with-why",
    title: "Start With Why",
    author: "Simon Sinek",
    year: 2009,
    category: "growth",
    blurb:
      "How great leaders inspire everyone to take action: people do not buy what you do, they buy why you do it.",
    iaId: "startwithwhyhowg00sine",
  },
  {
    id: "7-habits",
    title: "The 7 Habits of Highly Effective People",
    author: "Stephen R. Covey",
    year: 1989,
    category: "growth",
    blurb:
      "Be proactive, begin with the end in mind, sharpen the saw: the character ethic that outlasts every trend.",
    iaId: "7habitsofhighlye00cove_0",
  },
  {
    id: "essentialism",
    title: "Essentialism: The Disciplined Pursuit of Less",
    author: "Greg McKeown",
    year: 2014,
    category: "growth",
    blurb:
      "Less but better: a systematic discipline for figuring out what is essential and eliminating everything else.",
    iaId: "isbn_9780804137386",
  },
  {
    id: "lean-startup",
    title: "The Lean Startup",
    author: "Eric Ries",
    year: 2011,
    category: "growth",
    blurb:
      "Build, measure, learn: how startups and teams inside big companies test ideas cheaply before betting big.",
    iaId: "leanstartuphowco0000ries",
  },
  {
    id: "zero-to-one",
    title: "Zero to One",
    author: "Peter Thiel with Blake Masters",
    year: 2014,
    category: "growth",
    blurb:
      "Notes on startups, or how to build the future: competition is for losers, monopoly and secrets make progress.",
    iaId: "zerotoonenoteson0000thie",
  },
  {
    id: "steal-like-an-artist",
    title: "Steal Like an Artist",
    author: "Austin Kleon",
    year: 2012,
    category: "growth",
    blurb:
      "10 rules for creativity: nothing is original, so collect good ideas, remix them and put your work out there.",
    iaId: "steallikeartist10000kleo_z5o7",
  },
  {
    id: "show-your-work",
    title: "Show Your Work!",
    author: "Austin Kleon",
    year: 2014,
    category: "growth",
    blurb:
      "You do not need to be a genius, you need to document your process and share it, a little every day.",
    iaId: "isbn_9780761178972",
  },
  {
    id: "first-20-hours",
    title: "The First 20 Hours",
    author: "Josh Kaufman",
    year: 2013,
    category: "growth",
    blurb:
      "How to learn anything fast: deconstruct the skill, practice the crucial parts first, and remove practice barriers.",
    iaId: "first20hoursmast0000kauf",
  },
];

export function bestsellerCoverUrl(book: BestsellerBook): string | null {
  if (book.iaId) return `https://archive.org/services/img/${book.iaId}`;
  if (book.olIsbn) {
    return `https://covers.openlibrary.org/b/isbn/${book.olIsbn}-L.jpg?default=false`;
  }
  return null;
}

/** Where this exact edition can be legally borrowed. */
export function bestsellerBorrowLinks(book: BestsellerBook) {
  const term = `${book.title} ${book.author}`;
  const links: { name: string; url: string; note: string }[] = [];
  if (book.iaId) {
    links.push({
      name: "Archive.org, borrow this exact edition",
      url: `https://archive.org/details/${book.iaId}`,
      note: "Free digital loan with a free account, usually for 1 hour or 14 days.",
    });
  }
  links.push(
    {
      name: "Open Library",
      url: `https://openlibrary.org/search?q=${encodeURIComponent(term)}`,
      note: "Borrow modern ebooks and scanned copies, run by the Internet Archive.",
    },
    {
      name: "Your public library (Libby / OverDrive)",
      url: `https://libbyapp.com/search/${encodeURIComponent(book.title)}`,
      note: "Free with a library card on phone, tablet or e-reader.",
    },
    {
      name: "Google Books",
      url: `https://www.google.com/search?tbm=bks&q=${encodeURIComponent(term)}`,
      note: "Previews, store links and full views where the edition is free.",
    }
  );
  return links;
}
