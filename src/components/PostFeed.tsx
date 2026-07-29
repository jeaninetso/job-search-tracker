import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { addPrayerReaction, removePrayerReaction, PRAYER_EMOJI } from '../lib/reactions';
import { Avatar } from './Avatar';
import { DailyNoteComposer } from './DailyNoteComposer';
import { todayKey } from '../lib/date';
import type { FeedPost, FeedReaction, Profile } from '../types';

interface FeedEntry {
  post: FeedPost;
  profile: Profile;
  reactions: FeedReaction[];
}

/** Today's notes across the group, newest first, each with a prayer reaction. */
export function PostFeed() {
  const { session } = useAuth();
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [reacting, setReacting] = useState<Set<string>>(new Set());

  const load = async () => {
    const [{ data: posts }, { data: profiles }] = await Promise.all([
      supabase
        .from('feed_posts')
        .select('*')
        .eq('for_date', todayKey())
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('*'),
    ]);

    const postIds = (posts ?? []).map((post) => post.id);
    const { data: reactions } =
      postIds.length > 0
        ? await supabase.from('feed_reactions').select('*').in('post_id', postIds)
        : { data: [] as FeedReaction[] };

    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
    const reactionsByPost = new Map<string, FeedReaction[]>();
    for (const reaction of reactions ?? []) {
      const list = reactionsByPost.get(reaction.post_id) ?? [];
      list.push(reaction);
      reactionsByPost.set(reaction.post_id, list);
    }

    const built: FeedEntry[] = (posts ?? [])
      .map((post) => {
        const profile = profileById.get(post.user_id);
        if (!profile) return null;
        return { post, profile, reactions: reactionsByPost.get(post.id) ?? [] };
      })
      .filter((entry): entry is FeedEntry => entry !== null);

    setEntries(built);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePrayer = async (post: FeedPost, alreadyReacted: boolean) => {
    if (!session || reacting.has(post.id)) return;
    setReacting((prev) => new Set(prev).add(post.id));
    if (alreadyReacted) await removePrayerReaction(post.id, session.user.id);
    else await addPrayerReaction(post.id, session.user.id);
    await load();
    setReacting((prev) => {
      const copy = new Set(prev);
      copy.delete(post.id);
      return copy;
    });
  };

  return (
    <div className="post-feed">
      <DailyNoteComposer onSaved={load} />

      {loading ? (
        <p>Loading...</p>
      ) : entries.length === 0 ? (
        <p className="hint">No notes yet today - be the first to share something.</p>
      ) : (
        <div className="feed-list">
          {entries.map(({ post, profile, reactions }) => {
            const iReacted = !!session && reactions.some((r) => r.from_user_id === session.user.id);
            const isMe = profile.id === session?.user.id;
            return (
              <div className={isMe ? 'feed-card feed-card--me' : 'feed-card'} key={post.id}>
                <div className="feed-identity">
                  <Avatar name={profile.display_name} avatarKey={profile.avatar_key} seed={profile.id} size={32} />
                  <span className="feed-name">
                    {profile.display_name}
                    {isMe ? ' (you)' : ''}
                  </span>
                </div>
                <div className="feed-post">
                  <p className="feed-post-body">{post.body}</p>
                  <button
                    className={iReacted ? 'feed-reaction feed-reaction--active' : 'feed-reaction'}
                    disabled={reacting.has(post.id)}
                    onClick={() => togglePrayer(post, iReacted)}
                  >
                    {PRAYER_EMOJI} {reactions.length > 0 ? reactions.length : ''}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
