import { cn } from '../../../lib/utils';
import type { Thread } from '../types';
import { formatShortDate, initials, pickLatestIso } from '../domain/format';

function Attention({ thread }: { thread: Thread }) {
  const unread = Number(thread.conversation?.unread_count || 0);
  if (unread > 0) {
    return (
      <span className="min-w-5 h-5 px-1.5 rounded-full bg-indigo-600 text-white text-[11px] font-semibold flex items-center justify-center">
        {unread > 99 ? '99+' : unread}
      </span>
    );
  }
  if (!thread.attention.visible) return null;
  const color = thread.attention.color === 'orange' ? 'bg-orange-500' : 'bg-blue-600';
  return <span className={cn('inline-block w-2.5 h-2.5 rounded-full', color)} />;
}

function firstLine(text: string): string {
  const t = String(text || '').trim();
  if (!t) return '';
  return t.split('\n')[0].slice(0, 80);
}

export function ThreadListItem({
  thread,
  active,
  onClick,
}: {
  thread: Thread;
  active: boolean;
  onClick: () => void;
}) {
  const name = thread.lead.full_name || 'Unknown lead';
  const lastAt = pickLatestIso(thread.lastActivityAt, thread.lead.connection_accepted_at, thread.lead.last_interaction_at);
  const when = formatShortDate(lastAt);

  const preview = thread.pendingDraft
    ? `You: ${firstLine(thread.pendingDraft.draft_message) || 'Draft ready'}`
    : Number(thread.conversation?.unread_count || 0) > 0
      ? 'New message…'
      : (thread.lead.occupation || '—');

  return (
    <button
      type="button"
      className={cn(
        'w-full text-left px-4 py-3.5 border-b border-slate-100 hover:bg-slate-50',
        active && 'bg-indigo-50',
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center shrink-0">
            {thread.lead.picture_url ? (
              <img src={thread.lead.picture_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs font-semibold text-slate-700">{initials(thread.lead.full_name)}</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-slate-900 truncate">{name}</div>
            <div className="text-sm text-slate-500 truncate">{preview}</div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="text-xs text-slate-400 whitespace-nowrap">{when}</div>
          <Attention thread={thread} />
        </div>
      </div>
    </button>
  );
}

