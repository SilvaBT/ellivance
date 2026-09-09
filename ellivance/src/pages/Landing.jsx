import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Navbar from '../components/Navbar.jsx';
import EventCard from '../components/EventCard.jsx';

function Section({ title, events, emptyText }) {
  if (!events) return null;
  return (
    <div className="stack">
      <h2>{title}</h2>
      {events.length === 0 ? (
        <p className="help-text">{emptyText}</p>
      ) : (
        <div className="grid grid-cards">
          {events.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Landing() {
  const [featured, setFeatured] = useState(null);
  const [trending, setTrending] = useState(null);
  const [recent, setRecent] = useState(null);
  const [upcoming, setUpcoming] = useState(null);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const cols = '*, categories ( name, slug )';
    const today = new Date().toISOString().slice(0, 10);

    supabase.from('events').select(cols).eq('status', 'published').eq('is_featured', true).limit(6)
      .then(({ data }) => setFeatured(data || []));
    supabase.from('events').select(cols).eq('status', 'published').order('view_count', { ascending: false }).limit(6)
      .then(({ data }) => setTrending(data || []));
    supabase.from('events').select(cols).eq('status', 'published').order('created_at', { ascending: false }).limit(6)
      .then(({ data }) => setRecent(data || []));
    supabase.from('events').select(cols).eq('status', 'published').gte('event_date', today).order('event_date', { ascending: true }).limit(6)
      .then(({ data }) => setUpcoming(data || []));
    supabase.from('categories').select('*').then(({ data }) => setCategories(data || []));
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    navigate(`/events?q=${encodeURIComponent(query)}`);
  }

  return (
    <>
      <Navbar />
      <div style={{ background: 'var(--bg-sunken)', borderBottom: '1px solid var(--line)' }}>
        <div className="page" style={{ paddingTop: 56, paddingBottom: 56 }}>
          <p className="eyebrow">Ellivance</p>
          <h1 style={{ fontSize: 44, maxWidth: 640, marginBottom: 12 }}>Events worth showing up for.</h1>
          <p className="muted" style={{ maxWidth: 520, marginBottom: 24, fontSize: 17 }}>
            Discover things happening near you, or publish your own — in minutes, not hours.
          </p>
          <form className="row" onSubmit={handleSearch} style={{ maxWidth: 520 }}>
            <input
              className="input"
              placeholder="Search events, categories, cities…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="btn btn--primary">Search</button>
          </form>
          <div className="row row--wrap" style={{ marginTop: 20 }}>
            {categories.map((c) => (
              <Link key={c.id} to={`/events?category=${c.slug}`} className="pill pill--ink">
                {c.icon} {c.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="page stack" style={{ gap: 48 }}>
        <Section title="Featured events" events={featured} emptyText="No featured events yet — check back soon." />
        <Section title="Trending now" events={trending} emptyText="No events yet." />
        <Section title="Upcoming" events={upcoming} emptyText="No upcoming events yet." />
        <Section title="Recently added" events={recent} emptyText="No events yet." />
        <div style={{ textAlign: 'center' }}>
          <Link to="/events" className="btn btn--ink">Browse all events</Link>
        </div>
      </div>
    </>
  );
}
