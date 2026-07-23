import type { DailyProgress, GoalGroupStatus, GoalItem } from '../types';

/** Groups a user's active goal items by group_id (OR conditions share a group_id). */
export function groupGoalItems(items: GoalItem[]): GoalItem[][] {
  const byGroup = new Map<string, GoalItem[]>();
  for (const item of items) {
    if (item.archived_at) continue;
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
  progressByItemId: Map<string, DailyProgress>
): GoalGroupStatus[] {
  return groupGoalItems(items).map((groupItems) => ({
    group_id: groupItems[0].group_id,
    items: groupItems,
    satisfied: groupItems.some((item) => isItemSatisfied(item, progressByItemId.get(item.id))),
  }));
}

/** A day counts as "complete" only if every group has at least one satisfied item. */
export function isDayComplete(groups: GoalGroupStatus[]): boolean {
  return groups.length > 0 && groups.every((g) => g.satisfied);
}
