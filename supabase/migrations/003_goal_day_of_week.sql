-- Adds per-weekday assignment to goal items, enabling separate checklists
-- per day (e.g. a Monday-only goal vs a Saturday-only goal). Run this in
-- the Supabase SQL Editor against an existing project.
-- (New projects: already folded into schema.sql.)

alter table public.goal_items
  add column if not exists day_of_week smallint check (day_of_week is null or day_of_week between 0 and 6);

comment on column public.goal_items.day_of_week is
  '0=Sunday..6=Saturday (matches JS Date.getDay()). NULL means every day.';
