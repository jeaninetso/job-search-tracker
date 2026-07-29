import { useEffect, useMemo, useRef, useState } from 'react';
import { formatISO } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { evaluateGroups, isDayComplete } from '../lib/goals';
import { computeStreak } from '../lib/streak';
import {
  awardDayCompleteXp,
  awardItemCompletionXp,
  checkStreakMilestone,
  retractDayCompleteXp,
  retractItemCompletionXp,
} from '../lib/xp';
import { Avatar } from '../components/Avatar';
import { Confetti } from '../components/Confetti';
import { ManageChecklist } from '../components/ManageChecklist';
import { todayKey } from '../lib/date';
import { ensureTodayGoals } from '../lib/carryForward';
import type { DailyProgress, GoalItem } from '../types';

export function Dashboard() {
  const { session, profile, refreshProfile } = useAuth();
  const [items, setItems] = useState<GoalItem[]>([]);
  const [history, setHistory] = useState<DailyProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingItemIds, setSavingItemIds] = useState<Set<string>>(new Set());
  const [loadedForDate, setLoadedForDate] = useState(todayKey());
  const [celebrating, setCelebrating] = useState(false);
  const wasCompleteRef = useRef<boolean | null>(null);

  const load = async () => {
    if (!session) return;
    // Copies forward the most recent prior day's checklist if today has
    // nothing set up yet - must happen before fetching goal_items below.
    await ensureTodayGoals(session.user.id);

    const sixtyDaysAgo = formatISO(new Date(Date.now() - 60 * 86400000), { representation: 'date' });
    const [{ data: goalData }, { data: historyData }] = await Promise.all([
      // Spans many dates - each item's for_date scopes it to one day, so
      // streak computation can evaluate each past day against whatever
      // checklist actually existed for it.
      supabase
        .from('goal_items')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('for_date', sixtyDaysAgo)
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

  const todayItems = useMemo(() => items.filter((item) => item.for_date === todayKey()), [items]);

  const todayProgress = useMemo(
    () => history.filter((row) => row.entry_date === todayKey()),
    [history]
  );

  const progressByItemId = useMemo(() => {
    const map = new Map<string, DailyProgress>();
    for (const row of todayProgress) map.set(row.goal_item_id, row);
    return map;
  }, [todayProgress]);

  const groups = useMemo(() => evaluateGroups(todayItems, progressByItemId), [todayItems, progressByItemId]);
  const dayComplete = isDayComplete(groups);
  const streak = useMemo(() => computeStreak(items, history, new Date()), [items, history]);

  // Fire confetti + award the day-complete XP bonus only on the moment
  // completion flips true (not on every render/mount where it was already
  // complete from an earlier session); retract the bonus on the reverse
  // flip, e.g. unchecking something after finishing.
  useEffect(() => {
    const wasComplete = wasCompleteRef.current;
    wasCompleteRef.current = dayComplete;
    if (!session) return;

    if (wasComplete === false && dayComplete) {
      setCelebrating(true);
      const timeout = setTimeout(() => setCelebrating(false), 2200);
      awardDayCompleteXp(session.user.id, todayKey()).then(refreshProfile);
      return () => clearTimeout(timeout);
    }
    if (wasComplete === true && !dayComplete) {
      retractDayCompleteXp(session.user.id, todayKey()).then(refreshProfile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayComplete]);

  // Awards streak-milestone XP + badge the moment the streak crosses
  // 7/30/100 - a no-op for every other streak length.
  useEffect(() => {
    if (!session) return;
    checkStreakMilestone(session.user.id, streak, todayKey()).then(refreshProfile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, streak]);

  const upsertProgress = async (item: GoalItem, next: Partial<DailyProgress>): Promise<boolean> => {
    if (!session || savingItemIds.has(item.id)) return false;
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
      return false;
    }
    if (data) {
      setHistory((prev) => [...prev.filter((row) => row.id !== data.id), data]);
    }
    return true;
  };

  const toggleBoolean = async (item: GoalItem) => {
    const existing = progressByItemId.get(item.id);
    const nextDone = !(existing?.current_done ?? false);
    const ok = await upsertProgress(item, { current_done: nextDone });
    if (!ok || !session) return;

    if (nextDone) await awardItemCompletionXp(session.user.id, item.id, todayKey());
    else await retractItemCompletionXp(session.user.id, item.id, todayKey());
    await refreshProfile();
  };

  const incrementCount = async (item: GoalItem, delta: number) => {
    const existing = progressByItemId.get(item.id);
    const prevValue = existing?.current_value ?? 0;
    const nextValue = Math.max(0, prevValue + delta);
    const ok = await upsertProgress(item, { current_value: nextValue });
    if (!ok || !session || item.target == null) return;

    const wasMet = prevValue >= item.target;
    const nowMet = nextValue >= item.target;
    if (!wasMet && nowMet) await awardItemCompletionXp(session.user.id, item.id, todayKey());
    else if (wasMet && !nowMet) await retractItemCompletionXp(session.user.id, item.id, todayKey());
    if (wasMet !== nowMet) await refreshProfile();
  };

  if (loading) return <p>Loading...</p>;

  const hasChecklist = groups.length > 0;

  return (
    <div className="page">
      {celebrating && <Confetti />}
      <h1>Dashboard</h1>

      {hasChecklist ? (
        <>
          <p className={dayComplete ? 'day-status day-status--complete celebration-banner' : 'day-status'}>
            {dayComplete ? "You're done for today! 🎉" : 'Keep going.'}
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
                      <label className="check-label">
                        <input
                          type="checkbox"
                          checked={progress?.current_done ?? false}
                          disabled={saving}
                          onChange={() => toggleBoolean(item)}
                        />
                        <span className={progress?.current_done ? 'check-box check-box--checked' : 'check-box'}>
                          {progress?.current_done ? '✓' : ''}
                        </span>
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
                        <div className="progress-bar">
                          <div
                            className={
                              (progress?.current_value ?? 0) >= (item.target ?? Infinity)
                                ? 'progress-bar-fill progress-bar-fill--done'
                                : 'progress-bar-fill'
                            }
                            style={{
                              width: `${Math.min(100, ((progress?.current_value ?? 0) / (item.target ?? 1)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {group.items.length > 1 && <p className="or-hint">(any one of these counts)</p>}
            </div>
          ))}
        </>
      ) : (
        <div className="greeting-row">
          <Avatar name={profile?.display_name ?? '?'} avatarKey={profile?.avatar_key ?? null} seed={profile?.id} />
          <p className="hint">You haven't set up a daily checklist yet - add one below to get started.</p>
        </div>
      )}

      <details className="manage-checklist" open={!hasChecklist}>
        <summary>Manage today's checklist</summary>
        <ManageChecklist onChange={load} />
      </details>
    </div>
  );
}
