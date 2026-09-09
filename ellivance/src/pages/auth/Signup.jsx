import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

export default function Signup() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setBusy(false);
    if (err) return setError(err.message);
    // If email confirmation is required, Supabase returns a user with no session yet.
    if (data.user && !data.session) {
      setSent(true);
    } else {
      navigate('/dashboard');
    }
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  if (sent) {
    return (
      <div className="page page--narrow">
        <div className="card stack" style={{ textAlign: 'center' }}>
          <h1>Check your email</h1>
          <p className="help-text">
            We sent a verification link to <strong>{email}</strong>. Click it to activate your account, then sign in.
          </p>
          <Link to="/login" className="btn btn--primary btn--block">Go to sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page page--narrow">
      <div className="card stack">
        <div>
          <p className="eyebrow">Get started</p>
          <h1>Create your account</h1>
        </div>
        <form className="stack" onSubmit={handleSubmit}>
          <div className="field">
            <label className="label" htmlFor="fullName">Full name</label>
            <input id="fullName" className="input" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="email">Email</label>
            <input id="email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="password">Password</label>
            <input id="password" className="input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn--primary btn--block" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
        </form>
        <div className="row" style={{ gap: 10 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          <span className="help-text">or</span>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        </div>
        <button className="btn btn--ghost btn--block" onClick={handleGoogle}>Continue with Google</button>
        <p className="help-text">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
