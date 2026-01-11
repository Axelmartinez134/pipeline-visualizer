const AIMFOX_BASE_URL = 'https://api.aimfox.com/api/v2';

function getAimfoxApiKey() {
  const key = process.env.AIMFOX_API_KEY;
  if (!key) throw new Error('Missing AIMFOX_API_KEY env var');
  return key;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function aimfoxFetch(path, { method = 'GET', body, query, retries = 2 } = {}) {
  const key = getAimfoxApiKey();
  const url = new URL(AIMFOX_BASE_URL + path);
  if (query && typeof query === 'object') {
    Object.entries(query).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      url.searchParams.set(k, String(v));
    });
  }

  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
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
      const details = json ?? (text ? { raw: text.slice(0, 2000) } : null);
      const messageFromJson =
        json && typeof json === 'object'
          ? (typeof json.error === 'string'
              ? json.error
              : typeof json.message === 'string'
              ? json.message
              : null)
          : null;
      const message =
        messageFromJson ||
        (text ? text.slice(0, 500) : '') ||
        `Aimfox request failed (${res.status})`;
      const err = new Error(message);
      err.status = res.status;
      err.details = details;
      lastErr = err;

      // Retry on transient 5xx errors (common during maintenance).
      if (res.status >= 500 && res.status <= 599 && attempt < retries) {
        await sleep(400 * Math.pow(2, attempt)); // 400ms, 800ms, ...
        continue;
      }
      throw err;
    }

    return json;
  }

  throw lastErr || new Error('Aimfox request failed');
}

async function listRecentLeads(query) {
  return aimfoxFetch('/analytics/recent-leads', { query });
}

module.exports = { listRecentLeads };

