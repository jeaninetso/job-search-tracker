import { supabase } from './supabase';
import { awardBadge, type BadgeKey } from './badges';

const UNIQUE_VIOLATION = '23505';

/** Inserts an xp_events row, treating "already awarded" (unique violation) as a silent no-op. */
async function tryInsert(row: {
  user_id: string;
  amount: number;
  reason: 'item_completed' | 'day_complete' | 'streak_milestone';
  goal_item_id?: string;
  streak_threshold?: number;
  for_date: string;
}): Promise<void> {
  const { error } = await supabase.from('xp_events').insert(row);
  if (error && error.code !== UNIQUE_VIOLATION) throw error;
}

/** Deleting a row that doesn't exist is a harmless no-op - safe to call even if nothing was awarded. */
async function tryDelete(match: Record<string, string>): Promise<void> {
  await supabase.from('xp_events').delete().match(match);
}

export async function awardItemCompletionXp(userId: string, goalItemId: string, forDate: string): Promise<void> {
  await tryInsert({
    user_id: userId,
    amount: 2,
    reason: 'item_completed',
    goal_item_id: goalItemId,
    for_date: forDate,
  });
}

export async function retractItemCompletionXp(userId: string, goalItemId: string, forDate: string): Promise<void> {
  await tryDelete({
    user_id: userId,
    goal_item_id: goalItemId,
    for_date: forDate,
    reason: 'item_completed',
  });
}

export async function awardDayCompleteXp(userId: string, forDate: string): Promise<void> {
  await tryInsert({ user_id: userId, amount: 5, reason: 'day_complete', for_date: forDate });
}

export async function retractDayCompleteXp(userId: string, forDate: string): Promise<void> {
  await tryDelete({ user_id: userId, for_date: forDate, reason: 'day_complete' });
}

const STREAK_MILESTONE_XP: Record<number, number> = { 7: 25, 30: 100, 100: 300 };
const STREAK_MILESTONE_BADGE: Record<number, BadgeKey> = {
  7: 'streak_7',
  30: 'streak_30',
  100: 'streak_100',
};

/** Awards streak-milestone XP + the matching badge the moment a streak hits 7/30/100. Idempotent per streak run. */
export async function checkStreakMilestone(userId: string, streak: number, forDate: string): Promise<void> {
  const amount = STREAK_MILESTONE_XP[streak];
  if (!amount) return;

  const { error } = await supabase.from('xp_events').insert({
    user_id: userId,
    amount,
    reason: 'streak_milestone',
    streak_threshold: streak,
    for_date: forDate,
  });
  if (error) {
    if (error.code === UNIQUE_VIOLATION) return;
    throw error;
  }

  await awardBadge(userId, STREAK_MILESTONE_BADGE[streak]);
}
