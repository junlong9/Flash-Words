export type DefinitionEntry = {
  definition: string;
  example?: string | null;
  synonyms?: string[];
  antonyms?: string[];
};

export type Flashcard = {
  id: string;
  user_id: string;
  word: string;
  phonetic: string | null;
  part_of_speech: string | null;
  definitions: DefinitionEntry[];
  source: 'dictionary_api' | 'manual' | 'featured';
  is_manual: boolean;
  logged_date: string; // YYYY-MM-DD in user's tz
  created_at: string;
};

export type Profile = {
  id: string;
  display_name: string | null;
  is_premium: boolean;
  timezone: string;
  current_streak: number;
  longest_streak: number;
  last_logged_date: string | null;
  total_words: number;
  created_at: string;
  updated_at: string;
};

export type PlantStage =
  | 'seed'
  | 'seedling'
  | 'sprout'
  | 'sapling'
  | 'young_tree'
  | 'mature_tree';

export type PlantHydration = 'thirsty' | 'watered' | 'wilted';

export type FeaturedWord = {
  id: string;
  word: string;
  blurb: string | null;
  created_at: string;
};
