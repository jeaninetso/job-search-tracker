# Job Search Tracker

Shared accountability tool for a friend group job-searching together. Each
person sets their own daily checklist (count-based goals like "apply to 5
jobs," or yes/no goals like "worked on portfolio," with optional OR
alternatives). Completing every item on your checklist keeps your streak
alive. Everyone can see the group's status, no ranking.

## First-time setup

1. **Supabase project**
   - Create a project at [supabase.com](https://supabase.com).
   - Go to the SQL Editor, paste everything in `supabase/schema.sql` into a
     new query, and run it.
   - Go to Settings → API Keys and copy the **Project URL** and the
     **publishable key** (labeled `sb_publishable_...` — this is the modern
     name for what used to be called the "anon key"; same purpose, safe for
     client-side use).
   - Go to Authentication → Providers → Email and make sure "Confirm email"
     is off (or configure it) so magic links work smoothly. Under
     Authentication → URL Configuration, add your deployed URL (and
     `http://localhost:5183` for local dev) to the redirect allow list.

2. **Local env**
   ```bash
   cp .env.local.example .env.local
   # then fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
   ```

3. **Run locally**
   ```bash
   npm install
   npm run dev
   ```

## Deploying (Vercel)

1. Push this repo to GitHub.
2. In Vercel, "Add New Project" → import the repo.
3. Add the two env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in
   Vercel's project settings.
4. Deploy. Add the resulting `*.vercel.app` URL to Supabase's redirect allow
   list (Authentication → URL Configuration).

## Known v1 limitations (by design, revisit if the group grows)

- **No invite-code gate.** Anyone with the app URL can enter an email and get
  an account with full read access to the group's goals and progress. Fine
  for a small group you personally shared the link with; reconsider before
  posting the link anywhere public.
- **No push/email notifications.** Check-ins are in-app only.
- **Streak history is capped at 60 days** of lookback for performance — not
  an issue until someone's streak actually exceeds that.
- Editing your checklist reshapes how past days are evaluated (there's no
  historical snapshot of what your goals were on a given day).
