import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { upsertTodayPost, deleteTodayPost } from '../lib/feedPosts';
import { todayKey } from '../lib/date';

/** Optional free-text note shown in The Group feed - what a prayer reaction actually attaches to. */
export function DailyNoteComposer() {
  const { session } = useAuth();
  const [body, setBody] = useState('');
  const [savedBody, setSavedBody] = useState('');
  const [saving, setSaving] = useState(false);

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
        setSavedBody(data?.body ?? '');
      });
  }, [session]);

  const save = async () => {
    if (!session || saving) return;
    setSaving(true);
    if (body.trim()) {
      await upsertTodayPost(session.user.id, body);
      setSavedBody(body.trim());
    } else {
      await deleteTodayPost(session.user.id);
      setSavedBody('');
    }
    setSaving(false);
  };

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
      <button disabled={saving || body.trim() === savedBody} onClick={save}>
        {saving ? 'Saving...' : 'Post'}
      </button>
    </div>
  );
}
