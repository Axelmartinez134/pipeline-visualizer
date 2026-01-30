import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import type { Message } from '../types';

type LeadMessagesState = {
  loading: boolean;
  error: string | null;
  messages: Message[];
};

export function useLeadMessages(leadId: string | null): LeadMessagesState & { refresh: () => Promise<void> } {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const refresh = useCallback(async () => {
    if (!leadId) {
      setMessages([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('linkedin_messages')
        .select('id,lead_id,conversation_id,body,message_type,sender_name,recipient_name,sent_at,created_at')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: true, nullsFirst: true })
        .limit(500);
      if (err) throw new Error(err.message);
      setMessages((data as Message[]) || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { loading, error, messages, refresh };
}

