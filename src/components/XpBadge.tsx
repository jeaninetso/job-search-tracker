import { useAuth } from '../lib/AuthContext';

/** Personal progress metric, not a leaderboard - shown next to the streak badge in the nav. */
export function XpBadge() {
  const { profile } = useAuth();
  if (!profile) return null;

  return (
    <span className="xp-badge" title={`${profile.total_xp} XP`}>
      ⚡ {profile.total_xp} XP
    </span>
  );
}
