import type { DefinitionEntry } from './types';

export type DictionaryLookup = {
  word: string;
  phonetic: string | null;
  partOfSpeech: string | null;
  definitions: DefinitionEntry[];
};

type FreeDictionaryResponse = Array<{
  word: string;
  phonetic?: string;
  phonetics?: Array<{ text?: string; audio?: string }>;
  meanings: Array<{
    partOfSpeech: string;
    definitions: Array<{
      definition: string;
      example?: string;
      synonyms?: string[];
      antonyms?: string[];
    }>;
    synonyms?: string[];
    antonyms?: string[];
  }>;
}>;

const ENDPOINT = 'https://api.dictionaryapi.dev/api/v2/entries/en/';

/**
 * Look up a word using the Free Dictionary API.
 * Throws when the word isn't found so callers can offer a manual-definition fallback.
 */
export async function lookupWord(rawWord: string): Promise<DictionaryLookup> {
  const word = rawWord.trim().toLowerCase();
  if (!word) throw new Error('Please enter a word.');
  if (!/^[a-z][a-z'\- ]*$/i.test(word)) {
    throw new Error('Words can only contain letters, hyphens, apostrophes, and spaces.');
  }

  const res = await fetch(ENDPOINT + encodeURIComponent(word));
  if (res.status === 404) {
    throw new DictionaryNotFoundError(word);
  }
  if (!res.ok) {
    throw new Error(`Dictionary lookup failed (${res.status}). Try again.`);
  }

  const data = (await res.json()) as FreeDictionaryResponse;
  if (!Array.isArray(data) || data.length === 0) {
    throw new DictionaryNotFoundError(word);
  }

  const first = data[0];
  const phonetic =
    first.phonetic ||
    first.phonetics?.find((p) => p.text)?.text ||
    null;

  const meanings = first.meanings ?? [];
  const partOfSpeech = meanings[0]?.partOfSpeech ?? null;

  const definitions: DefinitionEntry[] = [];
  for (const m of meanings) {
    for (const d of m.definitions.slice(0, 3)) {
      definitions.push({
        definition: d.definition,
        example: d.example ?? null,
        synonyms: dedupeStrings([...(d.synonyms ?? []), ...(m.synonyms ?? [])]).slice(0, 8),
        antonyms: dedupeStrings([...(d.antonyms ?? []), ...(m.antonyms ?? [])]).slice(0, 8),
      });
      if (definitions.length >= 5) break;
    }
    if (definitions.length >= 5) break;
  }

  return {
    word: first.word ?? word,
    phonetic,
    partOfSpeech,
    definitions,
  };
}

function dedupeStrings(list: string[]): string[] {
  return Array.from(new Set(list.map((s) => s.trim()).filter(Boolean)));
}

export class DictionaryNotFoundError extends Error {
  word: string;
  constructor(word: string) {
    super(`We couldn't find a definition for "${word}".`);
    this.name = 'DictionaryNotFoundError';
    this.word = word;
  }
}
