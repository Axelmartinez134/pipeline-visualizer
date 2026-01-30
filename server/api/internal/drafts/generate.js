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

function mustEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} env var`);
  return v;
}

async function anthropicGenerate({ system, user, model }) {
  const apiKey = mustEnv('ANTHROPIC_API_KEY');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 300,
      temperature: 0.5,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }
  if (!res.ok) {
    const msg = (data && (data.error?.message || data.message)) || text || `Anthropic failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.details = data;
    throw err;
  }
  const content = Array.isArray(data?.content) ? data.content : [];
  const out = content.map((c) => (c && c.type === 'text' ? c.text : '')).join('\n').trim();
  return out;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, error: 'Method not allowed' });
  }

  // Verify Supabase user via access token
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
  const feedback = payload?.feedback != null ? String(payload.feedback).trim() : '';
  const parentDraftId = payload?.parentDraftId ? String(payload.parentDraftId) : null;
  if (!leadId) return json(res, 400, { ok: false, error: 'Missing leadId' });

  const { data: lead, error: leadErr } = await supabaseAdmin
    .from('linkedin_leads')
    .select('id,full_name,occupation,campaign_name,apify_profile_json,apify_last_scraped_at')
    .eq('id', leadId)
    .maybeSingle();
  if (leadErr) return json(res, 500, { ok: false, error: leadErr.message });
  if (!lead) return json(res, 404, { ok: false, error: 'Lead not found' });

  if (!lead.apify_profile_json || !lead.apify_last_scraped_at) {
    return json(res, 400, { ok: false, error: 'Lead is not enriched yet. Enrich and Pull first.' });
  }

  const { data: aboutMe, error: profErr } = await supabaseAdmin
    .from('user_profiles')
    .select(
      'offer_icp,tone_guidelines,hard_constraints,calendly_cta_prefs,ai_opener_system_prompt,ai_opener_user_prompt_template,ai_system_prompt,ai_user_prompt_template,my_profile_text,my_profile_json',
    )
    .eq('user_id', userData.user.id)
    .maybeSingle();
  if (profErr) return json(res, 500, { ok: false, error: profErr.message });

  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';
  let previousDraftText = null;
  if (parentDraftId) {
    const { data: parent, error: parentErr } = await supabaseAdmin
      .from('linkedin_ai_drafts')
      .select('draft_message,user_id,lead_id')
      .eq('id', parentDraftId)
      .maybeSingle();
    if (!parentErr && parent && String(parent.user_id) === String(userData.user.id) && String(parent.lead_id) === String(lead.id)) {
      previousDraftText = parent.draft_message ? String(parent.draft_message) : null;
    }
  }

  const { system, user, context, promptSource, userTemplate } = buildOpenerPrompt({
    lead,
    apify: lead.apify_profile_json,
    profile: aboutMe,
    feedback: feedback || null,
    previousDraftText,
  });

  let text;
  try {
    text = await anthropicGenerate({ system, user, model });
  } catch (e) {
    return json(res, 502, { ok: false, error: String(e?.message || e), details: e?.details || null });
  }

  if (!text) return json(res, 500, { ok: false, error: 'Anthropic returned empty text' });

  const { data: draftRow, error: insErr } = await supabaseAdmin
    .from('linkedin_ai_drafts')
    .insert({
      user_id: userData.user.id,
      lead_id: lead.id,
      draft_type: 'first_message',
      status: 'pending',
      draft_message: text,
      original_draft: text,
      ai_model: model,
      ai_system_prompt: system,
      ai_prompt: user,
      ai_context: { ...context, parent_draft_id: parentDraftId || null, prompt_source: promptSource },
      ai_request_json: {
        provider: 'anthropic',
        endpoint: '/v1/messages',
        anthropic_version: '2023-06-01',
        model,
        max_tokens: 300,
        temperature: 0.5,
        system,
        user,
        user_template: userTemplate,
        prompt_source: promptSource,
      },
    })
    .select('id')
    .single();
  if (insErr) return json(res, 500, { ok: false, error: insErr.message });

  return json(res, 200, { ok: true, draftId: draftRow.id });
};

