function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      data += chunk;
      // Basic safety against huge payloads
      if (data.length > 1_000_000) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
    return;
  }

  const expectedSecret = process.env.AIMFOX_WEBHOOK_SECRET;
  const providedSecret = req.headers['x-aimfox-secret'];

  if (!expectedSecret) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'Server not configured (missing AIMFOX_WEBHOOK_SECRET)' }));
    return;
  }

  if (!providedSecret || providedSecret !== expectedSecret) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'Unauthorized' }));
    return;
  }

  let payload = req.body;
  try {
    // On Vercel, req.body is often already parsed JSON.
    if (!payload || typeof payload === 'string') {
      const raw = typeof payload === 'string' ? payload : await readRawBody(req);
      payload = raw ? JSON.parse(raw) : null;
    }
  } catch (e) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'Invalid JSON payload' }));
    return;
  }

  if (!payload || typeof payload !== 'object') {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'Missing payload' }));
    return;
  }

  const eventType = payload.event_type || payload.eventType || null;
  const eventId = payload.id || payload.event_id || null;

  // Phase 2: persist raw events (audit trail + idempotency) using Supabase service role.
  try {
    const { getSupabaseAdminClient } = require('../lib/supabaseAdmin');
    const supabaseAdmin = getSupabaseAdminClient();

    const { error: insertError } = await supabaseAdmin
      .from('linkedin_webhook_events')
      .insert({
        event_id: eventId || null,
        event_type: eventType || 'unknown',
        payload,
        processed: false,
      });

    // If we got a duplicate event_id, ignore it (idempotency).
    // Postgres unique violation details vary; we just treat any insert error with event_id present as non-fatal.
    if (insertError) {
      const msg = String(insertError.message || '');
      const isDup = eventId && (msg.includes('duplicate') || msg.includes('unique') || msg.includes('23505'));
      if (!isDup) {
        console.error('[aimfox-webhook] failed to insert audit event', insertError);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: false, error: 'Failed to persist webhook event' }));
        return;
      }
    }
  } catch (e) {
    console.error('[aimfox-webhook] server configuration error', e);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'Server not configured for persistence' }));
    return;
  }

  // Still log a tiny summary for debugging.
  console.log('[aimfox-webhook]', { eventType, eventId });

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: true }));
};

