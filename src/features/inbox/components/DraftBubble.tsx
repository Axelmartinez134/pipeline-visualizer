import { cn } from '../../../lib/utils';

export function DraftBubble({ text }: { text: string }) {
  const body = String(text || '').trim();
  if (!body) return null;

  return (
    <div className="flex justify-end">
      <div
        className={cn(
          'max-w-[72%] rounded-[22px] px-4 py-3 text-sm leading-relaxed shadow-sm',
          'bg-[#0A84FF]/90 text-white border border-[#0A84FF]/30',
        )}
      >
        <div className="text-[11px] text-white/70 mb-1 text-center">Draft</div>
        <div className="whitespace-pre-wrap break-words text-center">{body}</div>
      </div>
    </div>
  );
}

