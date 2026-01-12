function buildOpenerPrompt({ lead, apify, profile, feedback, previousDraftText }) {
  const leadName = lead?.full_name || 'the lead';
  const occupation = lead?.occupation || '';

  const apifyProfile = apify?.profile?.items?.[0] || null;
  const posts = Array.isArray(apify?.posts?.items) ? apify.posts.items.slice(0, 2) : [];

  const profileSummary = apifyProfile
    ? {
        headline: apifyProfile.headline || null,
        summary: apifyProfile.summary || null,
        jobTitle: apifyProfile.jobTitle || null,
        companyName: apifyProfile.companyName || null,
      }
    : null;

  const recentPosts = posts.map((p) => ({
    linkedinUrl: p.linkedinUrl || null,
    postedAt: p.postedAt?.date || null,
    content: p.content || null,
  }));

  const context = {
    lead: {
      full_name: lead?.full_name || null,
      occupation,
      campaign_name: lead?.campaign_name || null,
    },
    about_me: {
      offer_icp: profile?.offer_icp || null,
      tone_guidelines: profile?.tone_guidelines || null,
      hard_constraints: profile?.hard_constraints || null,
      calendly_cta_prefs: profile?.calendly_cta_prefs || null,
    },
    me: {
      my_profile_text: profile?.my_profile_text || null,
      my_profile_json: profile?.my_profile_json || null, // legacy
    },
    apify: {
      profile_summary: profileSummary,
      recent_posts: recentPosts,
    },
    rerun: {
      feedback: feedback || null,
      previous_draft: previousDraftText || null,
    },
  };

  const defaultSystem = [
    "You write short, warm LinkedIn first messages using a 'Sell by Chat' approach.",
    'This is a FIRST message. It must be pure connection and relationship-building.',
    'CRITICAL: Do NOT mention the offer, services, pricing, demos, calls, or any CTA. No pitch slap.',
    'Personalize only if it feels natural and non-creepy. Never force a post reference.',
    'If you cannot find a real shared connection supported by the provided data, use a simple warm opener.',
    'Max 1 emoji.',
    'Return ONLY the message text. No quotes, no bullet points, no analysis.',
  ].join('\n');

  const defaultUserTemplate = [
    'Write a first message to {{LEAD_NAME}}.',
    '{{#if LEAD_OCCUPATION}}They are: {{LEAD_OCCUPATION}}{{/if}}',
    '',
    'Use the following context (JSON) to craft a warm opener. Do not invent facts.',
    '{{CONTEXT_JSON}}',
    '',
    'Constraints:',
    '- Aim for 2 sentences, max 4 sentences',
    '- Max 1 emoji',
    "- Pure connection (no 'market research' framing)",
    '- No offer mention, no CTA, no links',
    '- If a genuine shared connection exists between prospect and me, you may reference it briefly',
  ].join('\n');

  const openerSystemRaw = profile?.ai_opener_system_prompt || null;
  const openerUserRaw = profile?.ai_opener_user_prompt_template || null;
  const legacySystemRaw = profile?.ai_system_prompt || null;
  const legacyUserRaw = profile?.ai_user_prompt_template || null;

  const resolved = {
    systemSource: openerSystemRaw ? 'opener' : legacySystemRaw ? 'legacy' : 'default',
    userSource: openerUserRaw ? 'opener' : legacyUserRaw ? 'legacy' : 'default',
    system: String(openerSystemRaw || legacySystemRaw || defaultSystem).trim(),
    userTemplate: String(openerUserRaw || legacyUserRaw || defaultUserTemplate).trim(),
  };

  const contextJson = JSON.stringify(context, null, 2);
  const hasFeedbackPlaceholder =
    resolved.userTemplate.includes('{{FEEDBACK}}') || resolved.userTemplate.includes('{{PREVIOUS_DRAFT}}');

  let user = resolved.userTemplate
    .replaceAll('{{LEAD_NAME}}', String(leadName))
    .replaceAll('{{LEAD_OCCUPATION}}', String(occupation))
    .replaceAll('{{CONTEXT_JSON}}', contextJson)
    .replaceAll('{{FEEDBACK}}', String(feedback || ''))
    .replaceAll('{{PREVIOUS_DRAFT}}', String(previousDraftText || ''))
    .replace(/\{\{#if\s+LEAD_OCCUPATION\}\}[\s\S]*?\{\{\/if\}\}/g, occupation ? `They are: ${occupation}` : '')
    .trim();

  if (!hasFeedbackPlaceholder) {
    if (previousDraftText) user += `\n\nPrevious draft:\n${previousDraftText}\n`;
    if (feedback) user += `\nUser feedback:\n${feedback}\n`;
  }

  return {
    system: resolved.system,
    user,
    userTemplate: resolved.userTemplate,
    context,
    promptSource: { system: resolved.systemSource, user: resolved.userSource },
  };
}

module.exports = { buildOpenerPrompt };

