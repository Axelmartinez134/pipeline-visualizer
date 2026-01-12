import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Textarea } from '../../components/ui/textarea';
import { Input } from '../../components/ui/input';
import { supabase } from '../../lib/supabaseClient';

const DEFAULT_AI_SYSTEM_PROMPT = [
  "You write short, warm LinkedIn first messages using a 'Sell by Chat' approach.",
  'This is a FIRST message. It must be pure connection and relationship-building.',
  'CRITICAL: Do NOT mention the offer, services, pricing, demos, calls, or any CTA. No pitch slap.',
  'Personalize only if it feels natural and non-creepy. Never force a post reference.',
  'If you cannot find a real shared connection supported by the provided data, use a simple warm opener.',
  'Max 1 emoji.',
  'Return ONLY the message text. No quotes, no bullet points, no analysis.',
].join('\n');

const DEFAULT_AI_USER_PROMPT_TEMPLATE = [
  'Write a first message to {{LEAD_NAME}}.',
  '{{#if LEAD_OCCUPATION}}They are: {{LEAD_OCCUPATION}}{{/if}}',
  '',
  'Use the following context (JSON) to craft a warm opener. Do not invent facts.',
  '{{CONTEXT_JSON}}',
  '',
  'Constraints:',
  '- Aim for 2 sentences, max 4 sentences',
  '- Max 1 emoji',
  "- Pure connection (no 'market research' framing)",
  '- No offer mention, no CTA, no links',
  '- If a genuine shared connection exists between prospect and me, you may reference it briefly',
].join('\n');

type WebhookEventRow = {
  event_id: string | null;
  event_type: string;
  processed: boolean;
  created_at: string;
  error: string | null;
};

export default function LinkedInSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [latest, setLatest] = useState<WebhookEventRow | null>(null);
  const [leadCount, setLeadCount] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState<string | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [enrichLinkedinId, setEnrichLinkedinId] = useState('');
  const [enrichProfileUrl, setEnrichProfileUrl] = useState('');
  const [enrichResult, setEnrichResult] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  const [offerIcp, setOfferIcp] = useState('');
  const [tone, setTone] = useState('');
  const [constraints, setConstraints] = useState('');
  const [cta, setCta] = useState('');
  const [aiSystemPrompt, setAiSystemPrompt] = useState(DEFAULT_AI_SYSTEM_PROMPT);
  const [aiUserPromptTemplate, setAiUserPromptTemplate] = useState(DEFAULT_AI_USER_PROMPT_TEMPLATE);
  const [myProfileJsonText, setMyProfileJsonText] = useState('{\n  \n}');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);

      const [events, leads] = await Promise.all([
        supabase
          .from('linkedin_webhook_events')
          .select('event_id,event_type,processed,created_at,error')
          .order('created_at', { ascending: false })
          .limit(1),
        supabase.from('linkedin_leads').select('*', { count: 'exact', head: true }),
      ]);

      const session = (await supabase.auth.getSession()).data.session;
      const userId = session?.user?.id || null;
      if (userId) {
        const profile = await supabase
          .from('user_profiles')
          .select(
            'offer_icp,tone_guidelines,hard_constraints,calendly_cta_prefs,ai_system_prompt,ai_user_prompt_template,my_profile_json',
          )
          .eq('user_id', userId)
          .maybeSingle();
        if (profile.data) {
          setOfferIcp(profile.data.offer_icp || '');
          setTone(profile.data.tone_guidelines || '');
          setConstraints(profile.data.hard_constraints || '');
          setCta(profile.data.calendly_cta_prefs || '');
          setAiSystemPrompt(profile.data.ai_system_prompt || DEFAULT_AI_SYSTEM_PROMPT);
          setAiUserPromptTemplate(profile.data.ai_user_prompt_template || DEFAULT_AI_USER_PROMPT_TEMPLATE);
          setMyProfileJsonText(
            profile.data.my_profile_json ? JSON.stringify(profile.data.my_profile_json, null, 2) : '{\n  \n}',
          );
        }
      }

      if (!mounted) return;
      if (events.error) setError(events.error.message);
      if (leads.error) setError(leads.error.message);

      setLatest((events.data?.[0] as WebhookEventRow) || null);
      setLeadCount(typeof leads.count === 'number' ? leads.count : null);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const runSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    setError(null);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error('Not signed in');

      const res = await fetch('/api/internal/sync/retroactive?campaignName=Ads', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error || `Sync failed (${res.status})`);
      }
      setSyncResult(`Synced. Upserted ${json?.upserted ?? 0} leads.`);
    } catch (e: any) {
      setError(e?.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const saveAboutMe = async () => {
    setSavingProfile(true);
    setProfileSaved(null);
    setError(null);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const userId = session?.user?.id;
      if (!userId) throw new Error('Not signed in');

      let myProfileJson = null;
      try {
        const parsed = JSON.parse(myProfileJsonText || 'null');
        myProfileJson = parsed;
      } catch {
        throw new Error('My profile JSON is not valid JSON');
      }

      const { error: upErr } = await supabase.from('user_profiles').upsert({
        user_id: userId,
        offer_icp: offerIcp,
        tone_guidelines: tone,
        hard_constraints: constraints,
        calendly_cta_prefs: cta,
        ai_system_prompt: aiSystemPrompt,
        ai_user_prompt_template: aiUserPromptTemplate,
        my_profile_json: myProfileJson,
      });
      if (upErr) throw new Error(upErr.message);
      setProfileSaved('Saved.');
    } catch (e: any) {
      setError(e?.message || 'Failed to save');
    } finally {
      setSavingProfile(false);
    }
  };

  const runApifyForLead = async () => {
    setEnriching(true);
    setEnrichResult(null);
    setError(null);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error('Not signed in');

      const linkedinId = enrichLinkedinId.trim();
      const profileUrl = enrichProfileUrl.trim();
      if (!linkedinId && !profileUrl) throw new Error('Enter a lead linkedin_id or a LinkedIn profile URL');

      const res = await fetch('/api/internal/enrich/apify', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ linkedinId: linkedinId || undefined, profileUrl: profileUrl || undefined }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || `Enrich failed (${res.status})`);

      if (json?.alreadyEnriched) {
        setEnrichResult('Already enriched (apify_profile_json exists).');
      } else {
        setEnrichResult(
          `Started. profileRunId=${json?.profileRunId ?? '—'} postsRunId=${json?.postsRunId ?? '—'}`,
        );
      }
    } catch (e: any) {
      setError(e?.message || 'Enrich failed');
    } finally {
      setEnriching(false);
    }
  };

  const pollApify = async () => {
    setPolling(true);
    setError(null);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error('Not signed in');

      const linkedinId = enrichLinkedinId.trim();
      const profileUrl = enrichProfileUrl.trim();
      if (!linkedinId && !profileUrl) throw new Error('Enter a lead linkedin_id or a LinkedIn profile URL');

      const res = await fetch('/api/internal/enrich/apify', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'poll', linkedinId: linkedinId || undefined, profileUrl: profileUrl || undefined }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || `Poll failed (${res.status})`);

      const p = json?.profile ? `profile=${json.profile.status}` : 'profile=—';
      const s = json?.posts ? `posts=${json.posts.status}` : 'posts=—';
      setEnrichResult(`Poll: ${p}, ${s}${json?.allSucceeded ? ' ✅ saved' : ''}`);
    } catch (e: any) {
      setError(e?.message || 'Poll failed');
    } finally {
      setPolling(false);
    }
  };

  return (
    <div className="min-h-full p-6 text-white">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-white/60 text-sm">Diagnostics and maintenance actions.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-white/5 border-white/10 text-white">
          <CardContent className="p-6 space-y-2">
            <div className="text-sm text-white/60">Leads in database</div>
            <div className="text-2xl font-semibold">{loading ? '—' : leadCount ?? '—'}</div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10 text-white">
          <CardContent className="p-6 space-y-2">
            <div className="text-sm text-white/60">Latest webhook</div>
            <div className="text-sm">
              {loading ? (
                '—'
              ) : latest ? (
                <>
                  <div className="text-white">
                    <span className="font-medium">{latest.event_type}</span>
                    {latest.event_id ? <span className="text-white/50"> · {latest.event_id}</span> : null}
                  </div>
                  <div className="text-white/50">
                    {new Date(latest.created_at).toLocaleString()} · {latest.processed ? 'processed' : 'pending'}
                    {latest.error ? ` · error: ${latest.error}` : ''}
                  </div>
                </>
              ) : (
                'No webhooks received yet.'
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card className="bg-white/5 border-white/10 text-white">
          <CardContent className="p-6 space-y-4">
            <div>
              <div className="text-lg font-semibold">Retroactive sync</div>
              <div className="text-sm text-white/60">
                Pull accepted leads from Aimfox recent-leads and upsert them into Supabase.
              </div>
            </div>

            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <Button onClick={runSync} disabled={syncing}>
                {syncing ? 'Syncing…' : 'Run sync (Ads)'}
              </Button>
              {syncResult ? <div className="text-sm text-emerald-300">{syncResult}</div> : null}
              {error ? <div className="text-sm text-red-300">{error}</div> : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card className="bg-white/5 border-white/10 text-white">
          <CardContent className="p-6 space-y-4">
            <div>
              <div className="text-lg font-semibold">About me (for AI drafts)</div>
              <div className="text-sm text-white/60">
                This is used to personalize first messages. Stored per user (future-proofed).
              </div>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <div className="text-sm font-medium">Offer + ICP</div>
                <Textarea value={offerIcp} onChange={(e) => setOfferIcp(e.target.value)} className="bg-black/40 border-white/15 text-white placeholder:text-white/40" />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">Tone / voice guidelines</div>
                <Textarea value={tone} onChange={(e) => setTone(e.target.value)} className="bg-black/40 border-white/15 text-white placeholder:text-white/40" />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">Hard constraints</div>
                <Textarea value={constraints} onChange={(e) => setConstraints(e.target.value)} className="bg-black/40 border-white/15 text-white placeholder:text-white/40" />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">Calendly / CTA preferences</div>
                <Textarea value={cta} onChange={(e) => setCta(e.target.value)} className="bg-black/40 border-white/15 text-white placeholder:text-white/40" />
              </div>

              <div className="grid gap-2">
                <div className="text-sm font-medium">AI system prompt</div>
                <Textarea
                  value={aiSystemPrompt}
                  onChange={(e) => setAiSystemPrompt(e.target.value)}
                  placeholder="High-level behavior instructions for Claude."
                  className="min-h-[120px] bg-black/40 border-white/15 text-white placeholder:text-white/40"
                />
              </div>

              <div className="grid gap-2">
                <div className="text-sm font-medium">AI user prompt template</div>
                <div className="text-xs text-white/50">
                  Placeholders: <span className="font-mono">{'{'}{'{'}LEAD_NAME{'}'}{'}'}</span>,{' '}
                  <span className="font-mono">{'{'}{'{'}LEAD_OCCUPATION{'}'}{'}'}</span>,{' '}
                  <span className="font-mono">{'{'}{'{'}CONTEXT_JSON{'}'}{'}'}</span>
                </div>
                <Textarea
                  value={aiUserPromptTemplate}
                  onChange={(e) => setAiUserPromptTemplate(e.target.value)}
                  placeholder="Example: Write a first LinkedIn message to {{LEAD_NAME}}...\n\nContext:\n{{CONTEXT_JSON}}"
                  className="min-h-[200px] bg-black/40 border-white/15 text-white placeholder:text-white/40"
                />
              </div>

              <div className="grid gap-2">
                <div className="text-sm font-medium">My profile JSON (for shared connections)</div>
                <div className="text-xs text-white/50">
                  Put facts about you here (schools, locations, industries, interests). The AI will only reference shared
                  connections supported by this JSON + the prospect context.
                </div>
                <Textarea
                  value={myProfileJsonText}
                  onChange={(e) => setMyProfileJsonText(e.target.value)}
                  className="min-h-[220px] bg-black/40 border-white/15 text-white placeholder:text-white/40 font-mono text-xs"
                />
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={saveAboutMe} disabled={savingProfile}>
                  {savingProfile ? 'Saving…' : 'Save'}
                </Button>
                {profileSaved ? <div className="text-sm text-emerald-300">{profileSaved}</div> : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card className="bg-white/5 border-white/10 text-white">
          <CardContent className="p-6 space-y-4">
            <div>
              <div className="text-lg font-semibold">Apify enrichment (test)</div>
              <div className="text-sm text-white/60">
                Starts Apify runs for an existing lead by linkedin_id and stores run ids on the lead.
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <div className="text-sm font-medium">Lead linkedin_id (optional)</div>
                  <Input
                    value={enrichLinkedinId}
                    onChange={(e) => setEnrichLinkedinId(e.target.value)}
                    placeholder="e.g. 579183987"
                    className="bg-black/40 border-white/15 text-white placeholder:text-white/40 focus:ring-2 focus:ring-white/20"
                  />
                </div>
                <div className="grid gap-2">
                  <div className="text-sm font-medium">LinkedIn profile URL (recommended)</div>
                  <Input
                    value={enrichProfileUrl}
                    onChange={(e) => setEnrichProfileUrl(e.target.value)}
                    placeholder="https://www.linkedin.com/in/..."
                    className="bg-black/40 border-white/15 text-white placeholder:text-white/40 focus:ring-2 focus:ring-white/20"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={runApifyForLead} disabled={enriching}>
                  {enriching ? 'Starting…' : 'Run Apify'}
                </Button>
                <Button
                  variant="secondary"
                  className="bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:text-white"
                  onClick={pollApify}
                  disabled={polling}
                >
                  {polling ? 'Checking…' : 'Check status / Pull results'}
                </Button>
              </div>
            </div>

            {enrichResult ? <div className="text-sm text-emerald-300">{enrichResult}</div> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

