import { useState } from 'react';
import { getAvatarPreset, getInitials } from '../lib/presets';

interface AvatarProps {
  name: string;
  avatarKey: string | null;
  size?: number;
  /** Falls back to a stable pseudo-random preset (e.g. user id) when avatarKey is null/unmatched. */
  seed?: string;
}

export function Avatar({ name, avatarKey, size = 40, seed }: AvatarProps) {
  const preset = getAvatarPreset(avatarKey, seed);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className="avatar avatar--fallback" style={{ width: size, height: size, fontSize: size * 0.4 }}>
        {getInitials(name)}
      </span>
    );
  }

  return (
    <img
      src={preset.image}
      alt={`${name}'s avatar`}
      className="avatar"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}
