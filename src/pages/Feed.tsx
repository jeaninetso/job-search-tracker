import { useEffect, useMemo, useState } from 'react';
import { formatISO } from 'date-fns';
import { supabase } from '../lib/supabase';
import { evaluateGroups, isDayComplete } from '../lib/goals';
import { computeStreak, getStreakFlames } from '../lib/streak';
import { Avatar } from '../components/Avatar';
import { getStatusLabel } from '../lib/presets';
import { todayKey } from '../lib/date';
import type { DailyProgress, GoalItem, Profile } from '../types';

interface MemberStatus {
  profile: Profile;
  streak: number;
  dayComplete: boolean;
  hasGoals: boolean;
}

export function Feed() {
  const [members, setMembers] = useState<MemberStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const sixtyDaysAgo = formatISO(new Date(Date.now() - 60 * 86400000), { representation: 'date' });
      // Includes archived goal items - see Dashboard.tsx's load() for why:
      // history is evaluated per-day against what was active THAT day.
      const [{ data: profiles }, { data: allItems }, { data: allProgress }] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('goal_items').select('*'),
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
        const history = progressByUser.get(profile.id) ?? [];
        const todayProgress = history.filter((row) => row.entry_date === todayKey());
        const progressByItemId = new Map(todayProgress.map((row) => [row.goal_item_id, row]));
        const groups = evaluateGroups(items, progressByItemId);
        return {
          profile,
          streak: computeStreak(items, history, new Date()),
          dayComplete: isDayComplete(groups),
          hasGoals: groups.length > 0,
        };
      });

      // Highest streak first, but this is just for readability - not a ranked leaderboard.
      statuses.sort((a, b) => b.streak - a.streak);
      setMembers(statuses);
      setLoading(false);
    };
    load();
  }, []);

  const sorted = useMemo(() => members, [members]);

  if (loading) return <p>Loading...</p>;

  return (
    <div className="page">
      <h1>The group</h1>
      <p className="hint">Everyone's daily status. No ranking, just visibility.</p>
      <div className="feed-list">
        {sorted.map(({ profile, streak, dayComplete, hasGoals }) => (
          <div className="feed-card" key={profile.id}>
            <div className="feed-identity">
              <Avatar name={profile.display_name} avatarKey={profile.avatar_key} seed={profile.id} />
              <div className="feed-name-block">
                <span className="feed-name">{profile.display_name}</span>
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
        ))}
      </div>
    </div>
  );
}
