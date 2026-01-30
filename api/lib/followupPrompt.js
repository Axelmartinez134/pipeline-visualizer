function buildFollowupPrompt({ lead, profile, lastMessageSummary, feedback, previousDraftText }) {
  const leadName = lead?.full_name || 'the lead';
  const occupation = lead?.occupation || '';

  const context = {
    meta: {
      mode: 'followup',
      goal: 'Write a gentle follow-up after inactivity.',
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
      last_message_summary: lastMessageSummary || null,
    },
    rerun: {
      feedback: feedback || null,
      previous_draft: previousDraftText || null,
    },
  };

  const defaultSystem = [
    "You write short, warm LinkedIn follow-ups using a 'Sell by Chat' approach.",
    'This is a FOLLOW-UP after ~5 days of inactivity.',
    'Be friendly and low-pressure. Do not guilt-trip.',
    'Keep it concise: 1–2 short paragraphs.',
    'Max 1 emoji.',
    'End with a simple question.',
    'Return ONLY the message text. No quotes, no bullet points, no analysis.',
  ].join('\n');

  const defaultUserTemplate = [
    'Write a follow-up message to {{LEAD_NAME}}.',
    '{{#if LEAD_OCCUPATION}}They are: {{LEAD_OCCUPATION}}{{/if}}',
    '',
    'Context about the last interaction:',
    '{{LAST_MESSAGE_SUMMARY}}',
    '',
    'Use the following context (JSON) if helpful. Do not invent facts.',
    '{{CONTEXT_JSON}}',
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
    .replaceAll('{{LAST_MESSAGE_SUMMARY}}', String(lastMessageSummary || ''))
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

module.exports = { buildFollowupPrompt };

