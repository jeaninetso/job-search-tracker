-- Job Search Tracker schema
-- Run this in the Supabase SQL editor (Project > SQL Editor > New query)
-- Single shared group: everyone who signs up via the invite link is in the same group.

-- Profiles ---------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_key text,
  bio text check (bio is null or char_length(bio) <= 280),
  status text,
  total_xp int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are readable by any authenticated user"
  on public.profiles for select
  to authenticated
  using (true);

create policy "users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Deleting a profile cascades away everything else the user owns via the
-- FK "on delete cascade" clauses on every table below - this does NOT
-- delete the underlying Supabase Auth user, which needs a service-role
-- (Edge Function) delete or manual removal in the Supabase dashboard.
create policy "users can delete their own profile"
  on public.profiles for delete
  to authenticated
  using (auth.uid() = id);

-- Goal items ---------------------------------------------------------------
-- Each row is one checklist item for one specific calendar date (for_date).
-- Every day is fully independent - editing/deleting a goal only ever
-- affects that date's row. A new day with nothing set up yet gets
-- auto-copied forward from the user's most recent day that has items
-- (see src/lib/carryForward.ts) rather than starting from a shared
-- recurring template.
-- Items sharing the same group_id are an OR condition: the group counts as
-- "done" for the day if ANY item in the group is satisfied. A goal with no
-- OR partner is simply the sole member of its own group.
create table public.goal_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  group_id uuid not null default gen_random_uuid(),
  label text not null,
  kind text not null check (kind in ('count', 'boolean')),
  target int check (kind != 'count' or target > 0),
  sort_order int not null default 0,
  for_date date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.goal_items enable row level security;

create policy "goal items are readable by any authenticated user"
  on public.goal_items for select
  to authenticated
  using (true);

create policy "users manage their own goal items"
  on public.goal_items for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Daily progress ---------------------------------------------------------------
-- One row per user, per day, per goal item. Upserted as the user logs
-- through the day (count items increment current_value, boolean items flip
-- current_done).
create table public.daily_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  goal_item_id uuid not null references public.goal_items (id) on delete cascade,
  entry_date date not null default current_date,
  current_value int not null default 0,
  current_done boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (user_id, goal_item_id, entry_date)
);

alter table public.daily_progress enable row level security;

create policy "daily progress is readable by any authenticated user"
  on public.daily_progress for select
  to authenticated
  using (true);

create policy "users manage their own daily progress"
  on public.daily_progress for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index daily_progress_user_date_idx on public.daily_progress (user_id, entry_date);

-- Feed posts and reactions ---------------------------------------------------------------
-- A free-text daily note ("Interview at Google today") is what a prayer
-- reaction actually attaches to - one per user per day.
create table public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  for_date date not null default current_date,
  body text not null check (char_length(body) between 1 and 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, for_date)
);

alter table public.feed_posts enable row level security;

create policy "feed posts are readable by any authenticated user"
  on public.feed_posts for select
  to authenticated
  using (true);

create policy "users manage their own feed posts"
  on public.feed_posts for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Emoji is constrained to just prayer-hands for now - widen this check
-- constraint later if more reaction types are added.
create table public.feed_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts (id) on delete cascade,
  from_user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null check (emoji in ('🙏')),
  created_at timestamptz not null default now(),
  unique (post_id, from_user_id, emoji)
);

alter table public.feed_reactions enable row level security;

create policy "feed reactions are readable by any authenticated user"
  on public.feed_reactions for select
  to authenticated
  using (true);

create policy "users manage their own reactions"
  on public.feed_reactions for all
  to authenticated
  using (auth.uid() = from_user_id)
  with check (auth.uid() = from_user_id);

-- XP and badges ---------------------------------------------------------------
-- XP is a personal progress metric, not a leaderboard - The Group stays
-- "visibility, not ranking." Amounts are baked into a check constraint so a
-- client bug can't silently mis-award XP: +2 per checklist item completed,
-- +5 for finishing the whole day, +25/+100/+300 for a 7/30/100-day streak,
-- +1 for giving a prayer reaction.
create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount int not null check (amount > 0),
  reason text not null check (reason in ('item_completed', 'day_complete', 'streak_milestone', 'prayer_given')),
  goal_item_id uuid references public.goal_items (id) on delete cascade,
  streak_threshold int check (streak_threshold in (7, 30, 100)),
  reaction_id uuid references public.feed_reactions (id) on delete cascade,
  for_date date not null default current_date,
  created_at timestamptz not null default now(),
  constraint xp_events_shape check (
    (reason = 'item_completed' and goal_item_id is not null and streak_threshold is null and reaction_id is null and amount = 2)
    or (reason = 'day_complete' and goal_item_id is null and streak_threshold is null and reaction_id is null and amount = 5)
    or (
      reason = 'streak_milestone' and goal_item_id is null and streak_threshold is not null and reaction_id is null
      and amount = case streak_threshold when 7 then 25 when 30 then 100 when 100 then 300 end
    )
    or (reason = 'prayer_given' and goal_item_id is null and streak_threshold is null and reaction_id is not null and amount = 1)
  )
);

-- One item-completion award per item per day; one day-complete bonus per
-- day; one streak-milestone award per threshold per streak run (for_date
-- differs the next time the same threshold is crossed after a reset, so
-- it's earnable again - badges are repeatable, matching user_badges below);
-- one XP event per reaction (deleting the reaction cascades this away too).
create unique index xp_events_item_once_idx
  on public.xp_events (user_id, goal_item_id, for_date)
  where reason = 'item_completed';

create unique index xp_events_day_once_idx
  on public.xp_events (user_id, for_date)
  where reason = 'day_complete';

create unique index xp_events_reaction_once_idx
  on public.xp_events (reaction_id)
  where reason = 'prayer_given';

create unique index xp_events_streak_once_idx
  on public.xp_events (user_id, for_date, streak_threshold)
  where reason = 'streak_milestone';

alter table public.xp_events enable row level security;

create policy "xp events are readable by any authenticated user"
  on public.xp_events for select
  to authenticated
  using (true);

create policy "users manage their own xp events"
  on public.xp_events for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Keeps profiles.total_xp in sync with the ledger regardless of which
-- client path wrote the event - a DB invariant instead of scattered
-- client-side increment/decrement calls that could drift out of sync.
create or replace function public.bump_total_xp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set total_xp = total_xp + new.amount where id = new.user_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.profiles set total_xp = total_xp - old.amount where id = old.user_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger xp_events_bump_total
  after insert or delete on public.xp_events
  for each row execute function public.bump_total_xp();

-- Badges are seeded, not user-writable. Repeatable (times_earned) rather
-- than one-row-per-earn, matching Stridekick's "earn more than once,
-- tracked as a count" model.
create table public.badges (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  description text not null,
  emoji text not null,
  category text not null check (category in ('streak', 'challenge', 'social'))
);

alter table public.badges enable row level security;

create policy "badges are readable by any authenticated user"
  on public.badges for select
  to authenticated
  using (true);

insert into public.badges (key, label, description, emoji, category) values
  ('streak_7', 'Week Warrior', 'Kept a 7-day streak going.', '🔥', 'streak'),
  ('streak_30', 'Marathoner', 'Kept a 30-day streak going.', '🏅', 'streak'),
  ('streak_100', 'Centurion', 'Kept a 100-day streak going.', '💎', 'streak')
on conflict (key) do nothing;

create table public.user_badges (
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge_id uuid not null references public.badges (id) on delete cascade,
  times_earned int not null default 1 check (times_earned > 0),
  first_earned_at timestamptz not null default now(),
  last_earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

alter table public.user_badges enable row level security;

create policy "user badges are readable by any authenticated user"
  on public.user_badges for select
  to authenticated
  using (true);

create policy "users manage their own earned badges"
  on public.user_badges for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

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
