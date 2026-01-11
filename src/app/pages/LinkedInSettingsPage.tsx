import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { supabase } from '../../lib/supabaseClient';

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
    </div>
  );
}

