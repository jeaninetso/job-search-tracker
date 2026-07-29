-- profiles never had a delete policy (only select/insert/update). Needed
-- for a self-service "delete my account" flow: deleting the profile row
-- cascades away everything else the user owns (goal_items, daily_progress,
-- feed_posts, feed_reactions, xp_events, user_badges, challenges they
-- created, challenge_submissions) via the existing FK "on delete cascade"
-- clauses already in place on every one of those tables.
--
-- Note: this does NOT delete the underlying Supabase Auth user (auth.users
-- row) - that requires the service-role admin API, which must never run
-- from the browser. Deleting the profile only wipes the app data; the
-- login identity itself would need a server-side (Edge Function) delete,
-- or manual removal via the Supabase dashboard.
create policy "users can delete their own profile"
  on public.profiles for delete
  to authenticated
  using (auth.uid() = id);
