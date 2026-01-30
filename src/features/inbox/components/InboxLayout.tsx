import { useEffect, useMemo, useState } from 'react';
import { Input } from '../../../components/ui/input';
import { useInboxThreads } from '../hooks/useInboxThreads';
import { ThreadList } from './ThreadList';
import { ConversationPane } from './ConversationPane';
import { DraftComposer } from './DraftComposer';
import { useLeadMessages } from '../hooks/useLeadMessages';
import { bootstrapTopDrafts, ensureDraft, rerollDraft, sendDraft, saveDraft } from '../api/inboxClient';
import { Search, SlidersHorizontal } from 'lucide-react';
import { pickLatestIso } from '../domain/format';

export function InboxLayout() {
  const { loading, error, threads, refresh } = useInboxThreads();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftBusy, setDraftBusy] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [sendNote, setSendNote] = useState<string | null>(null);
  const [bootstrapNote, setBootstrapNote] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'favorite' | 'unread'>('all');
  const [draftText, setDraftText] = useState('');
  const [debugText, setDebugText] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  const selected = useMemo(() => threads.find((t) => t.id === selectedId) || null, [selectedId, threads]);
  const leadId = selected?.lead.id || null;
  const { loading: messagesLoading, error: messagesError, messages, refresh: refreshMessages } =
    useLeadMessages(leadId);
  const sendDryRun = (import.meta as any).env?.VITE_INBOX_SEND_DRY_RUN === '1';

  useEffect(() => {
    // Keep composer text in sync when switching threads / drafts.
    setDraftText(selected?.pendingDraft?.draft_message || '');
    setDraftError(null);
    setSendNote(null);
    setDebugText('');
    setSaveStatus('');
  }, [selected?.pendingDraft?.draft_message, selected?.pendingDraft?.id, selectedId]);

  useEffect(() => {
    // Autosave draft text after user pauses typing.
    const draftId = selected?.pendingDraft?.id || null;
    if (!draftId) return;
    if (draftBusy) return;
    const current = String(selected?.pendingDraft?.draft_message || '');
    const next = String(draftText || '');
    if (!next.trim()) return;
    if (next === current) {
      setSaveStatus('Saved');
      return;
    }

    setSaveStatus('Saving…');
    const t = window.setTimeout(() => {
      void saveDraft({ draftId, message: next })
        .then(() => setSaveStatus('Saved'))
        .catch((e: any) => setSaveStatus(`Save failed: ${e?.message || 'error'}`));
    }, 900);

    return () => window.clearTimeout(t);
  }, [draftBusy, draftText, selected?.pendingDraft?.draft_message, selected?.pendingDraft?.id]);

  const desiredDraftType = useMemo(() => {
    if (!selected) return 'first_message';
    const unread = Number(selected.conversation?.unread_count || 0) > 0;
    if (unread) return 'reply';

    // Follow-up: if we have any messages and last activity is older than 5 days, prompt a follow-up.
    const last = pickLatestIso(selected.conversation?.last_activity_at, selected.lead.last_interaction_at);
    const ts = last ? new Date(last).getTime() : NaN;
    const fiveDays = 5 * 24 * 60 * 60 * 1000;
    const isStale = Number.isFinite(ts) && Date.now() - ts >= fiveDays;
    const hasAnyMessages = Boolean(selected.conversation) || messages.length > 0;
    if (hasAnyMessages && isStale) return 'followup';

    return 'first_message';
  }, [messages.length, selected]);

  const visibleThreads = useMemo(() => {
    const q = query.trim().toLowerCase();
    return threads.filter((t) => {
      if (filter === 'unread' && Number(t.conversation?.unread_count || 0) <= 0) return false;
      // favorite not implemented yet; keep behavior as "all"
      if (!q) return true;
      const hay = `${t.lead.full_name || ''} ${t.lead.occupation || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [filter, query, threads]);

  useEffect(() => {
    // Auto-generate on selection when no pending draft exists.
    if (!selected?.lead?.id) return;
    if (selected.pendingDraft) return;
    if (draftBusy) return;

    let cancelled = false;
    setDraftBusy(true);
    setDraftError(null);
    void ensureDraft({ leadId: selected.lead.id, draftType: desiredDraftType })
      .then(() => refresh())
      .catch((e: any) => {
        if (!cancelled) setDraftError(e?.message || 'Failed to generate draft');
      })
      .finally(() => {
        if (!cancelled) setDraftBusy(false);
      });

    return () => {
      cancelled = true;
    };
  }, [desiredDraftType, draftBusy, refresh, selected?.lead?.id, selected?.pendingDraft]);

  useEffect(() => {
    // Phase 4: background-generate drafts for top 25 accepted leads.
    if (loading) return;
    if (threads.length === 0) return;
    const key = 'outreachai.inbox.bootstrap.v1';
    try {
      if (window.localStorage.getItem(key) === 'true') return;
      window.localStorage.setItem(key, 'true');
    } catch {
      // ignore
    }

    let cancelled = false;
    setBootstrapNote('Preparing drafts…');
    void bootstrapTopDrafts({ limit: 25 })
      .then((r) => {
        if (cancelled) return;
        setBootstrapNote(r.createdCount > 0 ? `Prepared ${r.createdCount} drafts.` : null);
        return refresh();
      })
      .catch((e: any) => {
        if (!cancelled) setBootstrapNote(`Draft bootstrap failed: ${e?.message || e}`);
      });

    return () => {
      cancelled = true;
    };
  }, [loading, refresh, threads.length]);

  return (
    <div className="h-full w-full bg-slate-100 text-slate-900">
      <div className="h-full w-full">

        {error ? (
          <div className="mb-3 text-sm text-red-600">
            {error}{' '}
            <button type="button" className="underline" onClick={() => void refresh()}>
              Retry
            </button>
          </div>
        ) : null}
        {draftError ? <div className="mb-3 text-sm text-red-600">{draftError}</div> : null}
        {sendNote ? <div className="mb-3 text-sm text-emerald-700">{sendNote}</div> : null}

        <div className="h-full w-full border border-slate-200 bg-white overflow-hidden">
          <div className="grid grid-cols-[340px_1fr] h-full min-h-[720px]">
            <div className="border-r border-slate-200 bg-white">
              <div className="px-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-semibold">Inbox</div>
                  {bootstrapNote ? <div className="text-[11px] text-slate-400">{bootstrapNote}</div> : null}
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search conversations"
                      className="pl-9 rounded-full bg-slate-50 border-slate-200 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    type="button"
                    className="h-10 w-10 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center"
                    aria-label="Filters"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  {(['all', 'favorite', 'unread'] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setFilter(k)}
                      className={[
                        'h-8 px-3 rounded-full text-xs font-semibold transition-colors',
                        filter === k ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                      ].join(' ')}
                    >
                      {k === 'all' ? 'All' : k === 'favorite' ? 'Favorite' : 'Unread'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-200">
                {loading ? (
                  <div className="px-4 py-6 text-slate-500">Loading conversations…</div>
                ) : (
                  <ThreadList threads={visibleThreads} selectedId={selectedId} onSelect={setSelectedId} />
                )}
              </div>
            </div>

            <div className="bg-white flex flex-col">
              {!selected ? (
                <div className="p-8 text-slate-500">Select a conversation</div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="flex-1 min-h-0">
                    <ConversationPane
                      thread={selected}
                      messages={messages}
                      loading={messagesLoading}
                      error={messagesError}
                      draftText={draftText}
                    />
                  </div>
                  <DraftComposer
                    draft={selected.pendingDraft}
                    desiredDraftType={desiredDraftType}
                    generating={draftBusy}
                    onTextChange={setDraftText}
                    debugText={debugText}
                    saveStatus={saveStatus}
                    canSend={
                      Boolean(selected.pendingDraft) &&
                      String((draftText || selected.pendingDraft?.draft_message || '') as any).trim().length > 0
                    }
                    onSend={() => {
                      if (!selected?.pendingDraft?.id) return;
                      setDraftBusy(true);
                      setDraftError(null);
                      setSendNote(null);
                      const url = `/api/internal/inbox/send-draft`;
                      const body = { draftId: selected.pendingDraft.id, message: draftText, dryRun: sendDryRun };
                      setDebugText(
                        JSON.stringify(
                          { ts: new Date().toISOString(), action: 'sendDraft', url, body },
                          null,
                          2,
                        ),
                      );
                      void sendDraft(body)
                        .then((r) => {
                          setDebugText((prev) =>
                            `${prev}\n\nRESPONSE:\n${JSON.stringify(r, null, 2)}`,
                          );
                          if (r?.dryRun) {
                          setSendNote('Dry run OK — no message was sent.');
                            return;
                          }
                          setSendNote('Sent.');
                          setDraftText('');
                          return Promise.all([refresh(), refreshMessages()]).then(() => undefined);
                        })
                        .catch((e: any) => {
                          setDebugText((prev) => `${prev}\n\nERROR:\n${JSON.stringify(
                            {
                              name: e?.name,
                              message: e?.message,
                              status: e?.status,
                              url: e?.url,
                              body: e?.body,
                            },
                            null,
                            2,
                          )}`);
                          if (e?.status === 404) {
                            setDraftError(
                              'Request failed (404). Restart `npm run dev` so the local `/api/*` middleware picks up the new route.',
                            );
                            return;
                          }
                          setDraftError(e?.message || 'Failed to send');
                        })
                        .finally(() => setDraftBusy(false));
                    }}
                    onRequestGenerate={() => {
                      if (!selected?.lead?.id) return;
                      setDraftBusy(true);
                      setDraftError(null);
                      void ensureDraft({ leadId: selected.lead.id, draftType: desiredDraftType })
                        .then(() => refresh())
                        .catch((e: any) => setDraftError(e?.message || 'Failed to generate draft'))
                        .finally(() => setDraftBusy(false));
                    }}
                    onRequestReroll={() => {
                      if (!selected?.lead?.id) return;
                      setDraftBusy(true);
                      setDraftError(null);
                      void rerollDraft({ leadId: selected.lead.id, draftType: desiredDraftType })
                        .then(() => refresh())
                        .catch((e: any) => setDraftError(e?.message || 'Failed to reroll draft'))
                        .finally(() => setDraftBusy(false));
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

