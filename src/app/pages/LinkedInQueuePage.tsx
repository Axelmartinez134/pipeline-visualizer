import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { supabase } from '../../lib/supabaseClient';

type DraftRow = {
  id: string;
  status: string;
  draft_type: string;
  draft_message: string;
  created_at: string;
  lead: { id: string; full_name: string | null; occupation: string | null } | null;
};

export default function LinkedInQueuePage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchDrafts = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('linkedin_ai_drafts')
      .select('id,status,draft_type,draft_message,created_at,lead:linkedin_leads(id,full_name,occupation)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(200);
    if (err) setError(err.message);
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    void fetchDrafts();
  }, []);

  const active = useMemo(() => rows.find((r) => r.id === activeId) || null, [activeId, rows]);

  useEffect(() => {
    if (active) setEditText(active.draft_message);
  }, [active]);

  const updateStatus = async (id: string, next: 'approved' | 'rejected') => {
    setSaving(true);
    setError(null);
    try {
      // Fetch current edit_count so we can increment instead of overwriting.
      const { data: current, error: curErr } = await supabase
        .from('linkedin_ai_drafts')
        .select('edit_count,draft_message')
        .eq('id', id)
        .single();
      if (curErr) throw new Error(curErr.message);

      const changed = String(current?.draft_message || '') !== editText;
      const nextEditCount = changed ? (Number(current?.edit_count || 0) + 1) : Number(current?.edit_count || 0);

      const { error: err } = await supabase
        .from('linkedin_ai_drafts')
        .update({ status: next, draft_message: editText, edit_count: nextEditCount })
        .eq('id', id);
      if (err) throw new Error(err.message);
      await fetchDrafts();
      setActiveId(null);
    } catch (e: any) {
      setError(e?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-full p-6 text-white">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Approval Queue</h1>
        <p className="text-white/60 text-sm">Review and approve AI drafts before sending.</p>
      </div>

      {error ? <div className="mb-4 text-sm text-red-300">{error}</div> : null}

      <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <Card className="bg-white/5 border-white/10 text-white overflow-hidden">
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b border-white/10 text-sm text-white/70">
              {loading ? 'Loading…' : `${rows.length} pending`}
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {loading ? (
                <div className="px-4 py-6 text-white/60">Loading drafts…</div>
              ) : rows.length === 0 ? (
                <div className="px-4 py-6 text-white/60">No pending drafts.</div>
              ) : (
                rows.map((r) => (
                  <button
                    key={r.id}
                    className={[
                      'w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5',
                      activeId === r.id ? 'bg-white/5' : '',
                    ].join(' ')}
                    onClick={() => setActiveId(r.id)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium truncate">
                        {r.lead?.full_name || 'Unknown lead'}
                      </div>
                      <Badge className="bg-white/10 text-white/80 border border-white/10 rounded-full">
                        {r.draft_type}
                      </Badge>
                    </div>
                    <div className="text-sm text-white/50 truncate">{r.lead?.occupation || '—'}</div>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10 text-white">
          <CardContent className="p-6 space-y-4">
            {!active ? (
              <div className="text-white/60">Select a draft to review.</div>
            ) : (
              <>
                <div>
                  <div className="text-lg font-semibold">{active.lead?.full_name || 'Unknown lead'}</div>
                  <div className="text-sm text-white/60">{active.lead?.occupation || '—'}</div>
                </div>

                <div className="grid gap-2">
                  <div className="text-sm font-medium">Draft</div>
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="min-h-[220px] bg-black/40 border-white/15 text-white placeholder:text-white/40"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button onClick={() => updateStatus(active.id, 'approved')} disabled={saving}>
                    Approve
                  </Button>
                  <Button
                    variant="secondary"
                    className="bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:text-white"
                    onClick={() => updateStatus(active.id, 'rejected')}
                    disabled={saving}
                  >
                    Reject
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

