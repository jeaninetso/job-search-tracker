import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { Avatar } from '../components/Avatar';
import { AVATAR_PRESETS, STATUS_PRESETS } from '../lib/presets';

export function Profile() {
  const { profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [avatarKey, setAvatarKey] = useState(profile?.avatar_key ?? AVATAR_PRESETS[0].key);
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [status, setStatus] = useState(profile?.status ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!profile) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
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
          onChange={(e) => setDisplayName(e.target.value)}
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
              onClick={() => setAvatarKey(preset.key)}
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
            onClick={() => setStatus('')}
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
              onClick={() => setStatus(preset.key)}
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
          onChange={(e) => setBio(e.target.value)}
          placeholder="What are you looking for? Anything the group should know?"
        />

        <div style={{ marginTop: '1.5rem' }}>
          <button type="submit" disabled={saving || !displayName.trim()}>
            {saving ? 'Saving...' : 'Save profile'}
          </button>
        </div>
        {saved && <p className="day-status--complete">Saved.</p>}
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
}
