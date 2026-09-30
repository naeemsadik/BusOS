# BusOS CMS: AI-Assisted Drag-and-Drop Page Builder Plan

## 1. Purpose

Extend the existing CMS so a shop owner with no development or content-writing experience can create a web page when needed. The owner should be able to enter incomplete information in everyday language, receive useful AI suggestions based on that information and existing BusOS data, arrange the result with drag-and-drop, and publish only after reviewing it.

The main principle is:

> The user provides facts; AI helps organize and write them; the user remains in control of the page and publishing.

This plan builds on the current CMS draft/publish model, section renderer, asset library, English/Bangla content, inventory integration, and optimistic version checks.

## 2. Product goals

- Let a non-technical user create a useful page without knowing page structure, design terminology, SEO, or copywriting.
- Accept rough, short, misspelled, or incomplete input and turn it into reviewable suggestions.
- Keep every generated result editable with ordinary fields and drag-and-drop sections.
- Use trusted BusOS data, such as business details, products, categories, contact information, and opening hours, instead of repeatedly asking for it.
- Clearly separate user-provided facts from AI-generated wording.
- Never publish, overwrite a draft, invent important business facts, or change inventory automatically.
- Work without AI: manual editing and templates must remain fully usable if AI is unavailable.

## 3. Scope

### Included

- A page manager for creating, duplicating, renaming, drafting, previewing, publishing, unpublishing, and archiving pages.
- Guided page creation for common needs.
- A manual drag-and-drop editor using the existing section system.
- AI-generated page outlines and field-level content suggestions.
- Suggestions based on user input and selected existing business data.
- English and Bangla assistance, including translation with review warnings.
- Validation, accessibility, SEO, link, and completeness checks before publishing.
- Revision history and recovery for AI and manual changes.

### Not included in the first release

- AI publishing without user confirmation.
- Fully free-form HTML, JavaScript, or custom CSS generation.
- AI-generated product prices, discounts, stock, legal claims, delivery promises, or opening hours.
- Automatic replacement of product or organization records from page content.
- Real-time multi-user collaborative editing.
- Custom domain management, payment changes, or customer accounts.
- AI image generation. The first release suggests image needs and uses uploaded assets or product images.

## 4. User experience model

The CMS should offer three clear starting choices instead of presenting a blank canvas:

1. **Guide me**: answer a few plain-language questions and receive a suggested page draft.
2. **Use a template**: start with a suitable section arrangement and replace the sample content.
3. **Start blank**: manually add and arrange sections.

All three choices lead to the same editor. AI is an assistant inside the editor, not a separate website generator.

### Recommended page types

The page type controls the questions, recommended sections, and validation rules. Initial types:

- Home page
- About the business
- Contact and opening hours
- Promotion or campaign
- Product/category landing page
- Delivery and ordering information
- Frequently asked questions
- Basic custom information page

The existing catalog, product detail, cart, checkout, and confirmation routes remain system-managed commerce pages. Users may link to them but cannot accidentally replace their required behavior.

## 5. Guided creation flow

### Step 1: Choose the page purpose

Ask: “What do you want this page to help visitors do?” Provide examples such as learn about the shop, see an offer, browse a category, find the address, or understand delivery.

The user may select an option or write one sentence. Do not require a polished prompt.

### Step 2: Collect minimum facts

Show no more than three to five questions at a time. Questions change with the page type. Examples:

- What should visitors know?
- Who is this page for?
- What action should visitors take?
- Is there an offer? If yes, what are its exact conditions and dates?
- Which products or categories should appear?
- Which contact details and opening hours may be shown?

Each question supports:

- A short text answer.
- “I do not know yet.”
- Selection from existing BusOS data.
- “Use current business information.”

Optional details stay optional. The interface must not block progress simply because the user writes only one or two sentences.

### Step 3: Confirm source data

Before generating, show a compact “Information AI will use” summary:

- User-entered facts.
- Selected products/categories.
- Organization profile fields.
- Existing contact, address, and hours.
- Chosen language and tone.

The user can remove any item. Sensitive internal data, customer data, supplier data, costs, staff records, unpublished products, and analytics are excluded by default and must never be sent to the AI.

### Step 4: Suggest a page outline

Generate a short outline first, not an entire hidden page. For example:

1. Hero with the main message and action.
2. Featured product category.
3. Short reason to choose the shop.
4. Contact and opening hours.

The owner can accept, remove, add, or reorder items before content is generated. This makes the result understandable and reduces unnecessary generation.

### Step 5: Create a draft

Convert the accepted outline into valid, typed CMS sections. Open the ordinary builder with:

- The generated sections visible on the canvas.
- A preview for mobile, tablet, and desktop.
- Clearly marked suggestions that have not yet been reviewed.
- Existing drag-and-drop and accessible move controls.
- Undo for the complete generation action.

Generation only changes the draft. It never changes the published snapshot.

### Step 6: Review and improve

For every editable text field, offer small contextual actions:

- Suggest wording
- Make shorter
- Make clearer
- Make more friendly or more professional
- Fix spelling and grammar
- Translate to English or Bangla
- Create button text
- Suggest image alternative text

The suggestion appears beside the current value with **Use suggestion**, **Try again**, and **Keep mine** actions. It must not silently replace the user's text.

### Step 7: Pre-publish check

Before publishing, show issues grouped as:

- **Must fix**: invalid route, missing required factual field, invalid promotion dates, broken internal link, unsafe URL, or structurally invalid section.
- **Recommended**: missing alternative text, vague button label, overly long title, low color contrast, missing SEO description, empty Bangla content when Bangla is enabled, or no clear visitor action.
- **Information only**: fields that will fall back to English or sections that use live inventory data.

The user may publish with recommendations outstanding, but never with a structural, security, or commerce-critical error.

## 6. Editor layout

Use a consistent four-part layout:

1. **Page/section panel**: page list, add section, reorder, hide, duplicate, and delete.
2. **Visual canvas**: rendered page preview and a clear selected-section state.
3. **Edit panel**: ordinary fields, asset selection, data binding, and contextual AI actions.
4. **Top action bar**: save status, undo/redo, preview size, language, view published page, and publish.

For narrow screens, make these panels separate tabs rather than compressing all controls. Authoring should be supported on tablets and desktop; phones may provide basic text edits and preview but do not need to be the primary drag-and-drop experience.

### Drag-and-drop rules

- Show an obvious insertion position while dragging.
- Support keyboard-accessible “Move up,” “Move down,” and “Move to…” actions.
- Auto-save locally after a move, then save the server draft after a short debounce.
- Keep header/footer and required commerce elements outside unsafe drop zones.
- Allow a maximum of 30 sections per page initially, matching current validation limits.
- If a drop is invalid, return the section to its original place and explain why.

## 7. Content assistance rules

### Facts versus wording

Classify inputs into two groups:

- **Protected facts**: business name, price, discount amount, dates, phone, address, delivery fee, stock, opening hours, product names, and policy statements.
- **Editable wording**: headings, descriptions, introductions, calls to action, summaries, and SEO text.

AI may rewrite editable wording. It may only repeat protected facts exactly from trusted data or explicit user input. If a required fact is missing, it must use a visible placeholder such as “Add offer end date,” ask for the fact, or omit the claim.

### Suggestion quality

Suggestions should:

- Use simple language suitable for the chosen audience.
- Be concise enough for the target section and existing field limits.
- Avoid unsupported superlatives such as “best,” “cheapest,” or “guaranteed.”
- Avoid medical, financial, safety, or legal claims unless copied from an approved source and explicitly confirmed.
- Preserve product names, brand names, numbers, currency, dates, and URLs.
- Use a specific call to action only when the destination is known.
- Produce valid structured JSON, never executable markup.

### Language behavior

- The user selects the source language and requested page languages.
- Bangla input can generate Bangla directly; it should not need to be translated through English in the interface.
- Translation is labeled as AI-generated until reviewed.
- If one language is incomplete, show the existing English fallback behavior before publishing.
- Mixed Bangla/English business and product names should be preserved unless the user edits them.

## 8. Data and document changes

The current `StorefrontDocument` represents one page. Introduce explicit pages while keeping the section schema and shared renderer.

### `StorefrontPage`

Suggested fields:

- `id`
- `organizationId`
- `siteId`
- `title`
- `slug`
- `pageType`
- `status` (`draft`, `published`, `archived`)
- `isHomePage`
- `includeInNavigation`
- `navigationLabel`
- `navigationOrder`
- `enabledLocales`
- `seoSettings`
- `draftDocument`
- `publishedDocument`
- `draftVersion`
- `publishedVersion`
- `publishedAt`
- `createdBy`, `updatedBy`, `createdAt`, `updatedAt`

Constraints:

- Unique `(siteId, slug)` and only one home page per site.
- Reserved commerce paths cannot be used as custom page slugs.
- A slug change after publication requires an explicit redirect decision.
- Archived pages are not public and cannot appear in navigation.
- Every query and mutation remains organization-scoped.

### `StorefrontPageRevision`

Store recoverable revisions with page ID, version, document, settings, author, origin (`manual`, `template`, `ai`, `restore`), and timestamp. Retain at least the latest 20 revisions per page or use a documented time-based retention policy.

### `CmsAiSuggestion` or audit event

Record metadata needed for support and cost control without storing unnecessary sensitive prompt content:

- Organization, user, page, and section identifiers.
- Action type and model/provider version.
- Input source types, not raw customer or secret data.
- Success/failure, latency, token/usage estimate, and timestamp.
- Whether the suggestion was accepted, edited, or rejected.

### Document versioning

Create a new document schema version only if multi-page needs change the page document itself. Add a migration reader for existing version 1 documents and preserve the currently published homepage during migration. Never require users to rebuild an existing site.

## 9. Backend interfaces

### Page management

- `GET /storefront/cms/pages`
- `POST /storefront/cms/pages`
- `GET /storefront/cms/pages/:pageId`
- `PATCH /storefront/cms/pages/:pageId`
- `POST /storefront/cms/pages/:pageId/duplicate`
- `POST /storefront/cms/pages/:pageId/publish`
- `POST /storefront/cms/pages/:pageId/unpublish`
- `POST /storefront/cms/pages/:pageId/archive`
- `GET /storefront/cms/pages/:pageId/revisions`
- `POST /storefront/cms/pages/:pageId/revisions/:revisionId/restore`

All draft writes require the expected `draftVersion`. Return a conflict response if another browser/session has changed the page.

### AI assistance

- `POST /storefront/cms/ai/outline`
- `POST /storefront/cms/ai/page-draft`
- `POST /storefront/cms/ai/field-suggestion`
- `POST /storefront/cms/ai/translate`
- `POST /storefront/cms/ai/page-review`

Each request should contain an explicit page/field target, locale, requested action, selected source IDs, and expected draft version where relevant. The server loads authorized source data itself; the client must not submit arbitrary organization records as trusted context.

### AI response validation

Every AI response must pass through:

1. Strict schema validation.
2. Section type and field-length validation.
3. URL and internal-route validation.
4. Protected-fact comparison.
5. Tenant-owned asset/product/category validation.
6. Content safety and prohibited-claim checks.
7. Final normalization into the existing CMS document format.

Reject invalid output and allow a safe retry. Never save raw model output directly as a page document.

## 10. AI architecture and safety

- Keep provider calls in the backend; never expose AI credentials to the browser.
- Use action-specific prompts and schemas rather than one unrestricted chat prompt.
- Send the minimum required context for the requested action.
- Treat uploaded filenames, product descriptions, and user content as untrusted data, not system instructions.
- Do not allow model output to select another tenant's asset, product, page, or category.
- Apply per-user and per-organization rate limits, request timeouts, and monthly usage limits.
- Cache only safe, non-personal repeated transformations where appropriate.
- Show a clear retry message when the provider is unavailable; keep manual editing operational.
- Provide an administrator-level feature flag and organization opt-out for AI assistance.
- Document the AI provider's data retention and regional/privacy implications before production use.
- Do not send customer personal information, order details, employee data, credentials, access tokens, or private financial data.

## 11. Templates and deterministic fallback

Templates are essential even when AI exists. Each page type should have one or two tested templates with:

- A sensible section order.
- Plain placeholder instructions, not fake business claims.
- Recommended field lengths.
- Example image aspect ratios.
- A valid default call-to-action route when applicable.

If AI fails, the CMS can deterministically fill a template with selected organization fields, categories, and products. The user should still receive a workable draft and a message that writing suggestions are temporarily unavailable.

## 12. Edge cases and expected behavior

| Edge case | Expected behavior |
| --- | --- |
| User enters only a few words | Infer a page type only when confidence is reasonable, show the proposed interpretation, and generate a minimal outline. Do not invent missing facts. |
| Input is unclear or contradictory | Highlight the conflicting statements and ask one focused question; do not choose a critical fact silently. |
| User selects “I do not know” | Omit the optional claim or insert a visible editor-only task placeholder that cannot leak to the public page. |
| AI invents a price, date, discount, hours, or delivery promise | Protected-fact validation blocks the suggestion and reports that verified information is required. |
| Product/category is deleted or hidden after being selected | Show the section in draft with a warning; public rendering omits unavailable items safely and publish review asks for a replacement. |
| Inventory has no storefront-visible products | Recommend an information/contact page and explain how to enable products; do not create an empty product grid without a warning. |
| Existing page slug conflicts | Suggest an available slug; never overwrite or merge pages automatically. |
| User changes a published slug | Require a confirmation and create a redirect from the previous slug when safe; block reserved paths. |
| AI provider is slow or unavailable | Time out, keep all entered answers, offer retry/template/manual options, and never leave a half-applied document. |
| AI returns malformed or oversized content | Reject it server-side, retry once with stricter instructions, then fall back to the template and preserve user input. |
| Generation is requested twice | Use an idempotency key so repeated clicks do not add duplicate sections or duplicate usage charges. |
| User navigates away during generation | Continue only within the request timeout, store no partial result, and let the user safely retry on return. |
| Two tabs edit the same page | Existing optimistic concurrency rejects the stale save and offers reload, compare, or copy-my-changes options. |
| User dislikes an AI rewrite | Keep the previous value in undo history; “Keep mine” must be immediate and permanent for that suggestion. |
| User applies AI to a manually edited field | Show a before/after comparison and require explicit acceptance. |
| Translation changes names or numbers | Protected tokens are compared; flag differences before the translation can be applied. |
| Bangla is enabled but incomplete | Preview English fallback clearly and list untranslated fields during review. |
| Image has no alternative text | Suggest alt text from the user's description and asset context; require human review for meaningful content images. |
| Decorative image | Allow the user to mark it decorative and store empty alt text intentionally. |
| Uploaded image is invalid, too large, or unsafe | Reuse existing file/MIME/size validation, scan in production, and provide resizing guidance without losing the draft. |
| Unsafe/external link is suggested | Allow only validated schemes and known internal paths; visibly identify external links before acceptance. |
| Promotion has expired | Warn in the editor and before publish; optionally allow a user-confirmed scheduled unpublish in a later phase. |
| Page has no clear action | Recommend a relevant action, but allow informational pages with no button. |
| Page exceeds section limit | Ask the user to replace or remove sections; AI must generate within the limit. |
| User deletes a section or page accidentally | Provide undo immediately and revision restore later; published content remains unchanged until publish. |
| Published page is unpublished or archived | Remove it from navigation and return an appropriate not-found page; keep its draft and revision history. |
| Subscription/site becomes inactive | Preserve drafts and serve the existing branded unavailable behavior without deleting content. |
| AI usage limit is reached | Explain the limit and keep templates, manual editing, translation fields, and publishing available. |
| Content contains prompt-injection text | Treat it as page data, ignore embedded instructions, minimize context, and validate the structured response. |
| User lacks website permission | Hide or disable page mutations and AI calls consistently on both client and server. |

## 13. Delivery phases

### Phase 0: Validate the workflow

- Test a clickable prototype with several non-technical shop owners.
- Confirm the page types, questions, terminology, and acceptable generation time.
- Observe whether users understand draft versus published content and AI suggestion versus verified fact.

Exit condition: most test users can create and preview a useful page without assistance.

### Phase 1: Multi-page manual foundation

- Add `StorefrontPage`, page manager, routes, navigation settings, and revision storage.
- Migrate the existing homepage without changing its public output.
- Support create from template, blank page, duplicate, archive, preview, publish, and restore.
- Keep current section types and shared renderer.

Exit condition: multi-page creation works completely without AI and passes tenant, route, draft, publish, and accessibility tests.

### Phase 2: Guided intake and deterministic drafts

- Add page-purpose selection and short questionnaires.
- Read authorized business/product/category data from BusOS.
- Produce template-based drafts without an AI dependency.
- Add editor-only missing-information tasks and pre-publish checks.

Exit condition: a user can supply rough facts and receive a valid useful draft even if AI is disabled.

### Phase 3: AI outlines and field suggestions

- Add outline generation, field-level rewrite, clarity, CTA, SEO, alt-text, and translation suggestions.
- Add strict structured output validation, protected-fact checks, audit events, rate limits, timeouts, and usage reporting.
- Add before/after acceptance and undo.

Exit condition: invalid or hallucinated protected facts cannot enter a saved draft through AI actions.

### Phase 4: Full guided page draft

- Generate a complete structured draft from an approved outline.
- Add atomic apply, idempotency, retry, fallback, and revision recovery.
- Add page-level AI review and prioritized recommendations.

Exit condition: generation either applies one valid recoverable draft or makes no document change.

### Phase 5: Refinement

- Improve suggestions using anonymized acceptance/rejection metrics.
- Add more templates and section variants based on observed needs.
- Consider scheduling promotions, tone presets, and image generation only after separate privacy, cost, and moderation review.

## 14. Test and acceptance plan

### Core workflow

- A first-time user can create, rearrange, preview, save, and publish a page without writing code.
- A user can finish with incomplete input and sees exactly what remains missing.
- Manual, template, and guided creation all produce the same valid document schema.
- AI suggestions never auto-apply or auto-publish.
- Undo and revision restore recover both AI and manual changes.

### AI correctness and safety

- Generated values conform to field lengths and allowed section types.
- Prices, dates, discounts, contact details, product names, and routes match trusted sources.
- Prompt injection inside user or product text cannot change system behavior or access another tenant.
- Invalid JSON, extra fields, unsafe URLs, disallowed claims, and cross-tenant identifiers are rejected.
- Provider timeout, quota exhaustion, and malformed responses leave the draft unchanged.

### Tenant and permission safety

- One organization cannot read, suggest from, copy, preview, publish, or restore another organization's pages or assets.
- A user without website permission cannot call manual or AI mutation endpoints.
- Selected source IDs are re-authorized on the server for every request.

### Publishing and routing

- Existing storefront homepages retain their current output after migration.
- Reserved routes cannot be claimed.
- Draft changes remain private until publication.
- Slug changes, redirects, unpublishing, archiving, and navigation removal behave consistently.
- Built-in catalog, product, cart, and checkout pages remain reachable.

### Accessibility and languages

- The complete builder is keyboard operable and has visible focus.
- Drag-and-drop has equivalent move controls and announcements.
- English/Bangla switching, direct Bangla generation, translation review, and fallback warnings work.
- Pre-publish checks catch missing alt text and serious color-contrast problems.
- Public pages have no serious automated accessibility violations at 360, 768, and 1440-pixel widths.

### Performance and resilience

- Manual draft saving remains responsive while an AI request is running.
- Page generation has a defined timeout and cancellation behavior.
- Duplicate clicks are idempotent.
- AI traffic is rate-limited without affecting public storefront traffic.
- Published rendering does not call the AI provider.

## 15. Success measures

Track these per organization and page type without collecting customer content unnecessarily:

- Percentage of new users who reach a valid preview.
- Percentage who publish a first page.
- Median time from page creation to first publish.
- Template, manual, and guided-flow completion rates.
- AI suggestion acceptance, edited acceptance, and rejection rates by action type.
- Publish-check issues most often encountered.
- AI error/fallback rate, latency, and estimated cost per completed page.
- Restore/undo usage after generation.

Initial product target: a non-technical owner should be able to create a clear, valid first draft in under ten minutes and always understand which facts came from them, which came from BusOS, and which wording was suggested by AI.

## 16. Definition of done

The feature is ready for production when:

- Manual page building works independently of AI.
- Existing storefronts migrate without public regressions.
- Guided creation accepts incomplete everyday input and produces a valid editable draft.
- AI suggestions are reviewable, reversible, tenant-safe, and fact-constrained.
- No AI operation can publish or alter inventory/business source records.
- Failure and quota cases have usable non-AI fallbacks.
- Tenant isolation, permissions, optimistic concurrency, draft/publish separation, accessibility, multilingual behavior, and provider-failure tests pass.
- Privacy, retention, cost limits, monitoring, and operational ownership are documented before enabling AI for customers.
