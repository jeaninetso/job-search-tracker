-- Job Search Tracker schema
-- Run this in the Supabase SQL editor (Project > SQL Editor > New query)
-- Single shared group: everyone who signs up via the invite link is in the same group.

-- Profiles ---------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
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

-- Goal items ---------------------------------------------------------------
-- Each row is one checklist item a user has defined for themselves.
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
  archived_at timestamptz,
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
