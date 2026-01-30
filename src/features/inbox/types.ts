export type InboxThreadId = string;

export type InboxDraftType = 'first_message' | 'reply' | 'followup' | string;

export type Lead = {
  id: string;
  full_name: string | null;
  occupation: string | null;
  picture_url: string | null;
  connection_accepted_at: string | null;
  last_interaction_at: string | null;
  lead_status: string;
};

export type Conversation = {
  id: string;
  lead_id: string | null;
  conversation_urn: string;
  last_activity_at: string | null;
  unread_count: number;
};

export type Draft = {
  id: string;
  lead_id: string | null;
  status: string;
  draft_type: InboxDraftType;
  draft_message: string;
  created_at: string;
};

export type Message = {
  id: string;
  lead_id: string | null;
  conversation_id: string | null;
  body: string;
  message_type: string;
  sender_name: string | null;
  recipient_name: string | null;
  sent_at: string | null;
  created_at: string;
};

export type AttentionDotColor = 'orange' | 'blue';

export type AttentionDot =
  | { visible: false }
  | { visible: true; color: AttentionDotColor; reason: 'pending_draft' | 'unread_reply' };

export type Thread = {
  id: InboxThreadId;
  lead: Lead;
  conversation: Conversation | null;
  pendingDraft: Draft | null;
  lastActivityAt: string | null;
  attention: AttentionDot;
};


