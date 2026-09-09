// Optional Edge Function: sends transactional email via Resend (resend.com).
//
// Not required for the app to work — account verification, password reset,
// and Google sign-in emails are all handled automatically by Supabase Auth.
// This function is only needed if you want *additional* emails (registration
// confirmation, event reminders/cancellations, announcements) to also go out
// by email rather than staying in-app-only notifications.
//
// Setup:
//   1. Create a free account at https://resend.com and verify a sending domain.
//   2. supabase secrets set RESEND_API_KEY=re_xxx
//   3. supabase functions deploy send-email
//   4. Call it from the client with supabase.functions.invoke('send-email', { body: {...} })
//
// Deliberately kept as a single generic endpoint (to, subject, html) rather
// than one function per email type — build templates in the client or add
// cases below as needed.

// @ts-ignore Deno-only import, resolved at deploy time
import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_ADDRESS = Deno.env.get('EMAIL_FROM') || 'Ellivance <notifications@your-verified-domain.com>';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), { status: 500 });
  }

  try {
    const { to, subject, html } = await req.json();
    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: 'to, subject, and html are required' }), { status: 400 });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html }),
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), { status: res.status, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
