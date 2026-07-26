import type { DayStatus } from '../lib/streak';
import { Avatar } from './Avatar';

interface StreakRailProps {
  days: DayStatus[];
  avatarName: string;
  avatarKey: string | null;
  avatarSeed?: string;
  size?: 'default' | 'compact';
  /** Set false when the traveler's avatar already appears elsewhere in the row (e.g. the feed identity block). */
  showAvatar?: boolean;
}

/**
 * The signature element: a waypoint trail of recent days, lit up for each
 * one completed, with the traveler's avatar riding at today's position.
 * Streak length is the same data shown as a number elsewhere, but this is
 * meant to read as a small piece of visual narrative rather than a bare
 * stat - literally watching the trail extend each day you show up.
 */
export function StreakRail({
  days,
  avatarName,
  avatarKey,
  avatarSeed,
  size = 'default',
  showAvatar = true,
}: StreakRailProps) {
  const avatarSize = size === 'compact' ? 26 : 40;
  return (
    <div className={size === 'compact' ? 'rail rail--compact' : 'rail'}>
      {days.map((day, i) => {
        const isToday = i === days.length - 1;
        return (
          <div className="rail-step" key={day.dateKey}>
            {i > 0 && <span className={days[i - 1].complete ? 'rail-link rail-link--lit' : 'rail-link'} />}
            {isToday && showAvatar ? (
              <span className="rail-avatar-halo">
                <Avatar name={avatarName} avatarKey={avatarKey} seed={avatarSeed} size={avatarSize} />
              </span>
            ) : (
              <span
                className={
                  day.complete ? 'rail-dot rail-dot--lit' : isToday ? 'rail-dot rail-dot--today' : 'rail-dot'
                }
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
