export interface AvatarPreset {
  key: string;
  label: string;
  image: string;
}

// 8-bit pixel-art character, recolored per palette entry (character + frame
// hue swapped, shading/highlights preserved). See public/avatars/ -
// avatar-original-source.png is the untouched source render.
export const AVATAR_PRESETS: AvatarPreset[] = [
  { key: 'lavender-gray', label: 'Lavender Gray', image: '/avatars/avatar-lavender-gray.png' },
  { key: 'cream', label: 'Cream', image: '/avatars/avatar-cream.png' },
  { key: 'blush', label: 'Blush', image: '/avatars/avatar-blush.png' },
  { key: 'rose', label: 'Rose', image: '/avatars/avatar-rose.png' },
  { key: 'sage-mint', label: 'Sage Mint', image: '/avatars/avatar-sage-mint.png' },
  { key: 'teal', label: 'Teal', image: '/avatars/avatar-teal.png' },
  { key: 'warm-gray', label: 'Warm Gray', image: '/avatars/avatar-warm-gray.png' },
  { key: 'periwinkle', label: 'Periwinkle', image: '/avatars/avatar-periwinkle.png' },
  { key: 'blue-lavender', label: 'Blue Lavender', image: '/avatars/avatar-blue-lavender.png' },
];

export const DEFAULT_AVATAR_KEY = AVATAR_PRESETS[0].key;

/** True random pick - use for a one-time assignment (e.g. at signup), never in a render path. */
export function pickRandomAvatarKey(): string {
  return AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)].key;
}

function hashStringToIndex(str: string, mod: number): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash % mod;
}

/**
 * Resolves a preset by key. If the key is missing/unmatched and a seed
 * (e.g. user id) is given, falls back to a stable pseudo-random pick
 * derived from that seed - varied per user, but the same on every render
 * (a real Math.random() fallback would flicker on every re-render).
 */
export function getAvatarPreset(key: string | null | undefined, seed?: string): AvatarPreset {
  const found = AVATAR_PRESETS.find((preset) => preset.key === key);
  if (found) return found;
  if (seed) return AVATAR_PRESETS[hashStringToIndex(seed, AVATAR_PRESETS.length)];
  return AVATAR_PRESETS[0];
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
