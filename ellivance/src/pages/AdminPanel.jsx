import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import Navbar from '../components/Navbar.jsx';

const TABS = ['Overview', 'Users', 'Events', 'Categories', 'Reports', 'Reviews', 'Settings'];

export default function AdminPanel() {
  const [tab, setTab] = useState('Overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState({ name: '', icon: '' });
  const [reports, setReports] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [settings, setSettings] = useState({});

  async function loadAll() {
    const [{ count: userCount }, { count: eventCount }, { count: regCount }, { data: u }, { data: e }, { data: c }, { data: r }, { data: rv }, { data: s }] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('events').select('id', { count: 'exact', head: true }),
      supabase.from('registrations').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('events').select('*, profiles:organiser_id ( full_name )').order('created_at', { ascending: false }).limit(200),
      supabase.from('categories').select('*').order('name'),
      supabase.from('reports').select('*').order('created_at', { ascending: false }),
      supabase.from('reviews').select('*, profiles ( full_name ), events ( title )').order('created_at', { ascending: false }).limit(100),
      supabase.from('site_settings').select('*'),
    ]);
    setStats({ userCount, eventCount, regCount });
    setUsers(u || []);
    setEvents(e || []);
    setCategories(c || []);
    setReports(r || []);
    setReviews(rv || []);
    setSettings(Object.fromEntries((s || []).map((row) => [row.key, row.value])));
  }

  useEffect(() => { loadAll(); }, []);

  async function toggleBan(userId, banned) {
    await supabase.from('profiles').update({ is_banned: !banned }).eq('id', userId);
    loadAll();
  }
  async function toggleFeatured(eventId, featured) {
    await supabase.from('events').update({ is_featured: !featured }).eq('id', eventId);
    loadAll();
  }
  async function moderateEvent(eventId, status) {
    await supabase.from('events').update({ status }).eq('id', eventId);
    loadAll();
  }
  async function addCategory(e) {
    e.preventDefault();
    if (!newCategory.name.trim()) return;
    await supabase.from('categories').insert({
      name: newCategory.name.trim(),
      slug: newCategory.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      icon: newCategory.icon,
    });
    setNewCategory({ name: '', icon: '' });
    loadAll();
  }
  async function deleteCategory(catId) {
    await supabase.from('categories').delete().eq('id', catId);
    loadAll();
  }
  async function resolveReport(reportId) {
    await supabase.from('reports').update({ status: 'resolved' }).eq('id', reportId);
    loadAll();
  }
  async function deleteReview(reviewId) {
    await supabase.from('reviews').delete().eq('id', reviewId);
    loadAll();
  }
  async function saveSetting(key, value) {
    await supabase.from('site_settings').upsert({ key, value });
    loadAll();
  }

  return (
    <>
      <Navbar />
      <div className="page stack">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Site administration</h1>
        </div>

        <div className="tabs">
          {TABS.map((t) => (
            <button key={t} className={`tab ${tab === t ? 'tab--active' : ''}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        {tab === 'Overview' && stats && (
          <div className="grid grid-3">
            <Stat label="Users" value={stats.userCount} />
            <Stat label="Events" value={stats.eventCount} />
            <Stat label="Registrations" value={stats.regCount} />
          </div>
        )}

        {tab === 'Users' && (
          <div className="card">
            <table className="table">
              <thead><tr><th>Name</th><th>Joined</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.full_name} {u.is_admin && <span className="pill pill--ink">admin</span>}</td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>{u.is_banned ? <span className="pill pill--stop">Banned</span> : <span className="pill pill--go">Active</span>}</td>
                    <td><button className="btn btn--ghost btn--sm" onClick={() => toggleBan(u.id, u.is_banned)}>{u.is_banned ? 'Unban' : 'Ban'}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Events' && (
          <div className="card">
            <table className="table">
              <thead><tr><th>Title</th><th>Organiser</th><th>Status</th><th>Featured</th><th></th></tr></thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id}>
                    <td>{e.title}</td>
                    <td>{e.profiles?.full_name}</td>
                    <td>
                      <span className={`pill ${e.status === 'published' ? 'pill--go' : e.status === 'cancelled' ? 'pill--stop' : 'pill--ink'}`}>{e.status}</span>
                    </td>
                    <td>
                      <button className="btn btn--ghost btn--sm" onClick={() => toggleFeatured(e.id, e.is_featured)}>{e.is_featured ? '★ Featured' : '☆ Feature'}</button>
                    </td>
                    <td className="row">
                      {e.status !== 'cancelled' && <button className="btn btn--danger btn--sm" onClick={() => moderateEvent(e.id, 'cancelled')}>Take down</button>}
                      {e.status === 'cancelled' && <button className="btn btn--ghost btn--sm" onClick={() => moderateEvent(e.id, 'published')}>Restore</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Categories' && (
          <div className="card stack">
            <form className="row" onSubmit={addCategory}>
              <input className="input" placeholder="Icon (emoji)" style={{ width: 80 }} value={newCategory.icon} onChange={(e) => setNewCategory((c) => ({ ...c, icon: e.target.value }))} />
              <input className="input" placeholder="Category name" value={newCategory.name} onChange={(e) => setNewCategory((c) => ({ ...c, name: e.target.value }))} />
              <button className="btn btn--primary btn--sm">Add</button>
            </form>
            <div className="row row--wrap">
              {categories.map((c) => (
                <span key={c.id} className="pill pill--ink">
                  {c.icon} {c.name}
                  <button onClick={() => deleteCategory(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 4 }}>×</button>
                </span>
              ))}
            </div>
          </div>
        )}

        {tab === 'Reports' && (
          <div className="card stack-sm">
            {reports.length === 0 ? <p className="help-text">No reports filed.</p> : reports.map((r) => (
              <div key={r.id} className="row row--between">
                <div>
                  <p style={{ margin: 0, fontWeight: 700 }}>{r.target_type} · {r.reason || 'No reason given'}</p>
                  <p className="help-text" style={{ margin: 0 }}>{new Date(r.created_at).toLocaleString()}</p>
                </div>
                {r.status === 'open' ? (
                  <button className="btn btn--ghost btn--sm" onClick={() => resolveReport(r.id)}>Mark resolved</button>
                ) : (
                  <span className="pill pill--go">Resolved</span>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'Reviews' && (
          <div className="card stack-sm">
            {reviews.map((r) => (
              <div key={r.id} className="row row--between">
                <div>
                  <p style={{ margin: 0, fontWeight: 700 }}>{r.profiles?.full_name} · ★ {r.rating} · {r.events?.title}</p>
                  {r.body && <p className="help-text" style={{ margin: 0 }}>{r.body}</p>}
                </div>
                <button className="btn btn--danger btn--sm" onClick={() => deleteReview(r.id)}>Remove</button>
              </div>
            ))}
          </div>
        )}

        {tab === 'Settings' && (
          <div className="card stack">
            <div className="field">
              <label className="label">Site name</label>
              <input className="input" defaultValue={settings.site_name} onBlur={(e) => saveSetting('site_name', e.target.value)} />
            </div>
            <div className="field">
              <label className="label">Support email</label>
              <input className="input" defaultValue={settings.support_email} onBlur={(e) => saveSetting('support_email', e.target.value)} />
            </div>
            <p className="help-text">Changes save automatically when you click away from a field.</p>
          </div>
        )}
      </div>
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card">
      <p className="help-text" style={{ margin: 0 }}>{label}</p>
      <p className="display" style={{ fontSize: 32, marginTop: 4 }}>{value}</p>
    </div>
  );
}
