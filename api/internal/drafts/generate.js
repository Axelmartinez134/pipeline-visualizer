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

function buildPrompt({ lead, apify, aboutMe }) {
  const leadName = lead?.full_name || 'the lead';
  const occupation = lead?.occupation || '';

  const profile = apify?.profile?.items?.[0] || null;
  const posts = Array.isArray(apify?.posts?.items) ? apify.posts.items.slice(0, 2) : [];

  const profileSummary = profile
    ? {
        headline: profile.headline || null,
        summary: profile.summary || null,
        jobTitle: profile.jobTitle || null,
        companyName: profile.companyName || null,
      }
    : null;

  const recentPosts = posts.map((p) => ({
    linkedinUrl: p.linkedinUrl || null,
    postedAt: p.postedAt?.date || null,
    content: p.content || null,
  }));

  const context = {
    lead: {
      full_name: lead?.full_name || null,
      occupation,
      campaign_name: lead?.campaign_name || null,
    },
    about_me: {
      offer_icp: aboutMe?.offer_icp || null,
      tone_guidelines: aboutMe?.tone_guidelines || null,
      hard_constraints: aboutMe?.hard_constraints || null,
      calendly_cta_prefs: aboutMe?.calendly_cta_prefs || null,
    },
    apify: {
      profile_summary: profileSummary,
      recent_posts: recentPosts,
    },
  };

  const system = [
    'You write concise, high-performing first messages for LinkedIn outreach.',
    'Return ONLY the message text. No quotes, no bullet points, no analysis.',
    'Keep it natural and human. Avoid sounding like AI.',
  ].join('\n');

  const user = [
    `Write a first message to ${leadName}.`,
    occupation ? `They are: ${occupation}` : '',
    '',
    'Use the following context (JSON) and follow it strictly:',
    JSON.stringify(context, null, 2),
    '',
    'Constraints:',
    '- 2 short paragraphs max',
    '- 1 question max',
    '- No links unless CTA prefs explicitly request it',
  ]
    .filter(Boolean)
    .join('\n');

  return { system, user, context };
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
    .select('offer_icp,tone_guidelines,hard_constraints,calendly_cta_prefs')
    .eq('user_id', userData.user.id)
    .maybeSingle();
  if (profErr) return json(res, 500, { ok: false, error: profErr.message });

  const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest';
  const { system, user, context } = buildPrompt({ lead, apify: lead.apify_profile_json, aboutMe });

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
      ai_prompt: user,
      ai_context: context,
    })
    .select('id')
    .single();
  if (insErr) return json(res, 500, { ok: false, error: insErr.message });

  return json(res, 200, { ok: true, draftId: draftRow.id });
};

