import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Spinner } from './Spinner';
import type { Badge, UserBadge } from '../types';

/** Shows the full badge catalog - earned ones vivid with a times-earned count, unearned ones muted as a goal to work toward. */
export function BadgeGrid({ userId }: { userId: string }) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [earned, setEarned] = useState<Map<string, UserBadge>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ data: badgeData }, { data: earnedData }] = await Promise.all([
        supabase.from('badges').select('*').order('category', { ascending: true }),
        supabase.from('user_badges').select('*').eq('user_id', userId),
      ]);
      setBadges(badgeData ?? []);
      setEarned(new Map((earnedData ?? []).map((row) => [row.badge_id, row])));
      setLoading(false);
    };
    load();
  }, [userId]);

  if (loading) return <Spinner />;
  if (badges.length === 0) return null;

  return (
    <div className="badge-grid">
      {badges.map((badge) => {
        const won = earned.get(badge.id);
        return (
          <div
            key={badge.id}
            className={won ? 'badge-chip badge-chip--earned' : 'badge-chip'}
            title={badge.description}
          >
            <span className="badge-chip-emoji">{badge.emoji}</span>
            <span className="badge-chip-label">{badge.label}</span>
            {won && won.times_earned > 1 && <span className="badge-chip-count">×{won.times_earned}</span>}
          </div>
        );
      })}
    </div>
  );
}
