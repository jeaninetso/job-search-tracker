import { useEffect, useMemo, useState } from 'react';
import { formatISO } from 'date-fns';
import { supabase } from '../lib/supabase';
import { evaluateGroups, isDayComplete } from '../lib/goals';
import { computeStreak } from '../lib/streak';
import type { DailyProgress, GoalItem, Profile } from '../types';

const todayKey = () => formatISO(new Date(), { representation: 'date' });

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
      const [{ data: profiles }, { data: allItems }, { data: allProgress }] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('goal_items').select('*').is('archived_at', null),
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
          hasGoals: items.length > 0,
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
            <span className="feed-name">{profile.display_name}</span>
            {hasGoals ? (
              <>
                <span className="feed-streak">🔥 {streak}</span>
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
