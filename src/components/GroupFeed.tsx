import { useEffect, useMemo, useState } from 'react';
import { formatISO } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { evaluateGroups, isDayComplete } from '../lib/goals';
import { computeStreak, getStreakFlames } from '../lib/streak';
import { addPrayerReaction, removePrayerReaction, PRAYER_EMOJI } from '../lib/reactions';
import { Avatar } from './Avatar';
import { getStatusLabel } from '../lib/presets';
import { todayKey } from '../lib/date';
import type { DailyProgress, FeedPost, FeedReaction, GoalItem, Profile } from '../types';

interface MemberStatus {
  profile: Profile;
  streak: number;
  dayComplete: boolean;
  hasGoals: boolean;
  post: FeedPost | null;
  reactions: FeedReaction[];
}

export function GroupFeed() {
  const { session } = useAuth();
  const [members, setMembers] = useState<MemberStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [reacting, setReacting] = useState<Set<string>>(new Set());

  const load = async () => {
    const sixtyDaysAgo = formatISO(new Date(Date.now() - 60 * 86400000), { representation: 'date' });
    // Spans many dates per user - each item's for_date scopes it to one
    // day, which is what lets computeStreak evaluate each past day
    // against whatever checklist actually existed for it.
    const [{ data: profiles }, { data: allItems }, { data: allProgress }, { data: todayPosts }] =
      await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('goal_items').select('*').gte('for_date', sixtyDaysAgo),
        supabase.from('daily_progress').select('*').gte('entry_date', sixtyDaysAgo),
        supabase.from('feed_posts').select('*').eq('for_date', todayKey()),
      ]);

    const postIds = (todayPosts ?? []).map((post) => post.id);
    const { data: reactions } =
      postIds.length > 0
        ? await supabase.from('feed_reactions').select('*').in('post_id', postIds)
        : { data: [] as FeedReaction[] };

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

    const postByUser = new Map<string, FeedPost>();
    for (const post of todayPosts ?? []) postByUser.set(post.user_id, post);

    const reactionsByPost = new Map<string, FeedReaction[]>();
    for (const reaction of reactions ?? []) {
      const list = reactionsByPost.get(reaction.post_id) ?? [];
      list.push(reaction);
      reactionsByPost.set(reaction.post_id, list);
    }

    const statuses: MemberStatus[] = (profiles ?? []).map((profile) => {
      const items = itemsByUser.get(profile.id) ?? [];
      const todayItems = items.filter((item) => item.for_date === todayKey());
      const history = progressByUser.get(profile.id) ?? [];
      const todayProgress = history.filter((row) => row.entry_date === todayKey());
      const progressByItemId = new Map(todayProgress.map((row) => [row.goal_item_id, row]));
      const groups = evaluateGroups(todayItems, progressByItemId);
      const post = postByUser.get(profile.id) ?? null;
      return {
        profile,
        streak: computeStreak(items, history, new Date()),
        dayComplete: isDayComplete(groups),
        hasGoals: groups.length > 0,
        post,
        reactions: post ? reactionsByPost.get(post.id) ?? [] : [],
      };
    });

    // Highest streak first, but this is just for readability - not a ranked leaderboard.
    statuses.sort((a, b) => b.streak - a.streak);
    setMembers(statuses);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = useMemo(() => members, [members]);

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

  if (loading) return <p>Loading...</p>;

  return (
    <div className="feed-list">
      {sorted.map(({ profile, streak, dayComplete, hasGoals, post, reactions }) => {
        const iReacted = !!session && reactions.some((r) => r.from_user_id === session.user.id);
        return (
          <div className="feed-card" key={profile.id}>
            <div className="feed-identity">
              <Avatar name={profile.display_name} avatarKey={profile.avatar_key} seed={profile.id} size={32} />
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
            {post && (
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
            )}
          </div>
        );
      })}
    </div>
  );
}
