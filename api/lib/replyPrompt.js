function buildReplyPrompt({ lead, profile, lastInboundMessage, feedback, previousDraftText }) {
  const leadName = lead?.full_name || 'the lead';
  const occupation = lead?.occupation || '';

  const context = {
    meta: {
      mode: 'reply',
      goal: 'Write a helpful reply to the most recent inbound message.',
    },
    prospect: {
      full_name: lead?.full_name || null,
      occupation,
      campaign_name: lead?.campaign_name || null,
    },
    me: {
      profile_text: profile?.my_profile_text || null,
      profile_json: profile?.my_profile_json || null,
    },
    constraints: {
      offer_icp: profile?.offer_icp || null,
      tone_guidelines: profile?.tone_guidelines || null,
      hard_constraints: profile?.hard_constraints || null,
      calendly_cta_prefs: profile?.calendly_cta_prefs || null,
    },
    conversation: {
      last_inbound_message: lastInboundMessage || null,
    },
    rerun: {
      feedback: feedback || null,
      previous_draft: previousDraftText || null,
    },
  };

  const defaultSystem = [
    "You write short, warm LinkedIn replies using a 'Sell by Chat' approach.",
    'This is a REPLY to the prospect’s most recent message.',
    'Be natural, helpful, and specific to what they said.',
    'Keep it concise: aim for 1–3 short paragraphs.',
    'Max 1 emoji.',
    'Return ONLY the message text. No quotes, no bullet points, no analysis.',
  ].join('\n');

  const defaultUserTemplate = [
    'Write a reply to {{LEAD_NAME}}.',
    '{{#if LEAD_OCCUPATION}}They are: {{LEAD_OCCUPATION}}{{/if}}',
    '',
    'Most recent inbound message:',
    '{{LAST_INBOUND_MESSAGE}}',
    '',
    'Use the following context (JSON) if helpful. Do not invent facts.',
    '{{CONTEXT_JSON}}',
    '',
    'Constraints:',
    '- 1–3 short paragraphs',
    '- Max 1 emoji',
    '- End with a simple question if it fits naturally',
  ].join('\n');

  const resolved = {
    systemSource: 'default',
    userSource: 'default',
    system: String(defaultSystem).trim(),
    userTemplate: String(defaultUserTemplate).trim(),
  };

  const contextJson = JSON.stringify(context, null, 2);
  let user = resolved.userTemplate
    .replaceAll('{{LEAD_NAME}}', String(leadName))
    .replaceAll('{{LEAD_OCCUPATION}}', String(occupation))
    .replaceAll('{{CONTEXT_JSON}}', contextJson)
    .replaceAll('{{LAST_INBOUND_MESSAGE}}', String(lastInboundMessage || ''))
    .replace(/\{\{#if\s+LEAD_OCCUPATION\}\}[\s\S]*?\{\{\/if\}\}/g, occupation ? `They are: ${occupation}` : '')
    .trim();

  if (previousDraftText) user += `\n\nPrevious draft:\n${previousDraftText}\n`;
  if (feedback) user += `\nUser feedback:\n${feedback}\n`;

  return {
    system: resolved.system,
    user,
    userTemplate: resolved.userTemplate,
    context,
    promptSource: { system: resolved.systemSource, user: resolved.userSource },
  };
}

module.exports = { buildReplyPrompt };

