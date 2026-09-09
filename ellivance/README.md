# Ellivance — Event Management Platform

A full-stack event management app: registration/login, a rich multi-step event
creation wizard, event discovery with search/filters, RSVP + QR-code tickets,
an organiser dashboard, and a light admin panel. Built with **React + Vite**
and **Supabase** (Postgres + Auth + Storage + Row Level Security).

## What's built vs. what's simplified for v1

This is a genuinely large spec, so here's an honest map of scope:

**Fully built:**
- Registration, login/logout, forgot/reset password, email verification,
  optional Google sign-in, profile with avatar
- Dashboard: upcoming / past / drafts / analytics / notifications / favourites
- 6-step event creation wizard covering every field in the spec (basics,
  media, schedule & location, tickets, extras — agenda/speakers/sponsors/FAQs,
  review), plus save-as-draft, preview-before-publish, edit-after-publish,
  delete, and duplicate
- Drag-and-drop image upload with in-browser compression/resizing before
  upload (no separate crop tool — see below)
- Homepage discovery sections (featured/trending/recent/upcoming/categories),
  full search + filters (category, date, location type, free/paid) + sort
- Event page: hero image, countdown timer, embedded map, gallery, organiser
  profile, live attendee count & remaining tickets, comments, star ratings +
  reviews, share buttons, Add to Calendar (.ics + Google Calendar), RSVP,
  QR-code ticket
- Free/RSVP ticketing end-to-end: QR generation, PDF ticket download, email
  confirmation via Supabase Auth's mailer, and a working check-in flow
- Organiser dashboard: registrations list, CSV export, in-app announcements,
  ticket "sales" view, cancel/duplicate event
- Admin panel: users (ban/unban), events (feature/take down), categories,
  reports queue, review moderation, basic site settings

**Simplified/out of scope, per your answers earlier:**
- **Payments**: no real processor wired up. The ticket-type/price fields
  exist and display, but registering a "paid" event still just books a free
  RSVP — no money moves. Adding Stripe later is a contained change (mainly
  `EventForm.jsx` and a new checkout step) if you want it.
- **Push notifications**: not built — only email (via Supabase Auth) and
  in-app notifications (bell icon, `notifications` table, realtime).
- **Image cropping**: uploads get automatic client-side compression/resizing
  to a max dimension, but there's no interactive crop UI — that'd be a
  reasonable next addition (e.g. `react-easy-crop`) if you want pixel-exact
  control over banners.
- **QR check-in scanning**: rather than a live camera QR-decoder, check-in
  works the same way the "Roll" attendance app did — the organiser scans an
  attendee's ticket QR with their **phone's own camera app**, which opens a
  check-in URL in the browser and validates the ticket server-side. No extra
  scanning library needed, and it's arguably more reliable than an in-browser
  decoder.

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor** → paste and run the entire contents of `supabase/schema.sql`.
   This creates every table, RLS policy, the `is_admin()` helper, the
   `check_in_ticket()` and `notify_attendees()` functions, and the storage
   buckets for avatars/event images.
3. **Database → Replication**: enable Realtime on the `notifications` table
   (powers the live bell icon).
4. **Authentication → Providers → Email**: turn off "Confirm email" while
   testing if you want instant sign-in, or leave it on to test the real
   verification flow.
5. **(Optional) Google sign-in**: Authentication → Providers → Google →
   toggle on, and follow Supabase's prompt to add your Google OAuth client
   ID/secret. The app's Login/Signup buttons already call
   `supabase.auth.signInWithOAuth({ provider: 'google' })`, so no code
   changes are needed once the provider is enabled.
6. **Project Settings → API**: copy your Project URL and **anon public** key.

### Make yourself an admin

Sign up normally first, then in **Table Editor → profiles**, find your row
and set `is_admin` to `true`. The Admin link then appears in the navbar for
your account.

## 2. Configure and run

```bash
cp .env.example .env
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

## 3. (Optional) Email notifications beyond Auth's built-in mailer

Supabase Auth already emails verification and password-reset links with zero
extra setup. If you also want registration confirmations, reminders, or
cancellation emails to go out (not just as in-app notifications), see
`supabase/functions/send-email/index.ts` — a small Edge Function using
[Resend](https://resend.com). It's optional and not required for the app to
work end to end.

## Project structure

```
supabase/
  schema.sql                All tables, RLS policies, storage buckets, RPC functions
  functions/send-email/     Optional Resend-based email Edge Function
src/
  supabaseClient.js
  hooks/useAuth.jsx, useNotifications.jsx
  components/               Navbar, ImageUploader, RichTextEditor, Repeater/TagInput,
                             EventCard, CountdownTimer, ShareButtons, StarRating, QRTicket
  lib/                       utils (dates/ICS/CSV), upload (compress+upload), pdfTicket
  pages/
    Landing, EventsBrowse, EventDetail        — discovery & public event page
    auth/                                     — Login, Signup, Forgot/Reset password, callback
    Dashboard                                 — upcoming/past/drafts/analytics/notifications/favourites
    EventForm                                 — 6-step create/edit wizard
    OrganizerManage                           — per-event registrations/CSV/announcements
    TicketView, CheckIn                       — QR ticket + check-in flow
    Profile, AdminPanel
```

## Design

Palette is beige/coffee-brown as requested: warm beige background (`--bg`),
deep coffee-brown ink for text (`--ink`), and a burnt-orange/coffee accent
(`--accent`) for primary actions and highlights — all defined as CSS
variables at the top of `src/index.css`, so retheming means editing one
block. Headings use **Fraunces** (a modern, high-contrast serif) and body
text uses **Plus Jakarta Sans** — both loaded via Google Fonts in
`index.html`.

## Security notes

Every write is enforced by Postgres Row Level Security, not just client-side
checks — organisers can only touch their own events, attendees can only
review events they've actually registered for, and admin actions require
`is_admin()` to return true server-side. The
`check_in_ticket()` function runs as `SECURITY DEFINER` so a scan can't be
forged from the client, and ticket codes are single-use (`checked_in_at` is
set exactly once, with duplicate scans reported back to the organiser rather
than silently re-validating).
