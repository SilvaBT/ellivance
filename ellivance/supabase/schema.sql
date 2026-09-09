-- ============================================================================
-- Ellivance — Event Management Platform — Supabase schema
-- Run this whole file once in Supabase Dashboard > SQL Editor.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. PROFILES
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default 'New user',
  bio text,
  avatar_url text,
  is_admin boolean not null default false,
  is_banned boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles readable by anyone" on public.profiles;
create policy "profiles readable by anyone" on public.profiles for select using (true);

drop policy if exists "users update their own profile" on public.profiles;
create policy "users update their own profile" on public.profiles for update
  to authenticated using (id = auth.uid());

create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

drop policy if exists "admins manage all profiles" on public.profiles;
create policy "admins manage all profiles" on public.profiles for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 2. CATEGORIES
-- ----------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  icon text
);

alter table public.categories enable row level security;
drop policy if exists "categories readable by anyone" on public.categories;
create policy "categories readable by anyone" on public.categories for select using (true);
drop policy if exists "admins manage categories" on public.categories;
create policy "admins manage categories" on public.categories for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.categories (name, slug, icon) values
  ('Music', 'music', '🎵'), ('Business', 'business', '💼'), ('Food & Drink', 'food-drink', '🍽️'),
  ('Arts', 'arts', '🎨'), ('Sports & Fitness', 'sports-fitness', '🏃'), ('Tech', 'tech', '💻'),
  ('Community', 'community', '🤝'), ('Education', 'education', '🎓'), ('Wellness', 'wellness', '🧘')
on conflict (slug) do nothing;

-- ----------------------------------------------------------------------------
-- 3. EVENTS
-- ----------------------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  organiser_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  slug text not null unique,
  description text,
  category_id uuid references public.categories (id),
  tags text[] not null default '{}',
  event_type text not null default 'physical' check (event_type in ('physical', 'virtual', 'hybrid')),
  banner_url text,
  video_url text,
  event_date date,
  start_time time,
  end_time time,
  timezone text not null default 'UTC',
  venue_name text,
  venue_address text,
  venue_lat double precision,
  venue_lng double precision,
  virtual_link text,
  max_attendees int,
  ticket_type text not null default 'free' check (ticket_type in ('free', 'paid')),
  ticket_price numeric(10, 2) default 0,
  registration_deadline timestamptz,
  contact_email text,
  contact_phone text,
  website_url text,
  social_links jsonb not null default '{}',
  dress_code text,
  age_restriction text,
  status text not null default 'draft' check (status in ('draft', 'published', 'cancelled')),
  is_featured boolean not null default false,
  view_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists events_status_idx on public.events (status, event_date);
create index if not exists events_organiser_idx on public.events (organiser_id);
create index if not exists events_category_idx on public.events (category_id);

alter table public.events enable row level security;

drop policy if exists "published events readable by anyone" on public.events;
create policy "published events readable by anyone" on public.events for select
  using (status = 'published' or organiser_id = auth.uid() or public.is_admin());

drop policy if exists "organisers manage their own events" on public.events;
create policy "organisers manage their own events" on public.events for all
  to authenticated using (organiser_id = auth.uid() or public.is_admin())
  with check (organiser_id = auth.uid() or public.is_admin());

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at before update on public.events
  for each row execute function public.set_updated_at();

-- Lets any visitor (including anonymous) bump a published event's view
-- count without granting a general UPDATE policy on the events table.
create or replace function public.increment_view_count(p_event_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.events set view_count = view_count + 1 where id = p_event_id and status = 'published';
$$;

-- ----------------------------------------------------------------------------
-- 4. EVENT GALLERY IMAGES
-- ----------------------------------------------------------------------------
create table if not exists public.event_images (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  url text not null,
  sort_order int not null default 0
);

alter table public.event_images enable row level security;
drop policy if exists "event images readable with event" on public.event_images;
create policy "event images readable with event" on public.event_images for select
  using (exists (select 1 from public.events e where e.id = event_id and (e.status = 'published' or e.organiser_id = auth.uid() or public.is_admin())));
drop policy if exists "organisers manage their event images" on public.event_images;
create policy "organisers manage their event images" on public.event_images for all
  to authenticated using (exists (select 1 from public.events e where e.id = event_id and e.organiser_id = auth.uid()))
  with check (exists (select 1 from public.events e where e.id = event_id and e.organiser_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 5. AGENDA / SPEAKERS / SPONSORS / FAQS  (all same ownership pattern)
-- ----------------------------------------------------------------------------
create table if not exists public.event_agenda (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  time_label text,
  title text not null,
  description text,
  sort_order int not null default 0
);

create table if not exists public.event_speakers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  title text,
  bio text,
  photo_url text,
  sort_order int not null default 0
);

create table if not exists public.event_sponsors (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  logo_url text,
  link_url text,
  sort_order int not null default 0
);

create table if not exists public.event_faqs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  question text not null,
  answer text not null,
  sort_order int not null default 0
);

do $$
declare t text;
begin
  foreach t in array array['event_agenda', 'event_speakers', 'event_sponsors', 'event_faqs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format($f$drop policy if exists "%1$s readable with event" on public.%1$s$f$, t);
    execute format($f$create policy "%1$s readable with event" on public.%1$s for select
      using (exists (select 1 from public.events e where e.id = event_id and (e.status = 'published' or e.organiser_id = auth.uid() or public.is_admin())))$f$, t);
    execute format($f$drop policy if exists "organisers manage %1$s" on public.%1$s$f$, t);
    execute format($f$create policy "organisers manage %1$s" on public.%1$s for all
      to authenticated using (exists (select 1 from public.events e where e.id = event_id and e.organiser_id = auth.uid()))
      with check (exists (select 1 from public.events e where e.id = event_id and e.organiser_id = auth.uid()))$f$, t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 6. REGISTRATIONS (RSVP / free tickets)
-- ----------------------------------------------------------------------------
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  ticket_code text not null unique default encode(gen_random_bytes(8), 'hex'),
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  checked_in_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

alter table public.registrations enable row level security;

drop policy if exists "users see own registrations" on public.registrations;
create policy "users see own registrations" on public.registrations for select
  to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from public.events e where e.id = event_id and e.organiser_id = auth.uid())
    or public.is_admin()
  );

drop policy if exists "users register themselves" on public.registrations;
create policy "users register themselves" on public.registrations for insert
  to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.events e
      where e.id = event_id and e.status = 'published'
        and (e.registration_deadline is null or e.registration_deadline > now())
        and (e.max_attendees is null or (select count(*) from public.registrations r where r.event_id = e.id and r.status = 'confirmed') < e.max_attendees)
    )
  );

drop policy if exists "users cancel their own registration" on public.registrations;
create policy "users cancel their own registration" on public.registrations for update
  to authenticated using (user_id = auth.uid() or exists (select 1 from public.events e where e.id = event_id and e.organiser_id = auth.uid()));

-- Organiser check-in, validated server-side so a QR scan can't be forged client-side.
create or replace function public.check_in_ticket(p_ticket_code text)
returns table (ok boolean, message text, attendee_name text, event_title text)
language plpgsql security definer set search_path = public as $$
declare
  v_reg public.registrations%rowtype;
  v_event public.events%rowtype;
  v_name text;
begin
  select * into v_reg from public.registrations where ticket_code = p_ticket_code;
  if not found then
    return query select false, 'Ticket code not found.', null::text, null::text; return;
  end if;

  select * into v_event from public.events where id = v_reg.event_id;
  if v_event.organiser_id <> auth.uid() and not public.is_admin() then
    return query select false, 'You are not the organiser of this event.', null::text, null::text; return;
  end if;
  if v_reg.status <> 'confirmed' then
    return query select false, 'This ticket was cancelled.', null::text, v_event.title; return;
  end if;

  select full_name into v_name from public.profiles where id = v_reg.user_id;

  if v_reg.checked_in_at is not null then
    return query select false, 'Already checked in at ' || to_char(v_reg.checked_in_at, 'HH12:MI AM'), v_name, v_event.title; return;
  end if;

  update public.registrations set checked_in_at = now() where id = v_reg.id;
  return query select true, 'Checked in.', v_name, v_event.title;
end;
$$;

-- ----------------------------------------------------------------------------
-- 7. FAVOURITES
-- ----------------------------------------------------------------------------
create table if not exists public.favourites (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

alter table public.favourites enable row level security;
drop policy if exists "users manage their own favourites" on public.favourites;
create policy "users manage their own favourites" on public.favourites for all
  to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 8. REVIEWS & COMMENTS
-- ----------------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  body text,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

alter table public.reviews enable row level security;
drop policy if exists "reviews readable by anyone" on public.reviews;
create policy "reviews readable by anyone" on public.reviews for select using (true);
drop policy if exists "attendees review events they registered for" on public.reviews;
create policy "attendees review events they registered for" on public.reviews for insert
  to authenticated with check (
    user_id = auth.uid()
    and exists (select 1 from public.registrations r where r.event_id = reviews.event_id and r.user_id = auth.uid())
  );
drop policy if exists "users manage their own review" on public.reviews;
create policy "users manage their own review" on public.reviews for all
  to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.comments enable row level security;
drop policy if exists "comments readable by anyone" on public.comments;
create policy "comments readable by anyone" on public.comments for select using (true);
drop policy if exists "authenticated users can comment" on public.comments;
create policy "authenticated users can comment" on public.comments for insert
  to authenticated with check (user_id = auth.uid());
drop policy if exists "users manage their own comments" on public.comments;
create policy "users manage their own comments" on public.comments for delete
  to authenticated using (user_id = auth.uid() or public.is_admin());

-- ----------------------------------------------------------------------------
-- 9. NOTIFICATIONS
-- ----------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  event_id uuid references public.events (id) on delete cascade,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
drop policy if exists "users see their own notifications" on public.notifications;
create policy "users see their own notifications" on public.notifications for select
  to authenticated using (user_id = auth.uid());
drop policy if exists "users update their own notifications" on public.notifications;
create policy "users update their own notifications" on public.notifications for update
  to authenticated using (user_id = auth.uid());
drop policy if exists "any authenticated user can create a notification" on public.notifications;
create policy "any authenticated user can create a notification" on public.notifications for insert
  to authenticated with check (true);

-- Fan out a notification to every confirmed attendee of an event (used for
-- announcements, updates, and cancellations). SECURITY DEFINER so an
-- organiser can insert notifications for other users despite the RLS above.
create or replace function public.notify_attendees(p_event_id uuid, p_type text, p_title text, p_body text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.events where id = p_event_id and organiser_id = auth.uid()) and not public.is_admin() then
    raise exception 'Only the organiser can notify attendees.';
  end if;
  insert into public.notifications (user_id, type, title, body, event_id)
  select user_id, p_type, p_title, p_body, p_event_id
  from public.registrations where event_id = p_event_id and status = 'confirmed';
end;
$$;

-- ----------------------------------------------------------------------------
-- 10. REPORTS (content moderation queue)
-- ----------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  target_type text not null check (target_type in ('event', 'review', 'comment')),
  target_id uuid not null,
  reason text,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;
drop policy if exists "users file reports" on public.reports;
create policy "users file reports" on public.reports for insert
  to authenticated with check (reporter_id = auth.uid());
drop policy if exists "admins manage reports" on public.reports;
create policy "admins manage reports" on public.reports for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- 11. SITE SETTINGS (admin-editable key/value store)
-- ----------------------------------------------------------------------------
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null
);

alter table public.site_settings enable row level security;
drop policy if exists "settings readable by anyone" on public.site_settings;
create policy "settings readable by anyone" on public.site_settings for select using (true);
drop policy if exists "admins manage settings" on public.site_settings;
create policy "admins manage settings" on public.site_settings for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.site_settings (key, value) values
  ('site_name', '"Ellivance"'), ('support_email', '"support@ellivance.app"')
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- 12. STORAGE BUCKETS (avatars, event-images — run once)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('event-images', 'event-images', true) on conflict (id) do nothing;

drop policy if exists "avatar images are publicly readable" on storage.objects;
create policy "avatar images are publicly readable" on storage.objects for select
  using (bucket_id = 'avatars');
drop policy if exists "users upload their own avatar" on storage.objects;
create policy "users upload their own avatar" on storage.objects for insert
  to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "users update their own avatar" on storage.objects;
create policy "users update their own avatar" on storage.objects for update
  to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "event images are publicly readable" on storage.objects;
create policy "event images are publicly readable" on storage.objects for select
  using (bucket_id = 'event-images');
drop policy if exists "authenticated users upload event images" on storage.objects;
create policy "authenticated users upload event images" on storage.objects for insert
  to authenticated with check (bucket_id = 'event-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "users manage their own event image files" on storage.objects;
create policy "users manage their own event image files" on storage.objects for delete
  to authenticated using (bucket_id = 'event-images' and (storage.foldername(name))[1] = auth.uid()::text);
