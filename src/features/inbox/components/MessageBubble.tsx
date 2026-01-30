import { cn } from '../../../lib/utils';
import type { Message } from '../types';
import { formatTime, pickLatestIso } from '../domain/format';

export function MessageBubble({ msg }: { msg: Message }) {
  const mt = String(msg.message_type || '').toLowerCase();
  const isSent = mt === 'sent';
  const ts = pickLatestIso(msg.sent_at, msg.created_at);
  const time = formatTime(ts);
  return (
    <div className={cn('flex', isSent ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          // iMessage-like bubbles: outgoing blue, incoming light gray
          'max-w-[72%] rounded-[22px] px-4 py-3 text-sm leading-relaxed shadow-sm',
          isSent
            ? 'bg-[#0A84FF] text-white'
            : 'bg-[#E5E5EA] text-black',
        )}
      >
        <div className={cn('whitespace-pre-wrap break-words', isSent ? 'text-center' : 'text-left')}>
          {msg.body}
        </div>
        {time ? (
          <div className={cn('mt-1 text-[11px]', isSent ? 'text-white/70 text-center' : 'text-black/50')}>
            {time}
          </div>
        ) : null}
      </div>
    </div>
  );
}

