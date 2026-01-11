import { useEffect, useMemo, useState } from 'react';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { supabase } from '../../lib/supabaseClient';

type LeadRow = {
  id: string;
  linkedin_id: string;
  picture_url: string | null;
  full_name: string | null;
  occupation: string | null;
  campaign_name: string | null;
  lead_status: string;
  connection_accepted_at: string | null;
  last_interaction_at: string | null;
  profile_url: string | null;
  apify_last_scraped_at: string | null;
  apify_profile_json: any | null;
  apify_error: string | null;
  apify_profile_run_id: string | null;
  apify_posts_run_id: string | null;
};

function formatDate(value: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return '—';
  return d.toLocaleString();
}

function formatRelative(value: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return '—';
  const diffMs = d.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (abs < hour) return rtf.format(Math.round(diffMs / minute), 'minute');
  if (abs < day) return rtf.format(Math.round(diffMs / hour), 'hour');
  return rtf.format(Math.round(diffMs / day), 'day');
}

function initials(name: string | null) {
  const n = (name || '').trim();
  if (!n) return '?';
  const parts = n.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || '';
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : '';
  return (a + b).toUpperCase() || '?';
}

export default function LinkedInCampaignPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'accepted' | 'replied'>('all');
  const [syncing, setSyncing] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [pollingId, setPollingId] = useState<string | null>(null);

  const fetchLeads = async () => {
    let mounted = true;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('linkedin_leads')
      .select(
        'id,linkedin_id,picture_url,full_name,occupation,campaign_name,lead_status,connection_accepted_at,last_interaction_at,profile_url,apify_last_scraped_at,apify_profile_json,apify_error,apify_profile_run_id,apify_posts_run_id',
      )
      .order('connection_accepted_at', { ascending: false, nullsFirst: false })
      .limit(500);

    if (!mounted) return;
    if (err) {
      setError(err.message);
      setRows([]);
    } else {
      setRows((data as LeadRow[]) || []);
    }
    setLoading(false);

    return () => {
      mounted = false;
    };
  };

  useEffect(() => {
    void fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== 'all' && r.lead_status !== status) return false;
      if (!q) return true;
      const hay = `${r.full_name || ''} ${r.occupation || ''} ${r.campaign_name || ''} ${r.linkedin_id}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query, rows, status]);

  const metrics = useMemo(() => {
    const total = rows.length;
    const accepted = rows.filter((r) => r.lead_status === 'accepted').length;
    const replied = rows.filter((r) => r.lead_status === 'replied').length;
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const new24h = rows.filter((r) => {
      const ts = r.connection_accepted_at ? new Date(r.connection_accepted_at).getTime() : NaN;
      return Number.isFinite(ts) && ts >= dayAgo;
    }).length;
    return { total, accepted, replied, new24h };
  }, [rows]);

  const runSync = async () => {
    setSyncing(true);
    setSyncNote(null);
    setError(null);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error('Not signed in');

      const res = await fetch('/api/internal/sync/retroactive?campaignName=Ads', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || `Sync failed (${res.status})`);
      setSyncNote(`Synced. Upserted ${json?.upserted ?? 0} leads.`);
      await fetchLeads();
    } catch (e: any) {
      setError(e?.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const startEnrich = async (lead: LeadRow) => {
    setEnrichingId(lead.id);
    setError(null);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error('Not signed in');

      let profileUrl = lead.profile_url;
      if (!profileUrl) {
        const entered = window.prompt(
          'This lead is missing a LinkedIn profile URL.\n\nPaste it here (e.g. https://www.linkedin.com/in/username/):',
          '',
        );
        if (entered) profileUrl = entered.trim();
      }

      const res = await fetch('/api/internal/enrich/apify', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'start',
          linkedinId: lead.linkedin_id,
          profileUrl: profileUrl || undefined,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || `Enrich failed (${res.status})`);
      await fetchLeads();
    } catch (e: any) {
      setError(e?.message || 'Enrich failed');
    } finally {
      setEnrichingId(null);
    }
  };

  const pollEnrich = async (lead: LeadRow) => {
    setPollingId(lead.id);
    setError(null);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error('Not signed in');

      const res = await fetch('/api/internal/enrich/apify', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'poll',
          linkedinId: lead.linkedin_id,
          profileUrl: lead.profile_url || undefined,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || `Poll failed (${res.status})`);
      await fetchLeads();
    } catch (e: any) {
      setError(e?.message || 'Poll failed');
    } finally {
      setPollingId(null);
    }
  };

  return (
    <div className="min-h-full p-8 text-white">
      <div className="w-full space-y-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Campaign</h1>
            <p className="text-white/60 text-sm">
              Ads · Leads accepted and replies captured from Aimfox.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="bg-transparent text-white border-white/15 hover:bg-white/10 hover:text-white" onClick={runSync} disabled={syncing}>
              {syncing ? 'Syncing…' : 'Run sync'}
            </Button>
            <Button variant="secondary" className="bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:text-white" onClick={() => void fetchLeads()} disabled={loading}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>
        </div>

        {syncNote ? <div className="text-sm text-emerald-300">{syncNote}</div> : null}
        {error ? <div className="text-sm text-red-300">{error}</div> : null}

        {/* Overview section (adds hierarchy + breathing room) */}
        <div className="space-y-4">
          <div>
            <div className="text-sm font-semibold tracking-tight text-white/90">Overview</div>
            <div className="text-sm text-white/60">High-level performance for this campaign.</div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-white/5 border-white/10 text-white">
              <CardContent className="p-6 space-y-2 text-center">
                <div className="text-sm text-white/60">Total leads</div>
                <div className="text-3xl font-semibold tracking-tight">{metrics.total}</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10 text-white">
              <CardContent className="p-6 space-y-2 text-center">
                <div className="text-sm text-white/60">Accepted</div>
                <div className="text-3xl font-semibold tracking-tight">{metrics.accepted}</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10 text-white">
              <CardContent className="p-6 space-y-2 text-center">
                <div className="text-sm text-white/60">Replied</div>
                <div className="text-3xl font-semibold tracking-tight">{metrics.replied}</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10 text-white">
              <CardContent className="p-6 space-y-2 text-center">
                <div className="text-sm text-white/60">New (24h)</div>
                <div className="text-3xl font-semibold tracking-tight">{metrics.new24h}</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Leads section */}
        <Card className="bg-white/5 border-white/10 text-white overflow-hidden">
          <CardContent className="p-0">
            <div className="px-6 py-5 border-b border-white/10">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-base font-semibold tracking-tight">Leads</div>
                  <div className="text-sm text-white/60">
                    {loading ? 'Loading…' : `${filtered.length} lead${filtered.length === 1 ? '' : 's'}`}
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 p-1">
                    {(['all', 'accepted', 'replied'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatus(s)}
                        className={[
                          'h-9 px-3 rounded-lg text-sm transition-colors',
                          status === s ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white',
                        ].join(' ')}
                      >
                        {s === 'all' ? 'All' : s === 'accepted' ? 'Accepted' : 'Replied'}
                      </button>
                    ))}
                  </div>

                  <div className="w-full sm:w-96">
                    <Input
                      placeholder="Search name, campaign, occupation…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="bg-black/40 border-white/15 text-white placeholder:text-white/40 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto p-4">
              <table className="min-w-full text-sm border-separate border-spacing-y-2">
                <thead className="text-white/60">
                  <tr>
                    <th className="text-left font-medium px-4 pb-2">Lead</th>
                    <th className="text-left font-medium px-4 pb-2">Campaign</th>
                    <th className="text-left font-medium px-4 pb-2">Status</th>
                    <th className="text-left font-medium px-4 pb-2 whitespace-nowrap">Enriched?</th>
                    <th className="text-left font-medium px-4 pb-2 whitespace-nowrap">Accepted</th>
                    <th className="text-left font-medium px-4 pb-2 whitespace-nowrap">Last activity</th>
                  </tr>
                </thead>
                <tbody className="align-top">
                  {loading ? (
                    <tr>
                      <td className="px-4 py-8 text-white/60" colSpan={6}>
                        Loading leads…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-white/60" colSpan={6}>
                        No leads found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r) => (
                      (() => {
                        const apifyStatus = (r.apify_profile_json && typeof r.apify_profile_json === 'object'
                          ? (r.apify_profile_json as any).status
                          : null) as string | null;
                        const enriched = Boolean(r.apify_last_scraped_at) || apifyStatus === 'succeeded';
                        const running = apifyStatus === 'running' || apifyStatus === 'SUCCEEDED' || apifyStatus === 'RUNNING';
                        const hasError = Boolean(r.apify_error);
                        const hasRuns = Boolean(r.apify_profile_run_id || r.apify_posts_run_id);

                        return (
                      <tr key={r.id}>
                        <td className="px-4 py-4 bg-black/30 border border-white/10 first:rounded-l-2xl last:rounded-r-2xl">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-9 w-9 rounded-full bg-white/10 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                              {r.picture_url ? (
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                                <img src={r.picture_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-xs font-semibold text-white/70">{initials(r.full_name)}</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-white truncate">{r.full_name || 'Unknown'}</div>
                              <div className="text-white/50 truncate max-w-[520px]">{r.occupation || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 bg-black/30 border border-white/10 text-white/70">{r.campaign_name || '—'}</td>
                        <td className="px-4 py-4 bg-black/30 border border-white/10">
                          <Badge
                            className={[
                              'rounded-full px-2 py-1 text-xs font-semibold border',
                              r.lead_status === 'replied'
                                ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/20'
                                : r.lead_status === 'accepted'
                                ? 'bg-blue-500/15 text-blue-200 border-blue-500/20'
                                : 'bg-white/10 text-white/70 border-white/10',
                            ].join(' ')}
                          >
                            {r.lead_status}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 bg-black/30 border border-white/10 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Badge
                              className={[
                                'rounded-full px-2 py-1 text-xs font-semibold border',
                                enriched
                                  ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/20'
                                  : hasError
                                  ? 'bg-red-500/15 text-red-200 border-red-500/20'
                                  : running
                                  ? 'bg-amber-500/15 text-amber-200 border-amber-500/20'
                                  : 'bg-white/10 text-white/70 border-white/10',
                              ].join(' ')}
                              title={hasError ? r.apify_error || '' : ''}
                            >
                              {enriched ? 'Yes' : hasError ? 'Error' : running ? 'Running' : 'No'}
                            </Badge>

                            {!enriched ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-8 bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:text-white"
                                onClick={() => void startEnrich(r)}
                                disabled={enrichingId === r.id}
                              >
                                {enrichingId === r.id ? 'Enriching…' : 'Enrich'}
                              </Button>
                            ) : null}

                            {!enriched && (running || hasRuns) ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 bg-transparent text-white border-white/15 hover:bg-white/10 hover:text-white"
                                onClick={() => void pollEnrich(r)}
                                disabled={pollingId === r.id}
                              >
                                {pollingId === r.id ? 'Checking…' : 'Pull'}
                              </Button>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-4 bg-black/30 border border-white/10 text-white/70 whitespace-nowrap" title={formatDate(r.connection_accepted_at)}>
                          {formatRelative(r.connection_accepted_at)}
                        </td>
                        <td className="px-4 py-4 bg-black/30 border border-white/10 text-white/70 whitespace-nowrap first:rounded-l-2xl last:rounded-r-2xl" title={formatDate(r.last_interaction_at)}>
                          {formatRelative(r.last_interaction_at)}
                        </td>
                      </tr>
                        );
                      })()
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

