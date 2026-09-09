import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId) {
    if (!userId) return setProfile(null);
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(data);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadProfile(data.session?.user?.id).finally(() => setLoading(false));
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, newSession) => {
      setSession(newSession);
      loadProfile(newSession?.user?.id);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    refreshProfile: () => loadProfile(session?.user?.id),
    signOut: () => supabase.auth.signOut(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
