-- Adds free-text daily notes to the group feed (so there's something to
-- actually pray over - "Interview at Google today") and a prayer emoji
-- reaction on them. Reacting earns the reactor +1 XP; the reaction is the
-- source of truth (deleting it cascades away the XP event too, so
-- un-reacting can't leave stray XP behind).

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

-- Extend the XP ledger to cover prayer reactions ------------------------
alter table public.xp_events
  add column if not exists reaction_id uuid references public.feed_reactions (id) on delete cascade;

alter table public.xp_events drop constraint if exists xp_events_reason_check;
alter table public.xp_events
  add constraint xp_events_reason_check
  check (reason in ('item_completed', 'day_complete', 'streak_milestone', 'prayer_given'));

alter table public.xp_events drop constraint if exists xp_events_shape;
alter table public.xp_events
  add constraint xp_events_shape check (
    (reason = 'item_completed' and goal_item_id is not null and streak_threshold is null and reaction_id is null and amount = 2)
    or (reason = 'day_complete' and goal_item_id is null and streak_threshold is null and reaction_id is null and amount = 5)
    or (
      reason = 'streak_milestone' and goal_item_id is null and streak_threshold is not null and reaction_id is null
      and amount = case streak_threshold when 7 then 25 when 30 then 100 when 100 then 300 end
    )
    or (reason = 'prayer_given' and goal_item_id is null and streak_threshold is null and reaction_id is not null and amount = 1)
  );

-- One XP event per reaction - if the reaction is deleted (unreact), the
-- FK's on delete cascade above removes this row automatically, and the
-- existing bump_total_xp trigger claws back the XP.
create unique index xp_events_reaction_once_idx
  on public.xp_events (reaction_id)
  where reason = 'prayer_given';
