import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { useNotifications } from '../hooks/useNotifications.jsx';

export default function Navbar() {
  const { user, profile, signOut } = useAuth();
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  return (
    <div className="navbar">
      <div className="navbar__inner">
        <Link to="/" className="brand">
          Elli<span className="brand__mark">vance</span>
        </Link>
        <div className="row" style={{ flex: 1, maxWidth: 420, margin: '0 24px' }}>
          <Link to="/events" className="help-text" style={{ fontWeight: 600 }}>
            Browse events
          </Link>
        </div>
        {user ? (
          <div className="row">
            <Link to="/dashboard/create" className="btn btn--primary btn--sm">
              + Create event
            </Link>
            {profile?.is_admin && (
              <Link to="/admin" className="btn btn--ghost btn--sm">
                Admin
              </Link>
            )}
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn--ghost btn--icon"
                onClick={() => {
                  setOpen((o) => !o);
                  if (!open) markAllRead();
                }}
                aria-label="Notifications"
                style={{ position: 'relative' }}
              >
                🔔
                {unreadCount > 0 && <span className="bell-dot" />}
              </button>
              {open && (
                <div
                  className="card"
                  style={{ position: 'absolute', right: 0, top: 44, width: 320, maxHeight: 400, overflowY: 'auto', zIndex: 30 }}
                >
                  <p className="label">Notifications</p>
                  {notifications.length === 0 ? (
                    <p className="help-text">Nothing yet.</p>
                  ) : (
                    <div className="stack-sm">
                      {notifications.map((n) => (
                        <div key={n.id} style={{ borderBottom: '1px solid var(--line)', paddingBottom: 8 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{n.title}</p>
                          {n.body && <p className="help-text" style={{ margin: '2px 0 0' }}>{n.body}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <Link to="/dashboard" className="row" style={{ gap: 8 }}>
              <img
                src={profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile?.full_name || 'U')}`}
                alt=""
                style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--line)' }}
              />
            </Link>
            <button className="btn btn--ghost btn--sm" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        ) : (
          <div className="row">
            <Link to="/login" className="btn btn--ghost btn--sm">
              Sign in
            </Link>
            <Link to="/signup" className="btn btn--primary btn--sm">
              Sign up
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
