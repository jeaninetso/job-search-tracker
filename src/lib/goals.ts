import type { DailyProgress, GoalGroupStatus, GoalItem } from '../types';
import { dateKey, todayKey, weekdayOf } from './date';

/**
 * Was this item part of the checklist on the given day? Based on the
 * item's own created_at/archived_at, not "is it archived right now" - so
 * archiving a goal today doesn't retroactively change whether past days
 * met their requirements. Archiving takes effect the day it happens
 * (a day is still evaluated with the item if archived later that same day).
 * Also checks day_of_week - a Monday-only item doesn't count on any other day.
 */
export function isItemActiveOn(item: GoalItem, dayKey: string): boolean {
  if (dateKey(item.created_at) > dayKey) return false;
  if (item.archived_at && dateKey(item.archived_at) <= dayKey) return false;
  if (item.day_of_week !== null && item.day_of_week !== weekdayOf(dayKey)) return false;
  return true;
}

/** Groups the items active on a given day by group_id (OR conditions share a group_id). */
export function groupGoalItems(items: GoalItem[], dayKey: string = todayKey()): GoalItem[][] {
  const byGroup = new Map<string, GoalItem[]>();
  for (const item of items) {
    if (!isItemActiveOn(item, dayKey)) continue;
    const list = byGroup.get(item.group_id) ?? [];
    list.push(item);
    byGroup.set(item.group_id, list);
  }
  return [...byGroup.values()];
}

export function isItemSatisfied(item: GoalItem, progress: DailyProgress | undefined): boolean {
  if (!progress) return false;
  if (item.kind === 'boolean') return progress.current_done;
  return progress.current_value >= (item.target ?? Infinity);
}

/** A group (OR set) is satisfied if any item in it is satisfied. */
export function evaluateGroups(
  items: GoalItem[],
  progressByItemId: Map<string, DailyProgress>,
  dayKey: string = todayKey()
): GoalGroupStatus[] {
  return groupGoalItems(items, dayKey).map((groupItems) => ({
    group_id: groupItems[0].group_id,
    items: groupItems,
    satisfied: groupItems.some((item) => isItemSatisfied(item, progressByItemId.get(item.id))),
  }));
}

/** A day counts as "complete" only if every group has at least one satisfied item. */
export function isDayComplete(groups: GoalGroupStatus[]): boolean {
  return groups.length > 0 && groups.every((g) => g.satisfied);
}
