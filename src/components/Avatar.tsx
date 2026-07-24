import { useState } from 'react';
import { getAvatarPreset, getInitials } from '../lib/presets';

export function Avatar({ name, avatarKey, size = 40 }: { name: string; avatarKey: string | null; size?: number }) {
  const preset = getAvatarPreset(avatarKey);
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
