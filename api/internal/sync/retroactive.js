const { getSupabaseAdminClient } = require('../../lib/supabaseAdmin');
const { listRecentLeads } = require('../../lib/aimfox');

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
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

  // Optional filters via query
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const campaignNameFilter = (url.searchParams.get('campaignName') || '').toLowerCase();

  let recent;
  try {
    recent = await listRecentLeads();
  } catch (e) {
    const status = e?.status || null;
    return json(res, 502, {
      ok: false,
      error: `Aimfox recent-leads failed${status ? ` (HTTP ${status})` : ''}: ${String(e?.message || e)}`,
      details: e?.details || null,
    });
  }

  const items = Array.isArray(recent?.leads) ? recent.leads : Array.isArray(recent) ? recent : [];
  const accepted = items.filter((it) => String(it?.transition || '').toLowerCase() === 'accepted');
  const filtered = campaignNameFilter
    ? accepted.filter((it) => String(it?.campaign_name || '').toLowerCase().includes(campaignNameFilter))
    : accepted;

  const leads = filtered.map(normalizeAcceptedItemToLead).filter(Boolean);
  if (leads.length === 0) return json(res, 200, { ok: true, upserted: 0, filteredAccepted: filtered.length });

  const chunkSize = 100;
  let upserted = 0;
  for (let i = 0; i < leads.length; i += chunkSize) {
    const chunk = leads.slice(i, i + chunkSize);
    const { error } = await supabaseAdmin.from('linkedin_leads').upsert(chunk, { onConflict: 'linkedin_id' });
    if (error) return json(res, 500, { ok: false, error: error.message });
    upserted += chunk.length;
  }

  return json(res, 200, { ok: true, upserted, filteredAccepted: filtered.length });
};

