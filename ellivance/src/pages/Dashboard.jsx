import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../hooks/useAuth.jsx';
import { useNotifications } from '../hooks/useNotifications.jsx';
import Navbar from '../components/Navbar.jsx';
import EventCard from '../components/EventCard.jsx';
import { formatEventDate } from '../lib/utils.js';

const TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'drafts', label: 'Drafts' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'favourites', label: 'Favourites' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notifications, reload: reloadNotifications } = useNotifications();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'upcoming';

  const [myEvents, setMyEvents] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [favourites, setFavourites] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    const [{ data: events }, { data: regs }, { data: favs }] = await Promise.all([
      supabase.from('events').select('*, categories ( name )').eq('organiser_id', user.id).order('event_date', { ascending: true }),
      supabase
        .from('registrations')
        .select('*, events (*, categories ( name ))')
        .eq('user_id', user.id)
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false }),
      supabase.from('favourites').select('*, events (*, categories ( name ))').eq('user_id', user.id),
    ]);
    setMyEvents(events || []);
    setMyRegistrations(regs || []);
    setFavourites((favs || []).map((f) => f.events).filter(Boolean));
    setLoading(false);
  }

  useEffect(() => {
    if (user) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const today = new Date().toISOString().slice(0, 10);

  const upcomingOrganised = myEvents.filter((e) => e.status === 'published' && (!e.event_date || e.event_date >= today));
  const pastOrganised = myEvents.filter((e) => e.status === 'published' && e.event_date && e.event_date < today);
  const draftEvents = myEvents.filter((e) => e.status === 'draft');
  const upcomingAttending = myRegistrations.map((r) => r.events).filter((e) => e && (!e.event_date || e.event_date >= today));
  const pastAttending = myRegistrations.map((r) => r.events).filter((e) => e && e.event_date && e.event_date < today);

  const analytics = useMemo(() => {
    const published = myEvents.filter((e) => e.status === 'published');
    return {
      totalEvents: published.length,
      totalViews: published.reduce((a, e) => a + (e.view_count || 0), 0),
      draftCount: draftEvents.length,
    };
  }, [myEvents, draftEvents]);

  function setTab(t) {
    setParams({ tab: t });
  }

  if (!user) return null;

  return (
    <>
      <Navbar />
      <div className="page stack">
        <div className="row row--between row--wrap">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1>Welcome back</h1>
          </div>
          <div className="row row--wrap">
            <Link to="/dashboard/create" className="btn btn--primary">+ Create event</Link>
            <Link to="/events" className="btn btn--ghost">Browse events</Link>
            <Link to="/profile" className="btn btn--ghost">Edit profile</Link>
          </div>
        </div>

        <div className="tabs">
          {TABS.map((t) => (
            <button key={t.key} className={`tab ${tab === t.key ? 'tab--active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
              {t.key === 'drafts' && draftEvents.length > 0 ? ` (${draftEvents.length})` : ''}
              {t.key === 'notifications' && notifications.filter((n) => !n.is_read).length > 0
                ? ` (${notifications.filter((n) => !n.is_read).length})`
                : ''}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="help-text">Loading…</p>
        ) : tab === 'upcoming' ? (
          <div className="stack">
            <Section title="Events you're organising" items={upcomingOrganised} manageable emptyText="No upcoming events you're organising." />
            <Section title="Events you're attending" items={upcomingAttending} emptyText="No upcoming registrations." />
          </div>
        ) : tab === 'past' ? (
          <div className="stack">
            <Section title="Events you organised" items={pastOrganised} manageable emptyText="No past events yet." />
            <Section title="Events you attended" items={pastAttending} emptyText="No past registrations." />
          </div>
        ) : tab === 'drafts' ? (
          draftEvents.length === 0 ? (
            <div className="card empty-state">
              No drafts. <Link to="/dashboard/create">Start a new event</Link> and save it as a draft any time.
            </div>
          ) : (
            <div className="stack-sm">
              {draftEvents.map((e) => (
                <div key={e.id} className="card row row--between">
                  <div>
                    <p style={{ fontWeight: 700, margin: 0 }}>{e.title || 'Untitled event'}</p>
                    <p className="help-text" style={{ margin: 0 }}>{formatEventDate(e.event_date)}</p>
                  </div>
                  <Link to={`/dashboard/edit/${e.id}`} className="btn btn--ghost btn--sm">Continue editing</Link>
                </div>
              ))}
            </div>
          )
        ) : tab === 'analytics' ? (
          <div className="grid grid-3">
            <StatCard label="Published events" value={analytics.totalEvents} />
            <StatCard label="Total event page views" value={analytics.totalViews} />
            <StatCard label="Drafts in progress" value={analytics.draftCount} />
            <div className="card" style={{ gridColumn: '1 / -1' }}>
              <p className="help-text">
                Open any of your events from the list above and click <strong>Manage this event</strong> for
                per-event registrations, ticket sales, and CSV export.
              </p>
            </div>
          </div>
        ) : tab === 'notifications' ? (
          <div className="stack-sm">
            {notifications.length === 0 ? (
              <div className="card empty-state">No notifications yet.</div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="card row row--between">
                  <div>
                    <p style={{ fontWeight: 700, margin: 0 }}>{n.title}</p>
                    {n.body && <p className="help-text" style={{ margin: '2px 0 0' }}>{n.body}</p>}
                  </div>
                  {n.event_id && (
                    <button className="btn btn--ghost btn--sm" onClick={() => navigate(`/events/${n.event_id}`)}>
                      View
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        ) : tab === 'favourites' ? (
          favourites.length === 0 ? (
            <div className="card empty-state">Nothing saved yet — tap ☆ Save on any event to keep it here.</div>
          ) : (
            <div className="grid grid-cards">
              {favourites.map((e) => <EventCard key={e.id} event={e} />)}
            </div>
          )
        ) : null}
      </div>
    </>
  );
}

function Section({ title, items, manageable, emptyText }) {
  return (
    <div className="stack-sm">
      <p className="label">{title}</p>
      {items.length === 0 ? (
        <p className="help-text">{emptyText}</p>
      ) : (
        <div className="stack-sm">
          {items.map((e) => (
            <div key={e.id} className="card row row--between">
              <Link to={`/events/${e.slug}`} style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, margin: 0 }}>{e.title}</p>
                <p className="help-text" style={{ margin: 0 }}>
                  {formatEventDate(e.event_date)} {e.categories?.name ? `· ${e.categories.name}` : ''}
                </p>
              </Link>
              {manageable && (
                <Link to={`/dashboard/manage/${e.id}`} className="btn btn--ghost btn--sm">Manage</Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="card">
      <p className="help-text" style={{ margin: 0 }}>{label}</p>
      <p className="display" style={{ fontSize: 32, marginTop: 4 }}>{value}</p>
    </div>
  );
}
