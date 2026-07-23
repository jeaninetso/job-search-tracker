import { useEffect, useMemo, useState } from 'react';
import { formatISO } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { evaluateGroups, isDayComplete } from '../lib/goals';
import { computeStreak } from '../lib/streak';
import type { DailyProgress, GoalItem } from '../types';

const todayKey = () => formatISO(new Date(), { representation: 'date' });

export function Dashboard() {
  const { session, profile } = useAuth();
  const [items, setItems] = useState<GoalItem[]>([]);
  const [history, setHistory] = useState<DailyProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingItemIds, setSavingItemIds] = useState<Set<string>>(new Set());
  const [loadedForDate, setLoadedForDate] = useState(todayKey());

  const load = async () => {
    if (!session) return;
    const sixtyDaysAgo = formatISO(new Date(Date.now() - 60 * 86400000), { representation: 'date' });
    const [{ data: goalData }, { data: historyData }] = await Promise.all([
      supabase
        .from('goal_items')
        .select('*')
        .eq('user_id', session.user.id)
        .is('archived_at', null)
        .order('sort_order', { ascending: true }),
      // 60 days back is enough runway for any realistic streak while keeping the query light.
      supabase
        .from('daily_progress')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('entry_date', sixtyDaysAgo),
    ]);
    setItems(goalData ?? []);
    setHistory(historyData ?? []);
    setLoadedForDate(todayKey());
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  // If the tab is left open across midnight, re-sync so "today" doesn't
  // keep pointing at a stale cached date.
  useEffect(() => {
    const checkDate = () => {
      if (todayKey() !== loadedForDate) load();
    };
    const interval = setInterval(checkDate, 60_000);
    window.addEventListener('focus', checkDate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkDate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedForDate]);

  const todayProgress = useMemo(
    () => history.filter((row) => row.entry_date === todayKey()),
    [history]
  );

  const progressByItemId = useMemo(() => {
    const map = new Map<string, DailyProgress>();
    for (const row of todayProgress) map.set(row.goal_item_id, row);
    return map;
  }, [todayProgress]);

  const groups = useMemo(() => evaluateGroups(items, progressByItemId), [items, progressByItemId]);
  const dayComplete = isDayComplete(groups);
  const streak = useMemo(() => computeStreak(items, history, new Date()), [items, history]);

  const upsertProgress = async (item: GoalItem, next: Partial<DailyProgress>) => {
    if (!session || savingItemIds.has(item.id)) return;
    setError(null);
    setSavingItemIds((prev) => new Set(prev).add(item.id));

    const existing = progressByItemId.get(item.id);
    const { data, error: upsertError } = await supabase
      .from('daily_progress')
      .upsert(
        {
          id: existing?.id,
          user_id: session.user.id,
          goal_item_id: item.id,
          entry_date: todayKey(),
          current_value: existing?.current_value ?? 0,
          current_done: existing?.current_done ?? false,
          ...next,
        },
        { onConflict: 'user_id,goal_item_id,entry_date' }
      )
      .select()
      .single();

    setSavingItemIds((prev) => {
      const copy = new Set(prev);
      copy.delete(item.id);
      return copy;
    });

    if (upsertError) {
      setError(`Couldn't save "${item.label}" — try again.`);
      return;
    }
    if (data) {
      setHistory((prev) => [...prev.filter((row) => row.id !== data.id), data]);
    }
  };

  const toggleBoolean = (item: GoalItem) => {
    const existing = progressByItemId.get(item.id);
    upsertProgress(item, { current_done: !(existing?.current_done ?? false) });
  };

  const incrementCount = (item: GoalItem, delta: number) => {
    const existing = progressByItemId.get(item.id);
    const next = Math.max(0, (existing?.current_value ?? 0) + delta);
    upsertProgress(item, { current_value: next });
  };

  if (loading) return <p>Loading...</p>;

  if (items.length === 0) {
    return (
      <div className="page">
        <h1>Hey {profile?.display_name}</h1>
        <p>You haven't set up a daily checklist yet. Head to "My Goals" to add one.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Today</h1>
      <p className="streak">🔥 {streak} day streak</p>
      <p className={dayComplete ? 'day-status day-status--complete' : 'day-status'}>
        {dayComplete ? "You're done for today!" : 'Keep going.'}
      </p>
      {error && <p className="error">{error}</p>}

      {groups.map((group) => (
        <div className={group.satisfied ? 'goal-group goal-group--done' : 'goal-group'} key={group.group_id}>
          {group.items.map((item) => {
            const progress = progressByItemId.get(item.id);
            const saving = savingItemIds.has(item.id);
            return (
              <div className="goal-item" key={item.id}>
                {item.kind === 'boolean' ? (
                  <label>
                    <input
                      type="checkbox"
                      checked={progress?.current_done ?? false}
                      disabled={saving}
                      onChange={() => toggleBoolean(item)}
                    />
                    {item.label}
                  </label>
                ) : (
                  <div className="count-row">
                    <span>
                      {item.label}: {progress?.current_value ?? 0} / {item.target}
                    </span>
                    <button disabled={saving} onClick={() => incrementCount(item, 1)}>
                      +1
                    </button>
                    <button disabled={saving} onClick={() => incrementCount(item, -1)}>
                      -1
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {group.items.length > 1 && <p className="or-hint">(any one of these counts)</p>}
        </div>
      ))}
    </div>
  );
}
