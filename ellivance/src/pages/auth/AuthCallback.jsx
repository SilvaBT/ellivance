import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

// Supabase JS automatically parses the auth code/tokens present in the URL
// (detectSessionInUrl is on by default) — this page just waits for that
// session to land, then routes into the app.
export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) navigate('/dashboard', { replace: true });
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate('/dashboard', { replace: true });
    });
    const timeout = setTimeout(() => navigate('/login', { replace: true }), 6000);
    return () => {
      listener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div className="page page--narrow">
      <div className="card" style={{ textAlign: 'center' }}>
        <p className="help-text">Finishing sign-in…</p>
      </div>
    </div>
  );
}
