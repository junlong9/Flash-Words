import type { PlantStage, PlantHydration } from './types';
import { daysBetween, todayInTimezone } from './timezone';

/** XP awarded for the first word logged on a calendar day. */
export const GROWTH_XP_FIRST_DAILY = 1.0;
/** XP for each additional word the same day (much lower). */
export const GROWTH_XP_REPEAT_DAILY = 0.15;

export type PlantState = {
  stage: PlantStage;
  hydration: PlantHydration;
  growthXp: number;
  progressToNext: number;
  intraStageProgress: number;
  foliageScale: number;
  nextStageAt: number | null;
  nextStageLabel: PlantStage | null;
};

export const PLANT_STAGE_LABELS: Record<PlantStage, string> = {
  seed: 'Seed',
  seedling: 'Seedling',
  sprout: 'Sprout',
  sapling: 'Sapling',
  young_tree: 'Young Tree',
  mature_tree: 'Mature Tree',
};

/** ~1 XP/day reaches mature in ~9 days — tuned for multi-plant gardens later. */
const STAGE_THRESHOLDS: Array<{ stage: PlantStage; minXp: number }> = [
  { stage: 'seed', minXp: 0 },
  { stage: 'seedling', minXp: 1 },
  { stage: 'sprout', minXp: 2 },
  { stage: 'sapling', minXp: 4 },
  { stage: 'young_tree', minXp: 6 },
  { stage: 'mature_tree', minXp: 9 },
];

export const STAGE_XP_PRESETS: Array<{ stage: PlantStage; xp: number; label: string }> =
  STAGE_THRESHOLDS.map((t) => ({
    stage: t.stage,
    xp: t.minXp,
    label: PLANT_STAGE_LABELS[t.stage],
  }));

export function xpForWatering(cardsTodayBefore: number): number {
  return cardsTodayBefore === 0 ? GROWTH_XP_FIRST_DAILY : GROWTH_XP_REPEAT_DAILY;
}

export function stageForGrowthXp(xp: number): PlantStage {
  let stage: PlantStage = 'seed';
  for (const t of STAGE_THRESHOLDS) {
    if (xp >= t.minXp) stage = t.stage;
  }
  return stage;
}

export function stageThresholdXp(stage: PlantStage): number {
  return STAGE_THRESHOLDS.find((t) => t.stage === stage)?.minXp ?? 0;
}

export function nextStageThresholdXp(xp: number): number | null {
  for (const t of STAGE_THRESHOLDS) {
    if (xp < t.minXp) return t.minXp;
  }
  return null;
}

export function nextStageLabel(xp: number): PlantStage | null {
  for (const t of STAGE_THRESHOLDS) {
    if (xp < t.minXp) return t.stage;
  }
  return null;
}

export function previousStageThresholdXp(xp: number): number | null {
  const stage = stageForGrowthXp(xp);
  const idx = STAGE_THRESHOLDS.findIndex((t) => t.stage === stage);
  if (idx <= 0) return null;
  return STAGE_THRESHOLDS[idx - 1].minXp;
}

export function previousStageLabel(xp: number): PlantStage | null {
  const prevXp = previousStageThresholdXp(xp);
  if (prevXp === null) return null;
  return stageForGrowthXp(prevXp);
}

export function progressToNextStageXp(xp: number): number {
  const next = nextStageThresholdXp(xp);
  if (next === null) return 1;
  const stage = stageForGrowthXp(xp);
  const prev = stageThresholdXp(stage);
  if (next <= prev) return 1;
  return Math.min(1, Math.max(0, (xp - prev) / (next - prev)));
}

export function intraStageProgressXp(xp: number): number {
  return progressToNextStageXp(xp);
}

export function foliageScaleForXp(xp: number): number {
  const stage = stageForGrowthXp(xp);
  const stageBase: Record<PlantStage, number> = {
    seed: 0.78,
    seedling: 0.86,
    sprout: 0.92,
    sapling: 0.98,
    young_tree: 1.04,
    mature_tree: 1.1,
  };
  const intra = intraStageProgressXp(xp);
  return stageBase[stage] + intra * 0.28;
}

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
  growthXp: number;
  lastLoggedDate: string | null;
  timezone: string;
}): PlantState {
  const growthXp = Math.max(0, opts.growthXp);
  const nextAt = nextStageThresholdXp(growthXp);
  return {
    stage: stageForGrowthXp(growthXp),
    hydration: hydrationFor(opts.lastLoggedDate, opts.timezone),
    growthXp,
    progressToNext: progressToNextStageXp(growthXp),
    intraStageProgress: intraStageProgressXp(growthXp),
    foliageScale: foliageScaleForXp(growthXp),
    nextStageAt: nextAt,
    nextStageLabel: nextStageLabel(growthXp),
  };
}

export function stageForTotalWords(total: number): PlantStage {
  return stageForGrowthXp(total);
}
