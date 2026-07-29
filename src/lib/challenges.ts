import { supabase } from './supabase';
import type { Challenge, ChallengeCategory, ChallengeSubmission, DailyProgress, GoalItem } from '../types';

export interface CategoryProgress {
  category: ChallengeCategory;
  /** Aggregate mode: one shared total. Individual mode: one entry per user who has submissions. */
  totalsByUser: Map<string, number>;
  groupTotal: number;
}

export function computeCategoryProgress(
  category: ChallengeCategory,
  submissions: ChallengeSubmission[]
): CategoryProgress {
  const totalsByUser = new Map<string, number>();
  let groupTotal = 0;
  for (const submission of submissions) {
    if (submission.category_id !== category.id) continue;
    totalsByUser.set(submission.user_id, (totalsByUser.get(submission.user_id) ?? 0) + submission.amount);
    groupTotal += submission.amount;
  }
  return { category, totalsByUser, groupTotal };
}

export interface EligibleItem {
  item: GoalItem;
  amount: number;
}

/**
 * A user's own completed items from the last 30 days that aren't yet
 * submitted to this category - count items with progress, or done
 * booleans. Amount mirrors the item's own completed value so e.g.
 * "Apply to 5 jobs" reaching 5 contributes 5, not 1.
 */
export function getEligibleItems(
  userItems: GoalItem[],
  userProgress: DailyProgress[],
  alreadySubmittedItemIds: Set<string>
): EligibleItem[] {
  const progressByItemId = new Map(userProgress.map((row) => [row.goal_item_id, row]));
  const eligible: EligibleItem[] = [];
  for (const item of userItems) {
    if (alreadySubmittedItemIds.has(item.id)) continue;
    const progress = progressByItemId.get(item.id);
    if (!progress) continue;
    if (item.kind === 'count' && progress.current_value > 0) {
      eligible.push({ item, amount: progress.current_value });
    } else if (item.kind === 'boolean' && progress.current_done) {
      eligible.push({ item, amount: 1 });
    }
  }
  return eligible.sort((a, b) => (a.item.for_date < b.item.for_date ? 1 : -1));
}

export async function submitToCategory(
  categoryId: string,
  userId: string,
  goalItemId: string,
  amount: number
): Promise<void> {
  const { error } = await supabase.from('challenge_submissions').insert({
    category_id: categoryId,
    user_id: userId,
    goal_item_id: goalItemId,
    amount,
  });
  if (error && error.code !== '23505') throw error;
}

export async function createChallenge(
  createdBy: string,
  title: string,
  description: string,
  endDate: string | null,
  displayMode: 'individual' | 'aggregate',
  categories: Array<{ label: string; targetCount: number }>
): Promise<void> {
  const { data: challenge, error } = await supabase
    .from('challenges')
    .insert({
      created_by: createdBy,
      title: title.trim(),
      description: description.trim() || null,
      end_date: endDate,
      display_mode: displayMode,
    })
    .select()
    .single();
  if (error) throw error;
  if (!challenge) return;

  const rows = categories
    .filter((c) => c.label.trim())
    .map((c) => ({ challenge_id: (challenge as Challenge).id, label: c.label.trim(), target_count: c.targetCount }));
  if (rows.length === 0) return;

  const { error: categoriesError } = await supabase.from('challenge_categories').insert(rows);
  if (categoriesError) throw categoriesError;
}
