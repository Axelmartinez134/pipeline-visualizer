const { getSupabaseAdminClient } = require('../../lib/supabaseAdmin');

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

function normalizeLinkedInProfileUrl(url) {
  const { normalizeLinkedInProfileUrl: normalize } = require('../../lib/apify');
  return normalize(url);
}

function extractPublicIdentifier(profileUrl) {
  if (!profileUrl) return null;
  try {
    const u = new URL(profileUrl);
    const m = u.pathname.match(/\/in\/([^/]+)/i);
    return m?.[1] ? decodeURIComponent(m[1]) : null;
  } catch {
    const m = String(profileUrl).match(/\/in\/([^/?#]+)/i);
    return m?.[1] ? String(m[1]) : null;
  }
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

  const linkedinId = payload?.linkedinId != null ? String(payload.linkedinId).trim() : null;
  const providedProfileUrlRaw = payload?.profileUrl != null ? String(payload.profileUrl).trim() : null;
  const providedProfileUrl = normalizeLinkedInProfileUrl(providedProfileUrlRaw);

  if (!linkedinId && !providedProfileUrl) {
    return json(res, 400, {
      ok: false,
      error: 'Provide either linkedinId or a valid LinkedIn profile URL',
      debug: { receivedProfileUrl: providedProfileUrlRaw || null },
    });
  }

  const publicIdentifier = extractPublicIdentifier(providedProfileUrl);

  let leadQuery = supabaseAdmin
    .from('linkedin_leads')
    .select('id,linkedin_id,linkedin_urn,public_identifier,profile_url,apify_profile_json');

  if (linkedinId) {
    leadQuery = leadQuery.eq('linkedin_id', linkedinId);
  } else if (publicIdentifier) {
    // Prefer public_identifier match (most stable across URL variants)
    leadQuery = leadQuery.eq('public_identifier', publicIdentifier);
  } else {
    // Fall back to profile_url (exact match)
    leadQuery = leadQuery.eq('profile_url', providedProfileUrl);
  }

  const { data: lead, error: leadErr } = await leadQuery.maybeSingle();
  if (leadErr) return json(res, 500, { ok: false, error: leadErr.message });
  if (!lead) {
    return json(res, 404, {
      ok: false,
      error: `Lead not found (provide an existing lead's linkedin_id or profile URL).`,
      debug: { linkedinId: linkedinId || null, profileUrl: providedProfileUrl || null, publicIdentifier },
    });
  }

  if (lead.apify_profile_json) {
    return json(res, 200, { ok: true, alreadyEnriched: true, leadId: lead.id });
  }

  try {
    const { getActorIds, startActorRun, buildProfileInput, buildPostsInput } = require('../../lib/apify');
    const { profileActor, postsActor } = getActorIds();

    // Prefer an explicit URL (actors often want a URL). If we don't have it, fall back.
    const profileUrlRaw =
      lead.profile_url ||
      providedProfileUrl ||
      (lead.public_identifier ? `https://linkedin.com/in/${String(lead.public_identifier)}` : null);

    const profileUrl = normalizeLinkedInProfileUrl(profileUrlRaw);

    if (!profileUrl) {
      return json(res, 400, { ok: false, error: 'Missing LinkedIn profile URL (required by Apify actor)' });
    }

    // If user supplied a URL and lead doesn't have one yet, store it.
    if (!lead.profile_url && providedProfileUrl) {
      await supabaseAdmin
        .from('linkedin_leads')
        .update({ profile_url: providedProfileUrl })
        .eq('id', lead.id);
    }

    console.log('[apify] starting enrichment', {
      leadId: lead.id,
      linkedin_id: lead.linkedin_id,
      linkedin_urn: lead.linkedin_urn,
      profileUrl,
      profileUrlRaw,
      resolvedFrom: linkedinId ? 'linkedin_id' : providedProfileUrl ? 'profile_url' : 'lead_row',
      profileActor,
      postsActor,
    });

    const profileInput = buildProfileInput({
      linkedinUrn: lead.linkedin_urn ? String(lead.linkedin_urn) : null,
      profileUrl,
      publicIdentifier: lead.public_identifier ? String(lead.public_identifier) : null,
    });
    console.log('[apify] profile actor input', { urls0: profileInput?.urls?.[0] || null });

    const profileRun = await startActorRun(
      profileActor,
      profileInput,
    );

    const postsRun = profileUrl ? await startActorRun(postsActor, buildPostsInput({ profileUrl })) : null;

    const { error: upErr } = await supabaseAdmin
      .from('linkedin_leads')
      .update({
        apify_profile_json: { status: 'running', started_at: new Date().toISOString() },
        apify_last_scraped_at: null,
        apify_profile_run_id: profileRun?.id || null,
        apify_posts_run_id: postsRun?.id || null,
        apify_error: null,
      })
      .eq('id', lead.id);
    if (upErr) return json(res, 500, { ok: false, error: upErr.message });

    return json(res, 200, {
      ok: true,
      leadId: lead.id,
      profileRunId: profileRun?.id || null,
      postsRunId: postsRun?.id || null,
      debug: {
        usedProfileUrl: profileUrl,
        usedProfileActor: profileActor,
        usedPostsActor: postsActor,
      },
    });
  } catch (e) {
    console.error('[apify] enrichment failed', {
      leadId: lead.id,
      err: String(e?.message || e),
      status: e?.status || null,
      details: e?.details || null,
    });
    await supabaseAdmin
      .from('linkedin_leads')
      .update({ apify_profile_json: null, apify_error: String(e?.message || e) })
      .eq('id', lead.id);
    return json(res, 502, {
      ok: false,
      error: String(e?.message || e),
      status: e?.status || null,
      details: e?.details || null,
    });
  }
};

