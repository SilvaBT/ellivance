export function slugify(text) {
  return (
    text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') || 'event'
  );
}

export function formatEventDate(dateStr) {
  if (!dateStr) return 'Date TBA';
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const d = new Date();
  d.setHours(Number(h), Number(m));
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function eventDateTime(event) {
  if (!event.event_date) return null;
  const time = event.start_time || '00:00:00';
  return new Date(`${event.event_date}T${time}`);
}

export function downloadBlob(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function toCSV(rows, headers) {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(',')];
  for (const row of rows) lines.push(headers.map((h) => escape(row[h])).join(','));
  return lines.join('\n');
}

export function buildICS(event) {
  const start = eventDateTime(event);
  const end = event.end_time ? new Date(`${event.event_date}T${event.end_time}`) : new Date(start.getTime() + 60 * 60 * 1000);
  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `UID:${event.id}@ellivance.app`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${(event.title || '').replace(/\n/g, ' ')}`,
    `LOCATION:${(event.venue_name || event.venue_address || 'Online').replace(/\n/g, ' ')}`,
    `DESCRIPTION:${(event.description || '').replace(/<[^>]+>/g, '').replace(/\n/g, ' ').slice(0, 500)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function googleCalendarUrl(event) {
  const start = eventDateTime(event);
  const end = event.end_time ? new Date(`${event.event_date}T${event.end_time}`) : new Date(start.getTime() + 60 * 60 * 1000);
  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title || '',
    dates: `${fmt(start)}/${fmt(end)}`,
    location: event.venue_name || event.venue_address || '',
    details: (event.description || '').replace(/<[^>]+>/g, '').slice(0, 500),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
