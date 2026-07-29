-- Time-boxed (or open-ended) group challenges. One underlying system
-- covers both flavors discussed: per-person progress bars, or one
-- combined group total for shared celebration - controlled by
-- display_mode rather than being two separate features.
--
-- No participants table: everyone in the app is implicitly a
-- participant in every challenge (small trusted group, not a public app
-- with strangers to gate) - individual-mode progress is just computed
-- per profile directly. If opt-in joining is ever wanted, add a
-- participants table then rather than building unused gating now.

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  start_date date not null default current_date,
  end_date date, -- nullable: open-ended group goals are allowed, not just fixed sprints
  display_mode text not null check (display_mode in ('individual', 'aggregate')),
  created_at timestamptz not null default now()
);

alter table public.challenges enable row level security;

create policy "challenges are readable by any authenticated user"
  on public.challenges for select
  to authenticated
  using (true);

create policy "any authenticated user can create a challenge"
  on public.challenges for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "creators manage their own challenges"
  on public.challenges for update
  to authenticated
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

create policy "creators delete their own challenges"
  on public.challenges for delete
  to authenticated
  using (auth.uid() = created_by);

-- Creator-defined buckets within a challenge, e.g. "Applications" -> 20.
create table public.challenge_categories (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  label text not null,
  target_count int not null check (target_count > 0)
);

alter table public.challenge_categories enable row level security;

create policy "challenge categories are readable by any authenticated user"
  on public.challenge_categories for select
  to authenticated
  using (true);

create policy "challenge creators manage their categories"
  on public.challenge_categories for all
  to authenticated
  using (exists (
    select 1 from public.challenges
    where challenges.id = challenge_categories.challenge_id
    and challenges.created_by = auth.uid()
  ))
  with check (exists (
    select 1 from public.challenges
    where challenges.id = challenge_categories.challenge_id
    and challenges.created_by = auth.uid()
  ));

-- Attributing a real completed checklist item to a category - never a
-- hand-typed number. `amount` carries the item's own completed value
-- (a count item's current_value, or 1 for a boolean) so e.g. "Apply to
-- 5 jobs" reaching 5 contributes 5 toward the group total, not 1.
create table public.challenge_submissions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.challenge_categories (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  goal_item_id uuid not null references public.goal_items (id) on delete cascade,
  amount int not null check (amount > 0),
  submitted_at timestamptz not null default now(),
  unique (category_id, user_id, goal_item_id)
);

alter table public.challenge_submissions enable row level security;

create policy "challenge submissions are readable by any authenticated user"
  on public.challenge_submissions for select
  to authenticated
  using (true);

create policy "users manage their own challenge submissions"
  on public.challenge_submissions for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index challenge_submissions_category_idx on public.challenge_submissions (category_id);
