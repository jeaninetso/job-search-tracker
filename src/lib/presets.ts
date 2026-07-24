export interface AvatarPreset {
  key: string;
  label: string;
  bg: string;
  fg: string;
}

// Straight from the app's color palette - light backgrounds get dark
// initials, dark backgrounds get light initials, for contrast.
export const AVATAR_PRESETS: AvatarPreset[] = [
  { key: 'sage', label: 'Dry Sage', bg: '#c9cba3', fg: '#2f1b1e' },
  { key: 'peach', label: 'Soft Peach', bg: '#ffe1a8', fg: '#2f1b1e' },
  { key: 'coral', label: 'Vibrant Coral', bg: '#e26d5c', fg: '#2f1b1e' },
  { key: 'plum', label: 'Wine Plum', bg: '#723d46', fg: '#ffe1a8' },
  { key: 'shadow', label: 'Mauve Shadow', bg: '#472d30', fg: '#ffe1a8' },
];

export const DEFAULT_AVATAR_KEY = AVATAR_PRESETS[0].key;

export function getAvatarPreset(key: string | null | undefined): AvatarPreset {
  return AVATAR_PRESETS.find((preset) => preset.key === key) ?? AVATAR_PRESETS[0];
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export interface StatusPreset {
  key: string;
  label: string;
}

export const STATUS_PRESETS: StatusPreset[] = [
  { key: 'hunting', label: '🔍 Job hunting' },
  { key: 'interviewing', label: '🎯 Interviewing' },
  { key: 'offer', label: '🎉 Got an offer!' },
  { key: 'break', label: '😌 Taking a break' },
];

export function getStatusLabel(key: string | null | undefined): string | null {
  if (!key) return null;
  return STATUS_PRESETS.find((preset) => preset.key === key)?.label ?? null;
}
