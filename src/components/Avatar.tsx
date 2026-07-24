import { getAvatarPreset, getInitials } from '../lib/presets';

export function Avatar({ name, avatarKey, size = 40 }: { name: string; avatarKey: string | null; size?: number }) {
  const preset = getAvatarPreset(avatarKey);
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        background: preset.bg,
        color: preset.fg,
        fontSize: size * 0.4,
      }}
    >
      {getInitials(name)}
    </span>
  );
}
