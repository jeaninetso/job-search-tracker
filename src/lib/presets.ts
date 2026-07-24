export interface AvatarPreset {
  key: string;
  label: string;
  bg: string;
  fg: string;
}

// All swatches are light pastels, so every preset uses the same dark text
// color for contrast (no per-swatch fg needed, unlike the old dark theme).
// TODO: swap these for Jeanine's 8-bit pixel avatars once she has them.
const FG = '#33303a';
export const AVATAR_PRESETS: AvatarPreset[] = [
  { key: 'lavender-gray', label: 'Lavender Gray', bg: '#eae4e9', fg: FG },
  { key: 'cream', label: 'Cream', bg: '#fff1e6', fg: FG },
  { key: 'blush', label: 'Blush', bg: '#fde2e4', fg: FG },
  { key: 'rose', label: 'Rose', bg: '#fad2e1', fg: FG },
  { key: 'sage-mint', label: 'Sage Mint', bg: '#e2ece9', fg: FG },
  { key: 'teal', label: 'Teal', bg: '#bee1e6', fg: FG },
  { key: 'warm-gray', label: 'Warm Gray', bg: '#f0efeb', fg: FG },
  { key: 'periwinkle', label: 'Periwinkle', bg: '#dfe7fd', fg: FG },
  { key: 'blue-lavender', label: 'Blue Lavender', bg: '#cddafd', fg: FG },
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
