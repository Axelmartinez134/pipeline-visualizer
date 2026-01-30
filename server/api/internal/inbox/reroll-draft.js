const { getSupabaseAdminClient } = require('../../lib/supabaseAdmin');
const { buildOpenerPrompt } = require('../../lib/openerPrompt');
const { buildReplyPrompt } = require('../../lib/replyPrompt');
const { buildFollowupPrompt } = require('../../lib/followupPrompt');
const { json, readRawBody } = require('../../lib/http');

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

  const leadId = payload?.leadId ? String(payload.leadId) : null;
  const draftType = payload?.draftType ? String(payload.draftType) : 'first_message';
  const feedback = payload?.feedback != null ? String(payload.feedback).trim() : '';
  if (!leadId) return json(res, 400, { ok: false, error: 'Missing leadId' });

  // Phase 5: support first_message + reply. (followup scaffolded later)
  if (draftType !== 'first_message' && draftType !== 'reply' && draftType !== 'followup') {
    return json(res, 400, { ok: false, error: `Draft type not implemented yet: ${draftType}` });
  }

  // Capture previous draft text (best-effort) and clear pending drafts.
  const { data: existing, error: exErr } = await supabaseAdmin
    .from('linkedin_ai_drafts')
    .select('id,draft_message')
    .eq('user_id', userData.user.id)
    .eq('lead_id', leadId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (exErr) return json(res, 500, { ok: false, error: exErr.message });

  if (existing?.id) {
    await supabaseAdmin
      .from('linkedin_ai_drafts')
      .update({ status: 'rejected', ai_context: { superseded: true } })
      .eq('user_id', userData.user.id)
      .eq('lead_id', leadId)
      .eq('status', 'pending');
  }

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

  // Attempt to attach to latest conversation (optional).
  const { data: convoRow } = await supabaseAdmin
    .from('linkedin_conversations')
    .select('id')
    .eq('lead_id', leadId)
    .order('last_activity_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  let lastInboundMessage = null;
  if (draftType === 'reply') {
    const { data: msgRow, error: msgErr } = await supabaseAdmin
      .from('linkedin_messages')
      .select('body,message_type')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(25);
    if (msgErr) return json(res, 500, { ok: false, error: msgErr.message });
    const rows = Array.isArray(msgRow) ? msgRow : [];
    const inbound = rows.find((m) => String(m?.message_type || '').toLowerCase() !== 'sent') || null;
    lastInboundMessage = inbound?.body ? String(inbound.body) : null;
    if (!lastInboundMessage) {
      return json(res, 400, { ok: false, error: 'No inbound message found to reply to' });
    }
  }

  let lastMessageSummary = null;
  if (draftType === 'followup') {
    const { data: msgRow, error: msgErr } = await supabaseAdmin
      .from('linkedin_messages')
      .select('body,message_type,created_at,sent_at')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (msgErr) return json(res, 500, { ok: false, error: msgErr.message });
    if (msgRow) {
      const who = String(msgRow.message_type || '').toLowerCase() === 'sent' ? 'You' : 'Them';
      const body = msgRow.body ? String(msgRow.body).slice(0, 240) : '';
      lastMessageSummary = `${who}: ${body}`;
    }
  }

  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';
  const prompt =
    draftType === 'reply'
      ? buildReplyPrompt({
          lead,
          profile,
          lastInboundMessage,
          feedback: feedback || null,
          previousDraftText: existing?.draft_message ? String(existing.draft_message) : null,
        })
      : draftType === 'followup'
      ? buildFollowupPrompt({
          lead,
          profile,
          lastMessageSummary,
          feedback: feedback || null,
          previousDraftText: existing?.draft_message ? String(existing.draft_message) : null,
        })
      : buildOpenerPrompt({
          lead,
          apify: lead.apify_profile_json,
          profile,
          feedback: feedback || null,
          previousDraftText: existing?.draft_message ? String(existing.draft_message) : null,
        });
  const { system, user, context, promptSource, userTemplate } = prompt;

  let text;
  try {
    text = await anthropicGenerate({ system, user, model });
  } catch (e) {
    return json(res, 502, { ok: false, error: String(e?.message || e), details: e?.details || null });
  }
  if (!text) return json(res, 500, { ok: false, error: 'Anthropic returned empty text' });

  const { data: inserted, error: insErr } = await supabaseAdmin
    .from('linkedin_ai_drafts')
    .insert({
      user_id: userData.user.id,
      lead_id: lead.id,
      conversation_id: convoRow?.id || null,
      draft_type: draftType,
      status: 'pending',
      draft_message: text,
      original_draft: text,
      ai_model: model,
      ai_system_prompt: system,
      ai_prompt: user,
      ai_context: { ...context, prompt_source: promptSource, supersedes_draft_id: existing?.id || null },
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
    .select('id,lead_id,status,draft_type,draft_message,created_at')
    .single();
  if (insErr) return json(res, 500, { ok: false, error: insErr.message });

  // Best-effort: ensure the "one pending draft" invariant even under races.
  await supabaseAdmin
    .from('linkedin_ai_drafts')
    .update({ status: 'rejected' })
    .eq('user_id', userData.user.id)
    .eq('lead_id', lead.id)
    .eq('status', 'pending')
    .neq('id', inserted.id);

  return json(res, 200, { ok: true, draft: inserted });
};

