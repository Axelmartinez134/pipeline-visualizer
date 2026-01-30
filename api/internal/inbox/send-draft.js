const { getSupabaseAdminClient } = require('../../lib/supabaseAdmin');
const { json, readRawBody } = require('../../lib/http');
const { getAimfoxSenderAccountId, startConversation } = require('../../lib/aimfox');

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
  const messageOverride = payload?.message != null ? String(payload.message) : null;
  const dryRun = Boolean(payload?.dryRun);
  if (!draftId) return json(res, 400, { ok: false, error: 'Missing draftId' });

  const { data: draft, error: draftErr } = await supabaseAdmin
    .from('linkedin_ai_drafts')
    .select('id,user_id,lead_id,conversation_id,status,draft_type,draft_message,edit_count')
    .eq('id', draftId)
    .maybeSingle();
  if (draftErr) return json(res, 500, { ok: false, error: draftErr.message });
  if (!draft) return json(res, 404, { ok: false, error: 'Draft not found' });
  if (String(draft.user_id) !== String(userData.user.id)) return json(res, 403, { ok: false, error: 'Forbidden' });
  if (String(draft.status) !== 'pending') return json(res, 400, { ok: false, error: 'Draft is not pending' });

  const leadId = draft.lead_id ? String(draft.lead_id) : null;
  if (!leadId) return json(res, 400, { ok: false, error: 'Draft missing lead_id' });

  const { data: lead, error: leadErr } = await supabaseAdmin
    .from('linkedin_leads')
    .select('id,linkedin_id')
    .eq('id', leadId)
    .maybeSingle();
  if (leadErr) return json(res, 500, { ok: false, error: leadErr.message });
  if (!lead?.linkedin_id) return json(res, 400, { ok: false, error: 'Lead missing linkedin_id' });

  const message = (messageOverride != null ? messageOverride : draft.draft_message) || '';
  const trimmed = String(message).trim();
  if (!trimmed) return json(res, 400, { ok: false, error: 'Message is empty' });

  if (dryRun) {
    let accountId = null;
    try {
      accountId = getAimfoxSenderAccountId();
    } catch {
      // don't fail dry-run if env isn't set yet; still show preview.
    }
    return json(res, 200, {
      ok: true,
      dryRun: true,
      wouldSend: {
        accountId,
        draftId,
        leadId,
        recipientLinkedinId: String(lead.linkedin_id),
        message: trimmed,
      },
      note: 'Dry-run: no message sent and no DB rows were modified.',
    });
  }

  // Persist the final message text on the draft before sending (oversight trail).
  const nextEditCount =
    String(draft.draft_message || '') !== trimmed ? Number(draft.edit_count || 0) + 1 : Number(draft.edit_count || 0);
  const { error: updErr } = await supabaseAdmin
    .from('linkedin_ai_drafts')
    .update({ draft_message: trimmed, edit_count: nextEditCount })
    .eq('id', draftId);
  if (updErr) return json(res, 500, { ok: false, error: updErr.message });

  let aimfoxRes;
  try {
    const accountId = getAimfoxSenderAccountId();
    aimfoxRes = await startConversation({ accountId, message: trimmed, recipients: [String(lead.linkedin_id)] });
  } catch (e) {
    return json(res, 502, { ok: false, error: String(e?.message || e), details: e?.details || null });
  }

  const conversationUrn = aimfoxRes?.conversation_urn ? String(aimfoxRes.conversation_urn) : null;
  const messageUrn = aimfoxRes?.message_urn ? String(aimfoxRes.message_urn) : null;
  const sentAtIso = new Date().toISOString();

  let conversationId = draft.conversation_id ? String(draft.conversation_id) : null;
  if (conversationUrn) {
    const { data: convo, error: convoErr } = await supabaseAdmin
      .from('linkedin_conversations')
      .upsert(
        {
          conversation_urn: conversationUrn,
          lead_id: leadId,
          last_activity_at: sentAtIso,
          unread_count: 0,
          participants: null,
        },
        { onConflict: 'conversation_urn' },
      )
      .select('id')
      .single();
    if (convoErr) return json(res, 500, { ok: false, error: convoErr.message });
    conversationId = convo?.id ? String(convo.id) : conversationId;
  }

  // Insert outbound message (idempotent on message_urn)
  const safeMessageUrn = messageUrn || `local-sent-${draftId}`;
  const { error: msgErr } = await supabaseAdmin.from('linkedin_messages').insert({
    message_urn: safeMessageUrn,
    conversation_id: conversationId,
    lead_id: leadId,
    body: trimmed,
    message_type: 'sent',
    sender_id: null,
    sender_name: null,
    recipient_id: null,
    recipient_name: null,
    raw: aimfoxRes || null,
    sent_at: sentAtIso,
  });
  if (msgErr) {
    const msg = String(msgErr.message || '');
    const isDup = msg.includes('duplicate') || msg.includes('unique') || msg.includes('23505');
    if (!isDup) return json(res, 500, { ok: false, error: msgErr.message });
  }

  const { error: finalErr } = await supabaseAdmin
    .from('linkedin_ai_drafts')
    .update({
      status: 'sent',
      approved_at: sentAtIso,
      sent_at: sentAtIso,
      conversation_id: conversationId,
    })
    .eq('id', draftId);
  if (finalErr) return json(res, 500, { ok: false, error: finalErr.message });

  return json(res, 200, {
    ok: true,
    conversationUrn,
    messageUrn: safeMessageUrn,
    sentAt: sentAtIso,
  });
};

