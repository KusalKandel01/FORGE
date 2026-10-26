/**
 * FORGE classics shelf expansion pack 2. Every id below was verified live
 * against the Project Gutenberg text cache (gutenberg.org/cache/epub/{id}),
 * checking the Title/Author header of the actual file, so a wrong or dead
 * id can not sneak in.
 */

import type { CatalogBook } from "./catalog";

export const CATALOG_EXTRA: CatalogBook[] = [
  // --- Modern classics, fiction ---
  { gutId: 64317, title: "The Great Gatsby", author: "F. Scott Fitzgerald", year: 1925, genres: ["classic", "fiction"], keywords: ["gatsby", "fitzgerald", "jazz age", "daisy", "american dream", "1920s"] },
  { gutId: 514, title: "Little Women", author: "Louisa May Alcott", year: 1868, genres: ["classic", "children", "fiction"], keywords: ["alcott", "march sisters", "jo", "beth", "civil war", "family"] },
  { gutId: 17396, title: "The Secret Garden", author: "Frances Hodgson Burnett", year: 1911, genres: ["classic", "children", "fiction"], keywords: ["burnett", "garden", "mary lennox", "colin", "yorkshire", "orphan"] },
  { gutId: 110, title: "Tess of the d'Urbervilles", author: "Thomas Hardy", year: 1891, genres: ["classic", "fiction"], keywords: ["hardy", "tess", "wessex", "durbeyfield", "tragedy", "england"] },
  { gutId: 27, title: "Far from the Madding Crowd", author: "Thomas Hardy", year: 1874, genres: ["classic", "fiction", "romance"], keywords: ["hardy", "bathsheba", "gabriel oak", "farming", "wessex", "sheep"] },
  { gutId: 4517, title: "Ethan Frome", author: "Edith Wharton", year: 1911, genres: ["classic", "fiction"], keywords: ["wharton", "ethan", "zeena", "mattie", "new england", "winter"] },
  { gutId: 160, title: "The Awakening, and Selected Short Stories", author: "Kate Chopin", year: 1899, genres: ["classic", "fiction"], keywords: ["chopin", "edna", "new orleans", "creole", "independence", "sea"] },
  { gutId: 242, title: "My Antonia", author: "Willa Cather", year: 1918, genres: ["classic", "fiction"], keywords: ["cather", "antonia", "nebraska", "prairie", "pioneers", "immigrants"] },
  { gutId: 209, title: "The Turn of the Screw", author: "Henry James", year: 1898, genres: ["classic", "horror", "fiction"], keywords: ["james", "governess", "ghosts", "bly", "children", "haunting"] },
  { gutId: 2638, title: "The Idiot", author: "Fyodor Dostoyevsky", year: 1869, genres: ["classic", "philosophy", "fiction"], keywords: ["dostoyevsky", "prince myshkin", "russia", "saint", "innocence", "society"] },

  // --- Adventure and mystery ---
  { gutId: 78, title: "Tarzan of the Apes", author: "Edgar Rice Burroughs", year: 1912, genres: ["adventure", "classic"], keywords: ["tarzan", "apes", "jungle", "africa", "jane", "burroughs"] },
  { gutId: 139, title: "The Lost World", author: "Arthur Conan Doyle", year: 1912, genres: ["adventure", "science fiction", "classic"], keywords: ["doyle", "challenger", "dinosaurs", "plateau", "amazon", "expedition"] },
  { gutId: 558, title: "The Thirty-Nine Steps", author: "John Buchan", year: 1915, genres: ["adventure", "mystery", "classic"], keywords: ["buchan", "richard hannay", "spy", "chase", "scotland", "conspiracy"] },
  { gutId: 155, title: "The Moonstone", author: "Wilkie Collins", year: 1868, genres: ["mystery", "classic"], keywords: ["collins", "diamond", "detective", "india", "theft", "first detective novel"] },
  { gutId: 2226, title: "Kim", author: "Rudyard Kipling", year: 1901, genres: ["adventure", "classic"], keywords: ["kipling", "kim", "india", "great game", "lama", "spy"] },

  // --- Epic, philosophy and study ---
  { gutId: 228, title: "The Aeneid", author: "Virgil", year: -19, genres: ["poetry", "classic", "non fiction"], keywords: ["virgil", "aeneas", "trojan", "rome", "epic", "dido"] },
  { gutId: 1656, title: "Apology", author: "Plato", year: -399, genres: ["philosophy", "classic", "study"], keywords: ["plato", "socrates", "trial", "athens", "wisdom", "defense"] },
  { gutId: 3330, title: "The Analects of Confucius", author: "Confucius", year: -500, genres: ["philosophy", "classic", "study"], keywords: ["confucius", "analects", "virtue", "learning", "china", "ethics"] },
];
