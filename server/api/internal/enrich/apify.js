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

function pickFirstString(...values) {
  for (const v of values) {
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return null;
}

function extractAimfoxLeadProfileUrl(payload) {
  // Be defensive: aimfox response shapes can differ.
  const profileUrlCandidate =
    payload?.profile_url ||
    payload?.profileUrl ||
    payload?.lead?.profile_url ||
    payload?.lead?.profileUrl ||
    payload?.data?.profile_url ||
    payload?.data?.profileUrl ||
    payload?.target?.profile_url ||
    payload?.target?.profileUrl ||
    payload?.lead?.target?.profile_url ||
    payload?.lead?.target?.profileUrl ||
    null;
  const direct = pickFirstString(profileUrlCandidate);
  if (direct) return direct;

  // Aimfox lead-details commonly returns `lead.public_identifier` (no explicit URL).
  const pid = extractAimfoxPublicIdentifier(payload);
  if (pid) return `https://www.linkedin.com/in/${pid}/`;
  return null;
}

function extractAimfoxPublicIdentifier(payload) {
  const candidate =
    payload?.public_identifier ||
    payload?.publicIdentifier ||
    payload?.lead?.public_identifier ||
    payload?.lead?.publicIdentifier ||
    payload?.data?.public_identifier ||
    payload?.data?.publicIdentifier ||
    payload?.target?.public_identifier ||
    payload?.target?.publicIdentifier ||
    payload?.lead?.target?.public_identifier ||
    payload?.lead?.target?.publicIdentifier ||
    null;
  return pickFirstString(candidate);
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

  const action = payload?.action != null ? String(payload.action).toLowerCase() : 'start'; // start | poll
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
    .select(
      'id,linkedin_id,linkedin_urn,public_identifier,profile_url,apify_profile_json,apify_profile_run_id,apify_posts_run_id,apify_last_scraped_at,apify_error',
    );

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

  if (action === 'start' && lead.apify_profile_json) {
    return json(res, 200, { ok: true, alreadyEnriched: true, leadId: lead.id });
  }

  try {
    const {
      getActorIds,
      startActorRun,
      startActorRunWithFallback,
      buildProfileInput,
      buildPostsInput,
      getRun,
      getDatasetItems,
    } = require('../../lib/apify');
    const { profileActor, postsActor } = getActorIds();

    // Prefer an explicit URL (actors often want a URL). If we don't have it, fall back.
    let profileUrlRaw =
      lead.profile_url ||
      providedProfileUrl ||
      (lead.public_identifier ? `https://linkedin.com/in/${String(lead.public_identifier)}` : null);

    let profileUrl = normalizeLinkedInProfileUrl(profileUrlRaw);

    // If we still don't have a usable URL, resolve via Aimfox lead details using linkedin_id.
    if (!profileUrl) {
      try {
        const { getLeadById } = require('../../lib/aimfox');
        const details = await getLeadById(lead.linkedin_id);
        const urlFromAimfox = extractAimfoxLeadProfileUrl(details);
        const pidFromAimfox = extractAimfoxPublicIdentifier(details);
        profileUrlRaw = urlFromAimfox || profileUrlRaw;
        profileUrl = normalizeLinkedInProfileUrl(profileUrlRaw);

        if (urlFromAimfox || pidFromAimfox) {
          await supabaseAdmin
            .from('linkedin_leads')
            .update({
              profile_url: urlFromAimfox || lead.profile_url || null,
              public_identifier: pidFromAimfox || lead.public_identifier || null,
            })
            .eq('id', lead.id);
        }
      } catch (e) {
        // ignore; we'll error below with missing profile URL
      }
    }

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

    if (action === 'poll') {
      const profileRunId = lead.apify_profile_run_id ? String(lead.apify_profile_run_id) : null;
      const postsRunId = lead.apify_posts_run_id ? String(lead.apify_posts_run_id) : null;
      if (!profileRunId && !postsRunId) {
        return json(res, 400, { ok: false, error: 'No Apify run ids found on this lead. Click Run Apify first.' });
      }

      const datasetLimit = parseInt(process.env.APIFY_DATASET_LIMIT || '10', 10);
      const limit = Number.isFinite(datasetLimit) ? datasetLimit : 10;

      const out = {
        ok: true,
        leadId: lead.id,
        profile: null,
        posts: null,
      };

      const nextJson = {
        status: 'running',
        started_at: lead.apify_profile_json?.started_at || lead.apify_profile_json?.startedAt || null,
        updated_at: new Date().toISOString(),
        profile: null,
        posts: null,
      };

      if (profileRunId) {
        const run = await getRun(profileRunId);
        const status = run?.status || null;
        const datasetId = run?.defaultDatasetId || null;
        let items = null;
        if (status === 'SUCCEEDED' && datasetId) {
          items = await getDatasetItems(datasetId, { limit });
        }
        nextJson.profile = { runId: profileRunId, status, datasetId, items };
        out.profile = { runId: profileRunId, status, datasetId, itemsCount: Array.isArray(items) ? items.length : null };
      }

      if (postsRunId) {
        const run = await getRun(postsRunId);
        const status = run?.status || null;
        const datasetId = run?.defaultDatasetId || null;
        let items = null;
        if (status === 'SUCCEEDED' && datasetId) {
          items = await getDatasetItems(datasetId, { limit });
        }
        nextJson.posts = { runId: postsRunId, status, datasetId, items };
        out.posts = { runId: postsRunId, status, datasetId, itemsCount: Array.isArray(items) ? items.length : null };
      }

      const statuses = [nextJson.profile?.status, nextJson.posts?.status].filter(Boolean);
      const allSucceeded = statuses.length > 0 && statuses.every((s) => s === 'SUCCEEDED');
      const anyFailed = statuses.some((s) => s === 'FAILED' || s === 'ABORTED' || s === 'TIMED-OUT');

      let apifyError = null;
      if (anyFailed) apifyError = 'One or more Apify runs failed. Check Apify run logs.';

      const { error: upErr } = await supabaseAdmin
        .from('linkedin_leads')
        .update({
          apify_profile_json: allSucceeded ? { ...nextJson, status: 'succeeded' } : nextJson,
          apify_last_scraped_at: allSucceeded ? new Date().toISOString() : null,
          apify_error: apifyError,
        })
        .eq('id', lead.id);
      if (upErr) return json(res, 500, { ok: false, error: upErr.message });

      return json(res, 200, { ...out, allSucceeded, anyFailed });
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

    const profileInputObj = buildProfileInput({
      linkedinUrn: lead.linkedin_urn ? String(lead.linkedin_urn) : null,
      profileUrl,
      publicIdentifier: lead.public_identifier ? String(lead.public_identifier) : null,
    });
    const profileInputStringUrls = {
      ...profileInputObj,
      urls: Array.isArray(profileInputObj.urls) && profileInputObj.urls[0]?.url ? [profileInputObj.urls[0].url] : [],
    };
    console.log('[apify] profile actor input', {
      urls0_obj: profileInputObj?.urls?.[0] || null,
      urls0_str: profileInputStringUrls?.urls?.[0] || null,
    });

    const profileRun = await startActorRunWithFallback(profileActor, [profileInputObj, profileInputStringUrls]);

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

