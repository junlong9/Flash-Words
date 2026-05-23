-- Spaced repetition fields on flashcards (run once in Supabase SQL editor)
alter table public.flashcards
  add column if not exists repetitions int not null default 0,
  add column if not exists interval_days int not null default 0,
  add column if not exists ease_factor numeric(4,2) not null default 2.5,
  add column if not exists next_review_date date,
  add column if not exists last_reviewed_at timestamptz;

create index if not exists flashcards_user_review_idx
  on public.flashcards (user_id, next_review_date);

drop policy if exists "flashcards self update" on public.flashcards;
create policy "flashcards self update"
  on public.flashcards for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
