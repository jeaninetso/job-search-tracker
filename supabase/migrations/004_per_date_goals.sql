-- Replaces the day-of-week recurring model (migration 003) with fully
-- independent per-calendar-date checklists. Each goal_items row now
-- belongs to one specific date (for_date), not a repeating weekday.
-- Editing/deleting a goal only ever affects that one date's row.
--
-- Safe to run whether or not migration 003 was applied.

alter table public.goal_items drop column if exists day_of_week;
alter table public.goal_items drop column if exists archived_at;

alter table public.goal_items
  add column if not exists for_date date not null default current_date;

comment on column public.goal_items.for_date is
  'The single calendar date this checklist item belongs to. Each date is independent - no recurrence.';
