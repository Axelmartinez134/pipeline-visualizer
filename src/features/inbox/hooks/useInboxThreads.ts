import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import type { Conversation, Draft, Lead, Thread } from '../types';
import { buildThreads } from '../domain/buildThreads';
import { sortThreads } from '../domain/sortThreads';

type InboxThreadsState = {
  loading: boolean;
  error: string | null;
  threads: Thread[];
};

export function useInboxThreads(): InboxThreadsState & { refresh: () => Promise<void> } {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: leadData, error: leadErr } = await supabase
        .from('linkedin_leads')
        .select(
          'id,full_name,occupation,picture_url,connection_accepted_at,last_interaction_at,lead_status',
        )
        .eq('lead_status', 'accepted')
        .order('connection_accepted_at', { ascending: false, nullsFirst: false })
        .limit(500);
      if (leadErr) throw new Error(leadErr.message);
      setLeads((leadData as Lead[]) || []);

      const { data: convoData, error: convoErr } = await supabase
        .from('linkedin_conversations')
        .select('id,lead_id,conversation_urn,last_activity_at,unread_count')
        .order('last_activity_at', { ascending: false, nullsFirst: false })
        .limit(2000);
      if (convoErr) throw new Error(convoErr.message);
      setConversations((convoData as Conversation[]) || []);

      const { data: draftData, error: draftErr } = await supabase
        .from('linkedin_ai_drafts')
        .select('id,lead_id,status,draft_type,draft_message,created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(2000);
      if (draftErr) throw new Error(draftErr.message);
      setDrafts((draftData as Draft[]) || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load inbox data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const threads = useMemo(() => {
    const base = buildThreads({ leads, conversations, pendingDrafts: drafts });
    return sortThreads(base);
  }, [conversations, drafts, leads]);

  return { loading, error, threads, refresh };
}

