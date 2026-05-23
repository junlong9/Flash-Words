-- Add plant growth XP (run once in Supabase SQL editor)
alter table public.profiles
  add column if not exists plant_growth_xp numeric(10, 2) not null default 0;

-- Backfill from existing word counts (first daily word ≈ 1 XP each)
update public.profiles
set plant_growth_xp = total_words::numeric
where plant_growth_xp = 0 and total_words > 0;
