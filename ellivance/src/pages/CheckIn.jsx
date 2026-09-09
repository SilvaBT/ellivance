import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../hooks/useAuth.jsx';
import Navbar from '../components/Navbar.jsx';

export default function CheckIn() {
  const { code } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    const { data, error } = await supabase.rpc('check_in_ticket', { p_ticket_code: code });
    setBusy(false);
    if (error) return setResult({ ok: false, message: error.message });
    setResult(data?.[0] || { ok: false, message: 'No response from server.' });
  }

  useEffect(() => {
    if (!authLoading && user) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, code]);

  return (
    <>
      <Navbar />
      <div className="page page--narrow">
        <div className="card stack" style={{ textAlign: 'center' }}>
          <p className="eyebrow">Check-in</p>
          {authLoading ? (
            <p className="help-text">Loading…</p>
          ) : !user ? (
            <>
              <h1>Sign in required</h1>
              <p className="help-text">Only the event organiser can check in attendees. Sign in with your organiser account and scan again.</p>
            </>
          ) : busy ? (
            <p className="help-text">Validating ticket…</p>
          ) : result ? (
            <>
              <span className={`pill pill--dot ${result.ok ? 'pill--go' : 'pill--stop'}`} style={{ alignSelf: 'center' }}>
                {result.ok ? 'Checked in' : 'Not valid'}
              </span>
              {result.attendee_name && <h1>{result.attendee_name}</h1>}
              {result.event_title && <p className="help-text">{result.event_title}</p>}
              <p className={result.ok ? 'success-text' : 'error-text'}>{result.message}</p>
              <button className="btn btn--ghost" onClick={run}>Scan again</button>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
