-- Adds avatar/bio/status to profiles. Run this in the Supabase SQL Editor
-- against an existing project that already ran the original schema.sql.
-- (New projects: this is already folded into schema.sql, no need to run
-- both.)

alter table public.profiles
  add column if not exists avatar_key text,
  add column if not exists bio text check (bio is null or char_length(bio) <= 280),
  add column if not exists status text;
