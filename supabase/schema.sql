-- =====================================================================
-- Word Flash — Supabase schema
-- Run this in the Supabase SQL editor (Project → SQL → New query → Run).
-- Idempotent: safe to re-run.
-- =====================================================================

-- Extensions ----------------------------------------------------------
create extension if not exists "uuid-ossp";

-- =====================================================================
-- profiles
-- One row per auth user. Created automatically on sign-up via trigger.
-- =====================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  is_premium boolean not null default false,
  timezone text not null default 'UTC',
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_logged_date date,            -- in user's local tz
  total_words int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger: keep updated_at fresh
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.tg_set_updated_at();

-- Trigger: auto-create profile when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =====================================================================
-- flashcards
-- One per saved word. logged_date is the user's local-tz calendar date.
-- =====================================================================
create table if not exists public.flashcards (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word text not null,
  phonetic text,
  part_of_speech text,
  definitions jsonb not null default '[]'::jsonb,   -- [{definition, example, synonyms[]}]
  source text not null default 'dictionary_api',    -- dictionary_api | manual | featured
  is_manual boolean not null default false,
  logged_date date not null,                        -- local-tz date
  created_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists flashcards_user_date_idx
  on public.flashcards (user_id, logged_date desc);

create index if not exists flashcards_user_word_idx
  on public.flashcards (user_id, lower(word));

-- =====================================================================
-- featured_words (curated "Word of the Day")
-- Public read; only service role writes.
-- =====================================================================
create table if not exists public.featured_words (
  id uuid primary key default uuid_generate_v4(),
  word text not null unique,
  blurb text,
  created_at timestamptz not null default now()
);

-- Seed a small starter set (idempotent)
insert into public.featured_words (word, blurb) values
  ('serendipity',  'A pleasant surprise or fortunate accident.'),
  ('ephemeral',    'Lasting for a very short time.'),
  ('sonder',       'The realization that everyone has a life as vivid as your own.'),
  ('petrichor',    'The earthy scent after rain.'),
  ('luminous',     'Full of or shedding light; radiant.'),
  ('mellifluous',  'A sound that is pleasingly smooth and musical.'),
  ('quintessence', 'The most perfect example of a quality or class.'),
  ('halcyon',      'Denoting a period of time in the past that was idyllically happy.'),
  ('ineffable',    'Too great to be expressed in words.'),
  ('limerence',    'The state of being infatuated with another person.'),
  ('vellichor',    'The strange wistfulness of used bookshops.'),
  ('cynosure',     'A person or thing that is the centre of attention.'),
  ('redolent',     'Strongly reminiscent or suggestive of something.'),
  ('sanguine',     'Optimistic or positive, especially in a difficult situation.'),
  ('saudade',      'A deep emotional longing for an absent something or someone.')
on conflict (word) do nothing;

-- =====================================================================
-- Row-Level Security
-- =====================================================================
alter table public.profiles       enable row level security;
alter table public.flashcards     enable row level security;
alter table public.featured_words enable row level security;

-- profiles: a user can read & update their own row
drop policy if exists "profiles self select" on public.profiles;
create policy "profiles self select"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update"
  on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles self insert" on public.profiles;
create policy "profiles self insert"
  on public.profiles for insert
  with check (auth.uid() = id);

-- flashcards: full CRUD on own rows only
drop policy if exists "flashcards self select" on public.flashcards;
create policy "flashcards self select"
  on public.flashcards for select
  using (auth.uid() = user_id);

drop policy if exists "flashcards self insert" on public.flashcards;
create policy "flashcards self insert"
  on public.flashcards for insert
  with check (auth.uid() = user_id);

drop policy if exists "flashcards self update" on public.flashcards;
create policy "flashcards self update"
  on public.flashcards for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "flashcards self delete" on public.flashcards;
create policy "flashcards self delete"
  on public.flashcards for delete
  using (auth.uid() = user_id);

-- featured_words: world-readable
drop policy if exists "featured_words public read" on public.featured_words;
create policy "featured_words public read"
  on public.featured_words for select
  to anon, authenticated
  using (true);
