const AIMFOX_BASE_URL = 'https://api.aimfox.com/api/v2';

function getAimfoxApiKey() {
  const key = process.env.AIMFOX_API_KEY;
  if (!key) throw new Error('Missing AIMFOX_API_KEY env var');
  return key;
}

async function aimfoxFetch(path, { method = 'GET', body, query } = {}) {
  const key = getAimfoxApiKey();
  const url = new URL(AIMFOX_BASE_URL + path);
  if (query && typeof query === 'object') {
    Object.entries(query).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      url.searchParams.set(k, String(v));
    });
  }

  const res = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
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
    const message =
      (json && (json.error || json.message)) ||
      (text ? text.slice(0, 500) : '') ||
      `Aimfox request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.response = json || text;
    throw err;
  }

  return json;
}

async function listRecentLeads(query) {
  return aimfoxFetch('/analytics/recent-leads', { query });
}

module.exports = { listRecentLeads };

