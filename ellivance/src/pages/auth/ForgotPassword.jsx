import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (err) return setError(err.message);
    setSent(true);
  }

  return (
    <div className="page page--narrow">
      <div className="card stack">
        <div>
          <p className="eyebrow">Reset password</p>
          <h1>Forgot your password?</h1>
        </div>
        {sent ? (
          <p className="help-text">If an account exists for <strong>{email}</strong>, a reset link has been sent.</p>
        ) : (
          <form className="stack" onSubmit={handleSubmit}>
            <div className="field">
              <label className="label" htmlFor="email">Email</label>
              <input id="email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="btn btn--primary btn--block" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
          </form>
        )}
        <p className="help-text">
          <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
