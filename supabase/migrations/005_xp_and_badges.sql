-- Adds an XP/badges layer on top of the existing checklist + streak system.
-- XP is a personal progress metric, not a leaderboard - The Group stays
-- "visibility, not ranking." Amounts are baked into a check constraint so a
-- client bug can't silently mis-award XP: +2 per checklist item completed,
-- +5 for finishing the whole day, +25/+100/+300 for a 7/30/100-day streak.

alter table public.profiles
  add column if not exists total_xp int not null default 0;

-- Ledger of every XP award. Kept (not just a running total) so awards are
-- idempotent - toggling a checkbox on/off can't be farmed for repeat XP,
-- since re-awarding the same (user, item, date) hits the partial unique
-- index below and is rejected rather than silently duplicated.
create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount int not null check (amount > 0),
  reason text not null check (reason in ('item_completed', 'day_complete', 'streak_milestone')),
  goal_item_id uuid references public.goal_items (id) on delete cascade,
  streak_threshold int check (streak_threshold in (7, 30, 100)),
  for_date date not null default current_date,
  created_at timestamptz not null default now(),
  constraint xp_events_shape check (
    (reason = 'item_completed' and goal_item_id is not null and streak_threshold is null and amount = 2)
    or (reason = 'day_complete' and goal_item_id is null and streak_threshold is null and amount = 5)
    or (
      reason = 'streak_milestone' and goal_item_id is null and streak_threshold is not null
      and amount = case streak_threshold when 7 then 25 when 30 then 100 when 100 then 300 end
    )
  )
);

-- One item-completion award per item per day; one day-complete bonus per
-- day; one streak-milestone award per threshold per streak run (for_date
-- differs the next time the same threshold is crossed after a reset, so
-- it's earnable again - badges are repeatable, matching user_badges below).
create unique index xp_events_item_once_idx
  on public.xp_events (user_id, goal_item_id, for_date)
  where reason = 'item_completed';

create unique index xp_events_day_once_idx
  on public.xp_events (user_id, for_date)
  where reason = 'day_complete';

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

-- Badges ---------------------------------------------------------------
-- Catalog is seeded, not user-writable. Repeatable (times_earned) rather
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
