# Detailed plant art for Lotus

The in-app plant is built with **SVG + Reanimated** today. That works well for a clean, scalable look with growth animations, but **truly cinematic detail** usually comes from dedicated animation assets.

## Recommended paths (best → good)

### 1. Rive (best for interactive growth)
- Design in [rive.app](https://rive.app) with **state machines**: `seed` → `seedling` → … → `mature`, plus `watered` / `thirsty` / `wilted`.
- Export `.riv`, load with `@rive-app/react-native` (dev build required; not Expo Go).
- Wire `plant_growth_xp` and hydration to Rive inputs for smooth, frame-by-frame art.

### 2. Lottie (best for polished loops)
- Animate in After Effects, export JSON via [LottieFiles](https://lottiefiles.com).
- Use `lottie-react-native` — one animation per stage, or one timeline with markers.
- Great for watering splash, idle sway, and stage transitions.

### 3. Illustrated sprite sheets
- Commission 6–12 PNG sequences (or one atlas) per stage from an illustrator on Fiverr / Behance.
- Swap images based on `stageForGrowthXp()`; cross-fade with Reanimated.

### 4. Enhanced SVG (what we use now)
- Pros: no extra deps, works in Expo Go, tiny bundle, easy to tint by hydration.
- Cons: hard to reach “game-quality” detail without huge path count.
- Our SVG adds: terracotta pot + saucer, soil gradient, moss, serrated leaves, stem shadows, canopy depth, and **foliage scale** tied to growth XP.

## Growth XP (already in the app)

| Action | XP |
|--------|-----|
| First word of the day | **1.0** |
| Each extra word same day | **0.15** |

Stages (by total XP): Seed 0 · Seedling 1 · Sprout 2 · Sapling 4 · Young tree 6 · Mature tree 9 (~9 days of daily words).

Within each stage, `foliageScale` increases slightly so every watering produces a visible (tiny) growth bump.

## Dev preview buttons

On the Garden screen in development builds (`__DEV__`), use:
- **Simulate first water** — +1.0 XP + bounce animation
- **Simulate extra water** — +0.15 XP
- **Jump to next stage** — snaps XP to the next threshold

Remove these before production (`__DEV__` guard already hides them in release builds).

## Suggested production pipeline

1. Lock stage count + hydration states in `lib/plant.ts`.
2. Brief an artist with reference screenshots from the app.
3. Prototype one stage in Rive/Lottie, integrate in a **development build** (`eas build`).
4. Replace `<AnimatedPlant />` with the asset component; keep the same props (`stage`, `hydration`, `foliageScale`, `waterPulse`).
