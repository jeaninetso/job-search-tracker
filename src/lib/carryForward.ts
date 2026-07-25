import { supabase } from './supabase';
import { todayKey } from './date';

/**
 * If the user has no checklist items for today yet, copies forward
 * whatever their most recent prior day's items were (whichever day that
 * was - handles gaps if the app wasn't opened for a few days). Brand new
 * users with no items at all are left alone (empty state prompts setup).
 * Idempotent - safe to call on every page load.
 */
export async function ensureTodayGoals(userId: string): Promise<void> {
  const today = todayKey();

  const { data: todayItems } = await supabase
    .from('goal_items')
    .select('id')
    .eq('user_id', userId)
    .eq('for_date', today)
    .limit(1);
  if (todayItems && todayItems.length > 0) return;

  const { data: mostRecent } = await supabase
    .from('goal_items')
    .select('for_date')
    .eq('user_id', userId)
    .lt('for_date', today)
    .order('for_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!mostRecent) return;

  const { data: priorItems } = await supabase
    .from('goal_items')
    .select('*')
    .eq('user_id', userId)
    .eq('for_date', mostRecent.for_date);
  if (!priorItems || priorItems.length === 0) return;

  await supabase.from('goal_items').insert(
    priorItems.map((item) => ({
      user_id: userId,
      group_id: item.group_id,
      label: item.label,
      kind: item.kind,
      target: item.target,
      sort_order: item.sort_order,
      for_date: today,
    }))
  );
}
