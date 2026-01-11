const APIFY_BASE_URL = 'https://api.apify.com/v2';

function normalizeLinkedInProfileUrl(url) {
  if (!url) return null;
  let raw = String(url).trim();
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;

  let u;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }

  u.hash = '';
  u.search = '';

  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  if (!host.endsWith('linkedin.com')) return null;
  u.hostname = 'www.linkedin.com';
  u.protocol = 'https:';

  // Normalize /in/<handle> URLs (what the actor expects)
  const m = u.pathname.match(/^\/in\/([^/]+)\/?$/i);
  if (m?.[1]) {
    u.pathname = `/in/${m[1]}/`;
  }

  return u.toString();
}

function getApifyToken() {
  const t = process.env.APIFY_API_TOKEN;
  if (!t) throw new Error('Missing APIFY_API_TOKEN env var');
  return t;
}

function getActorIds() {
  const profileActorRaw = process.env.APIFY_PROFILE_ACTOR_ID;
  const postsActorRaw = process.env.APIFY_POSTS_ACTOR_ID;
  // Apify API commonly expects actor ids like "username~actor-name" in URL paths.
  // If user provides "username/actor-name" (copy/paste from UI), normalize it.
  const profileActor = profileActorRaw ? String(profileActorRaw).replace('/', '~') : '';
  const postsActor = postsActorRaw ? String(postsActorRaw).replace('/', '~') : '';
  if (!profileActor) throw new Error('Missing APIFY_PROFILE_ACTOR_ID env var');
  if (!postsActor) throw new Error('Missing APIFY_POSTS_ACTOR_ID env var');
  return { profileActor, postsActor };
}

async function apifyFetch(path, { method = 'GET', body } = {}) {
  const token = getApifyToken();
  const res = await fetch(`${APIFY_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }
  if (!res.ok) {
    const msg =
      (json && (json.error?.message || json.message)) ||
      text ||
      `Apify request failed (${res.status})`;
    const err = new Error(`${msg} [${method} ${path}]`);
    err.status = res.status;
    err.details = json;
    throw err;
  }
  return json;
}

async function startActorRun(actorId, input) {
  // Start a run (async). We poll it later.
  const r = await apifyFetch(`/acts/${encodeURIComponent(actorId)}/runs`, { method: 'POST', body: input });
  return r?.data || null;
}

async function getRun(runId) {
  const r = await apifyFetch(`/actor-runs/${encodeURIComponent(runId)}`, { method: 'GET' });
  return r?.data || null;
}

async function getDatasetItems(datasetId, { limit = 50 } = {}) {
  const url = `/datasets/${encodeURIComponent(datasetId)}/items?clean=true&format=json&limit=${encodeURIComponent(
    String(limit),
  )}`;
  const r = await apifyFetch(url, { method: 'GET' });
  return r;
}

function buildProfileInput({ linkedinUrn, profileUrl, publicIdentifier }) {
  // Actor docs vary; we try to be permissive. We'll store failures if incompatible.
  const input = {};
  // This actor requires `input.urls` (array of LinkedIn profile URLs).
  // Keep `profileUrl` too for compatibility with other actors.
  if (profileUrl) {
    const normalized = normalizeLinkedInProfileUrl(profileUrl);
    if (!normalized) throw new Error(`Invalid LinkedIn profile URL for Apify: ${String(profileUrl)}`);
    input.urls = [normalized];
    input.profileUrl = normalized;
  }
  if (linkedinUrn) input.urn = linkedinUrn;
  if (publicIdentifier) input.public_identifier = publicIdentifier;
  return input;
}

function buildPostsInput({ profileUrl }) {
  const includeComments = String(process.env.APIFY_INCLUDE_COMMENTS || 'true').toLowerCase() === 'true';
  const includeReactions = String(process.env.APIFY_INCLUDE_REACTIONS || 'true').toLowerCase() === 'true';
  const postsLimit = parseInt(process.env.APIFY_POSTS_LIMIT || '50', 10);

  return {
    profileUrl,
    includeComments,
    includeReactions,
    maxPosts: Number.isFinite(postsLimit) ? postsLimit : 50,
  };
}

module.exports = {
  getActorIds,
  startActorRun,
  getRun,
  getDatasetItems,
  buildProfileInput,
  buildPostsInput,
  normalizeLinkedInProfileUrl,
};

