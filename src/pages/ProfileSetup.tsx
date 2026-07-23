import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

export function ProfileSetup() {
  const { session, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setError(null);
    setSubmitting(true);
    const { error: upsertError } = await supabase.from('profiles').insert({
      id: session.user.id,
      display_name: displayName.trim(),
    });
    setSubmitting(false);
    if (upsertError) {
      setError(upsertError.message);
      return;
    }
    await refreshProfile();
  };

  return (
    <div className="auth-card">
      <h1>What should we call you?</h1>
      <form onSubmit={handleSubmit}>
        <input
          required
          placeholder="Your name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={40}
        />
        <button type="submit" disabled={submitting || !displayName.trim()}>
          {submitting ? 'Saving...' : 'Continue'}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
