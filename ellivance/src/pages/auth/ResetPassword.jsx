import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) return setError(err.message);
    setDone(true);
    setTimeout(() => navigate('/dashboard'), 1500);
  }

  return (
    <div className="page page--narrow">
      <div className="card stack">
        <div>
          <p className="eyebrow">Reset password</p>
          <h1>Choose a new password</h1>
        </div>
        {done ? (
          <p className="success-text">Password updated. Redirecting…</p>
        ) : (
          <form className="stack" onSubmit={handleSubmit}>
            <div className="field">
              <label className="label" htmlFor="password">New password</label>
              <input id="password" className="input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="btn btn--primary btn--block" disabled={busy}>{busy ? 'Saving…' : 'Save new password'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
