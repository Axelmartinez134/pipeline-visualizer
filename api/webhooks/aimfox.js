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

  // Minimal log for smoke-testing (we'll persist to DB in Phase 2).
  try {
    const eventType = payload.event_type || payload.eventType || null;
    const eventId = payload.id || payload.event_id || null;
    console.log('[aimfox-webhook]', { eventType, eventId });
  } catch {
    // ignore logging errors
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: true }));
};

