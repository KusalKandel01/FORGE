/**
 * FORGE built-in classics shelf.
 *
 * A curated catalog of famous public domain books with their real Project
 * Gutenberg ids. Two jobs:
 *  1. Search always returns results (instantly, even fully offline) because
 *     matching runs locally against this list before touching the network.
 *  2. Every entry uses the gut-<id> format, so the reader downloads the full
 *     text from gutenberg.org and caches it on the device for offline reads.
 *
 * Only entries whose Gutenberg id is well established are listed.
 */

import { CATALOG_MORE } from "./catalog-more";
import { CATALOG_EXTRA } from "./catalog-extra";

export interface CatalogBook {
  /** Numeric Project Gutenberg id. */
  gutId: number;
  title: string;
  author: string;
  year: number | null;
  genres: string[];
  /** Extra search hints: subjects, author surnames, common spellings. */
  keywords: string[];
}

const CATALOG_BASE: CatalogBook[] = [
  // --- Literature classics ---
  { gutId: 1342, title: "Pride and Prejudice", author: "Jane Austen", year: 1813, genres: ["fiction", "romance", "classic"], keywords: ["austen", "elizabeth bennet", "darcy", "love", "regency"] },
  { gutId: 158, title: "Emma", author: "Jane Austen", year: 1815, genres: ["fiction", "romance", "classic"], keywords: ["austen", "matchmaking", "regency"] },
  { gutId: 161, title: "Sense and Sensibility", author: "Jane Austen", year: 1811, genres: ["fiction", "romance", "classic"], keywords: ["austen", "dashwood", "sisters"] },
  { gutId: 141, title: "Mansfield Park", author: "Jane Austen", year: 1814, genres: ["fiction", "romance", "classic"], keywords: ["austen", "fanny price"] },
  { gutId: 2701, title: "Moby Dick", author: "Herman Melville", year: 1851, genres: ["fiction", "adventure", "classic"], keywords: ["melville", "whale", "ahab", "sea", "the whale"] },
  { gutId: 84, title: "Frankenstein", author: "Mary Shelley", year: 1818, genres: ["fiction", "horror", "science fiction", "classic"], keywords: ["shelley", "monster", "scientist", "gothic", "prometheus"] },
  { gutId: 1260, title: "Jane Eyre", author: "Charlotte Bronte", year: 1847, genres: ["fiction", "romance", "classic"], keywords: ["bronte", "gothic", "orphan", "governess"] },
  { gutId: 768, title: "Wuthering Heights", author: "Emily Bronte", year: 1847, genres: ["fiction", "romance", "classic"], keywords: ["bronte", "heathcliff", "moors", "gothic"] },
  { gutId: 1400, title: "Great Expectations", author: "Charles Dickens", year: 1861, genres: ["fiction", "classic"], keywords: ["dickens", "pip", "orphan", "london"] },
  { gutId: 98, title: "A Tale of Two Cities", author: "Charles Dickens", year: 1859, genres: ["fiction", "history", "classic"], keywords: ["dickens", "revolution", "paris", "london", "french revolution"] },
  { gutId: 46, title: "A Christmas Carol", author: "Charles Dickens", year: 1843, genres: ["fiction", "classic", "children"], keywords: ["dickens", "scrooge", "christmas", "ghosts", "holiday"] },
  { gutId: 730, title: "Oliver Twist", author: "Charles Dickens", year: 1838, genres: ["fiction", "classic"], keywords: ["dickens", "orphan", "london", "workhouse"] },
  { gutId: 766, title: "David Copperfield", author: "Charles Dickens", year: 1850, genres: ["fiction", "classic"], keywords: ["dickens", "autobiographical", "coming of age"] },
  { gutId: 145, title: "Middlemarch", author: "George Eliot", year: 1871, genres: ["fiction", "classic"], keywords: ["eliot", "province", "marriage", "ambition"] },
  { gutId: 2554, title: "Crime and Punishment", author: "Fyodor Dostoevsky", year: 1866, genres: ["fiction", "classic", "philosophy"], keywords: ["dostoevsky", "raskolnikov", "murder", "guilt", "russia", "psychological"] },
  { gutId: 28054, title: "The Brothers Karamazov", author: "Fyodor Dostoevsky", year: 1880, genres: ["fiction", "classic", "philosophy"], keywords: ["dostoevsky", "russia", "god", "faith", "murder", "trial"] },
  { gutId: 1399, title: "Anna Karenina", author: "Leo Tolstoy", year: 1878, genres: ["fiction", "romance", "classic"], keywords: ["tolstoy", "russia", "love", "train", "family"] },
  { gutId: 2600, title: "War and Peace", author: "Leo Tolstoy", year: 1869, genres: ["fiction", "history", "classic"], keywords: ["tolstoy", "napoleon", "russia", "epic", "1812"] },
  { gutId: 174, title: "The Picture of Dorian Gray", author: "Oscar Wilde", year: 1890, genres: ["fiction", "horror", "classic"], keywords: ["wilde", "portrait", "vanity", "gothic", "aestheticism"] },
  { gutId: 1952, title: "The Yellow Wallpaper", author: "Charlotte Perkins Gilman", year: 1892, genres: ["fiction", "horror", "classic"], keywords: ["gilman", "madness", "feminism", "short story"] },
  { gutId: 2542, title: "A Doll's House", author: "Henrik Ibsen", year: 1879, genres: ["drama", "classic"], keywords: ["ibsen", "play", "marriage", "norway", "feminism"] },
  { gutId: 2814, title: "Dubliners", author: "James Joyce", year: 1914, genres: ["fiction", "classic"], keywords: ["joyce", "ireland", "short stories", "dublin"] },
  { gutId: 4300, title: "Ulysses", author: "James Joyce", year: 1922, genres: ["fiction", "classic"], keywords: ["joyce", "dublin", "modernist", "odyssey", "experimental"] },
  { gutId: 33, title: "The Scarlet Letter", author: "Nathaniel Hawthorne", year: 1850, genres: ["fiction", "classic"], keywords: ["hawthorne", "puritan", "adultery", "boston", "sin"] },
  { gutId: 74, title: "The Adventures of Tom Sawyer", author: "Mark Twain", year: 1876, genres: ["fiction", "adventure", "children", "classic"], keywords: ["twain", "mississippi", "boyhood", "mischief"] },
  { gutId: 76, title: "Adventures of Huckleberry Finn", author: "Mark Twain", year: 1884, genres: ["fiction", "adventure", "classic"], keywords: ["twain", "mississippi", "raft", "jim", "river"] },
  { gutId: 203, title: "Uncle Tom's Cabin", author: "Harriet Beecher Stowe", year: 1852, genres: ["fiction", "history", "classic"], keywords: ["stowe", "slavery", "civil war", "abolition"] },
  { gutId: 23, title: "Narrative of the Life of Frederick Douglass", author: "Frederick Douglass", year: 1845, genres: ["memoir", "history", "classic"], keywords: ["douglass", "slavery", "abolition", "autobiography", "freedom"] },
  { gutId: 408, title: "The Souls of Black Folk", author: "W. E. B. Du Bois", year: 1903, genres: ["non fiction", "history", "sociology"], keywords: ["du bois", "essays", "race", "america", "sociology"] },
  { gutId: 215, title: "The Call of the Wild", author: "Jack London", year: 1903, genres: ["fiction", "adventure", "classic"], keywords: ["london", "dog", "yukon", "gold rush", "sled"] },
  { gutId: 910, title: "White Fang", author: "Jack London", year: 1906, genres: ["fiction", "adventure", "classic"], keywords: ["london", "wolf", "dog", "yukon"] },
  { gutId: 120, title: "Treasure Island", author: "Robert Louis Stevenson", year: 1883, genres: ["fiction", "adventure", "children", "classic"], keywords: ["stevenson", "pirates", "buried treasure", "long john silver", "map"] },
  { gutId: 43, title: "The Strange Case of Dr Jekyll and Mr Hyde", author: "Robert Louis Stevenson", year: 1886, genres: ["fiction", "horror", "classic"], keywords: ["stevenson", "hyde", "double life", "gothic", "experiment"] },
  { gutId: 345, title: "Dracula", author: "Bram Stoker", year: 1897, genres: ["fiction", "horror", "classic"], keywords: ["stoker", "vampire", "transylvania", "gothic", "count"] },
  { gutId: 35, title: "The Time Machine", author: "H. G. Wells", year: 1895, genres: ["fiction", "science fiction", "classic"], keywords: ["wells", "time travel", "future", "morlocks", "elois"] },
  { gutId: 36, title: "The War of the Worlds", author: "H. G. Wells", year: 1898, genres: ["fiction", "science fiction", "classic"], keywords: ["wells", "aliens", "mars", "invasion", "martians"] },
  { gutId: 5230, title: "The Invisible Man", author: "H. G. Wells", year: 1897, genres: ["fiction", "science fiction", "classic"], keywords: ["wells", "invisibility", "scientist", "thriller"] },
  { gutId: 164, title: "Twenty Thousand Leagues Under the Sea", author: "Jules Verne", year: 1870, genres: ["fiction", "adventure", "science fiction", "classic"], keywords: ["verne", "nautilus", "submarine", "captain nemo", "ocean"] },
  { gutId: 103, title: "Around the World in Eighty Days", author: "Jules Verne", year: 1873, genres: ["fiction", "adventure", "classic"], keywords: ["verne", "fogg", "race", "journey", "balloon", "circumnavigate"] },
  { gutId: 1184, title: "The Count of Monte Cristo", author: "Alexandre Dumas", year: 1844, genres: ["fiction", "adventure", "classic"], keywords: ["dumas", "revenge", "prison", "treasure", "france"] },
  { gutId: 135, title: "Les Miserables", author: "Victor Hugo", year: 1862, genres: ["fiction", "classic", "history"], keywords: ["hugo", "jean valjean", "france", "revolution", "redemption", "paris"] },
  { gutId: 2413, title: "Madame Bovary", author: "Gustave Flaubert", year: 1856, genres: ["fiction", "classic"], keywords: ["flaubert", "france", "marriage", "realism"] },
  { gutId: 996, title: "Don Quixote", author: "Miguel de Cervantes", year: 1605, genres: ["fiction", "adventure", "classic"], keywords: ["cervantes", "spain", "knight", "windmills", "sancho", "satire"] },
  { gutId: 829, title: "Gulliver's Travels", author: "Jonathan Swift", year: 1726, genres: ["fiction", "adventure", "classic"], keywords: ["swift", "lilliput", "satire", "giants", "voyage"] },
  { gutId: 219, title: "Heart of Darkness", author: "Joseph Conrad", year: 1899, genres: ["fiction", "classic"], keywords: ["conrad", "congo", "kurtz", "colonialism", "river"] },
  { gutId: 5200, title: "Metamorphosis", author: "Franz Kafka", year: 1915, genres: ["fiction", "classic"], keywords: ["kafka", "insect", "absurd", "family", "alienation"] },
  { gutId: 16328, title: "Beowulf", author: "Unknown", year: 1000, genres: ["poetry", "classic", "history"], keywords: ["epic", "dragon", "grendel", "anglo saxon", "hero", "old english"] },
  { gutId: 100, title: "The Complete Works of William Shakespeare", author: "William Shakespeare", year: 1623, genres: ["drama", "poetry", "classic"], keywords: ["shakespeare", "plays", "sonnets", "complete", "theatre", "tragedies"] },
  { gutId: 1513, title: "Romeo and Juliet", author: "William Shakespeare", year: 1597, genres: ["drama", "romance", "classic"], keywords: ["shakespeare", "play", "verona", "love", "feuds", "tragedy"] },
  { gutId: 1524, title: "Hamlet", author: "William Shakespeare", year: 1603, genres: ["drama", "classic"], keywords: ["shakespeare", "play", "denmark", "ghost", "tragedy", "prince"] },
  { gutId: 1533, title: "Macbeth", author: "William Shakespeare", year: 1606, genres: ["drama", "classic"], keywords: ["shakespeare", "play", "witches", "scotland", "ambition", "tragedy"] },
  { gutId: 2148, title: "The Works of Edgar Allan Poe, Volume 1", author: "Edgar Allan Poe", year: 1850, genres: ["horror", "fiction", "poetry", "classic"], keywords: ["poe", "gothic", "raven", "short stories", "tales", "mystery"] },
  { gutId: 62, title: "A Princess of Mars", author: "Edgar Rice Burroughs", year: 1912, genres: ["science fiction", "adventure", "classic"], keywords: ["burroughs", "mars", "barsoom", "john carter"] },
  { gutId: 1727, title: "The Odyssey", author: "Homer", year: -700, genres: ["poetry", "classic", "history"], keywords: ["homer", "epic", "odysseus", "greece", "voyage", "trojan"] },
  { gutId: 6130, title: "The Iliad", author: "Homer", year: -750, genres: ["poetry", "classic", "history"], keywords: ["homer", "epic", "achilles", "trojan war", "greece", "hector"] },
  { gutId: 8800, title: "The Divine Comedy", author: "Dante Alighieri", year: 1320, genres: ["poetry", "classic", "philosophy"], keywords: ["dante", "inferno", "hell", "purgatory", "paradise", "virgil"] },

  // --- Mystery ---
  { gutId: 1661, title: "The Adventures of Sherlock Holmes", author: "Arthur Conan Doyle", year: 1892, genres: ["mystery", "classic"], keywords: ["doyle", "sherlock", "holmes", "watson", "detective", "cases"] },
  { gutId: 244, title: "A Study in Scarlet", author: "Arthur Conan Doyle", year: 1887, genres: ["mystery", "classic"], keywords: ["doyle", "sherlock", "holmes", "detective", "first"] },
  { gutId: 2097, title: "The Sign of the Four", author: "Arthur Conan Doyle", year: 1890, genres: ["mystery", "classic"], keywords: ["doyle", "sherlock", "holmes", "detective", "treasure"] },
  { gutId: 108, title: "The Return of Sherlock Holmes", author: "Arthur Conan Doyle", year: 1905, genres: ["mystery", "classic"], keywords: ["doyle", "sherlock", "holmes", "detective", "cases"] },
  { gutId: 834, title: "The Memoirs of Sherlock Holmes", author: "Arthur Conan Doyle", year: 1894, genres: ["mystery", "classic"], keywords: ["doyle", "sherlock", "holmes", "detective", "cases"] },
  { gutId: 2852, title: "The Hound of the Baskervilles", author: "Arthur Conan Doyle", year: 1902, genres: ["mystery", "classic"], keywords: ["doyle", "sherlock", "holmes", "moor", "curse", "dog"] },

  // --- Children ---
  { gutId: 11, title: "Alice's Adventures in Wonderland", author: "Lewis Carroll", year: 1865, genres: ["children", "fantasy", "classic"], keywords: ["carroll", "wonderland", "rabbit", "mad hatter", "tea party", "cheshire"] },
  { gutId: 12, title: "Through the Looking-Glass", author: "Lewis Carroll", year: 1871, genres: ["children", "fantasy", "classic"], keywords: ["carroll", "mirror", "chess", "jabberwocky"] },
  { gutId: 16, title: "Peter Pan", author: "J. M. Barrie", year: 1911, genres: ["children", "fantasy", "classic"], keywords: ["barrie", "neverland", "hook", "fairy", "wendy", "fly"] },
  { gutId: 55, title: "The Wonderful Wizard of Oz", author: "L. Frank Baum", year: 1900, genres: ["children", "fantasy", "classic"], keywords: ["baum", "oz", "dorothy", "yellow brick", "emerald city", "witch"] },
  { gutId: 113, title: "The Secret Garden", author: "Frances Hodgson Burnett", year: 1911, genres: ["children", "classic"], keywords: ["burnett", "garden", "orphan", "yorkshire", "mary"] },
  { gutId: 45, title: "Anne of Green Gables", author: "L. M. Montgomery", year: 1908, genres: ["children", "classic"], keywords: ["montgomery", "anne", "orphan", "canada", "avonlea", "red hair"] },
  { gutId: 289, title: "The Wind in the Willows", author: "Kenneth Grahame", year: 1908, genres: ["children", "classic"], keywords: ["grahame", "mole", "rat", "toad", "river", "animals"] },
  { gutId: 236, title: "The Jungle Book", author: "Rudyard Kipling", year: 1894, genres: ["children", "adventure", "classic"], keywords: ["kipling", "mowgli", "india", "wolf", "bear", "baloo"] },
  { gutId: 2591, title: "Grimms' Fairy Tales", author: "Jacob and Wilhelm Grimm", year: 1812, genres: ["children", "fantasy", "classic"], keywords: ["grimm", "fairy tales", "folk", "cinderella", "hansel", "rapunzel"] },
  { gutId: 271, title: "Black Beauty", author: "Anna Sewell", year: 1877, genres: ["children", "classic"], keywords: ["sewell", "horse", "animals"] },

  // --- Philosophy and big ideas ---
  { gutId: 2680, title: "Meditations", author: "Marcus Aurelius", year: 180, genres: ["philosophy", "non fiction", "classic"], keywords: ["aurelius", "stoicism", "stoic", "roman", "emperor", "wisdom", "self improvement"] },
  { gutId: 1497, title: "The Republic", author: "Plato", year: -375, genres: ["philosophy", "non fiction", "classic"], keywords: ["plato", "socrates", "justice", "state", "athens", "philosophy"] },
  { gutId: 4363, title: "Beyond Good and Evil", author: "Friedrich Nietzsche", year: 1886, genres: ["philosophy", "non fiction", "classic"], keywords: ["nietzsche", "morality", "philosophy", "will to power"] },
  { gutId: 1998, title: "Thus Spake Zarathustra", author: "Friedrich Nietzsche", year: 1883, genres: ["philosophy", "non fiction", "classic"], keywords: ["nietzsche", "zarathustra", "superman", "god", "philosophy"] },
  { gutId: 1232, title: "The Prince", author: "Niccolo Machiavelli", year: 1532, genres: ["philosophy", "history", "non fiction", "classic"], keywords: ["machiavelli", "power", "politics", "leadership", "strategy", "italy"] },
  { gutId: 132, title: "The Art of War", author: "Sun Tzu", year: -500, genres: ["philosophy", "non fiction", "history", "classic"], keywords: ["sun tzu", "strategy", "military", "battle", "leadership", "china", "business"] },
  { gutId: 3207, title: "Leviathan", author: "Thomas Hobbes", year: 1651, genres: ["philosophy", "non fiction", "classic"], keywords: ["hobbes", "state", "society", "politics", "social contract"] },
  { gutId: 5827, title: "The Problems of Philosophy", author: "Bertrand Russell", year: 1912, genres: ["philosophy", "non fiction", "classic"], keywords: ["russell", "knowledge", "reality", "beginner", "philosophy"] },
  { gutId: 3600, title: "Essays of Montaigne", author: "Michel de Montaigne", year: 1580, genres: ["philosophy", "non fiction", "classic"], keywords: ["montaigne", "essays", "life", "wisdom", "france"] },

  // --- Science, economics, history, memoir ---
  { gutId: 1228, title: "On the Origin of Species", author: "Charles Darwin", year: 1859, genres: ["science", "non fiction", "classic"], keywords: ["darwin", "evolution", "species", "biology", "natural selection", "galapagos"] },
  { gutId: 3300, title: "The Wealth of Nations", author: "Adam Smith", year: 1776, genres: ["economics", "non fiction", "classic"], keywords: ["smith", "economics", "markets", "capitalism", "labor", "money"] },
  { gutId: 1404, title: "The Federalist Papers", author: "Alexander Hamilton, James Madison, John Jay", year: 1788, genres: ["history", "politics", "non fiction", "classic"], keywords: ["hamilton", "madison", "constitution", "america", "government", "essays"] },
  { gutId: 148, title: "The Autobiography of Benjamin Franklin", author: "Benjamin Franklin", year: 1791, genres: ["memoir", "history", "non fiction", "classic"], keywords: ["franklin", "america", "inventor", "self improvement", "founding father"] },
  { gutId: 10, title: "The King James Bible", author: "Unknown", year: 1611, genres: ["religion", "classic", "non fiction"], keywords: ["bible", "scripture", "kjv", "gospels", "old testament", "new testament"] },
  { gutId: 1322, title: "Leaves of Grass", author: "Walt Whitman", year: 1855, genres: ["poetry", "classic"], keywords: ["whitman", "poems", "america", "free verse", "song of myself"] },
];

/**
 * The full shelf: the originals above plus the expansion packs (ancient
 * epics, study texts, memoirs, self improvement, and pack 2 of live verified
 * modern classics) from catalog-more.ts and catalog-extra.ts.
 */
export const CATALOG: CatalogBook[] = [
  ...CATALOG_BASE,
  ...CATALOG_MORE,
  ...CATALOG_EXTRA,
];

/** One-line description shown when a catalog hit has no cover image. */
export function catalogGenres(book: CatalogBook): string {
  return book.genres.join(", ");
}
