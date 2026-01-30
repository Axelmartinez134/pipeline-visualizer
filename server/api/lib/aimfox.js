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

async function getLeadById(leadId) {
  if (leadId == null || String(leadId).trim() === '') throw new Error('Missing leadId');
  // Aimfox lead details endpoint (needed to resolve public_identifier/profile_url).
  // Some Aimfox accounts expose different paths; try a small set of common variants.
  const id = encodeURIComponent(String(leadId).trim());
  // Per docs: GET /api/v2/leads/:lead_id
  const candidates = [`/leads/${id}`, `/leads/${id}/details`, `/leads/${id}/detail`, `/leads/${id}/profile`];
  let lastErr = null;
  for (const path of candidates) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await aimfoxFetch(path, { method: 'GET' });
    } catch (e) {
      lastErr = e;
      // Keep trying on 404/400; stop on auth/5xx.
      const status = e?.status || null;
      if (status && status >= 500) break;
      if (status === 401 || status === 403) break;
      continue;
    }
  }
  throw lastErr || new Error('Aimfox lead details request failed');
}

function getAimfoxSenderAccountId() {
  const id = process.env.AIMFOX_SENDER_ACCOUNT_ID;
  if (!id) throw new Error('Missing AIMFOX_SENDER_ACCOUNT_ID env var');
  return String(id).trim();
}

async function startConversation({ accountId, message, recipients, recipientUrns }) {
  const aid = encodeURIComponent(String(accountId || '').trim());
  if (!aid) throw new Error('Missing accountId');
  const body = recipientUrns
    ? { message, recipient_urns: recipientUrns }
    : { message, recipients: recipients || [] };
  return aimfoxFetch(`/accounts/${aid}/conversations`, { method: 'POST', body });
}

module.exports = { listRecentLeads, getLeadById, getAimfoxSenderAccountId, startConversation };

