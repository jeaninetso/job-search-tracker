import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';

export function Login() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setSubmitting(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="auth-card">
        <h1>Check your email</h1>
        <p>We sent a sign-in link to {email}. Click it to get in.</p>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <h1>Job Search Tracker</h1>
      <p className="subtitle">Enter your email for a magic sign-in link.</p>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" disabled={submitting || !email.trim()}>
          {submitting ? 'Sending...' : 'Send magic link'}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
