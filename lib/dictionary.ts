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
const SUGGEST_ENDPOINT = 'https://api.datamuse.com/sug?s=';

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

export async function suggestWord(rawWord: string): Promise<string | null> {
  const word = rawWord.trim().toLowerCase();
  if (!word || !/^[a-z][a-z'\- ]*$/i.test(word)) return null;

  try {
    const res = await fetch(SUGGEST_ENDPOINT + encodeURIComponent(word));
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ word?: string }>;
    const suggestion = data
      .map((item) => item.word?.trim().toLowerCase())
      .find((candidate): candidate is string => {
        if (!candidate || candidate === word || candidate.includes(' ')) return false;
        return editDistance(word, candidate) <= 2;
      });
    return suggestion ?? null;
  } catch {
    return null;
  }
}

function dedupeStrings(list: string[]): string[] {
  return Array.from(new Set(list.map((s) => s.trim()).filter(Boolean)));
}

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_v, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[a.length][b.length];
}

export class DictionaryNotFoundError extends Error {
  word: string;
  constructor(word: string) {
    super(`We couldn't find a definition for "${word}".`);
    this.name = 'DictionaryNotFoundError';
    this.word = word;
  }
}
