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

function asIsoTimestamp(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isFinite(d.getTime()) ? d.toISOString() : null;
  }
  if (typeof value === 'number') {
    // Aimfox sometimes includes created_at in ms epoch
    const d = new Date(value);
    return Number.isFinite(d.getTime()) ? d.toISOString() : null;
  }
  return null;
}

function pickLeadFromEvent(eventType, event) {
  // accepted: lead is event.target
  // campaign_reply: lead is the sender (the prospect replying)
  if (eventType === 'accepted') return event?.target || null;
  if (eventType === 'campaign_reply') return event?.sender || event?.target || null;
  return event?.target || event?.sender || null;
}

async function maybeKickoffApifyEnrichment({ supabaseAdmin, leadId, linkedinUrn, profileUrl }) {
  // Only run if lead is not enriched yet
  const { data: existing, error: existingErr } = await supabaseAdmin
    .from('linkedin_leads')
    .select('apify_profile_json')
    .eq('id', leadId)
    .maybeSingle();
  if (existingErr) return;
  if (existing?.apify_profile_json) return;

  try {
    const { getActorIds, startActorRun, buildProfileInput, buildPostsInput } = require('../lib/apify');
    const { profileActor, postsActor } = getActorIds();

    const profileRun = await startActorRun(profileActor, buildProfileInput({ linkedinUrn, profileUrl }));

    // Posts actor generally wants a URL; if we don't have it yet, we'll run posts later after profile data resolves.
    const postsRun = profileUrl ? await startActorRun(postsActor, buildPostsInput({ profileUrl })) : null;

    await supabaseAdmin
      .from('linkedin_leads')
      .update({
        apify_profile_json: { status: 'running', started_at: new Date().toISOString() },
        apify_profile_run_id: profileRun?.id || null,
        apify_posts_run_id: postsRun?.id || null,
        apify_error: null,
      })
      .eq('id', leadId);
  } catch (e) {
    await supabaseAdmin
      .from('linkedin_leads')
      .update({
        apify_profile_json: null,
        apify_error: String(e?.message || e),
      })
      .eq('id', leadId);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
    return;
  }

  // Auth: single shared secret via Authorization: Bearer <SECRET>
  // Prefer API_BEARER_SECRET; keep backwards-compat via AIMFOX_WEBHOOK_SECRET.
  const expectedSecret = process.env.API_BEARER_SECRET || process.env.AIMFOX_WEBHOOK_SECRET;
  const authHeader = req.headers['authorization'];
  const providedToken =
    typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice('bearer '.length).trim()
      : null;

  if (!expectedSecret) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'Server not configured (missing API_BEARER_SECRET)' }));
    return;
  }

  if (!providedToken || providedToken !== expectedSecret) {
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

    let auditId = null;
    const { data: insertedAudit, error: insertError } = await supabaseAdmin
      .from('linkedin_webhook_events')
      .insert({
        event_id: eventId || null,
        event_type: eventType || 'unknown',
        payload,
        processed: false,
      });
      // Note: avoid select() here for compatibility; we'll fetch below if needed.

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

      // If duplicate, fetch the existing audit row to decide whether to reprocess.
      const { data: existing, error: fetchErr } = await supabaseAdmin
        .from('linkedin_webhook_events')
        .select('id,processed')
        .eq('event_id', eventId)
        .maybeSingle();
      if (fetchErr) {
        console.error('[aimfox-webhook] failed to fetch existing audit event', fetchErr);
      }
      if (existing?.processed) {
        // Already handled.
        console.log('[aimfox-webhook] duplicate event already processed', { eventType, eventId });
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: true, duplicate: true }));
        return;
      }
      auditId = existing?.id || null;
    } else {
      // For non-duplicate inserts, attempt to fetch the created row id if needed.
      if (Array.isArray(insertedAudit) && insertedAudit[0]?.id) auditId = insertedAudit[0].id;
    }

    // Phase 3: process events into normalized tables.
    const event = payload.event || payload.data || null;
    const lead = pickLeadFromEvent(eventType, event);
    const campaign = event?.campaign || null;

    const leadLinkedinId = lead?.id != null ? String(lead.id) : null;
    const leadUrn = lead?.urn ? String(lead.urn) : null;
    const leadPublicId = lead?.public_identifier ? String(lead.public_identifier) : null;
    const leadProfileUrl = leadPublicId ? `https://linkedin.com/in/${leadPublicId}` : null;

    const safeCampaignId = campaign?.id ? String(campaign.id) : null;
    const safeCampaignName = campaign?.name ? String(campaign.name) : null;

    // Upsert lead when we have an id.
    let leadRow = null;
    if (leadLinkedinId) {
      const leadUpsert = {
        linkedin_id: leadLinkedinId,
        linkedin_urn: leadUrn,
        public_identifier: leadPublicId,
        first_name: lead?.first_name != null ? String(lead.first_name).trim() : null,
        last_name: lead?.last_name != null ? String(lead.last_name).trim() : null,
        full_name:
          lead?.first_name || lead?.last_name
            ? `${String(lead?.first_name || '').trim()} ${String(lead?.last_name || '').trim()}`.trim()
            : (lead?.full_name != null ? String(lead.full_name).trim() : null),
        headline: lead?.headline != null ? String(lead.headline) : null,
        occupation: lead?.occupation != null ? String(lead.occupation) : null,
        picture_url: lead?.picture_url != null ? String(lead.picture_url) : null,
        profile_url: lead?.profile_url != null ? String(lead.profile_url) : leadProfileUrl,
        campaign_id: safeCampaignId,
        campaign_name: safeCampaignName,
        // status fields below set per event type
      };

      if (eventType === 'accepted') {
        leadUpsert.lead_status = 'accepted';
        leadUpsert.connection_accepted_at = asIsoTimestamp(event?.timestamp || payload?.timestamp) || new Date().toISOString();
        leadUpsert.last_interaction_at = leadUpsert.connection_accepted_at;
      }

      if (eventType === 'campaign_reply') {
        leadUpsert.lead_status = 'replied';
        leadUpsert.last_interaction_at = asIsoTimestamp(event?.timestamp || event?.message?.created_at) || new Date().toISOString();
      }

      const { data: leadData, error: leadErr } = await supabaseAdmin
        .from('linkedin_leads')
        .upsert(leadUpsert, { onConflict: 'linkedin_id' })
        .select('id')
        .single();
      if (leadErr) throw leadErr;
      leadRow = leadData;
    }

    // Phase 6: trigger Apify enrichment for accepted leads (only if not already enriched)
    if (eventType === 'accepted' && leadRow?.id) {
      void maybeKickoffApifyEnrichment({
        supabaseAdmin,
        leadId: leadRow.id,
        linkedinUrn: leadUrn,
        profileUrl: leadProfileUrl,
      });
    }

    // Upsert conversation + insert message for campaign_reply
    if (eventType === 'campaign_reply') {
      const conversationUrn = event?.conversation_urn ? String(event.conversation_urn) : null;
      if (conversationUrn && leadRow?.id) {
        const lastActivityAt =
          asIsoTimestamp(event?.timestamp) ||
          asIsoTimestamp(event?.message?.created_at) ||
          new Date().toISOString();

        const participants = {
          sender: event?.sender || null,
          recipient: event?.recipient || null,
        };

        const { data: convoData, error: convoErr } = await supabaseAdmin
          .from('linkedin_conversations')
          .upsert(
            {
              conversation_urn: conversationUrn,
              lead_id: leadRow.id,
              last_activity_at: lastActivityAt,
              unread_count: 1,
              participants,
            },
            { onConflict: 'conversation_urn' },
          )
          .select('id')
          .single();
        if (convoErr) throw convoErr;

        const messageUrn = event?.message_urn || event?.message?.urn ? String(event?.message_urn || event?.message?.urn) : null;
        if (messageUrn) {
          const body = event?.body || event?.message?.body || '';
          const { error: msgErr } = await supabaseAdmin.from('linkedin_messages').insert({
            message_urn: messageUrn,
            conversation_id: convoData.id,
            lead_id: leadRow.id,
            body: String(body),
            message_type: 'received',
            sender_id: event?.sender?.id != null ? String(event.sender.id) : (event?.message?.sender != null ? String(event.message.sender) : null),
            sender_name: event?.sender ? `${String(event.sender.first_name || '').trim()} ${String(event.sender.last_name || '').trim()}`.trim() : null,
            recipient_id: event?.recipient?.id != null ? String(event.recipient.id) : null,
            recipient_name: event?.recipient ? `${String(event.recipient.first_name || '').trim()} ${String(event.recipient.last_name || '').trim()}`.trim() : null,
            raw: event?.message || null,
            sent_at: asIsoTimestamp(event?.timestamp) || asIsoTimestamp(event?.message?.created_at) || null,
          });

          // Duplicate message_urn should be safely ignored by returning 200 (idempotent).
          if (msgErr) {
            const msg = String(msgErr.message || '');
            const isDup = msg.includes('duplicate') || msg.includes('unique') || msg.includes('23505');
            if (!isDup) throw msgErr;
          }
        }
      }
    }

    // Mark audit event as processed (even if we ignored it).
    if (eventId) {
      const { error: updErr } = await supabaseAdmin
        .from('linkedin_webhook_events')
        .update({ processed: true, processed_at: new Date().toISOString(), error: null })
        .eq('event_id', eventId);
      if (updErr) console.error('[aimfox-webhook] failed to mark processed', updErr);
    } else if (auditId) {
      const { error: updErr } = await supabaseAdmin
        .from('linkedin_webhook_events')
        .update({ processed: true, processed_at: new Date().toISOString(), error: null })
        .eq('id', auditId);
      if (updErr) console.error('[aimfox-webhook] failed to mark processed (by id)', updErr);
    }
  } catch (e) {
    console.error('[aimfox-webhook] processing error', e);
    // We already stored the raw event. Mark it as failed so we can replay later.
    try {
      const { getSupabaseAdminClient } = require('../lib/supabaseAdmin');
      const supabaseAdmin = getSupabaseAdminClient();
      if (eventId) {
        await supabaseAdmin
          .from('linkedin_webhook_events')
          .update({ processed: false, processed_at: null, error: String(e?.message || e) })
          .eq('event_id', eventId);
      }
    } catch {
      // ignore
    }
    // Return 200 so Aimfox doesn't hammer retries; we can replay from the audit table.
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, processed: false }));
    return;
  }

  // Still log a tiny summary for debugging.
  console.log('[aimfox-webhook]', { eventType, eventId });

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: true }));
};

