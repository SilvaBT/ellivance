import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Navbar from '../components/Navbar.jsx';
import { downloadBlob, formatEventDate, toCSV } from '../lib/utils.js';

export default function OrganizerManage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceBody, setAnnounceBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function load() {
    const { data: ev } = await supabase.from('events').select('*').eq('id', id).single();
    setEvent(ev);
    const { data: regs } = await supabase
      .from('registrations')
      .select('*, profiles ( full_name, avatar_url )')
      .eq('event_id', id)
      .order('created_at', { ascending: false });
    setRegistrations(regs || []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!event) return (<><Navbar /><div className="page">Loading…</div></>);

  const confirmed = registrations.filter((r) => r.status === 'confirmed');
  const checkedIn = confirmed.filter((r) => r.checked_in_at);
  const revenue = event.ticket_type === 'paid' ? confirmed.length * Number(event.ticket_price || 0) : 0;

  function exportCSV() {
    const rows = confirmed.map((r) => ({
      name: r.profiles?.full_name || '',
      ticket_code: r.ticket_code,
      registered_at: r.created_at,
      checked_in_at: r.checked_in_at || '',
    }));
    downloadBlob(`${event.slug}-attendees.csv`, toCSV(rows, ['name', 'ticket_code', 'registered_at', 'checked_in_at']), 'text/csv');
  }

  async function sendAnnouncement(e) {
    e.preventDefault();
    if (!announceTitle.trim()) return;
    setSending(true);
    await supabase.rpc('notify_attendees', {
      p_event_id: event.id,
      p_type: 'announcement',
      p_title: announceTitle.trim(),
      p_body: announceBody.trim(),
    });
    setSending(false);
    setSent(true);
    setAnnounceTitle('');
    setAnnounceBody('');
    setTimeout(() => setSent(false), 3000);
  }

  async function handleCancelEvent() {
    if (!confirm('Cancel this event? All attendees will be notified.')) return;
    await supabase.from('events').update({ status: 'cancelled' }).eq('id', event.id);
    await supabase.rpc('notify_attendees', {
      p_event_id: event.id,
      p_type: 'event_cancelled',
      p_title: `${event.title} has been cancelled`,
      p_body: 'The organiser has cancelled this event.',
    });
    load();
  }

  async function handleDeleteEvent() {
    if (!confirm('Permanently delete this event? This cannot be undone.')) return;
    await supabase.from('events').delete().eq('id', event.id);
    navigate('/dashboard');
  }

  return (
    <>
      <Navbar />
      <div className="page stack">
        <div className="row row--between row--wrap">
          <div>
            <p className="eyebrow">Manage event</p>
            <h1>{event.title}</h1>
            <p className="help-text">{formatEventDate(event.event_date)} · <Link to={`/events/${event.slug}`}>View public page ↗</Link></p>
          </div>
          <div className="row row--wrap">
            <Link to={`/dashboard/edit/${event.id}`} className="btn btn--ghost btn--sm">Edit</Link>
            {event.status !== 'cancelled' && (
              <button className="btn btn--ghost btn--sm" onClick={handleCancelEvent}>Cancel event</button>
            )}
            <button className="btn btn--danger btn--sm" onClick={handleDeleteEvent}>Delete</button>
          </div>
        </div>

        {event.status === 'cancelled' && <div className="card"><span className="pill pill--stop pill--dot">This event is cancelled</span></div>}

        <div className="grid grid-3">
          <Stat label="Registrations" value={confirmed.length} />
          <Stat label="Checked in" value={checkedIn.length} />
          <Stat label={event.ticket_type === 'paid' ? 'Ticket sales (informational)' : 'Ticket price'} value={event.ticket_type === 'paid' ? `$${revenue.toFixed(2)}` : 'Free'} />
        </div>

        <div className="card stack">
          <div className="row row--between">
            <p className="label" style={{ margin: 0 }}>Registrations</p>
            <button className="btn btn--ghost btn--sm" onClick={exportCSV} disabled={confirmed.length === 0}>⬇ Export CSV</button>
          </div>
          {confirmed.length === 0 ? (
            <p className="help-text">No one has registered yet.</p>
          ) : (
            <table className="table">
              <thead><tr><th>Name</th><th>Ticket code</th><th>Registered</th><th>Checked in</th></tr></thead>
              <tbody>
                {confirmed.map((r) => (
                  <tr key={r.id}>
                    <td>{r.profiles?.full_name}</td>
                    <td className="mono">{r.ticket_code}</td>
                    <td>{new Date(r.created_at).toLocaleDateString()}</td>
                    <td>{r.checked_in_at ? new Date(r.checked_in_at).toLocaleTimeString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card stack">
          <p className="label" style={{ margin: 0 }}>Send an announcement</p>
          <p className="help-text">Delivered as an in-app notification to everyone currently registered.</p>
          <form className="stack-sm" onSubmit={sendAnnouncement}>
            <input className="input" placeholder="Announcement title" value={announceTitle} onChange={(e) => setAnnounceTitle(e.target.value)} />
            <textarea className="textarea" placeholder="Message (optional)" value={announceBody} onChange={(e) => setAnnounceBody(e.target.value)} />
            <button className="btn btn--primary btn--sm" style={{ alignSelf: 'flex-start' }} disabled={sending || confirmed.length === 0}>
              {sending ? 'Sending…' : `Send to ${confirmed.length} attendee${confirmed.length === 1 ? '' : 's'}`}
            </button>
            {sent && <span className="success-text">Sent.</span>}
          </form>
        </div>

        <div className="card">
          <p className="help-text">
            To check in an attendee, open their ticket's QR code with your phone camera (or open the check-in
            link directly) while signed in as the organiser — it validates and marks them checked in immediately.
          </p>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card">
      <p className="help-text" style={{ margin: 0 }}>{label}</p>
      <p className="display" style={{ fontSize: 28, marginTop: 4 }}>{value}</p>
    </div>
  );
}
