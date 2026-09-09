import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../hooks/useAuth.jsx';
import Navbar from '../components/Navbar.jsx';
import QRTicket from '../components/QRTicket.jsx';
import { downloadTicketPDF } from '../lib/pdfTicket.js';
import { buildICS, downloadBlob } from '../lib/utils.js';

export default function TicketView() {
  const { id } = useParams();
  const { profile } = useAuth();
  const [registration, setRegistration] = useState(null);
  const [event, setEvent] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    supabase
      .from('registrations')
      .select('*, events (*)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setRegistration(data);
        setEvent(data.events);
      });
  }, [id]);

  async function handleDownloadPDF() {
    setDownloading(true);
    try {
      await downloadTicketPDF({ event, registration, attendeeName: profile?.full_name });
    } finally {
      setDownloading(false);
    }
  }

  async function handleCancel() {
    if (!confirm('Cancel this registration? Your ticket will no longer be valid.')) return;
    await supabase.from('registrations').update({ status: 'cancelled' }).eq('id', id);
    setRegistration((r) => ({ ...r, status: 'cancelled' }));
  }

  if (!registration || !event) {
    return (
      <>
        <Navbar />
        <div className="page">Loading…</div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="page page--medium stack">
        <div>
          <p className="eyebrow">Your ticket</p>
          <h1>{event.title}</h1>
        </div>

        <QRTicket event={event} registration={registration} attendeeName={profile?.full_name} />

        <div className="row row--wrap">
          <button className="btn btn--primary" onClick={handleDownloadPDF} disabled={downloading}>
            {downloading ? 'Preparing…' : '⬇ Download ticket (PDF)'}
          </button>
          <button className="btn btn--ghost" onClick={() => downloadBlob(`${event.slug}.ics`, buildICS(event), 'text/calendar')}>
            📅 Add to calendar
          </button>
          <Link className="btn btn--ghost" to={`/events/${event.slug}`}>
            View event page
          </Link>
          {registration.status !== 'cancelled' && (
            <button className="btn btn--danger" onClick={handleCancel}>
              Cancel registration
            </button>
          )}
        </div>

        <div className="card">
          <p className="help-text">
            A confirmation was sent to your email when you registered. At check-in, the organiser scans the QR
            code above (or opens the check-in link on their phone) to validate your ticket — each code can only
            be used once.
          </p>
        </div>
      </div>
    </>
  );
}
