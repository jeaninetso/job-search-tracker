import { useEffect, useMemo, useState } from 'react';
import { formatISO } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { evaluateGroups, isDayComplete } from '../lib/goals';
import { computeStreak, getStreakFlames } from '../lib/streak';
import { Avatar } from './Avatar';
import { getStatusLabel } from '../lib/presets';
import { todayKey } from '../lib/date';
import type { DailyProgress, GoalItem, Profile } from '../types';

interface MemberStatus {
  profile: Profile;
  streak: number;
  dayComplete: boolean;
  hasGoals: boolean;
}

/** Roster of each member's streak/completion status - no posts here, see PostFeed for that. */
export function GroupStats() {
  const { session } = useAuth();
  const [members, setMembers] = useState<MemberStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const sixtyDaysAgo = formatISO(new Date(Date.now() - 60 * 86400000), { representation: 'date' });
      // Spans many dates per user - each item's for_date scopes it to one
      // day, which is what lets computeStreak evaluate each past day
      // against whatever checklist actually existed for it.
      const [{ data: profiles }, { data: allItems }, { data: allProgress }] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('goal_items').select('*').gte('for_date', sixtyDaysAgo),
        supabase.from('daily_progress').select('*').gte('entry_date', sixtyDaysAgo),
      ]);

      const itemsByUser = new Map<string, GoalItem[]>();
      for (const item of allItems ?? []) {
        const list = itemsByUser.get(item.user_id) ?? [];
        list.push(item);
        itemsByUser.set(item.user_id, list);
      }

      const progressByUser = new Map<string, DailyProgress[]>();
      for (const row of allProgress ?? []) {
        const list = progressByUser.get(row.user_id) ?? [];
        list.push(row);
        progressByUser.set(row.user_id, list);
      }

      const statuses: MemberStatus[] = (profiles ?? []).map((profile) => {
        const items = itemsByUser.get(profile.id) ?? [];
        const todayItems = items.filter((item) => item.for_date === todayKey());
        const history = progressByUser.get(profile.id) ?? [];
        const todayProgress = history.filter((row) => row.entry_date === todayKey());
        const progressByItemId = new Map(todayProgress.map((row) => [row.goal_item_id, row]));
        const groups = evaluateGroups(todayItems, progressByItemId);
        return {
          profile,
          streak: computeStreak(items, history, new Date()),
          dayComplete: isDayComplete(groups),
          hasGoals: groups.length > 0,
        };
      });

      // Your own card always comes first, then highest streak - just for
      // readability, not a ranked leaderboard.
      statuses.sort((a, b) => {
        if (a.profile.id === session?.user.id) return -1;
        if (b.profile.id === session?.user.id) return 1;
        return b.streak - a.streak;
      });
      setMembers(statuses);
      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = useMemo(() => members, [members]);

  if (loading) return <p>Loading...</p>;

  return (
    <div className="feed-list">
      {sorted.map(({ profile, streak, dayComplete, hasGoals }) => {
        const isMe = profile.id === session?.user.id;
        return (
          <div className={isMe ? 'feed-card feed-card--me' : 'feed-card'} key={profile.id}>
            <div className="feed-identity">
              <Avatar name={profile.display_name} avatarKey={profile.avatar_key} seed={profile.id} size={32} />
              <div className="feed-name-block">
                <span className="feed-name">
                  {profile.display_name}
                  {isMe ? ' (you)' : ''}
                </span>
                {getStatusLabel(profile.status) && (
                  <span className="feed-status">{getStatusLabel(profile.status)}</span>
                )}
              </div>
            </div>
            {hasGoals ? (
              <>
                <span className="feed-streak">{getStreakFlames(streak)} {streak}</span>
                <span className={dayComplete ? 'feed-badge feed-badge--done' : 'feed-badge'}>
                  {dayComplete ? 'Done today' : 'In progress'}
                </span>
              </>
            ) : (
              <span className="feed-badge">No checklist yet</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
