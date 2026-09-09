import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (err) return setError(err.message);
    navigate('/dashboard');
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="page page--narrow">
      <div className="card stack">
        <div>
          <p className="eyebrow">Welcome back</p>
          <h1>Sign in to Ellivance</h1>
        </div>
        <form className="stack" onSubmit={handleSubmit}>
          <div className="field">
            <label className="label" htmlFor="email">Email</label>
            <input id="email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <div className="row row--between">
              <label className="label" htmlFor="password">Password</label>
              <Link to="/forgot-password" className="help-text">Forgot password?</Link>
            </div>
            <input id="password" className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn--primary btn--block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <div className="row" style={{ gap: 10 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          <span className="help-text">or</span>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        </div>
        <button className="btn btn--ghost btn--block" onClick={handleGoogle}>Continue with Google</button>
        <p className="help-text">
          New here? <Link to="/signup">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
