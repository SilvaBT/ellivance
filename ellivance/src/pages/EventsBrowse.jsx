import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Navbar from '../components/Navbar.jsx';
import EventCard from '../components/EventCard.jsx';

export default function EventsBrowse() {
  const [params, setParams] = useSearchParams();
  const [events, setEvents] = useState(null);
  const [categories, setCategories] = useState([]);

  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const dateFrom = params.get('date') || '';
  const price = params.get('price') || ''; // '', 'free', 'paid'
  const mode = params.get('mode') || ''; // '', 'physical', 'virtual', 'hybrid'
  const sort = params.get('sort') || 'newest';

  function setParam(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  }

  useEffect(() => {
    supabase.from('categories').select('*').then(({ data }) => setCategories(data || []));
  }, []);

  useEffect(() => {
    let query = supabase.from('events').select('*, categories ( name, slug )').eq('status', 'published');
    if (q) query = query.ilike('title', `%${q}%`);
    if (category) query = query.eq('categories.slug', category);
    if (dateFrom) query = query.gte('event_date', dateFrom);
    if (price) query = query.eq('ticket_type', price);
    if (mode) query = query.eq('event_type', mode);

    if (sort === 'popular') query = query.order('view_count', { ascending: false });
    else if (sort === 'date') query = query.order('event_date', { ascending: true });
    else query = query.order('created_at', { ascending: false });

    query.then(async ({ data }) => {
      let rows = (data || []).filter((e) => !category || e.categories?.slug === category);
      if (sort === 'rating' && rows.length) {
        const ids = rows.map((r) => r.id);
        const { data: reviews } = await supabase.from('reviews').select('event_id, rating').in('event_id', ids);
        const avg = {};
        (reviews || []).forEach((r) => {
          avg[r.event_id] = avg[r.event_id] || [];
          avg[r.event_id].push(r.rating);
        });
        rows = rows
          .map((r) => ({ ...r, _rating: avg[r.id] ? avg[r.id].reduce((a, b) => a + b, 0) / avg[r.id].length : 0 }))
          .sort((a, b) => b._rating - a._rating);
      }
      setEvents(rows);
    });
  }, [q, category, dateFrom, price, mode, sort]);

  return (
    <>
      <Navbar />
      <div className="page stack">
        <div>
          <p className="eyebrow">Discover</p>
          <h1>Browse events</h1>
        </div>

        <div className="card stack">
          <input
            className="input"
            placeholder="Search events…"
            defaultValue={q}
            onKeyDown={(e) => e.key === 'Enter' && setParam('q', e.currentTarget.value)}
          />
          <div className="row row--wrap">
            <select className="select" value={category} onChange={(e) => setParam('category', e.target.value)} style={{ width: 'auto' }}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>{c.icon} {c.name}</option>
              ))}
            </select>
            <input type="date" className="input" style={{ width: 'auto' }} value={dateFrom} onChange={(e) => setParam('date', e.target.value)} />
            <select className="select" value={price} onChange={(e) => setParam('price', e.target.value)} style={{ width: 'auto' }}>
              <option value="">Free & paid</option>
              <option value="free">Free only</option>
              <option value="paid">Paid only</option>
            </select>
            <select className="select" value={mode} onChange={(e) => setParam('mode', e.target.value)} style={{ width: 'auto' }}>
              <option value="">Any format</option>
              <option value="physical">In person</option>
              <option value="virtual">Online</option>
              <option value="hybrid">Hybrid</option>
            </select>
            <select className="select" value={sort} onChange={(e) => setParam('sort', e.target.value)} style={{ width: 'auto', marginLeft: 'auto' }}>
              <option value="newest">Newest</option>
              <option value="popular">Most popular</option>
              <option value="date">Date</option>
              <option value="rating">Rating</option>
            </select>
          </div>
        </div>

        {events === null ? (
          <p className="help-text">Loading events…</p>
        ) : events.length === 0 ? (
          <div className="card empty-state">No events match those filters. Try widening your search.</div>
        ) : (
          <div className="grid grid-cards">
            {events.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
