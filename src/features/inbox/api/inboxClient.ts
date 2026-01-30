import { supabase } from '../../../lib/supabaseClient';

class ApiError extends Error {
  status: number;
  url: string;
  body: any;
  constructor(message: string, opts: { status: number; url: string; body: any }) {
    super(message);
    this.name = 'ApiError';
    this.status = opts.status;
    this.url = opts.url;
    this.body = opts.body;
  }
}

async function getAccessToken(): Promise<string> {
  const session = (await supabase.auth.getSession()).data.session;
  const token = session?.access_token;
  if (!token) throw new Error('Not signed in');
  return token;
}

async function postJsonWithToken<T>(token: string, url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (e: any) {
    throw new ApiError(e?.message || 'Network error (failed to fetch)', {
      status: 0,
      url,
      body: { networkError: true, original: String(e?.message || e) },
    });
  }
  const text = await res.text().catch(() => '');
  const json = (() => {
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  })();
  if (!res.ok) {
    const msg =
      (json && (json.error || json.message)) ||
      (text ? text.slice(0, 300) : '') ||
      `Request failed (${res.status})`;
    throw new ApiError(String(msg), { status: res.status, url, body: json ?? text });
  }
  return (json ?? (text as any)) as T;
}

export async function ensureDraft(params: { leadId: string; draftType: string }) {
  const token = await getAccessToken();
  return await postJsonWithToken<{ ok: true; draft: any; reused?: boolean }>(
    token,
    `/api/internal/inbox/ensure-draft`,
    params,
  );
}

export async function rerollDraft(params: { leadId: string; draftType: string; feedback?: string }) {
  const token = await getAccessToken();
  return await postJsonWithToken<{ ok: true; draft: any }>(token, `/api/internal/inbox/reroll-draft`, params);
}

export async function sendDraft(params: { draftId: string; message?: string; dryRun?: boolean }) {
  const token = await getAccessToken();
  return await postJsonWithToken<{
    ok: true;
    dryRun?: boolean;
    conversationUrn?: string;
    messageUrn?: string;
    sentAt?: string;
    wouldSend?: any;
  }>(
    token,
    `/api/internal/inbox/send-draft`,
    params,
  );
}

export async function saveDraft(params: { draftId: string; message: string }) {
  const token = await getAccessToken();
  return await postJsonWithToken<{ ok: true; draft: any; changed: boolean }>(
    token,
    `/api/internal/inbox/save-draft`,
    params,
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function bootstrapTopDrafts(params: { limit?: number } = {}) {
  const token = await getAccessToken();
  const { leadIdsToDraft } = await postJsonWithToken<{
    ok: true;
    considered: number;
    leadIdsToDraft: string[];
  }>(token, `/api/internal/inbox/bootstrap-drafts`, { limit: params.limit ?? 25 });

  // Generate sequentially to reduce rate-limit spikes.
  const created: string[] = [];
  for (const leadId of leadIdsToDraft) {
    await postJsonWithToken(token, `/api/internal/inbox/ensure-draft`, { leadId, draftType: 'first_message' });
    created.push(leadId);
    await sleep(150);
  }

  return { leadIdsToDraft, createdCount: created.length };
}

