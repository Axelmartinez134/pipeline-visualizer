const { json } = require('../../lib/http');
const { getSupabaseAdminClient } = require('../../lib/supabaseAdmin');

function parseBearer(req) {
  const authHeader = req.headers['authorization'];
  return typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice('bearer '.length).trim()
    : null;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { ok: false, error: 'Method not allowed' });
  }

  const token = parseBearer(req);
  if (!token) return json(res, 401, { ok: false, error: 'Missing Authorization token' });

  const supabaseAdmin = getSupabaseAdminClient();
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user) return json(res, 401, { ok: false, error: 'Invalid token' });

  const allowedEmail = (process.env.VITE_ALLOWED_EMAIL || '').toLowerCase();
  const email = (userData.user.email || '').toLowerCase();
  if (allowedEmail && email !== allowedEmail) return json(res, 403, { ok: false, error: 'Forbidden' });

  const key = process.env.AIMFOX_API_KEY;
  if (!key) return json(res, 500, { ok: false, error: 'Missing AIMFOX_API_KEY env var' });

  const url = 'https://api.aimfox.com/api/v2/accounts';
  const aimRes = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${key}` },
  });

  const text = await aimRes.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }
  if (!aimRes.ok) {
    const msg =
      (payload && typeof payload === 'object' && (payload.message || payload.error?.message || payload.error)) ||
      `Aimfox request failed (${aimRes.status})`;
    return json(res, 502, { ok: false, error: String(msg), details: payload });
  }

  const accounts = Array.isArray(payload?.accounts) ? payload.accounts : [];
  return json(res, 200, {
    ok: true,
    accounts: accounts.map((a) => ({
      id: a?.id ?? null,
      full_name: a?.full_name ?? null,
      public_identifier: a?.public_identifier ?? null,
      urn: a?.urn ?? null,
      state: a?.state ?? null,
      email: a?.email ?? null,
      workspace_id: a?.workspace_id ?? null,
    })),
  });
};

