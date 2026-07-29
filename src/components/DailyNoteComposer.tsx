import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { upsertTodayPost, deleteTodayPost } from '../lib/feedPosts';
import { todayKey } from '../lib/date';

interface DailyNoteComposerProps {
  /** Called after a successful post/edit/remove, so a parent feed list can refresh. */
  onSaved?: () => void;
}

/** Optional free-text note shown in The Group feed - what a prayer reaction actually attaches to. */
export function DailyNoteComposer({ onSaved }: DailyNoteComposerProps) {
  const { session } = useAuth();
  const [body, setBody] = useState('');
  const [savedBody, setSavedBody] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    supabase
      .from('feed_posts')
      .select('body')
      .eq('user_id', session.user.id)
      .eq('for_date', todayKey())
      .maybeSingle()
      .then(({ data }) => {
        setBody(data?.body ?? '');
        setSavedBody(data?.body ?? null);
        setEditing(!data?.body);
      });
  }, [session]);

  const save = async () => {
    if (!session || saving) return;
    setSaving(true);
    setError(null);
    try {
      if (body.trim()) {
        await upsertTodayPost(session.user.id, body);
        setSavedBody(body.trim());
      } else {
        await deleteTodayPost(session.user.id);
        setSavedBody(null);
      }
      setEditing(false);
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that - try again.");
    } finally {
      setSaving(false);
    }
  };

  // Once posted, show the actual saved text right here - it also shows up
  // in The Group sidebar, but that shouldn't be the only place you can
  // confirm what you posted.
  if (!editing && savedBody) {
    return (
      <div className="daily-note daily-note--posted">
        <p className="daily-note-posted">
          <span className="daily-note-label">Posted to the group:</span> "{savedBody}"
        </p>
        <button
          className="link-button"
          onClick={() => {
            setBody(savedBody);
            setEditing(true);
          }}
        >
          Edit
        </button>
      </div>
    );
  }

  const isDirty = body.trim() !== (savedBody ?? '');

  return (
    <div className="daily-note">
      <label className="field-label" htmlFor="daily-note-input">
        Share something with the group (optional)
      </label>
      <input
        id="daily-note-input"
        placeholder="e.g. Interview at Google today - pray for me!"
        maxLength={280}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <button disabled={saving || !isDirty} onClick={save}>
        {saving ? 'Saving...' : body.trim() ? 'Post' : 'Remove'}
      </button>
      {savedBody && (
        <button className="link-button" onClick={() => setEditing(false)}>
          Cancel
        </button>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
