# Lotus

A gamified vocabulary-learning mobile app. Log a new word each day to "water" your virtual plant, build a streak, and grow a Word Bank you can review later.

Built with **Expo SDK 54 + React Native + TypeScript** on top of **Supabase** (Auth + Postgres + RLS) and the **Free Dictionary API**.

> **Expo Go:** This project targets **SDK 54** (matches the current Expo Go app). If you upgrade Expo Go to SDK 56+ later, you can bump the project with `npx expo install expo@latest` and `npx expo install --fix`.

---

## 1. Quick start

```bash
cd lotus
npm install --legacy-peer-deps   # if reinstalling
cp .env.example .env             # then fill in your Supabase keys
npm start
```

Open the QR in the Expo Go app on your phone, or press `w` for web.

> The first run with empty `.env` will boot to a friendly "Setup needed" screen until you provide credentials.

---

## 2. Supabase setup

1. Create a free project at https://supabase.com.
2. In **Project Settings → API**, copy:
   - `Project URL`
   - `anon public` key
3. Paste into your local `.env`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```
4. Open the **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](./supabase/schema.sql), and run it. This creates:
   - `profiles` (1:1 with `auth.users`, auto-created on sign-up)
   - `flashcards`
   - `featured_words` (seeded with 15 starter words)
   - All Row-Level Security policies
5. (Optional) In **Authentication → Providers → Email**, decide whether to require email confirmation. The app handles both flows.

Restart `expo start` after editing `.env`.

---

## 3. Project layout

```
lotus/
├── app/                       # Expo Router routes
│   ├── _layout.tsx            # Root providers + status bar
│   ├── index.tsx              # Auth gate (redirects to (auth) or (tabs))
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── sign-in.tsx
│   │   └── sign-up.tsx
│   └── (tabs)/
│       ├── _layout.tsx        # Bottom tabs
│       ├── index.tsx          # Garden (dashboard)
│       ├── wordbank.tsx
│       ├── calendar.tsx
│       └── profile.tsx
├── components/                # Reusable UI (Button, Plant, Flashcard, ...)
├── lib/                       # Supabase, Dictionary API, plant logic, etc.
├── providers/                 # AuthProvider, AppProviders (RQ + GestureHandler)
├── theme/                     # Colors, spacing, typography
└── supabase/
    └── schema.sql             # One-shot DB setup
```

---

## 4. Core mechanics

| Feature | Where |
|---|---|
| Plant growth thresholds | `lib/plant.ts` (`STAGE_THRESHOLDS`) |
| Hydration state machine | `lib/plant.ts` (`hydrationFor`) |
| Streak update on log | `lib/db.ts` (`applyDailyLogToProfile`) |
| Daily reset (local TZ) | `lib/timezone.ts` (`todayInTimezone`) |
| Free-tier daily cap | `app/(tabs)/index.tsx` + `UpsellModal` |
| Dictionary lookup w/ manual fallback | `lib/dictionary.ts` + Garden modal |
| Calendar visual archive | `app/(tabs)/calendar.tsx` |
| Daily reminder notification | `lib/notifications.ts` |

### Plant stages

| Stage | Words required |
|---|---|
| Seed | 0 |
| Seedling | 5 |
| Sprout | 20 |
| Sapling | 50 |
| Young Tree | 100 |
| Mature Tree | 150 |

### Hydration

- **Watered** — a card was logged today (local timezone).
- **Thirsty** — missed today, but missed ≤ 2 days.
- **Wilted** — missed 3+ days. Comes back to "watered" the moment you log a new word; it never permanently dies (per PRD).

---

## 5. Premium tier

Currently a **stub**: the Profile screen has a Switch that flips `profiles.is_premium`. When `is_premium = true`, the daily card limit is removed and the upsell modal is suppressed.

To wire up real billing later, add a Supabase Edge Function for Stripe webhooks (or RevenueCat) and update that flag.

---

## 6. Notifications

The Profile screen has a "Daily reminder" toggle that schedules an 8 PM local notification ("Water your plant — don't break your streak!") via `expo-notifications`. Works in dev with Expo Go on Android; iOS Expo Go has limitations — for production iOS, use a dev build (`eas build`).

---

## 7. Useful scripts

```bash
npm start              # Expo dev server
npm run android        # Open Android emulator
npm run ios            # iOS simulator (macOS only)
npm run web            # Web preview
npx tsc --noEmit       # Type-check
```

---

## 8. Roadmap (post-MVP)

- [ ] Spaced-repetition review queue (the PRD nods to this)
- [ ] "Streak Saver" / "Fertilizer" reward (review N old cards)
- [ ] Real IAP via RevenueCat / Stripe
- [ ] Rare/exotic premium plants
- [ ] Audio playback for phonetics
- [ ] Social sharing of plant snapshots
