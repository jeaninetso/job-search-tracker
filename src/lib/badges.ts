import { supabase } from './supabase';

/** Keys of the seeded badge catalog (supabase/migrations/005_xp_and_badges.sql). */
export type BadgeKey = 'streak_7' | 'streak_30' | 'streak_100';

/**
 * Awards a badge, incrementing times_earned if the user already has it.
 * Badges are repeatable (e.g. hitting a 7-day streak again after a reset).
 */
export async function awardBadge(userId: string, key: BadgeKey): Promise<void> {
  const { data: badge } = await supabase.from('badges').select('id').eq('key', key).maybeSingle();
  if (!badge) return;

  const { data: existing } = await supabase
    .from('user_badges')
    .select('times_earned')
    .eq('user_id', userId)
    .eq('badge_id', badge.id)
    .maybeSingle();

  await supabase.from('user_badges').upsert(
    {
      user_id: userId,
      badge_id: badge.id,
      times_earned: (existing?.times_earned ?? 0) + 1,
      last_earned_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,badge_id' }
  );
}
