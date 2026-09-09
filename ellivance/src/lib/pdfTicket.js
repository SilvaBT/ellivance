import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { formatEventDate, formatTime } from './utils.js';

export async function downloadTicketPDF({ event, registration, attendeeName }) {
  const checkInUrl = `${window.location.origin}/checkin/${registration.ticket_code}`;
  const qrDataUrl = await QRCode.toDataURL(checkInUrl, { margin: 1, width: 300, color: { dark: '#2c1f17', light: '#ffffff' } });

  const doc = new jsPDF({ unit: 'pt', format: [400, 640] });

  doc.setFillColor('#f5efe6');
  doc.rect(0, 0, 400, 640, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor('#c9762f');
  doc.text('ELLIVANCE', 32, 44);

  doc.setTextColor('#2c1f17');
  doc.setFontSize(20);
  const titleLines = doc.splitTextToSize(event.title, 336);
  doc.text(titleLines, 32, 76);

  let y = 76 + titleLines.length * 24 + 16;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor('#6b5541');
  doc.text(`${formatEventDate(event.event_date)}${event.start_time ? ' · ' + formatTime(event.start_time) : ''}`, 32, y);
  y += 18;
  doc.text(event.venue_name || event.venue_address || (event.event_type === 'virtual' ? 'Online event' : 'Venue TBA'), 32, y);
  y += 30;

  doc.setDrawColor('#e3d5c0');
  doc.setLineDashPattern([4, 3], 0);
  doc.line(32, y, 368, y);
  y += 30;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor('#2c1f17');
  doc.text(attendeeName || 'Guest', 32, y);
  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor('#6b5541');
  doc.text(`Ticket code: ${registration.ticket_code}`, 32, y);
  y += 24;

  doc.addImage(qrDataUrl, 'PNG', 100, y, 200, 200);
  y += 216;

  doc.setFontSize(9);
  doc.setTextColor('#6b5541');
  doc.text('Present this QR code at check-in. One scan per ticket.', 200, y, { align: 'center' });

  doc.save(`${event.slug || 'ticket'}-ticket.pdf`);
}
