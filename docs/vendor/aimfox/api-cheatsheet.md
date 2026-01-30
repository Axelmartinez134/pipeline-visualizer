# Aimfox API cheatsheet (for Cursor @ reference)

Source: Aimfox docs (`https://docs.aimfox.com/`) + your Insomnia export.

## Base URL

- `https://api.aimfox.com`

## Auth

- Header: `Authorization: Bearer <API_KEY>`
- API key location (per docs): Workspace Settings → Integrations.

## Rate limits

- 60 requests/minute (HTTP 429 when exceeded).

## Common variables (from Insomnia export)

- `workspace_id`: `:workspace_id`
- `account_id`: `:account_id`
- `campaign_id`: `:campaign_id`
- `target_urn`: `:urn`
- `lead_id`: `:lead_id`
- `lead_urn`: `:lead_urn`
- `conversation_urn`: `:conversation_urn`
- `message_id`: `:message_id`
- `webhook_id`: `:webhook_id`

## High-signal endpoints (v2)

### Workspaces / tokens

- **Create workspace**: `POST /api/v2/workspaces`
- **Create workspace master token**: `POST /api/v2/workspaces/:workspace_id/tokens`
- **List workspace master tokens**: `GET /api/v2/workspaces/:workspace_id/tokens`

### Accounts

- **List accounts**: `GET /api/v2/accounts`
- **Get account limits**: `GET /api/v2/accounts/:account_id/limits`
- **Set account limits**: `PATCH /api/v2/accounts/:account_id/limits`

### Campaigns

- **List campaigns**: `GET /api/v2/campaigns`
- **Create campaign**: `POST /api/v2/campaigns`
- **Get campaign**: `GET /api/v2/campaigns/:campaign_id`
- **Update campaign**: `PATCH /api/v2/campaigns/:campaign_id`
- **Get campaign metrics**: `GET /api/v2/campaigns/:campaign_id/metrics`
- **Add profile to campaign audience**: `POST /api/v2/campaigns/:campaign_id/audience`
- **Remove profile from campaign**: `DELETE /api/v2/campaigns/:campaign_id/audience/:urn`
- **Bulk add profiles (+ custom variables)**: `POST /api/v2/campaigns/:campaign_id/audience/multiple`

### Custom variables (campaign)

- **Get campaign custom variables**: `GET /api/v2/campaigns/:campaign_id/custom-variables`
- **Get target custom variables**: `GET /api/v2/campaigns/:campaign_id/custom-variables/:urn`
- **Add custom variables to targets**: `POST /api/v2/campaigns/:campaign_id/custom-variables`

### Leads

- **Get lead details**: `GET /api/v2/leads/:lead_id`
- **Search leads**: `POST /api/v2/leads:search`
- **Search facets**: `POST /api/v2/leads:search/facets/:name`
- **Total leads**: `POST /api/v2/leads:search/total`

### Lead notes

- **List notes**: `GET /api/v2/leads/:lead_id/notes`
- **Create note**: `POST /api/v2/leads/:lead_id/notes`
- **Update note**: `PATCH /api/v2/leads/:lead_id/notes/:note_id`
- **Delete note**: `DELETE /api/v2/leads/:lead_id/notes/:note_id`

### Labels

- **List labels**: `GET /api/v2/labels`
- **Create label**: `POST /api/v2/labels`
- **Edit label**: `PATCH /api/v2/labels/:label_id`
- **Delete label**: `DELETE /api/v2/labels/:label_id`
- **Add label to lead**: `POST /api/v2/leads/:lead_id/labels/:label_id`
- **Remove label from lead**: `DELETE /api/v2/leads/:lead_id/labels/:label_id`

### Blacklist

- **List blacklisted profiles**: `GET /api/v2/blacklist`
- **Add profile to blacklist**: `POST /api/v2/blacklist/:urn`
- **Remove profile from blacklist**: `DELETE /api/v2/blacklist/:urn`
- **List blacklisted companies**: `GET /api/v2/blacklist-companies`
- **Add companies**: `POST /api/v2/blacklist-companies`
- **Remove company**: `DELETE /api/v2/blacklist-companies/:company_urn`

### Messages / conversations

- **List conversations**: `GET /api/v2/conversations` (supports query params like `in_app`, `before`, optionally `campaigns`)
- **Get conversation**: `GET /api/v2/accounts/:account_id/conversations/:conversation_urn`
- **Get lead conversation**: `GET /api/v2/accounts/:account_id/leads/:lead_id/conversation`
- **Start conversation**: `POST /api/v2/accounts/:account_id/conversations`
- **Send message**: `POST /api/v2/accounts/:account_id/conversations/:conversation_urn`
- **Mark as read**: `POST /api/v2/accounts/:account_id/conversations/:conversation_urn/mark-as-read`
- **React**: `POST /api/v2/accounts/:account_id/conversations/:conversation_urn/messages/:message_id/react`
- **Edit message**: `PATCH /api/v2/accounts/:account_id/conversations/:conversation_urn/messages/:message_id`
- **Delete message**: `DELETE /api/v2/accounts/:account_id/conversations/:conversation_urn/messages/:message_id`

### Templates

- **List templates**: `GET /api/v2/templates`
- **Get template**: `GET /api/v2/templates/:template_id`
- **Create template**: `POST /api/v2/templates`
- **Edit template**: `PATCH /api/v2/templates/:template_id`
- **Delete template**: `DELETE /api/v2/templates/:template_id`

### Webhooks

- **List webhooks**: `GET /api/v2/webhooks`
- **Create webhook**: `POST /api/v2/webhooks`
- **Edit webhook**: `PATCH /api/v2/webhooks/:webhook_id`
- **Delete webhook**: `DELETE /api/v2/webhooks/:webhook_id`

**Webhook events** (per docs/export):  
`account_logged_in`, `account_logged_out`, `new_connection`, `view`, `connect`, `accepted`, `inmail`, `message_request`, `message`, `reply`, `inmail_reply`

