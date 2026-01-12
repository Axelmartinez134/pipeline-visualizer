const { getSupabaseAdminClient } = require('../../lib/supabaseAdmin');
const { buildOpenerPrompt } = require('../../lib/openerPrompt');

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) reject(new Error('Payload too large'));
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, error: 'Method not allowed' });
  }

  const authHeader = req.headers['authorization'];
  const token =
    typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice('bearer '.length).trim()
      : null;
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

  const leadId = payload?.leadId ? String(payload.leadId) : null;
  if (!leadId) return json(res, 400, { ok: false, error: 'Missing leadId' });

  const { data: lead, error: leadErr } = await supabaseAdmin
    .from('linkedin_leads')
    .select('id,full_name,occupation,campaign_name,apify_profile_json,apify_last_scraped_at')
    .eq('id', leadId)
    .maybeSingle();
  if (leadErr) return json(res, 500, { ok: false, error: leadErr.message });
  if (!lead) return json(res, 404, { ok: false, error: 'Lead not found' });

  const { data: profile, error: profErr } = await supabaseAdmin
    .from('user_profiles')
    .select(
      'offer_icp,tone_guidelines,hard_constraints,calendly_cta_prefs,ai_opener_system_prompt,ai_opener_user_prompt_template,ai_system_prompt,ai_user_prompt_template,my_profile_text,my_profile_json',
    )
    .eq('user_id', userData.user.id)
    .maybeSingle();
  if (profErr) return json(res, 500, { ok: false, error: profErr.message });

  const { system, user, context, promptSource, userTemplate } = buildOpenerPrompt({
    lead,
    apify: lead.apify_profile_json,
    profile,
    feedback: null,
    previousDraftText: null,
  });

  return json(res, 200, {
    ok: true,
    leadId: lead.id,
    promptSource,
    system,
    user,
    userTemplate,
    context,
  });
};

