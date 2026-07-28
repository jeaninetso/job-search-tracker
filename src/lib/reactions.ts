import { supabase } from './supabase';
import { todayKey } from './date';

export const PRAYER_EMOJI = '🙏';

/** Reacts and awards the reactor +1 XP. A repeat reaction on the same post (unique violation) is a silent no-op. */
export async function addPrayerReaction(postId: string, fromUserId: string): Promise<void> {
  const { data, error } = await supabase
    .from('feed_reactions')
    .insert({ post_id: postId, from_user_id: fromUserId, emoji: PRAYER_EMOJI })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return;
    throw error;
  }

  // The XP event's reaction_id FK cascades on delete, so un-reacting
  // (below) claws the XP back automatically - no separate retract call.
  await supabase.from('xp_events').insert({
    user_id: fromUserId,
    amount: 1,
    reason: 'prayer_given',
    reaction_id: data.id,
    for_date: todayKey(),
  });
}

export async function removePrayerReaction(postId: string, fromUserId: string): Promise<void> {
  await supabase.from('feed_reactions').delete().match({
    post_id: postId,
    from_user_id: fromUserId,
    emoji: PRAYER_EMOJI,
  });
}
