import { QRCodeSVG } from 'qrcode.react';

export default function QRTicket({ event, registration, attendeeName }) {
  const checkInUrl = `${window.location.origin}/checkin/${registration.ticket_code}`;
  const cancelled = registration.status === 'cancelled';

  return (
    <div className="ticket-stub">
      <div className="ticket-stub__main stack-sm">
        <span className="eyebrow">Ellivance ticket</span>
        <h2 style={{ fontSize: 24 }}>{event.title}</h2>
        <p className="help-text" style={{ margin: 0 }}>
          {new Date(`${event.event_date}T${event.start_time || '00:00'}`).toLocaleString(undefined, {
            weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
          })}
        </p>
        <p className="help-text" style={{ margin: 0 }}>
          {event.venue_name || event.venue_address || (event.event_type === 'virtual' ? 'Online event' : 'Venue TBA')}
        </p>
        <div className="row" style={{ marginTop: 12 }}>
          <div>
            <p className="label" style={{ marginBottom: 2 }}>Attendee</p>
            <p style={{ margin: 0, fontWeight: 700 }}>{attendeeName}</p>
          </div>
        </div>
        {cancelled && <span className="pill pill--stop pill--dot" style={{ alignSelf: 'flex-start', marginTop: 8 }}>Cancelled</span>}
        {registration.checked_in_at && (
          <span className="pill pill--go pill--dot" style={{ alignSelf: 'flex-start', marginTop: 8 }}>
            Checked in {new Date(registration.checked_in_at).toLocaleTimeString()}
          </span>
        )}
      </div>
      <div className="ticket-stub__divider" />
      <div className="ticket-stub__stub">
        <div style={{ background: '#fff', padding: 10, borderRadius: 10, opacity: cancelled ? 0.35 : 1 }}>
          <QRCodeSVG value={checkInUrl} size={128} fgColor="#2c1f17" level="M" />
        </div>
        <p className="mono help-text" style={{ margin: 0, fontSize: 11 }}>{registration.ticket_code}</p>
      </div>
    </div>
  );
}
