import { Link } from 'react-router-dom';
import { formatEventDate } from '../lib/utils.js';

export default function EventCard({ event }) {
  return (
    <Link to={`/events/${event.slug}`} className="event-card">
      <img
        className="event-card__image"
        src={event.banner_url || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=60'}
        alt=""
      />
      <div className="event-card__body">
        <span className="event-card__date">{formatEventDate(event.event_date)}</span>
        <h3 className="event-card__title">{event.title}</h3>
        <span className="event-card__meta">
          {event.event_type === 'virtual' ? 'Online' : event.venue_name || event.venue_address || 'Venue TBA'}
        </span>
        <div className="row" style={{ marginTop: 4 }}>
          {event.ticket_type === 'free' ? (
            <span className="pill pill--go">Free</span>
          ) : (
            <span className="pill pill--accent">From ${event.ticket_price}</span>
          )}
          {event.categories?.name && <span className="pill pill--ink">{event.categories.name}</span>}
        </div>
      </div>
    </Link>
  );
}
