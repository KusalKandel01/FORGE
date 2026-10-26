/**
 * FORGE classics shelf expansion: ancient epics, study texts, memoirs,
 * self improvement and more, all public domain with verified Project
 * Gutenberg ids (each id was checked against gutenberg.org directly).
 */

import type { CatalogBook } from "./catalog";

export const CATALOG_MORE: CatalogBook[] = [
  // --- Ancient world: 2000 to 2000 years old ---
  { gutId: 2707, title: "The History of Herodotus, Volume 1", author: "Herodotus", year: -440, genres: ["history", "study", "non fiction"], keywords: ["herodotus", "persia", "egypt", "greece", "ancient", "histories"] },
  { gutId: 7142, title: "The History of the Peloponnesian War", author: "Thucydides", year: -400, genres: ["history", "study", "non fiction"], keywords: ["thucydides", "athens", "sparta", "war", "ancient greece", "peloponnesian"] },
  { gutId: 216, title: "Tao Te Ching", author: "Lao Tzu", year: -400, genres: ["philosophy", "non fiction", "classic"], keywords: ["lao tzu", "taoism", "tao te ching", "chinese", "wisdom", "the way"] },
  { gutId: 2388, title: "The Bhagavad Gita", author: "Vyasa (trans. Edwin Arnold)", year: -100, genres: ["philosophy", "religion", "poetry", "classic"], keywords: ["bhagavad gita", "hindu", "krishna", "arjuna", "song celestial", "india", "sanskrit"] },
  { gutId: 6762, title: "Politics: A Treatise on Government", author: "Aristotle", year: -350, genres: ["philosophy", "politics", "study", "non fiction"], keywords: ["aristotle", "greek", "state", "citizen", "government", "ethics"] },
  { gutId: 8438, title: "The Nicomachean Ethics", author: "Aristotle", year: -340, genres: ["philosophy", "study", "non fiction"], keywords: ["aristotle", "virtue", "happiness", "ethics", "greek", "moral"] },
  { gutId: 1268, title: "The Mysterious Island", author: "Jules Verne", year: 1874, genres: ["fiction", "adventure", "classic"], keywords: ["verne", "island", "castaways", "nautilus", "engineering", "survival"] },
  { gutId: 1251, title: "Le Morte d'Arthur, Volume 1", author: "Sir Thomas Malory", year: 1485, genres: ["fiction", "adventure", "classic", "history"], keywords: ["malory", "king arthur", "camelot", "knights", "round table", "excalibur", "merlin"] },
  { gutId: 521, title: "The Life and Adventures of Robinson Crusoe", author: "Daniel Defoe", year: 1719, genres: ["fiction", "adventure", "classic"], keywords: ["defoe", "crusoe", "island", "castaway", "survival", "friday"] },
  { gutId: 2130, title: "Utopia", author: "Sir Thomas More", year: 1516, genres: ["philosophy", "politics", "non fiction", "classic"], keywords: ["more", "utopia", "ideal society", "island", "humanism"] },
  { gutId: 19942, title: "Candide", author: "Voltaire", year: 1759, genres: ["fiction", "classic", "philosophy"], keywords: ["voltaire", "satire", "optimism", "france", "philosophy", "candide"] },
  { gutId: 1080, title: "A Modest Proposal", author: "Jonathan Swift", year: 1729, genres: ["non fiction", "classic", "politics"], keywords: ["swift", "satire", "ireland", "essay", "satirical"] },
  { gutId: 147, title: "Common Sense", author: "Thomas Paine", year: 1776, genres: ["history", "politics", "non fiction", "classic"], keywords: ["paine", "american revolution", "independence", "pamphlet", "america"] },
  { gutId: 61, title: "The Communist Manifesto", author: "Karl Marx and Friedrich Engels", year: 1848, genres: ["politics", "philosophy", "economics", "non fiction"], keywords: ["marx", "engels", "communism", "socialism", "workers", "revolution"] },
  { gutId: 1946, title: "On War, Volume 1", author: "Carl von Clausewitz", year: 1832, genres: ["history", "philosophy", "non fiction"], keywords: ["clausewitz", "military", "strategy", "war", "prussia", "battle"] },
  { gutId: 34901, title: "On Liberty", author: "John Stuart Mill", year: 1859, genres: ["philosophy", "politics", "study", "non fiction"], keywords: ["mill", "freedom", "liberty", "society", "individual", "utilitarian"] },
  { gutId: 7370, title: "Second Treatise of Government", author: "John Locke", year: 1689, genres: ["philosophy", "politics", "study", "non fiction"], keywords: ["locke", "natural rights", "property", "government", "social contract"] },
  { gutId: 46333, title: "The Social Contract and Discourses", author: "Jean Jacques Rousseau", year: 1762, genres: ["philosophy", "politics", "study", "non fiction"], keywords: ["rousseau", "social contract", "general will", "inequality", "french"] },
  { gutId: 815, title: "Democracy in America, Volume 1", author: "Alexis de Tocqueville", year: 1835, genres: ["history", "politics", "study", "non fiction"], keywords: ["tocqueville", "america", "democracy", "society", "french", "travels"] },

  // --- Study and reference: school subjects in primary sources ---
  { gutId: 21076, title: "The First Six Books of the Elements of Euclid", author: "Euclid", year: -300, genres: ["study", "mathematics", "science", "non fiction"], keywords: ["euclid", "geometry", "mathematics", "proofs", "plane geometry", "math"] },
  { gutId: 5001, title: "Relativity: The Special and General Theory", author: "Albert Einstein", year: 1916, genres: ["study", "science", "physics", "non fiction"], keywords: ["einstein", "physics", "relativity", "space", "time", "spacetime", "light"] },
  { gutId: 944, title: "The Voyage of the Beagle", author: "Charles Darwin", year: 1839, genres: ["study", "science", "history", "non fiction"], keywords: ["darwin", "beagle", "travel", "geology", "biology", "south america", "galapagos"] },
  { gutId: 852, title: "Democracy and Education", author: "John Dewey", year: 1916, genres: ["study", "philosophy", "non fiction"], keywords: ["dewey", "education", "teaching", "learning", "school", "pedagogy"] },
  { gutId: 833, title: "The Theory of the Leisure Class", author: "Thorstein Veblen", year: 1899, genres: ["study", "economics", "sociology", "non fiction"], keywords: ["veblen", "economics", "conspicuous consumption", "society", "wealth", "status"] },
  { gutId: 37134, title: "The Elements of Style", author: "William Strunk Jr.", year: 1918, genres: ["study", "writing", "reference", "non fiction"], keywords: ["strunk", "writing", "grammar", "composition", "english", "style guide", "essay"] },
  { gutId: 4280, title: "The Critique of Pure Reason", author: "Immanuel Kant", year: 1781, genres: ["study", "philosophy", "non fiction"], keywords: ["kant", "metaphysics", "reason", "epistemology", "german", "philosophy"] },
  { gutId: 4705, title: "A Treatise of Human Nature", author: "David Hume", year: 1739, genres: ["study", "philosophy", "non fiction"], keywords: ["hume", "empiricism", "mind", "passions", "scottish", "philosophy"] },
  { gutId: 9662, title: "An Enquiry Concerning Human Understanding", author: "David Hume", year: 1748, genres: ["study", "philosophy", "non fiction"], keywords: ["hume", "experience", "miracles", "causation", "skepticism", "philosophy"] },

  // --- Self improvement and real life skills in book form ---
  { gutId: 935, title: "Self Help", author: "Samuel Smiles", year: 1859, genres: ["self help", "non fiction", "classic"], keywords: ["smiles", "self improvement", "character", "perseverance", "industry", "habits"] },
  { gutId: 4507, title: "As a Man Thinketh", author: "James Allen", year: 1903, genres: ["self help", "philosophy", "non fiction"], keywords: ["allen", "thought", "mind", "character", "self improvement", "attitude"] },
  { gutId: 2274, title: "How to Live on 24 Hours a Day", author: "Arnold Bennett", year: 1908, genres: ["self help", "non fiction"], keywords: ["bennett", "time management", "time", "daily routine", "habits", "productivity"] },
  { gutId: 16317, title: "The Art of Public Speaking", author: "J. Berg Esenwein and Dale Carnegie", year: 1915, genres: ["self help", "reference", "non fiction"], keywords: ["carnegie", "public speaking", "speech", "oratory", "presentation", "confidence"] },

  // --- Literature and drama additions ---
  { gutId: 786, title: "Hard Times", author: "Charles Dickens", year: 1854, genres: ["fiction", "classic"], keywords: ["dickens", "industrial", "coketown", "utilitarianism", "factory", "england"] },
  { gutId: 599, title: "Vanity Fair", author: "William Makepeace Thackeray", year: 1848, genres: ["fiction", "classic"], keywords: ["thackeray", "becky sharp", "satire", "society", "napoleonic", "england"] },
  { gutId: 105, title: "Persuasion", author: "Jane Austen", year: 1817, genres: ["fiction", "romance", "classic"], keywords: ["austen", "anne elliot", "captain wentworth", "second chances", "regency"] },
  { gutId: 175, title: "The Phantom of the Opera", author: "Gaston Leroux", year: 1910, genres: ["fiction", "horror", "romance", "classic"], keywords: ["leroux", "phantom", "opera", "paris", "christine", "gothic"] },
  { gutId: 95, title: "The Prisoner of Zenda", author: "Anthony Hope", year: 1894, genres: ["fiction", "adventure", "classic"], keywords: ["hope", "ruritania", "impersonation", "king", "adventure", "swashbuckling"] },
  { gutId: 844, title: "The Importance of Being Earnest", author: "Oscar Wilde", year: 1895, genres: ["drama", "classic"], keywords: ["wilde", "comedy", "play", "bunburying", "victorian", "wit"] },
  { gutId: 1522, title: "Julius Caesar", author: "William Shakespeare", year: 1599, genres: ["drama", "classic", "history"], keywords: ["shakespeare", "play", "rome", "betrayal", "brutus", "assassination"] },
  { gutId: 1041, title: "Shakespeare's Sonnets", author: "William Shakespeare", year: 1609, genres: ["poetry", "classic"], keywords: ["shakespeare", "sonnets", "poems", "love poetry", "dark lady"] },
  { gutId: 12242, title: "Poems by Emily Dickinson, Three Series", author: "Emily Dickinson", year: 1890, genres: ["poetry", "classic"], keywords: ["dickinson", "poems", "american poetry", "lyric", "death", "nature"] },
  { gutId: 1597, title: "Andersen's Fairy Tales", author: "Hans Christian Andersen", year: 1835, genres: ["children", "fantasy", "classic"], keywords: ["andersen", "fairy tales", "little mermaid", "ugly duckling", "emperors new clothes", "denmark"] },
  { gutId: 500, title: "The Adventures of Pinocchio", author: "Carlo Collodi", year: 1883, genres: ["children", "fantasy", "classic"], keywords: ["collodi", "pinocchio", "puppet", "italy", "wooden boy", "cricket"] },

  // --- Memoir and testimony ---
  { gutId: 2376, title: "Up from Slavery", author: "Booker T. Washington", year: 1901, genres: ["memoir", "history", "non fiction"], keywords: ["booker t washington", "tuskegee", "autobiography", "education", "america", "perseverance"] },
  { gutId: 11030, title: "Incidents in the Life of a Slave Girl", author: "Harriet Jacobs", year: 1861, genres: ["memoir", "history", "non fiction"], keywords: ["jacobs", "slavery", "escape", "autobiography", "america", "resilience"] },
];
