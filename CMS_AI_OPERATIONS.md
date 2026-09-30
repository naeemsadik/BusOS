# CMS AI Operations and Privacy Runbook

## Release controls

AI assistance is server-side and opt-in at deployment time. Set `CMS_AI_ENABLED=false` to disable every provider call without disabling templates, manual editing, page review, or publishing. Keep the feature disabled until the provider agreement, data-processing terms, retention settings, supported region, and expected monthly budget have been approved for the deployment.

Required production configuration:

- `AI_API_KEY`: server secret; never expose it through a `NEXT_PUBLIC_*` variable.
- `CMS_AI_MODEL`: approved structured-output model.
- `CMS_AI_TIMEOUT_MS`: provider deadline; default 20 seconds.
- Per-minute limits: `CMS_AI_USER_LIMIT` and `CMS_AI_ORG_LIMIT`.
- Monthly request limits: `CMS_AI_USER_MONTHLY_LIMIT` and `CMS_AI_ORG_MONTHLY_LIMIT`.

Roll out to internal organizations first, then a small customer cohort. Monitor failures, latency, suggestion acceptance, publish-check failures, and estimated usage before expanding access. The global flag is the administrator control; each organization can also disable AI writing assistance from page settings without losing templates or manual editing.

## Data sent to the provider

Only the minimum context selected for the requested action is sent:

- Explicit user-entered page facts.
- Public organization name, description, phone, address, city, and country when the user leaves “Use current business information” enabled.
- Explicitly selected storefront-visible products: ID, public name, public description, category, and selling price.
- Explicitly selected, server-authorized category names.
- The targeted page field or approved section outline.

The backend re-loads products and categories within the authenticated organization. The browser cannot submit an arbitrary organization record as trusted context. Product text, filenames, and user facts are marked as untrusted data in provider instructions.

Never send customer or order data, supplier data, cost or margin data, inventory quantities, employee/HR data, analytics, credentials, access tokens, courier keys, private financial data, or unpublished products. If a future action needs another data type, it requires a separate privacy review and an action-specific schema.

Provider requests use `store: false`. Confirm the provider’s current API retention and regional processing terms before each production launch; this repository cannot enforce provider-side policy. Rotate the key immediately if it appears in a client bundle, log, ticket, or source-control history.

## Application retention

`cms_ai_suggestions` stores support and cost metadata only: organization/user/page/section IDs, action type, model, source-type labels, outcome, latency, usage estimate, failure code, and timestamp. Raw prompts and generated page content are not stored in this audit table. Generated content is retained only if the user explicitly applies it to the ordinary page draft/revision history.

Page history retains the latest 20 snapshots per page. Database backup retention applies to deleted audit rows and old revisions; document the actual backup window for each environment. Establish an audit-metadata deletion job before production if local privacy policy requires a shorter period.

## Safety and failure behavior

- AI output must pass a strict JSON schema and the normal CMS document validator.
- Protected numbers, dates, currencies, phone-like values, names, routes, and selected records are checked before output can enter a draft.
- Unsupported superlatives, guarantees, and high-risk claims are rejected.
- AI cannot publish, alter inventory, or update organization source records.
- Field suggestions appear beside the current value and require explicit acceptance.
- Full-page generation writes one versioned draft transaction or makes no change. Duplicate generation requests use an idempotency key.
- Missing credentials, timeouts, malformed output, quota exhaustion, and provider errors use deterministic outlines/templates or leave the targeted field unchanged.
- Published storefront rendering never calls an AI provider.

If unsafe output is reported, disable `CMS_AI_ENABLED`, preserve the relevant audit IDs, record the model and action type, and reproduce with non-sensitive test data. Do not copy customer content into an incident ticket.

## Monitoring and ownership

The backend/application owner is responsible for provider configuration, key rotation, quota thresholds, and incident response. Product ownership is responsible for prompt/schema changes, protected-fact policy, and template quality. Privacy/security ownership must approve new data sources or model providers.

Alert on sustained provider failures, authentication failures, unusually high per-organization usage, latency near the configured timeout, and spikes in rejected suggestions. Public storefront availability must be monitored separately because public traffic has no provider dependency.

## Deployment checklist

1. Back up PostgreSQL and run migration `1790400000000-CreateStorefrontPages`.
2. Verify that each existing storefront has one `home` page and that its published output matches the legacy homepage.
3. Keep `CMS_AI_ENABLED=false`; test blank/template creation, save conflicts, publish checks, public custom routes, redirects, unpublish, archive, and revision restore.
4. Configure provider credentials and limits, validate that no prompt/audit log contains excluded data, then enable AI for the approved cohort.
5. Exercise timeout, invalid output, duplicate-click, quota, and key-revocation scenarios.
6. Confirm English/Bangla fallback warnings and keyboard section movement at 360, 768, and 1440 pixel previews.
