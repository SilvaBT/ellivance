import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../hooks/useAuth.jsx';
import Navbar from '../components/Navbar.jsx';
import ImageUploader from '../components/ImageUploader.jsx';
import RichTextEditor from '../components/RichTextEditor.jsx';
import { Repeater, TagInput } from '../components/Repeater.jsx';
import { slugify } from '../lib/utils.js';

const STEPS = ['Basics', 'Media', 'Schedule & location', 'Tickets', 'Extras', 'Review'];

const EMPTY = {
  title: '', description: '', category_id: '', tags: [], event_type: 'physical',
  banner_url: '', video_url: '',
  event_date: '', start_time: '', end_time: '', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  venue_name: '', venue_address: '', virtual_link: '',
  max_attendees: '', ticket_type: 'free', ticket_price: '', registration_deadline: '',
  contact_email: '', contact_phone: '', website_url: '',
  social_links: { facebook: '', instagram: '', twitter: '', linkedin: '' },
  dress_code: '', age_restriction: '',
};

export default function EventForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [galleryUrls, setGalleryUrls] = useState([]);
  const [agenda, setAgenda] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [eventId, setEventId] = useState(id || null);
  const [status, setStatus] = useState('draft');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    supabase.from('categories').select('*').order('name').then(({ data }) => setCategories(data || []));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const { data: ev } = await supabase.from('events').select('*').eq('id', id).single();
      if (!ev) return;
      setForm({
        ...EMPTY, ...ev,
        social_links: { ...EMPTY.social_links, ...(ev.social_links || {}) },
        max_attendees: ev.max_attendees ?? '',
        ticket_price: ev.ticket_price ?? '',
        registration_deadline: ev.registration_deadline ? ev.registration_deadline.slice(0, 16) : '',
      });
      setStatus(ev.status);
      const [{ data: imgs }, { data: ag }, { data: sp }, { data: spo }, { data: fq }] = await Promise.all([
        supabase.from('event_images').select('*').eq('event_id', id).order('sort_order'),
        supabase.from('event_agenda').select('*').eq('event_id', id).order('sort_order'),
        supabase.from('event_speakers').select('*').eq('event_id', id).order('sort_order'),
        supabase.from('event_sponsors').select('*').eq('event_id', id).order('sort_order'),
        supabase.from('event_faqs').select('*').eq('event_id', id).order('sort_order'),
      ]);
      setGalleryUrls((imgs || []).map((i) => i.url));
      setAgenda(ag || []);
      setSpeakers(sp || []);
      setSponsors(spo || []);
      setFaqs(fq || []);
      setLoading(false);
    })();
  }, [id, isEdit]);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  function setSocial(key, value) {
    setForm((f) => ({ ...f, social_links: { ...f.social_links, [key]: value } }));
  }

  function buildPayload() {
    return {
      organiser_id: user.id,
      title: form.title.trim() || 'Untitled event',
      slug: (isEdit && form.slug) || `${slugify(form.title)}-${Math.random().toString(36).slice(2, 7)}`,
      description: form.description,
      category_id: form.category_id || null,
      tags: form.tags,
      event_type: form.event_type,
      banner_url: form.banner_url || null,
      video_url: form.video_url || null,
      event_date: form.event_date || null,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      timezone: form.timezone,
      venue_name: form.venue_name || null,
      venue_address: form.venue_address || null,
      virtual_link: form.virtual_link || null,
      max_attendees: form.max_attendees ? Number(form.max_attendees) : null,
      ticket_type: form.ticket_type,
      ticket_price: form.ticket_type === 'paid' ? Number(form.ticket_price || 0) : 0,
      registration_deadline: form.registration_deadline ? new Date(form.registration_deadline).toISOString() : null,
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
      website_url: form.website_url || null,
      social_links: form.social_links,
      dress_code: form.dress_code || null,
      age_restriction: form.age_restriction || null,
    };
  }

  async function saveChildRows(evId) {
    async function replaceAll(table, rows, mapRow) {
      await supabase.from(table).delete().eq('event_id', evId);
      const payload = rows.map((r, i) => ({ ...mapRow(r), event_id: evId, sort_order: i }));
      if (payload.length) await supabase.from(table).insert(payload);
    }
    await Promise.all([
      (async () => {
        await supabase.from('event_images').delete().eq('event_id', evId);
        if (galleryUrls.length) await supabase.from('event_images').insert(galleryUrls.map((url, i) => ({ event_id: evId, url, sort_order: i })));
      })(),
      replaceAll('event_agenda', agenda.filter((a) => a.title), (a) => ({ time_label: a.time_label, title: a.title, description: a.description })),
      replaceAll('event_speakers', speakers.filter((s) => s.name), (s) => ({ name: s.name, title: s.title, bio: s.bio, photo_url: s.photo_url })),
      replaceAll('event_sponsors', sponsors.filter((s) => s.name), (s) => ({ name: s.name, logo_url: s.logo_url, link_url: s.link_url })),
      replaceAll('event_faqs', faqs.filter((f) => f.question), (f) => ({ question: f.question, answer: f.answer })),
    ]);
  }

  async function handleSave(newStatus) {
    setSaving(true);
    setError('');
    const payload = { ...buildPayload(), status: newStatus };
    let evId = eventId;
    if (evId) {
      const { error: err } = await supabase.from('events').update(payload).eq('id', evId);
      if (err) { setSaving(false); return setError(err.message); }
    } else {
      const { data, error: err } = await supabase.from('events').insert(payload).select().single();
      if (err) { setSaving(false); return setError(err.message); }
      evId = data.id;
      setEventId(evId);
    }
    await saveChildRows(evId);
    setSaving(false);
    setStatus(newStatus);
    if (newStatus === 'published') navigate(`/dashboard/manage/${evId}`);
    else navigate('/dashboard?tab=drafts');
  }

  async function handleDuplicate() {
    if (!eventId) return;
    const payload = { ...buildPayload(), status: 'draft', title: `${form.title} (copy)`, slug: `${slugify(form.title)}-copy-${Math.random().toString(36).slice(2, 7)}` };
    const { data, error: err } = await supabase.from('events').insert(payload).select().single();
    if (err) return setError(err.message);
    await saveChildRows(data.id);
    navigate(`/dashboard/edit/${data.id}`);
  }

  if (loading) return (<><Navbar /><div className="page">Loading…</div></>);

  return (
    <>
      <Navbar />
      <div className="page page--medium stack">
        <div className="row row--between row--wrap">
          <div>
            <p className="eyebrow">{isEdit ? 'Edit event' : 'Create event'}</p>
            <h1>{form.title || 'New event'}</h1>
          </div>
          {isEdit && (
            <button className="btn btn--ghost btn--sm" onClick={handleDuplicate}>Duplicate</button>
          )}
        </div>

        <div className="stepper">
          {STEPS.map((s, i) => (
            <button key={s} className={`step-chip ${i === step ? 'step-chip--active' : i < step ? 'step-chip--done' : ''}`} onClick={() => setStep(i)}>
              {i + 1}. {s}
            </button>
          ))}
        </div>

        <div className="card stack">
          {step === 0 && (
            <div className="stack">
              <Field label="Event title">
                <input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Sunset Rooftop Jazz Night" />
              </Field>
              <Field label="Description">
                <RichTextEditor value={form.description} onChange={(v) => set('description', v)} placeholder="Tell people what to expect…" />
              </Field>
              <div className="grid grid-2">
                <Field label="Category">
                  <select className="select" value={form.category_id} onChange={(e) => set('category_id', e.target.value)}>
                    <option value="">Select a category</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </Field>
                <Field label="Event type">
                  <select className="select" value={form.event_type} onChange={(e) => set('event_type', e.target.value)}>
                    <option value="physical">Physical</option>
                    <option value="virtual">Virtual</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </Field>
              </div>
              <Field label="Tags">
                <TagInput value={form.tags} onChange={(v) => set('tags', v)} placeholder="Type a tag and press Enter" />
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="stack">
              <ImageUploader bucket="event-images" value={form.banner_url} onChange={(v) => set('banner_url', v)} label="Event banner image" />
              <ImageUploader bucket="event-images" multiple value={galleryUrls} onChange={setGalleryUrls} label="Gallery images" />
              <Field label="Promotional video link (optional)">
                <input className="input" value={form.video_url} onChange={(e) => set('video_url', e.target.value)} placeholder="https://youtube.com/watch?v=…" />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="stack">
              <div className="grid grid-3">
                <Field label="Event date"><input type="date" className="input" value={form.event_date} onChange={(e) => set('event_date', e.target.value)} /></Field>
                <Field label="Start time"><input type="time" className="input" value={form.start_time} onChange={(e) => set('start_time', e.target.value)} /></Field>
                <Field label="End time"><input type="time" className="input" value={form.end_time} onChange={(e) => set('end_time', e.target.value)} /></Field>
              </div>
              <Field label="Time zone">
                <input className="input" value={form.timezone} onChange={(e) => set('timezone', e.target.value)} />
              </Field>
              {form.event_type !== 'virtual' && (
                <>
                  <Field label="Venue name"><input className="input" value={form.venue_name} onChange={(e) => set('venue_name', e.target.value)} /></Field>
                  <Field label="Venue address (used for Google Maps)"><input className="input" value={form.venue_address} onChange={(e) => set('venue_address', e.target.value)} /></Field>
                </>
              )}
              {form.event_type !== 'physical' && (
                <Field label="Virtual event link (shown to registered attendees only)">
                  <input className="input" value={form.virtual_link} onChange={(e) => set('virtual_link', e.target.value)} placeholder="https://zoom.us/…" />
                </Field>
              )}
              <div className="grid grid-2">
                <Field label="Maximum attendees (blank = unlimited)"><input type="number" min="1" className="input" value={form.max_attendees} onChange={(e) => set('max_attendees', e.target.value)} /></Field>
                <Field label="Registration deadline"><input type="datetime-local" className="input" value={form.registration_deadline} onChange={(e) => set('registration_deadline', e.target.value)} /></Field>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="stack">
              <Field label="Ticket type">
                <select className="select" value={form.ticket_type} onChange={(e) => set('ticket_type', e.target.value)}>
                  <option value="free">Free</option>
                  <option value="paid">Paid</option>
                </select>
              </Field>
              {form.ticket_type === 'paid' && (
                <>
                  <Field label="Ticket price (USD)">
                    <input type="number" min="0" step="0.01" className="input" value={form.ticket_price} onChange={(e) => set('ticket_price', e.target.value)} />
                  </Field>
                  <p className="help-text">
                    Note: real payment processing isn't wired up in this build — the price is shown for information,
                    but registering a "paid" event still books a free RSVP for now.
                  </p>
                </>
              )}
              <p className="help-text">Number of tickets available is controlled by "Maximum attendees" on the previous step.</p>
            </div>
          )}

          {step === 4 && (
            <div className="stack">
              <div className="grid grid-2">
                <Field label="Contact email"><input type="email" className="input" value={form.contact_email} onChange={(e) => set('contact_email', e.target.value)} /></Field>
                <Field label="Contact phone"><input className="input" value={form.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} /></Field>
              </div>
              <Field label="Website link"><input className="input" value={form.website_url} onChange={(e) => set('website_url', e.target.value)} /></Field>
              <div className="grid grid-2">
                <Field label="Facebook"><input className="input" value={form.social_links.facebook} onChange={(e) => setSocial('facebook', e.target.value)} /></Field>
                <Field label="Instagram"><input className="input" value={form.social_links.instagram} onChange={(e) => setSocial('instagram', e.target.value)} /></Field>
                <Field label="Twitter / X"><input className="input" value={form.social_links.twitter} onChange={(e) => setSocial('twitter', e.target.value)} /></Field>
                <Field label="LinkedIn"><input className="input" value={form.social_links.linkedin} onChange={(e) => setSocial('linkedin', e.target.value)} /></Field>
              </div>
              <div className="grid grid-2">
                <Field label="Dress code"><input className="input" value={form.dress_code} onChange={(e) => set('dress_code', e.target.value)} /></Field>
                <Field label="Age restriction"><input className="input" value={form.age_restriction} onChange={(e) => set('age_restriction', e.target.value)} placeholder="e.g. 18+" /></Field>
              </div>

              <p className="label">Agenda / schedule</p>
              <Repeater
                items={agenda}
                emptyItem={{ time_label: '', title: '', description: '' }}
                onChange={setAgenda}
                addLabel="Add agenda item"
                renderItem={(item, update) => (
                  <div className="grid grid-2">
                    <input className="input" placeholder="Time (e.g. 6:00 PM)" value={item.time_label || ''} onChange={(e) => update({ time_label: e.target.value })} />
                    <input className="input" placeholder="Title" value={item.title || ''} onChange={(e) => update({ title: e.target.value })} />
                    <textarea className="textarea" style={{ gridColumn: '1 / -1' }} placeholder="Description" value={item.description || ''} onChange={(e) => update({ description: e.target.value })} />
                  </div>
                )}
              />

              <p className="label">Speakers / guests</p>
              <Repeater
                items={speakers}
                emptyItem={{ name: '', title: '', bio: '', photo_url: '' }}
                onChange={setSpeakers}
                addLabel="Add speaker"
                renderItem={(item, update) => (
                  <div className="stack-sm">
                    <div className="grid grid-2">
                      <input className="input" placeholder="Name" value={item.name || ''} onChange={(e) => update({ name: e.target.value })} />
                      <input className="input" placeholder="Title / role" value={item.title || ''} onChange={(e) => update({ title: e.target.value })} />
                    </div>
                    <ImageUploader bucket="event-images" value={item.photo_url} onChange={(v) => update({ photo_url: v })} label="Photo" />
                  </div>
                )}
              />

              <p className="label">Sponsors</p>
              <Repeater
                items={sponsors}
                emptyItem={{ name: '', logo_url: '', link_url: '' }}
                onChange={setSponsors}
                addLabel="Add sponsor"
                renderItem={(item, update) => (
                  <div className="stack-sm">
                    <div className="grid grid-2">
                      <input className="input" placeholder="Sponsor name" value={item.name || ''} onChange={(e) => update({ name: e.target.value })} />
                      <input className="input" placeholder="Link URL" value={item.link_url || ''} onChange={(e) => update({ link_url: e.target.value })} />
                    </div>
                    <ImageUploader bucket="event-images" value={item.logo_url} onChange={(v) => update({ logo_url: v })} label="Logo" />
                  </div>
                )}
              />

              <p className="label">Frequently asked questions</p>
              <Repeater
                items={faqs}
                emptyItem={{ question: '', answer: '' }}
                onChange={setFaqs}
                addLabel="Add FAQ"
                renderItem={(item, update) => (
                  <div className="stack-sm">
                    <input className="input" placeholder="Question" value={item.question || ''} onChange={(e) => update({ question: e.target.value })} />
                    <textarea className="textarea" placeholder="Answer" value={item.answer || ''} onChange={(e) => update({ answer: e.target.value })} />
                  </div>
                )}
              />
            </div>
          )}

          {step === 5 && (
            <div className="stack">
              <p className="help-text">Quick check before you publish:</p>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>{form.title ? '✓' : '⚠'} Title {form.title ? `— "${form.title}"` : '— missing'}</li>
                <li>{form.banner_url ? '✓' : '⚠'} Banner image {form.banner_url ? '' : '— recommended'}</li>
                <li>{form.event_date ? '✓' : '⚠'} Date {form.event_date ? `— ${form.event_date}` : '— missing'}</li>
                <li>{form.event_type === 'virtual' || form.venue_name || form.venue_address ? '✓' : '⚠'} Location</li>
              </ul>
              {form.banner_url && <img src={form.banner_url} alt="" style={{ borderRadius: 12, maxHeight: 240, objectFit: 'cover', width: '100%' }} />}
            </div>
          )}

          {error && <p className="error-text">{error}</p>}

          <div className="row row--between" style={{ marginTop: 8 }}>
            <button className="btn btn--ghost" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>← Back</button>
            <div className="row">
              <button className="btn btn--ghost" disabled={saving} onClick={() => handleSave('draft')}>{saving ? 'Saving…' : 'Save as draft'}</button>
              {step < STEPS.length - 1 ? (
                <button className="btn btn--primary" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>Next →</button>
              ) : (
                <button className="btn btn--primary" disabled={saving} onClick={() => handleSave('published')}>
                  {saving ? 'Publishing…' : status === 'published' ? 'Save changes' : 'Publish event'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Field({ label, children }) {
  return (
    <div className="field">
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
