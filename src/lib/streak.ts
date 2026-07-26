import { subDays } from 'date-fns';
import type { DailyProgress, GoalItem } from '../types';
import { evaluateGroups, isDayComplete } from './goals';
import { dateKey } from './date';

function buildDayCompletionChecker(allItems: GoalItem[], progressRows: DailyProgress[]) {
  const itemsByDate = new Map<string, GoalItem[]>();
  for (const item of allItems) {
    const list = itemsByDate.get(item.for_date) ?? [];
    list.push(item);
    itemsByDate.set(item.for_date, list);
  }

  const progressByDate = new Map<string, Map<string, DailyProgress>>();
  for (const row of progressRows) {
    const byItem = progressByDate.get(row.entry_date) ?? new Map<string, DailyProgress>();
    byItem.set(row.goal_item_id, row);
    progressByDate.set(row.entry_date, byItem);
  }

  return (date: Date): boolean => {
    const key = dateKey(date);
    const dayItems = itemsByDate.get(key) ?? [];
    if (dayItems.length === 0) return false;
    const byItem = progressByDate.get(key) ?? new Map<string, DailyProgress>();
    return isDayComplete(evaluateGroups(dayItems, byItem));
  };
}

/**
 * Computes the current streak length for a user.
 *
 * `allItems` spans many dates (each item's own for_date scopes it to one
 * day) - grouped here by for_date so each day is evaluated against
 * whatever checklist actually existed for that day. Today only counts
 * once it's actually complete; an incomplete "today" doesn't break the
 * streak, it just isn't counted yet.
 */
export function computeStreak(
  allItems: GoalItem[],
  progressRows: DailyProgress[],
  today: Date
): number {
  if (allItems.length === 0) return 0;

  const dayIsComplete = buildDayCompletionChecker(allItems, progressRows);

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

export interface DayStatus {
  dateKey: string;
  complete: boolean;
}

/** Completion status for the last `count` days, oldest first, today last - powers the waypoint rail. */
export function computeRecentDayStatuses(
  allItems: GoalItem[],
  progressRows: DailyProgress[],
  today: Date,
  count = 7
): DayStatus[] {
  const dayIsComplete = buildDayCompletionChecker(allItems, progressRows);
  const statuses: DayStatus[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const date = subDays(today, i);
    statuses.push({ dateKey: dateKey(date), complete: dayIsComplete(date) });
  }
  return statuses;
}

/** More flames at longer streaks - a small visual reward for consistency. */
export function getStreakFlames(streak: number): string {
  if (streak >= 30) return '🔥🔥🔥';
  if (streak >= 7) return '🔥🔥';
  if (streak >= 1) return '🔥';
  return '💤';
}
