// Cloudflare Worker: verifies a Turnstile token server-side, then forwards
// the contact form submission to EmailJS — sending both the "Contact Us"
// lead notification and the customer-facing auto-reply. Deploy this in
// front of the static site's contact form so bot submissions never reach
// EmailJS.
//
// Required secrets:
//   wrangler secret put TURNSTILE_SECRET_KEY   - Secret Key from the Cloudflare Turnstile widget
//   wrangler secret put EMAILJS_PRIVATE_KEY    - Private Key from EmailJS dashboard > Account > Security
//                                                 (required because "strict mode" / non-browser API access is enabled)

const EMAILJS_SERVICE_ID = 'service_1kah54w';
const EMAILJS_CONTACT_TEMPLATE_ID = 'template_pfvmnv7';
const EMAILJS_AUTOREPLY_TEMPLATE_ID = 'template_8pdp9qb';
const EMAILJS_PUBLIC_KEY = 'qN5yjWrpc-FWnUXM-';

const ALLOWED_ORIGINS = [
  'https://jmsolutionitservices.com',
  'https://www.jmsolutionitservices.com',
];

function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // allow localhost / 127.0.0.1 on any port for local testing
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin : 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Strips CR/LF so a field can't inject fake extra "lines" into the
// plain-text email body built from these values.
function stripNewlines(value) {
  return (value || '').replace(/[\r\n]+/g, ' ').trim();
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders(origin) });
    }

    if (!isAllowedOrigin(origin)) {
      return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }

    const { name, phone, email, service, services, message, consent, turnstileToken } = body;

    if (!name || !email || !message || !consent) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }

    if (!EMAIL_RE.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email address' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }

    if (!turnstileToken) {
      return new Response(JSON.stringify({ error: 'Missing Turnstile token' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }

    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: env.TURNSTILE_SECRET_KEY,
        response: turnstileToken,
        remoteip: request.headers.get('CF-Connecting-IP') || '',
      }),
    });
    const verifyResult = await verifyRes.json();
    console.log('turnstile verify:', JSON.stringify(verifyResult));

    if (!verifyResult.success) {
      return new Response(JSON.stringify({ error: 'Turnstile verification failed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }

    // name/phone/service feed into a plain-text email body, so strip
    // newlines to stop them injecting fake extra "fields" into it.
    const safeName = stripNewlines(name);
    const normalizedPhone = stripNewlines(phone) || 'Not provided';
    const normalizedService = stripNewlines(service || services) || 'Not specified';
    const normalizedMessage = (message || '').trim();
    const formattedLeadMessage =
      'Name: ' + safeName + '\n' +
      'Phone: ' + normalizedPhone + '\n' +
      'Email: ' + email + '\n' +
      'Service: ' + normalizedService + '\n\n' +
      'Message:\n' + normalizedMessage;

    const notificationTemplateParams = {
      name: safeName,
      phone: normalizedPhone,
      email,
      service: normalizedService,
      services: normalizedService,
      message: formattedLeadMessage,
      raw_message: formattedLeadMessage,
      email_content: formattedLeadMessage,
      details: formattedLeadMessage,
      user_message: normalizedMessage,
    };

    // The auto-reply goes to whatever address the submitter typed in, which
    // isn't verified to belong to them. Deliberately do NOT echo their
    // free-text message back here — only a fixed, generic body — so this
    // endpoint can't be used to relay attacker-chosen content to a
    // third-party inbox under our sending reputation.
    const autoReplyFixedMessage =
      "Thanks for reaching out to JM Solution IT Services. We've received your message and will get back to you within one business day.";
    const autoReplyTemplateParams = {
      name: safeName,
      phone: normalizedPhone,
      email,
      service: normalizedService,
      services: normalizedService,
      message: autoReplyFixedMessage,
      raw_message: autoReplyFixedMessage,
      email_content: autoReplyFixedMessage,
      details: autoReplyFixedMessage,
      user_message: autoReplyFixedMessage,
    };

    const emailRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_CONTACT_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        accessToken: env.EMAILJS_PRIVATE_KEY,
        template_params: notificationTemplateParams,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.log('emailjs contact-notification send failed:', emailRes.status, errText);
      return new Response(JSON.stringify({ error: 'Email send failed', detail: errText }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }

    // Auto-reply to the customer is best-effort: the lead notification above
    // already succeeded, so a failure here shouldn't fail the whole request.
    const autoReplyRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_AUTOREPLY_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        accessToken: env.EMAILJS_PRIVATE_KEY,
        template_params: autoReplyTemplateParams,
      }),
    });

    if (!autoReplyRes.ok) {
      const errText = await autoReplyRes.text();
      console.log('emailjs auto-reply send failed:', autoReplyRes.status, errText);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    });
  },
};
