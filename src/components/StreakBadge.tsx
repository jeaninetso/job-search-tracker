import { useEffect, useState } from 'react';
import { formatISO } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { computeStreak, getStreakFlames } from '../lib/streak';
import type { DailyProgress, GoalItem } from '../types';

/** Top-bar streak count, visible from any page - the one number worth always showing. */
export function StreakBadge() {
  const { session } = useAuth();
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const load = async () => {
      const sixtyDaysAgo = formatISO(new Date(Date.now() - 60 * 86400000), { representation: 'date' });
      const [{ data: items }, { data: history }] = await Promise.all([
        supabase.from('goal_items').select('*').eq('user_id', session.user.id).gte('for_date', sixtyDaysAgo),
        supabase
          .from('daily_progress')
          .select('*')
          .eq('user_id', session.user.id)
          .gte('entry_date', sixtyDaysAgo),
      ]);
      if (cancelled) return;
      if (!items || items.length === 0) {
        setStreak(null);
        return;
      }
      setStreak(computeStreak(items as GoalItem[], (history ?? []) as DailyProgress[], new Date()));
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (streak === null) return null;

  return (
    <span className="streak-badge" title={`${streak} day streak`}>
      {getStreakFlames(streak)} {streak}
    </span>
  );
}
