const { getSupabaseAdminClient } = require('../lib/supabaseAdmin');
const { listRecentLeads } = require('../lib/aimfox');

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
      if (data.length > 200_000) reject(new Error('Payload too large'));
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const raw = await readRawBody(req);
  if (!raw) return null;
  return JSON.parse(raw);
}

function asIsoTimestamp(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isFinite(d.getTime()) ? d.toISOString() : null;
  }
  if (typeof value === 'number') {
    const d = new Date(value);
    return Number.isFinite(d.getTime()) ? d.toISOString() : null;
  }
  return null;
}

function normalizeAcceptedItemToLead(item) {
  // Aimfox recent-leads response shape (observed):
  // {
  //   timestamp, campaign_id, campaign_name, target_id, target_urn, transition: "accepted",
  //   target: { urn, full_name, picture_url, occupation, ... }
  // }
  const target = item?.target || null;
  const linkedinId = item?.target_id != null ? String(item.target_id) : null;
  if (!linkedinId) return null;

  const acceptedAt = asIsoTimestamp(item?.timestamp) || null;

  return {
    linkedin_id: linkedinId,
    linkedin_urn: item?.target_urn ? String(item.target_urn) : (target?.urn ? String(target.urn) : null),
    public_identifier: target?.public_identifier ? String(target.public_identifier) : null,
    full_name: target?.full_name != null ? String(target.full_name).trim() : null,
    first_name: target?.first_name != null ? String(target.first_name).trim() : null,
    last_name: target?.last_name != null ? String(target.last_name).trim() : null,
    headline: target?.headline != null ? String(target.headline) : null,
    occupation: target?.occupation != null ? String(target.occupation) : null,
    picture_url: target?.picture_url != null ? String(target.picture_url) : null,
    profile_url: target?.public_identifier ? `https://linkedin.com/in/${String(target.public_identifier)}` : null,
    campaign_id: item?.campaign_id ? String(item.campaign_id) : null,
    campaign_name: item?.campaign_name ? String(item.campaign_name) : null,
    lead_status: 'accepted',
    connection_accepted_at: acceptedAt,
    last_interaction_at: acceptedAt,
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, error: 'Method not allowed' });
  }

  // Auth: single shared secret via Authorization: Bearer <SECRET>
  const expected = process.env.API_BEARER_SECRET || process.env.ADMIN_API_SECRET;
  if (!expected) {
    return json(res, 500, { ok: false, error: 'Server not configured (missing API_BEARER_SECRET)' });
  }
  const authHeader = req.headers['authorization'];
  const provided =
    typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice('bearer '.length).trim()
      : null;
  if (!provided || provided !== expected) {
    return json(res, 401, { ok: false, error: 'Unauthorized' });
  }

  const supabaseAdmin = getSupabaseAdminClient();

  // Optional filters provided per-run (preferred). Accept either query params or JSON body.
  // Example:
  //   POST /api/sync/retroactive?campaignType=ads
  //   POST body: { "campaignType": "ads" }
  let filters = {};
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const body = await readJsonBody(req).catch(() => null);
    filters = {
      campaignId: (body?.campaignId ?? url.searchParams.get('campaignId') ?? '').toString(),
      campaignName: (body?.campaignName ?? url.searchParams.get('campaignName') ?? '').toString(),
      campaignType: (body?.campaignType ?? url.searchParams.get('campaignType') ?? '').toString(),
    };
  } catch {
    // ignore; filters remain empty
  }

  const campaignIdFilter = (filters.campaignId || '').trim();
  const campaignNameFilter = (filters.campaignName || '').trim().toLowerCase();
  const campaignTypeFilter = (filters.campaignType || '').trim().toLowerCase(); // e.g. "ads"

  // Aimfox paging parameters are not documented publicly here; we implement a safe single-page sync first.
  // If Aimfox supports paging, we can expand this to loop with cursors/offsets.
  let recent;
  try {
    recent = await listRecentLeads();
  } catch (e) {
    const status = e?.status || null;
    const details = e?.details || e?.response || null;
    return json(res, 502, {
      ok: false,
      error: `Aimfox recent-leads failed${status ? ` (HTTP ${status})` : ''}: ${String(e?.message || e)}`,
      details,
    });
  }

  // Aimfox response shape (observed): { status: "ok", leads: [...] }
  // Also support older shapes: array, or { data: [...] }.
  const items = Array.isArray(recent)
    ? recent
    : Array.isArray(recent?.leads)
    ? recent.leads
    : Array.isArray(recent?.data)
    ? recent.data
    : [];

  // accepted records are identified by transition === "accepted"
  const accepted = items.filter((it) => {
    const transition = it?.transition ? String(it.transition).toLowerCase() : '';
    return transition === 'accepted';
  });

  const filtered = accepted.filter((it) => {
    const cid = it?.campaign_id ? String(it.campaign_id) : '';
    const cname = it?.campaign_name ? String(it.campaign_name).toLowerCase() : '';
    // recent-leads items don't include campaign type in the observed payload
    if (campaignIdFilter && cid !== campaignIdFilter) return false;
    if (campaignNameFilter && !cname.includes(campaignNameFilter)) return false;
    if (campaignTypeFilter) return false;
    return true;
  });

  const leads = filtered.map(normalizeAcceptedItemToLead).filter(Boolean);

  if (leads.length === 0) {
    return json(res, 200, { ok: true, foundAccepted: accepted.length, upserted: 0 });
  }

  // Upsert in chunks to avoid payload limits.
  const chunkSize = 100;
  let upserted = 0;

  for (let i = 0; i < leads.length; i += chunkSize) {
    const chunk = leads.slice(i, i + chunkSize);
    const { error } = await supabaseAdmin
      .from('linkedin_leads')
      .upsert(chunk, { onConflict: 'linkedin_id' });
    if (error) {
      return json(res, 500, { ok: false, error: `Supabase upsert failed: ${error.message}` });
    }
    upserted += chunk.length;
  }

  return json(res, 200, {
    ok: true,
    foundAccepted: accepted.length,
    filteredAccepted: filtered.length,
    upserted,
    note:
      'This Phase 4 sync uses Aimfox recent-leads (single page). If you need deeper history, we will add paging/looping next.',
  });
};

