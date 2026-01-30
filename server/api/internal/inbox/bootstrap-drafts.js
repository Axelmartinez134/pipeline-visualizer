const { getSupabaseAdminClient } = require('../../lib/supabaseAdmin');
const { json, readRawBody } = require('../../lib/http');

function parseBearer(req) {
  const authHeader = req.headers['authorization'];
  return typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice('bearer '.length).trim()
    : null;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
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

  let payload = req.body;
  try {
    if (!payload || typeof payload === 'string') {
      const raw = typeof payload === 'string' ? payload : await readRawBody(req);
      payload = raw ? JSON.parse(raw) : null;
    }
  } catch {
    return json(res, 400, { ok: false, error: 'Invalid JSON payload' });
  }

  const limit = Math.max(1, Math.min(100, Number(payload?.limit || 25)));

  // Step 1: pick top accepted leads (stable, cheap query).
  const { data: leads, error: leadErr } = await supabaseAdmin
    .from('linkedin_leads')
    .select('id')
    .eq('lead_status', 'accepted')
    .order('connection_accepted_at', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (leadErr) return json(res, 500, { ok: false, error: leadErr.message });

  const leadIds = (Array.isArray(leads) ? leads : []).map((r) => String(r.id)).filter(Boolean);
  if (leadIds.length === 0) return json(res, 200, { ok: true, leadIdsToDraft: [], considered: 0 });

  // Step 2: find which ones already have a pending draft for this user.
  const { data: existingDrafts, error: draftErr } = await supabaseAdmin
    .from('linkedin_ai_drafts')
    .select('lead_id')
    .eq('user_id', userData.user.id)
    .eq('status', 'pending')
    .in('lead_id', leadIds);
  if (draftErr) return json(res, 500, { ok: false, error: draftErr.message });

  const withDraft = new Set((Array.isArray(existingDrafts) ? existingDrafts : []).map((d) => String(d.lead_id)));
  const leadIdsToDraft = leadIds.filter((id) => !withDraft.has(id));

  return json(res, 200, { ok: true, considered: leadIds.length, leadIdsToDraft });
};

