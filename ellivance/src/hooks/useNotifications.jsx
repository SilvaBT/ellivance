import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './useAuth.jsx';

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);

  async function load() {
    if (!user) return setNotifications([]);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);
    setNotifications(data || []);
  }

  useEffect(() => {
    load();
    if (!user) return;
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function markAllRead() {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    load();
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  return { notifications, unreadCount, markAllRead, reload: load };
}
