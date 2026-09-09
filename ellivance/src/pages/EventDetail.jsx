import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../hooks/useAuth.jsx';
import Navbar from '../components/Navbar.jsx';
import CountdownTimer from '../components/CountdownTimer.jsx';
import ShareButtons from '../components/ShareButtons.jsx';
import StarRating from '../components/StarRating.jsx';
import { buildICS, downloadBlob, eventDateTime, formatEventDate, formatTime, googleCalendarUrl } from '../lib/utils.js';

export default function EventDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [images, setImages] = useState([]);
  const [agenda, setAgenda] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [registrationCount, setRegistrationCount] = useState(0);
  const [myRegistration, setMyRegistration] = useState(null);
  const [isFavourited, setIsFavourited] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [myReview, setMyReview] = useState({ rating: 0, body: '' });
  const [busy, setBusy] = useState(false);

  async function loadAll() {
    const { data: ev } = await supabase
      .from('events')
      .select('*, categories ( name, slug ), profiles:organiser_id ( id, full_name, avatar_url, bio )')
      .eq('slug', slug)
      .single();
    if (!ev) return setEvent(false);
    setEvent(ev);
    supabase.rpc('increment_view_count', { p_event_id: ev.id });

    const [{ data: imgs }, { data: ag }, { data: sp }, { data: spo }, { data: fq }, { count }, { data: rv }, { data: cm }] = await Promise.all([
      supabase.from('event_images').select('*').eq('event_id', ev.id).order('sort_order'),
      supabase.from('event_agenda').select('*').eq('event_id', ev.id).order('sort_order'),
      supabase.from('event_speakers').select('*').eq('event_id', ev.id).order('sort_order'),
      supabase.from('event_sponsors').select('*').eq('event_id', ev.id).order('sort_order'),
      supabase.from('event_faqs').select('*').eq('event_id', ev.id).order('sort_order'),
      supabase.from('registrations').select('id', { count: 'exact', head: true }).eq('event_id', ev.id).eq('status', 'confirmed'),
      supabase.from('reviews').select('*, profiles ( full_name, avatar_url )').eq('event_id', ev.id).order('created_at', { ascending: false }),
      supabase.from('comments').select('*, profiles ( full_name, avatar_url )').eq('event_id', ev.id).order('created_at', { ascending: false }),
    ]);
    setImages(imgs || []);
    setAgenda(ag || []);
    setSpeakers(sp || []);
    setSponsors(spo || []);
    setFaqs(fq || []);
    setRegistrationCount(count || 0);
    setReviews(rv || []);
    setComments(cm || []);

    if (user) {
      const { data: reg } = await supabase.from('registrations').select('*').eq('event_id', ev.id).eq('user_id', user.id).maybeSingle();
      setMyRegistration(reg);
      const { data: fav } = await supabase.from('favourites').select('id').eq('event_id', ev.id).eq('user_id', user.id).maybeSingle();
      setIsFavourited(!!fav);
      const mine = (rv || []).find((r) => r.user_id === user.id);
      if (mine) setMyReview({ rating: mine.rating, body: mine.body || '' });
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, user?.id]);

  async function handleRegister() {
    if (!user) return navigate('/login');
    setBusy(true);
    const { data, error } = await supabase.from('registrations').insert({ event_id: event.id, user_id: user.id }).select().single();
    setBusy(false);
    if (error) return alert(error.message.includes('row-level security') ? 'Registration is closed for this event.' : error.message);
    setMyRegistration(data);
    setRegistrationCount((c) => c + 1);
    await supabase.from('notifications').insert({
      user_id: event.organiser_id,
      type: 'new_registration',
      title: `New registration for ${event.title}`,
      body: `Someone just registered.`,
      event_id: event.id,
    });
    navigate(`/tickets/${data.id}`);
  }

  async function toggleFavourite() {
    if (!user) return navigate('/login');
    if (isFavourited) {
      await supabase.from('favourites').delete().eq('event_id', event.id).eq('user_id', user.id);
      setIsFavourited(false);
    } else {
      await supabase.from('favourites').insert({ event_id: event.id, user_id: user.id });
      setIsFavourited(true);
    }
  }

  async function submitComment(e) {
    e.preventDefault();
    if (!user) return navigate('/login');
    if (!newComment.trim()) return;
    const { data } = await supabase
      .from('comments')
      .insert({ event_id: event.id, user_id: user.id, body: newComment.trim() })
      .select('*, profiles ( full_name, avatar_url )')
      .single();
    setComments([data, ...comments]);
    setNewComment('');
  }

  async function submitReview(e) {
    e.preventDefault();
    if (!user) return navigate('/login');
    if (!myReview.rating) return alert('Pick a star rating first.');
    const { data, error } = await supabase
      .from('reviews')
      .upsert({ event_id: event.id, user_id: user.id, rating: myReview.rating, body: myReview.body }, { onConflict: 'event_id,user_id' })
      .select('*, profiles ( full_name, avatar_url )')
      .single();
    if (error) return alert(error.message.includes('row-level security') ? 'Only attendees who registered can leave a review.' : error.message);
    setReviews([data, ...reviews.filter((r) => r.user_id !== user.id)]);
  }

  if (event === null) return (<><Navbar /><div className="page">Loading…</div></>);
  if (event === false) return (<><Navbar /><div className="page empty-state">Event not found.</div></>);

  const avgRating = reviews.length ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : null;
  const spotsLeft = event.max_attendees ? event.max_attendees - registrationCount : null;
  const isFull = spotsLeft !== null && spotsLeft <= 0;
  const isOrganiser = user?.id === event.organiser_id;

  return (
    <>
      <Navbar />
      <div className="page stack" style={{ gap: 32 }}>
        <img className="hero-media" src={event.banner_url || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1600&q=70'} alt="" />

        <div className="row row--between row--wrap">
          <div className="stack-sm">
            <div className="row row--wrap">
              {event.categories?.name && <span className="pill pill--ink">{event.categories.name}</span>}
              <span className="pill pill--accent">{event.event_type}</span>
              {event.ticket_type === 'free' ? <span className="pill pill--go">Free</span> : <span className="pill pill--go">${event.ticket_price}</span>}
              {avgRating && <span className="pill pill--ink">★ {avgRating} ({reviews.length})</span>}
            </div>
            <h1 style={{ fontSize: 34 }}>{event.title}</h1>
            <p className="muted">
              {formatEventDate(event.event_date)}{event.start_time && ` · ${formatTime(event.start_time)}${event.end_time ? ` – ${formatTime(event.end_time)}` : ''}`} ({event.timezone})
            </p>
          </div>
          <div className="stack-sm" style={{ alignItems: 'flex-end' }}>
            {eventDateTime(event) && <CountdownTimer target={eventDateTime(event)} />}
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', alignItems: 'start' }}>
          <div className="stack" style={{ gap: 32 }}>
            <div className="card">
              <h2 style={{ marginBottom: 12 }}>About this event</h2>
              <div dangerouslySetInnerHTML={{ __html: event.description || '<p>No description yet.</p>' }} />
              {event.tags?.length > 0 && (
                <div className="row row--wrap" style={{ marginTop: 16 }}>
                  {event.tags.map((t) => <span key={t} className="pill pill--ink">#{t}</span>)}
                </div>
              )}
            </div>

            {images.length > 0 && (
              <div className="stack">
                <h2>Gallery</h2>
                <div className="grid grid-cards">
                  {images.map((img) => <img key={img.id} src={img.url} alt="" style={{ borderRadius: 12, aspectRatio: '4/3', objectFit: 'cover' }} />)}
                </div>
              </div>
            )}

            {agenda.length > 0 && (
              <div className="stack">
                <h2>Agenda</h2>
                <div className="stack-sm">
                  {agenda.map((a) => (
                    <div key={a.id} className="card row" style={{ alignItems: 'flex-start' }}>
                      <span className="mono pill pill--accent">{a.time_label}</span>
                      <div>
                        <p style={{ fontWeight: 700, margin: 0 }}>{a.title}</p>
                        {a.description && <p className="help-text" style={{ margin: '2px 0 0' }}>{a.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {speakers.length > 0 && (
              <div className="stack">
                <h2>Speakers & guests</h2>
                <div className="grid grid-cards">
                  {speakers.map((s) => (
                    <div key={s.id} className="card row">
                      <img src={s.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(s.name)}`} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
                      <div>
                        <p style={{ fontWeight: 700, margin: 0 }}>{s.name}</p>
                        {s.title && <p className="help-text" style={{ margin: 0 }}>{s.title}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sponsors.length > 0 && (
              <div className="stack">
                <h2>Sponsors</h2>
                <div className="row row--wrap">
                  {sponsors.map((s) => (
                    <a key={s.id} href={s.link_url || '#'} target="_blank" rel="noreferrer" className="card row" style={{ padding: 12 }}>
                      {s.logo_url && <img src={s.logo_url} alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />}
                      <span style={{ fontWeight: 600 }}>{s.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {faqs.length > 0 && (
              <div className="stack">
                <h2>Frequently asked questions</h2>
                <div className="stack-sm">
                  {faqs.map((f) => (
                    <div key={f.id} className="card">
                      <p style={{ fontWeight: 700, margin: 0 }}>{f.question}</p>
                      <p className="help-text" style={{ margin: '4px 0 0' }}>{f.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="stack">
              <h2>Reviews {avgRating && `· ★ ${avgRating}`}</h2>
              {myRegistration && (
                <form className="card stack-sm" onSubmit={submitReview}>
                  <span className="label">Leave a review</span>
                  <StarRating value={myReview.rating} onChange={(v) => setMyReview((r) => ({ ...r, rating: v }))} size={22} />
                  <textarea className="textarea" placeholder="How was it?" value={myReview.body} onChange={(e) => setMyReview((r) => ({ ...r, body: e.target.value }))} />
                  <button className="btn btn--primary btn--sm" style={{ alignSelf: 'flex-start' }}>Submit review</button>
                </form>
              )}
              {reviews.length === 0 ? (
                <p className="help-text">No reviews yet.</p>
              ) : (
                reviews.map((r) => (
                  <div key={r.id} className="card">
                    <div className="row row--between">
                      <span style={{ fontWeight: 700 }}>{r.profiles?.full_name}</span>
                      <StarRating value={r.rating} size={14} />
                    </div>
                    {r.body && <p className="help-text" style={{ marginTop: 6 }}>{r.body}</p>}
                  </div>
                ))
              )}
            </div>

            <div className="stack">
              <h2>Comments</h2>
              <form className="row" onSubmit={submitComment}>
                <input className="input" placeholder={user ? 'Ask a question or say hi…' : 'Sign in to comment'} value={newComment} onChange={(e) => setNewComment(e.target.value)} disabled={!user} />
                <button className="btn btn--primary btn--sm" disabled={!user}>Post</button>
              </form>
              {comments.map((c) => (
                <div key={c.id} className="row" style={{ alignItems: 'flex-start' }}>
                  <img src={c.profiles?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.profiles?.full_name || 'U')}`} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                  <div className="card" style={{ flex: 1, padding: 12 }}>
                    <p style={{ fontWeight: 700, margin: 0, fontSize: 13 }}>{c.profiles?.full_name}</p>
                    <p style={{ margin: '2px 0 0' }}>{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="stack" style={{ position: 'sticky', top: 84 }}>
            <div className="card stack">
              <div className="row row--between">
                <span className="help-text">Attendees</span>
                <span style={{ fontWeight: 700 }}>{registrationCount}{event.max_attendees ? ` / ${event.max_attendees}` : ''}</span>
              </div>
              {spotsLeft !== null && <span className="help-text">{isFull ? 'Sold out' : `${spotsLeft} spots left`}</span>}

              {isOrganiser ? (
                <Link to={`/dashboard/manage/${event.id}`} className="btn btn--ink btn--block">Manage this event</Link>
              ) : myRegistration ? (
                <Link to={`/tickets/${myRegistration.id}`} className="btn btn--primary btn--block">View my ticket</Link>
              ) : (
                <button className="btn btn--primary btn--block" onClick={handleRegister} disabled={busy || isFull}>
                  {isFull ? 'Sold out' : busy ? 'Registering…' : event.ticket_type === 'free' ? 'RSVP — it\u2019s free' : `Register — $${event.ticket_price}`}
                </button>
              )}
              <button className="btn btn--ghost btn--block" onClick={toggleFavourite}>
                {isFavourited ? '★ Saved' : '☆ Save for later'}
              </button>

              <div className="row row--wrap">
                <button className="btn btn--ghost btn--sm" onClick={() => downloadBlob(`${event.slug}.ics`, buildICS(event), 'text/calendar')}>
                  📅 Add to Calendar
                </button>
                <a className="btn btn--ghost btn--sm" href={googleCalendarUrl(event)} target="_blank" rel="noreferrer">Google Calendar</a>
              </div>
            </div>

            {(event.venue_address || event.venue_name) && (
              <div className="card stack-sm">
                <span className="label">Location</span>
                <p style={{ margin: 0 }}>{event.venue_name}</p>
                <p className="help-text" style={{ margin: 0 }}>{event.venue_address}</p>
                {import.meta.env.VITE_ENABLE_MAP_EMBED === 'true' && (
                  <iframe
                    title="map"
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(event.venue_address || event.venue_name)}&output=embed`}
                    style={{ width: '100%', height: 180, border: 0, borderRadius: 10 }}
                    loading="lazy"
                  />
                )}
              </div>
            )}

            {event.virtual_link && myRegistration && (
              <div className="card stack-sm">
                <span className="label">Join link</span>
                <a href={event.virtual_link} target="_blank" rel="noreferrer" className="btn btn--ghost btn--block">Open virtual event</a>
              </div>
            )}

            <div className="card stack-sm">
              <span className="label">Organiser</span>
              <div className="row">
                <img src={event.profiles?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(event.profiles?.full_name || 'O')}`} alt="" style={{ width: 40, height: 40, borderRadius: '50%' }} />
                <span style={{ fontWeight: 700 }}>{event.profiles?.full_name}</span>
              </div>
              {(event.contact_email || event.contact_phone) && (
                <p className="help-text" style={{ margin: 0 }}>{event.contact_email} {event.contact_phone}</p>
              )}
              {event.website_url && <a href={event.website_url} target="_blank" rel="noreferrer" className="help-text">Website ↗</a>}
            </div>

            {(event.dress_code || event.age_restriction) && (
              <div className="card stack-sm">
                {event.dress_code && <p className="help-text" style={{ margin: 0 }}><strong>Dress code:</strong> {event.dress_code}</p>}
                {event.age_restriction && <p className="help-text" style={{ margin: 0 }}><strong>Age restriction:</strong> {event.age_restriction}</p>}
              </div>
            )}

            <div className="card stack-sm">
              <span className="label">Share</span>
              <ShareButtons url={window.location.href} title={event.title} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
