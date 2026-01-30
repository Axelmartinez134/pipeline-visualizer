import type { Conversation, Draft, Lead, Thread } from '../types';
import { pickLatestIso } from './format';

function draftColor(draftType: string): 'orange' | 'blue' {
  return draftType === 'first_message' ? 'orange' : 'blue';
}

export function buildThreads({
  leads,
  conversations,
  pendingDrafts,
}: {
  leads: Lead[];
  conversations: Conversation[];
  pendingDrafts: Draft[];
}): Thread[] {
  const convoByLeadId = new Map<string, Conversation>();
  for (const c of conversations) {
    if (!c.lead_id) continue;
    const existing = convoByLeadId.get(c.lead_id);
    if (!existing) {
      convoByLeadId.set(c.lead_id, c);
      continue;
    }
    const existingTs = existing.last_activity_at ? new Date(existing.last_activity_at).getTime() : -Infinity;
    const nextTs = c.last_activity_at ? new Date(c.last_activity_at).getTime() : -Infinity;
    if (nextTs > existingTs) convoByLeadId.set(c.lead_id, c);
  }

  const draftByLeadId = new Map<string, Draft>();
  for (const d of pendingDrafts) {
    if (!d.lead_id) continue;
    const existing = draftByLeadId.get(d.lead_id);
    if (!existing) {
      draftByLeadId.set(d.lead_id, d);
      continue;
    }
    const existingTs = new Date(existing.created_at).getTime();
    const nextTs = new Date(d.created_at).getTime();
    if (nextTs > existingTs) draftByLeadId.set(d.lead_id, d);
  }

  return leads.map((lead) => {
    const conversation = convoByLeadId.get(lead.id) || null;
    const pendingDraft = draftByLeadId.get(lead.id) || null;
    const lastActivityAt = pickLatestIso(
      conversation?.last_activity_at,
      lead.last_interaction_at,
      lead.connection_accepted_at,
    );

    const attention: Thread['attention'] = pendingDraft
      ? { visible: true, color: draftColor(String(pendingDraft.draft_type || '')), reason: 'pending_draft' }
      : conversation && Number(conversation.unread_count || 0) > 0
        ? { visible: true, color: 'blue', reason: 'unread_reply' }
        : { visible: false };

    return {
      id: lead.id,
      lead,
      conversation,
      pendingDraft,
      lastActivityAt,
      attention,
    };
  });
}

