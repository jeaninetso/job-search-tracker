import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { Avatar } from '../components/Avatar';
import { AVATAR_PRESETS, STATUS_PRESETS, getAvatarPreset } from '../lib/presets';

export function Profile() {
  const { profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [avatarKey, setAvatarKey] = useState(getAvatarPreset(profile?.avatar_key, profile?.id).key);
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [status, setStatus] = useState(profile?.status ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!profile) return null;

  // Any edit after a successful save re-enables the button - "saved" only
  // reflects "nothing has changed since the last save."
  const withDirty = <T,>(setter: (value: T) => void) => (value: T) => {
    setSaved(false);
    setter(value);
  };
  const setDisplayNameDirty = withDirty(setDisplayName);
  const setAvatarKeyDirty = withDirty(setAvatarKey);
  const setBioDirty = withDirty(setBio);
  const setStatusDirty = withDirty(setStatus);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim(),
        avatar_key: avatarKey,
        bio: bio.trim() || null,
        status: status || null,
      })
      .eq('id', profile.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await refreshProfile();
    setSaved(true);
  };

  return (
    <div className="page">
      <h1>Your profile</h1>
      <form onSubmit={handleSubmit}>
        <label className="field-label" htmlFor="displayName">
          Name
        </label>
        <input
          id="displayName"
          required
          maxLength={40}
          value={displayName}
          onChange={(e) => setDisplayNameDirty(e.target.value)}
        />

        <span className="field-label">Avatar</span>
        <div className="avatar-picker">
          {AVATAR_PRESETS.map((preset) => (
            <button
              type="button"
              key={preset.key}
              className={
                preset.key === avatarKey
                  ? 'avatar-picker-option avatar-picker-option--selected'
                  : 'avatar-picker-option'
              }
              onClick={() => setAvatarKeyDirty(preset.key)}
              aria-label={preset.label}
            >
              <Avatar name={displayName || '?'} avatarKey={preset.key} size={44} />
            </button>
          ))}
        </div>

        <span className="field-label">Status</span>
        <div className="status-picker">
          <button
            type="button"
            className={status === '' ? 'status-picker-option status-picker-option--selected' : 'status-picker-option'}
            onClick={() => setStatusDirty('')}
          >
            No status
          </button>
          {STATUS_PRESETS.map((preset) => (
            <button
              type="button"
              key={preset.key}
              className={
                status === preset.key
                  ? 'status-picker-option status-picker-option--selected'
                  : 'status-picker-option'
              }
              onClick={() => setStatusDirty(preset.key)}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <label className="field-label" htmlFor="bio">
          Bio (optional, 280 characters max)
        </label>
        <textarea
          id="bio"
          className="bio-field"
          maxLength={280}
          value={bio}
          onChange={(e) => setBioDirty(e.target.value)}
          placeholder="What are you looking for? Anything the group should know?"
        />

        <div style={{ marginTop: '1.5rem' }}>
          <button type="submit" disabled={saving || saved || !displayName.trim()}>
            {saving ? 'Saving...' : saved ? 'Saved' : 'Save profile'}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
}
