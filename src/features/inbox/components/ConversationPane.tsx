import { Plus, MoreVertical, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import type { Message, Thread } from '../types';
import { MessageBubble } from './MessageBubble';
import { DraftBubble } from './DraftBubble';
import { initials } from '../domain/format';
import { cn } from '../../../lib/utils';

export function ConversationPane({
  thread,
  messages,
  loading,
  error,
  draftText,
}: {
  thread: Thread;
  messages: Message[];
  loading: boolean;
  error: string | null;
  draftText: string;
}) {
  const hasDraft = Boolean(String(draftText || '').trim());
  return (
    <Card className="bg-white border-slate-200 text-slate-900 overflow-hidden h-full flex flex-col">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center shrink-0">
            {thread.lead.picture_url ? (
              <img src={thread.lead.picture_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs font-semibold text-slate-700">{initials(thread.lead.full_name)}</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1 min-w-0">
              <div className="font-semibold truncate">{thread.lead.full_name || 'Unknown lead'}</div>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </div>
            <div className="text-xs text-slate-500 truncate">{thread.lead.occupation || '—'}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium',
              'border border-slate-200 bg-white hover:bg-slate-50',
            )}
            aria-label="Add new"
          >
            <Plus className="w-4 h-4" />
            Add new
          </button>
          <button
            type="button"
            className="h-9 w-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center"
            aria-label="More"
          >
            <MoreVertical className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      <CardContent className="p-0 flex-1 min-h-0">
        {error ? <div className="px-5 py-3 text-sm text-red-600">{error}</div> : null}

        <div className="px-5 py-4 overflow-y-auto bg-slate-50 flex-1 min-h-0">
          {loading ? (
            <div className="text-slate-500 text-sm">Loading messages…</div>
          ) : (
            <div className="min-h-full flex flex-col justify-end gap-3">
              {messages.length === 0 && !hasDraft ? (
                <div className="text-slate-500 text-sm">No messages yet for this lead.</div>
              ) : (
                messages.map((m) => <MessageBubble key={m.id} msg={m} />)
              )}

              {/* Show the current draft as an iMessage-like outgoing bubble */}
              <DraftBubble text={draftText} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

