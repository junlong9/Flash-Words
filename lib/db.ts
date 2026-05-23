import { supabase } from './supabase';
import { todayInTimezone } from './timezone';
import { daysBetween } from './timezone';
import { xpForWatering } from './plant';
import type { ReviewSchedule } from './srs';
import type { DefinitionEntry, Flashcard, Profile, FeaturedWord } from './types';

// ---------- Profile ----------

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function ensureProfile(userId: string, timezone: string): Promise<Profile> {
  const existing = await fetchProfile(userId);
  if (existing) {
    if (existing.timezone !== timezone) {
      const { data, error } = await supabase
        .from('profiles')
        .update({ timezone })
        .eq('id', userId)
        .select()
        .single();
      if (error) throw error;
      return data as Profile;
    }
    return existing;
  }
  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: userId, timezone })
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function setPremium(userId: string, isPremium: boolean): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_premium: isPremium })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}

// ---------- Flashcards ----------

export type NewFlashcardInput = {
  userId: string;
  word: string;
  phonetic: string | null;
  partOfSpeech: string | null;
  definitions: DefinitionEntry[];
  source: Flashcard['source'];
  isManual: boolean;
  loggedDate: string;
};

export async function listFlashcards(userId: string): Promise<Flashcard[]> {
  const { data, error } = await supabase
    .from('flashcards')
    .select('*')
    .eq('user_id', userId)
    .order('logged_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Flashcard[];
}

export async function countFlashcardsOnDate(
  userId: string,
  date: string
): Promise<number> {
  const { count, error } = await supabase
    .from('flashcards')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('logged_date', date);
  if (error) throw error;
  return count ?? 0;
}

export async function findFlashcardByWord(
  userId: string,
  word: string
): Promise<Flashcard | null> {
  const normalized = word.trim().toLowerCase();
  const { data, error } = await supabase
    .from('flashcards')
    .select('*')
    .eq('user_id', userId)
    .ilike('word', normalized)
    .limit(1);
  if (error) throw error;
  return ((data ?? [])[0] as Flashcard | undefined) ?? null;
}

export async function createFlashcard(input: NewFlashcardInput): Promise<Flashcard> {
  const { data, error } = await supabase
    .from('flashcards')
    .insert({
      user_id: input.userId,
      word: input.word,
      phonetic: input.phonetic,
      part_of_speech: input.partOfSpeech,
      definitions: input.definitions,
      source: input.source,
      is_manual: input.isManual,
      logged_date: input.loggedDate,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Flashcard;
}

export async function deleteFlashcard(id: string): Promise<void> {
  const { error } = await supabase.from('flashcards').delete().eq('id', id);
  if (error) throw error;
}

/** Remove a flashcard and decrement the user's word count (plant XP is kept). */
export async function removeFlashcard(userId: string, cardId: string): Promise<void> {
  const { error } = await supabase
    .from('flashcards')
    .delete()
    .eq('id', cardId)
    .eq('user_id', userId);
  if (error) throw error;

  const profile = await fetchProfile(userId);
  if (profile && profile.total_words > 0) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ total_words: profile.total_words - 1 })
      .eq('id', userId);
    if (profileError) throw profileError;
  }
}

export async function submitReview(
  userId: string,
  cardId: string,
  schedule: ReviewSchedule
): Promise<Flashcard> {
  const { data, error } = await supabase
    .from('flashcards')
    .update({
      repetitions: schedule.repetitions,
      interval_days: schedule.interval_days,
      ease_factor: schedule.ease_factor,
      next_review_date: schedule.next_review_date,
      last_reviewed_at: schedule.last_reviewed_at,
    })
    .eq('id', cardId)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return data as Flashcard;
}

// ---------- Streak / profile recompute ----------

/**
 * Apply streak, word count, and growth XP after a flashcard was logged today.
 * First word of the day earns full XP; additional words earn reduced XP.
 */
export async function applyDailyLogToProfile(
  userId: string,
  todayLocal: string,
  cardsTodayBefore: number
): Promise<{ profile: Profile; xpGained: number }> {
  const profile = await fetchProfile(userId);
  if (!profile) throw new Error('Profile missing.');

  let newStreak = profile.current_streak;
  if (profile.last_logged_date === todayLocal) {
    // Already logged today; streak unchanged.
  } else if (profile.last_logged_date) {
    const gap = daysBetween(profile.last_logged_date, todayLocal);
    newStreak = gap === 1 ? profile.current_streak + 1 : 1;
  } else {
    newStreak = 1;
  }

  const longest = Math.max(profile.longest_streak, newStreak);
  const xpGained = xpForWatering(cardsTodayBefore);
  const newGrowthXp = Number(profile.plant_growth_xp ?? 0) + xpGained;

  const { data, error } = await supabase
    .from('profiles')
    .update({
      current_streak: newStreak,
      longest_streak: longest,
      last_logged_date: todayLocal,
      total_words: profile.total_words + 1,
      plant_growth_xp: newGrowthXp,
    })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return { profile: data as Profile, xpGained };
}

/** Dev-only: add growth XP without creating a flashcard. */
export async function addDevGrowthXp(userId: string, xp: number): Promise<Profile> {
  const profile = await fetchProfile(userId);
  if (!profile) throw new Error('Profile missing.');
  const newGrowthXp = Number(profile.plant_growth_xp ?? 0) + xp;
  return setDevGrowthXp(userId, newGrowthXp);
}

/** Dev-only: set growth XP to an exact value (stage preview). */
export async function setDevGrowthXp(userId: string, xp: number): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ plant_growth_xp: Math.max(0, xp) })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}

/** Dev-only: subtract growth XP (clamped at 0). */
export async function subtractDevGrowthXp(userId: string, xp: number): Promise<Profile> {
  const profile = await fetchProfile(userId);
  if (!profile) throw new Error('Profile missing.');
  const current = Number(profile.plant_growth_xp ?? 0);
  return setDevGrowthXp(userId, Math.max(0, current - xp));
}

// ---------- Featured Words ----------

/** Picks a deterministic featured word for the given local date. */
export async function getFeaturedWordForDate(localDate: string): Promise<FeaturedWord | null> {
  const { data, error } = await supabase.from('featured_words').select('*');
  if (error) throw error;
  const list = (data ?? []) as FeaturedWord[];
  if (list.length === 0) return null;
  const hash = hashString(localDate);
  return list[hash % list.length];
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

export { todayInTimezone };
