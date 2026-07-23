export type GoalKind = 'count' | 'boolean';

export interface Profile {
  id: string;
  display_name: string;
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
  archived_at: string | null;
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
