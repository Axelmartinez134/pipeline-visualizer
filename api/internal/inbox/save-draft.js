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

  const draftId = payload?.draftId ? String(payload.draftId) : null;
  const message = payload?.message != null ? String(payload.message) : '';
  if (!draftId) return json(res, 400, { ok: false, error: 'Missing draftId' });

  const trimmed = String(message).trim();
  if (!trimmed) return json(res, 400, { ok: false, error: 'Message is empty' });

  const { data: current, error: curErr } = await supabaseAdmin
    .from('linkedin_ai_drafts')
    .select('id,user_id,status,draft_message,edit_count,updated_at')
    .eq('id', draftId)
    .maybeSingle();
  if (curErr) return json(res, 500, { ok: false, error: curErr.message });
  if (!current) return json(res, 404, { ok: false, error: 'Draft not found' });
  if (String(current.user_id) !== String(userData.user.id)) return json(res, 403, { ok: false, error: 'Forbidden' });
  if (String(current.status) !== 'pending') return json(res, 400, { ok: false, error: 'Draft is not pending' });

  const changed = String(current.draft_message || '') !== trimmed;
  const nextEditCount = changed ? Number(current.edit_count || 0) + 1 : Number(current.edit_count || 0);

  const { data: updated, error: updErr } = await supabaseAdmin
    .from('linkedin_ai_drafts')
    .update({ draft_message: trimmed, edit_count: nextEditCount })
    .eq('id', draftId)
    .select('id,draft_message,edit_count,updated_at')
    .single();
  if (updErr) return json(res, 500, { ok: false, error: updErr.message });

  return json(res, 200, { ok: true, draft: updated, changed });
};

