import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { groupGoalItems } from '../lib/goals';
import { todayKey } from '../lib/date';
import { ensureTodayGoals } from '../lib/carryForward';
import { Spinner } from './Spinner';
import type { GoalItem, GoalKind } from '../types';

interface ManageChecklistProps {
  /** Called after any add/remove so the parent dashboard can refetch and reflect the change. */
  onChange: () => void;
}

export function ManageChecklist({ onChange }: ManageChecklistProps) {
  const { session } = useAuth();
  const [items, setItems] = useState<GoalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [label, setLabel] = useState('');
  const [kind, setKind] = useState<GoalKind>('count');
  const [target, setTarget] = useState(5);

  const load = async () => {
    if (!session) return;
    await ensureTodayGoals(session.user.id);
    const { data, error: fetchError } = await supabase
      .from('goal_items')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('for_date', todayKey())
      .order('sort_order', { ascending: true });
    if (fetchError) setError(fetchError.message);
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  const addGoal = async (e: FormEvent, groupId?: string) => {
    e.preventDefault();
    if (!session) return;
    setError(null);
    const { error: insertError } = await supabase.from('goal_items').insert({
      user_id: session.user.id,
      group_id: groupId, // if undefined, DB default generates a fresh group_id
      label: label.trim(),
      kind,
      target: kind === 'count' ? target : null,
      for_date: todayKey(),
      sort_order: items.length,
    });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setLabel('');
    setKind('count');
    setTarget(5);
    await load();
    onChange();
  };

  // Only removes today's row - other dates (including any that were
  // already copied forward from today, or copied from before) are
  // untouched, since each date's items are independent.
  const removeItem = async (id: string) => {
    await supabase.from('goal_items').delete().eq('id', id);
    await load();
    onChange();
  };

  if (loading) return <Spinner />;

  const groups = groupGoalItems(items);

  return (
    <div className="manage-checklist-body">
      <p className="hint">
        Every group below must have at least one satisfied item to complete your day. Add an "OR
        alternative" to a group so any one of several things counts (e.g. "apply to 5 jobs" OR
        "upskill in AI"). This only edits today - tomorrow starts as a copy of whatever today ends
        up looking like, and you can change it independently from there.
      </p>

      {groups.map((group) => (
        <div className="goal-group" key={group[0].group_id}>
          {group.map((item) => (
            <div className="goal-item goal-item-row" key={item.id}>
              <span>
                {item.label}
                {item.kind === 'count' ? ` (target: ${item.target})` : ' (yes/no)'}
              </span>
              <button onClick={() => removeItem(item.id)}>Remove</button>
            </div>
          ))}
          <AddAlternative
            groupId={group[0].group_id}
            onAdded={async () => {
              await load();
              onChange();
            }}
            nextSort={items.length}
          />
        </div>
      ))}

      <form onSubmit={(e) => addGoal(e)} className="goal-form">
        <h3>Add a new checklist item</h3>
        <input
          required
          placeholder="e.g. Apply to 5 jobs"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <select value={kind} onChange={(e) => setKind(e.target.value as GoalKind)}>
          <option value="count">Count (e.g. applications)</option>
          <option value="boolean">Yes/No (e.g. worked on portfolio)</option>
        </select>
        {kind === 'count' && (
          <input
            type="number"
            min={1}
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
          />
        )}
        <button type="submit" disabled={!label.trim()}>
          Add
        </button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

function AddAlternative({
  groupId,
  onAdded,
  nextSort,
}: {
  groupId: string;
  onAdded: () => void;
  nextSort: number;
}) {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [kind, setKind] = useState<GoalKind>('boolean');
  const [target, setTarget] = useState(5);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!session) return;
    await supabase.from('goal_items').insert({
      user_id: session.user.id,
      group_id: groupId,
      label: label.trim(),
      kind,
      target: kind === 'count' ? target : null,
      for_date: todayKey(),
      sort_order: nextSort,
    });
    setLabel('');
    setOpen(false);
    onAdded();
  };

  if (!open) {
    return (
      <button className="link-button" onClick={() => setOpen(true)}>
        + Add OR alternative
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="goal-form goal-form--inline">
      <input
        required
        placeholder="Alternative, e.g. Upskill in AI"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      <select value={kind} onChange={(e) => setKind(e.target.value as GoalKind)}>
        <option value="boolean">Yes/No</option>
        <option value="count">Count</option>
      </select>
      {kind === 'count' && (
        <input
          type="number"
          min={1}
          value={target}
          onChange={(e) => setTarget(Number(e.target.value))}
        />
      )}
      <button type="submit" disabled={!label.trim()}>
        Save
      </button>
      <button type="button" onClick={() => setOpen(false)}>
        Cancel
      </button>
    </form>
  );
}
