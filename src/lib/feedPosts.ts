import { supabase } from './supabase';
import { todayKey } from './date';

export async function upsertTodayPost(userId: string, body: string): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed) return;
  await supabase.from('feed_posts').upsert(
    { user_id: userId, for_date: todayKey(), body: trimmed, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,for_date' }
  );
}

export async function deleteTodayPost(userId: string): Promise<void> {
  await supabase.from('feed_posts').delete().eq('user_id', userId).eq('for_date', todayKey());
}
