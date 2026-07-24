import { formatISO, subDays } from 'date-fns';
import type { DailyProgress, GoalItem } from '../types';
import { evaluateGroups, isDayComplete } from './goals';

/**
 * Computes the current streak length for a user.
 *
 * Uses the user's CURRENT active goal items to evaluate every past day.
 * This means editing your checklist retroactively reshapes how past days
 * read (a known, accepted simplification for v1 - we don't version goal
 * history). Today only counts once it's actually complete; an incomplete
 * "today" doesn't break the streak, it just isn't counted yet.
 */
export function computeStreak(
  activeItems: GoalItem[],
  progressRows: DailyProgress[],
  today: Date
): number {
  if (activeItems.length === 0) return 0;

  const progressByDate = new Map<string, Map<string, DailyProgress>>();
  for (const row of progressRows) {
    const byItem = progressByDate.get(row.entry_date) ?? new Map<string, DailyProgress>();
    byItem.set(row.goal_item_id, row);
    progressByDate.set(row.entry_date, byItem);
  }

  const dayIsComplete = (date: Date): boolean => {
    const key = formatISO(date, { representation: 'date' });
    const byItem = progressByDate.get(key) ?? new Map<string, DailyProgress>();
    return isDayComplete(evaluateGroups(activeItems, byItem));
  };

  let streak = 0;
  let cursor = today;

  if (dayIsComplete(cursor)) {
    streak += 1;
    cursor = subDays(cursor, 1);
  } else {
    cursor = subDays(cursor, 1);
  }

  while (dayIsComplete(cursor)) {
    streak += 1;
    cursor = subDays(cursor, 1);
  }

  return streak;
}

/** More flames at longer streaks - a small visual reward for consistency. */
export function getStreakFlames(streak: number): string {
  if (streak >= 30) return '🔥🔥🔥';
  if (streak >= 7) return '🔥🔥';
  if (streak >= 1) return '🔥';
  return '💤';
}
