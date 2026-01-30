import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import type { Draft } from '../types';
import { Paperclip, Tag, Smile, Mic, Settings, Send } from 'lucide-react';

function labelForDraft(draft: Draft | null): string {
  if (!draft) return 'Draft (not generated yet)';
  const t = String(draft.draft_type || '');
  if (t === 'first_message') return 'Draft · First message';
  if (t === 'reply') return 'Draft · Reply';
  if (t === 'followup') return 'Draft · Follow-up';
  return `Draft · ${t || 'message'}`;
}

export function DraftComposer({
  draft,
  desiredDraftType,
  onRequestGenerate,
  onRequestReroll,
  generating,
  onTextChange,
  onSend,
  canSend,
  debugText,
  saveStatus,
}: {
  draft: Draft | null;
  desiredDraftType: string;
  onRequestGenerate: () => void;
  onRequestReroll: () => void;
  generating: boolean;
  onTextChange: (text: string) => void;
  onSend: () => void;
  canSend: boolean;
  debugText: string;
  saveStatus: string;
}) {
  const [text, setText] = useState('');

  useEffect(() => {
    setText(draft?.draft_message || '');
  }, [draft?.draft_message, draft?.id]);
  useEffect(() => {
    onTextChange(text);
  }, [onTextChange, text]);

  const hasDraft = Boolean(draft);
  const helper = useMemo(() => {
    if (hasDraft) return 'Edit the draft, then send when ready.';
    if (desiredDraftType === 'reply') return 'No reply draft yet. Click AI draft to generate one from the latest inbound message.';
    if (desiredDraftType === 'first_message') return 'No draft exists yet. Click AI draft to create a first message draft.';
    return 'Draft generation for follow-ups will be added in a later phase.';
  }, [desiredDraftType, hasDraft]);

  return (
    <div className="bg-white border-t border-slate-200">
      <div className="px-5 py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="text-xs text-slate-500 truncate">{labelForDraft(draft)}</div>
            {saveStatus ? <div className="text-[11px] text-slate-400">{saveStatus}</div> : null}
          </div>
          <div className="flex items-center gap-2">
            {!hasDraft ? (
              <button
                type="button"
                className="text-xs font-medium text-slate-600 hover:text-slate-900"
                onClick={onRequestGenerate}
                disabled={generating}
              >
                {generating ? 'Generating…' : 'AI draft'}
              </button>
            ) : (
              <button
                type="button"
                className="text-xs font-medium text-slate-600 hover:text-slate-900"
                onClick={onRequestReroll}
                disabled={generating}
              >
                {generating ? 'Rerolling…' : 'Reroll'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 pb-4">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-[72px] bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-indigo-500"
          placeholder={hasDraft ? 'Write your message here' : `Write your message here`}
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-slate-500">
            <button type="button" className="hover:text-slate-700" aria-label="Attach">
              <Paperclip className="w-4 h-4" />
            </button>
            <button type="button" className="hover:text-slate-700" aria-label="Tag">
              <Tag className="w-4 h-4" />
            </button>
            <button type="button" className="hover:text-slate-700" aria-label="Emoji">
              <Smile className="w-4 h-4" />
            </button>
            <button type="button" className="hover:text-slate-700" aria-label="Mic">
              <Mic className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" className="hover:text-slate-700 text-slate-500" aria-label="Settings">
              <Settings className="w-4 h-4" />
            </button>
            <Button
              size="sm"
              className="h-9 rounded-full bg-[#0A84FF] text-white hover:bg-[#007AFF]"
              disabled={!canSend || generating}
              onClick={onSend}
            >
              <Send className="w-4 h-4" />
              Send
            </Button>
          </div>
        </div>
        <div className="mt-2 text-[11px] text-slate-400">{helper}</div>
        <details className="mt-2">
          <summary className="cursor-pointer select-none text-[11px] text-slate-500">Debug</summary>
          <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2">
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words text-[11px] text-slate-700">
              {debugText || 'No debug output yet.'}
            </pre>
          </div>
        </details>
      </div>
    </div>
  );
}

