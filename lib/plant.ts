import type { PlantStage, PlantHydration } from './types';
import { daysBetween, todayInTimezone } from './timezone';

export type PlantState = {
  stage: PlantStage;
  hydration: PlantHydration;
  nextStageAt: number | null; // total_words required for next stage; null if max
  progressToNext: number;     // 0..1
};

const STAGE_THRESHOLDS: Array<{ stage: PlantStage; min: number }> = [
  { stage: 'seed',        min: 0 },
  { stage: 'seedling',    min: 5 },
  { stage: 'sprout',      min: 20 },
  { stage: 'sapling',     min: 50 },
  { stage: 'young_tree',  min: 100 },
  { stage: 'mature_tree', min: 150 },
];

export const PLANT_STAGE_LABELS: Record<PlantStage, string> = {
  seed: 'Seed',
  seedling: 'Seedling',
  sprout: 'Sprout',
  sapling: 'Sapling',
  young_tree: 'Young Tree',
  mature_tree: 'Mature Tree',
};

export function stageForTotalWords(total: number): PlantStage {
  let stage: PlantStage = 'seed';
  for (const t of STAGE_THRESHOLDS) {
    if (total >= t.min) stage = t.stage;
  }
  return stage;
}

export function nextStageThreshold(total: number): number | null {
  for (const t of STAGE_THRESHOLDS) {
    if (total < t.min) return t.min;
  }
  return null;
}

export function progressToNextStage(total: number): number {
  const next = nextStageThreshold(total);
  if (next === null) return 1;
  let prev = 0;
  for (const t of STAGE_THRESHOLDS) {
    if (t.min <= total) prev = t.min;
  }
  if (next <= prev) return 1;
  return Math.min(1, Math.max(0, (total - prev) / (next - prev)));
}

/**
 * Determine the current hydration state of the plant.
 *  - watered: a word was logged today (local tz)
 *  - thirsty: missed today, but missed <= 2 days ago
 *  - wilted:  missed 3+ days
 */
export function hydrationFor(
  lastLoggedDate: string | null,
  timezone: string
): PlantHydration {
  if (!lastLoggedDate) return 'thirsty';
  const today = todayInTimezone(timezone);
  const gap = daysBetween(lastLoggedDate, today);
  if (gap <= 0) return 'watered';
  if (gap <= 2) return 'thirsty';
  return 'wilted';
}

export function plantStateFor(opts: {
  totalWords: number;
  lastLoggedDate: string | null;
  timezone: string;
}): PlantState {
  return {
    stage: stageForTotalWords(opts.totalWords),
    hydration: hydrationFor(opts.lastLoggedDate, opts.timezone),
    nextStageAt: nextStageThreshold(opts.totalWords),
    progressToNext: progressToNextStage(opts.totalWords),
  };
}
