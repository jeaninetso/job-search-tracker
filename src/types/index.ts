export type GoalKind = 'count' | 'boolean';

export interface Profile {
  id: string;
  display_name: string;
  avatar_key: string | null;
  bio: string | null;
  status: string | null;
  total_xp: number;
  created_at: string;
}

export type BadgeCategory = 'streak' | 'challenge' | 'social';

export interface Badge {
  id: string;
  key: string;
  label: string;
  description: string;
  emoji: string;
  category: BadgeCategory;
}

export interface UserBadge {
  user_id: string;
  badge_id: string;
  times_earned: number;
  first_earned_at: string;
  last_earned_at: string;
}

export interface FeedPost {
  id: string;
  user_id: string;
  for_date: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface FeedReaction {
  id: string;
  post_id: string;
  from_user_id: string;
  emoji: string;
  created_at: string;
}

export interface GoalItem {
  id: string;
  user_id: string;
  group_id: string;
  label: string;
  kind: GoalKind;
  target: number | null;
  sort_order: number;
  /** The one specific calendar date (YYYY-MM-DD) this item belongs to. */
  for_date: string;
  created_at: string;
}

export interface DailyProgress {
  id: string;
  user_id: string;
  goal_item_id: string;
  entry_date: string;
  current_value: number;
  current_done: boolean;
  updated_at: string;
}

export interface GoalGroupStatus {
  group_id: string;
  items: GoalItem[];
  satisfied: boolean;
}

export type ChallengeDisplayMode = 'individual' | 'aggregate';

export interface Challenge {
  id: string;
  created_by: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  display_mode: ChallengeDisplayMode;
  created_at: string;
}

export interface ChallengeCategory {
  id: string;
  challenge_id: string;
  label: string;
  target_count: number;
}

export interface ChallengeSubmission {
  id: string;
  category_id: string;
  user_id: string;
  goal_item_id: string;
  amount: number;
  submitted_at: string;
}
