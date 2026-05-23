import { addDays, parseISO } from 'date-fns';
import type { Flashcard } from './types';

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

export type ReviewSchedule = {
  repetitions: number;
  interval_days: number;
  ease_factor: number;
  next_review_date: string;
  last_reviewed_at: string;
};

export type PracticeStats = {
  due: number;
  new: number;
  overdue: number;
  sessionSize: number;
};

const SESSION_LIMIT = 20;
const NEW_PER_SESSION = 5;

function cardReps(card: Flashcard): number {
  return card.repetitions ?? 0;
}

function cardNext(card: Flashcard): string | null {
  return card.next_review_date ?? null;
}

export function isNewCard(card: Flashcard): boolean {
  return cardReps(card) === 0 && !cardNext(card);
}

export function isDueCard(card: Flashcard, today: string): boolean {
  if (isNewCard(card)) return true;
  const next = cardNext(card);
  if (!next) return true;
  return next <= today;
}

export function isOverdue(card: Flashcard, today: string): boolean {
  const next = cardNext(card);
  return !!next && next < today;
}

/** Build a systematic review queue: overdue → due today → learning → new (capped). */
export function buildPracticeQueue(cards: Flashcard[], today: string): Flashcard[] {
  const overdue = cards
    .filter((c) => isOverdue(c, today))
    .sort((a, b) => (cardNext(a) ?? '').localeCompare(cardNext(b) ?? ''));

  const dueToday = cards.filter((c) => {
    const next = cardNext(c);
    return next === today && !isNewCard(c);
  });

  const fresh = cards.filter((c) => isNewCard(c));

  const queue: Flashcard[] = [];
  const seen = new Set<string>();

  const push = (list: Flashcard[], cap?: number) => {
    let n = 0;
    for (const c of list) {
      if (seen.has(c.id)) continue;
      if (cap !== undefined && n >= cap) break;
      queue.push(c);
      seen.add(c.id);
      n++;
      if (queue.length >= SESSION_LIMIT) return;
    }
  };

  push(overdue);
  push(dueToday);
  push(fresh, NEW_PER_SESSION);

  return queue.slice(0, SESSION_LIMIT);
}

export function practiceStats(cards: Flashcard[], today: string): PracticeStats {
  const queue = buildPracticeQueue(cards, today);
  return {
    due: cards.filter((c) => isDueCard(c, today) && !isNewCard(c)).length,
    new: cards.filter((c) => isNewCard(c)).length,
    overdue: cards.filter((c) => isOverdue(c, today)).length,
    sessionSize: queue.length,
  };
}

export function scheduleReview(
  card: Flashcard,
  rating: ReviewRating,
  today: string
): ReviewSchedule {
  let repetitions = card.repetitions ?? 0;
  let interval_days = card.interval_days ?? 0;
  let ease_factor = Number(card.ease_factor ?? 2.5);

  switch (rating) {
    case 'again':
      repetitions = 0;
      interval_days = 1;
      ease_factor = Math.max(1.3, ease_factor - 0.2);
      break;
    case 'hard':
      interval_days = Math.max(1, Math.round(interval_days * 1.2) || 1);
      ease_factor = Math.max(1.3, ease_factor - 0.15);
      repetitions = Math.max(1, repetitions);
      break;
    case 'good':
      if (repetitions === 0) interval_days = 1;
      else if (repetitions === 1) interval_days = 3;
      else if (repetitions === 2) interval_days = 7;
      else interval_days = Math.max(1, Math.round(interval_days * ease_factor));
      repetitions += 1;
      break;
    case 'easy':
      if (repetitions === 0) interval_days = 3;
      else interval_days = Math.max(1, Math.round(Math.max(interval_days, 1) * ease_factor * 1.3));
      repetitions += 1;
      ease_factor = Math.min(3.0, ease_factor + 0.15);
      break;
  }

  const next = addDays(parseISO(today), interval_days);
  return {
    repetitions,
    interval_days,
    ease_factor,
    next_review_date: formatDate(next),
    last_reviewed_at: new Date().toISOString(),
  };
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const RATING_LABELS: Record<ReviewRating, string> = {
  again: 'Again',
  hard: 'Hard',
  good: 'Good',
  easy: 'Easy',
};

export const RATING_HINTS: Record<ReviewRating, string> = {
  again: '1 day',
  hard: 'Sooner',
  good: 'Standard',
  easy: 'Later',
};
