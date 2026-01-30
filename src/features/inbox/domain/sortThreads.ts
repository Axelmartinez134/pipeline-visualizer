import type { Thread } from '../types';

function tsOrNegInfinity(iso: string | null): number {
  if (!iso) return Number.NEGATIVE_INFINITY;
  const ts = new Date(iso).getTime();
  return Number.isFinite(ts) ? ts : Number.NEGATIVE_INFINITY;
}

function draftTypeRank(t: string | null | undefined): number {
  const v = String(t || '');
  if (v === 'first_message') return 0;
  if (v === 'followup' || v === 'reply') return 1;
  return 2;
}

export function sortThreads(threads: Thread[]): Thread[] {
  return [...threads].sort((a, b) => {
    const aHasDraft = Boolean(a.pendingDraft);
    const bHasDraft = Boolean(b.pendingDraft);
    if (aHasDraft !== bHasDraft) return aHasDraft ? -1 : 1;

    if (aHasDraft && bHasDraft) {
      const dt = draftTypeRank(a.pendingDraft?.draft_type) - draftTypeRank(b.pendingDraft?.draft_type);
      if (dt !== 0) return dt;
    }

    // Fall back to activity
    return tsOrNegInfinity(b.lastActivityAt) - tsOrNegInfinity(a.lastActivityAt);
  });
}

