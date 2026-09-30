# BusOS CMS — Implementation Plan (v2)

Website builder + online storefront for BusOS (Pillar 3 of the PRD).
This document is the single source of truth for the CMS part. Implement it exactly, phase by phase.

---

## 0. Instructions for the implementing agent

1. **Read this whole file before writing code.** Then inspect the existing repository (backend, frontend, migrations, existing Orders/Products/Permissions/Subscription code, i18n setup, test setup). Follow existing conventions (module layout, naming, DTO validation, guards, error format, i18n keys, UI components).
2. **Scope guard.** Only build what this document describes. Do not refactor, rename, restyle or "improve" unrelated modules (POS, inventory logic, staff/attendance, reports, auth, billing). The only permitted edits outside CMS code are the *additive* touch points listed in §3.2.
3. **Preserve existing behavior.** Before touching Orders or Products, write characterization tests for current behavior (POS order creation, stock decrement, order status transitions). They must still pass unchanged at the end.
4. **Migrations only.** TypeORM `synchronize` stays disabled. Every schema change is a reversible migration that is safe on a populated database and on a clean one. Never drop or rewrite existing columns/data.
5. **Do not stop on ambiguity.** Pick the simplest option that satisfies §2 (design principles), and record the decision in `CMS_NOTES.md` (root) under "Decisions". Record any place where existing code contradicts this document under "Conflicts" and keep existing behavior.
6. **Ship in phases (§18).** Each phase must build, pass tests, and leave the app working. Feature-flag nothing except AI (§9).
7. All user-facing text goes through the existing i18n mechanism (English + Bangla). Run the existing locale check.
8. Never commit secrets. Never expose server secrets through `NEXT_PUBLIC_*`.

---

## 1. Product summary

Each organization (shop) gets **one public storefront** at `<slug>.<STOREFRONT_ROOT_DOMAIN>` that reads the shop's **existing products** (single source of truth — no re-entry). The owner builds pages from a small set of sections, previews them on phone/tablet/desktop, and publishes. Customers browse, add to cart and place **guest cash-on-delivery orders**. Orders arrive in the existing Orders screen as `pending`; the owner confirms manually (stock is deducted on confirmation).

Shop owners are **not designers**. The product therefore provides: starter templates, a guided setup, plain-language checks, one-click fixes, and **optional AI suggestions** generated from the owner's own input (§9).

Out of scope for v1: custom domains, customer accounts, online payments, coupons, websockets, SMS/WhatsApp, multi-branch, multi-currency. (Design host resolution behind one function `resolveSiteFromHost()` so custom domains can be added later.)

---

## 2. Design principles — the "no dead end" contract

These are acceptance criteria, not suggestions. Every screen, endpoint and state must satisfy them.

1. **Every failure has a next step.** Every error shown to a user states what happened in plain language and offers at least one action (Retry, Fix, Go to X, Contact shop). Never show a raw error, blank page, or infinite spinner.
2. **Every empty state has a call to action** (e.g. "No products online yet → Choose products").
3. **Every blocked action explains why** and links to the fix ("Can't publish: shop phone is missing → Add phone").
4. **Drafts accept incomplete work; publishing demands complete work.** Draft saves only enforce structural/size limits. Completeness is checked at publish time.
5. **Live site is only changed by explicit, confirmed actions**: Publish, Unpublish (site/page), Delete a published page, Take down a section now, Pause ordering. Everything else edits drafts only.
6. **Live site degrades gracefully.** The public renderer never crashes or shows broken UI because data changed: missing product → skipped; missing image → placeholder; link to unpublished/deleted page → button hidden; empty section → not rendered; missing translation → fallback locale.
7. **Nothing is lost silently.** Deletes are soft (Trash / revisions). Save conflicts never overwrite either side. Unsaved local edits survive network loss and session expiry.
8. **Every async operation has timeout, retry and cancel** (uploads, saves, publish, AI). Duplicate clicks are idempotent.
9. **Publishing is atomic.** Either everything selected goes live, or nothing changes and the previous live version stays online.
10. **Public traffic has no dependency on AI, uploads or the builder.** The public site reads only published snapshots + live product data.
11. **The owner can always leave and resume.** Setup wizard progress and drafts persist; nothing forces completion in one sitting.
12. **Tenant isolation everywhere** (§14).

---

## 3. Scope and touch points

### 3.1 In scope (new code)
Storefront site/pages/sections/theme, drafts and publishing, revisions, trash, media, "Products online" management, builder UI, setup wizard, public storefront (catalog, product page, cart, checkout, confirmation, order tracking), storefront order intake, AI suggestions, SEO, tests.

### 3.2 Permitted additive changes outside CMS (nothing else may change)
| Area | Allowed change |
|---|---|
| Organization | Relation to `StorefrontSite` only. No column changes. |
| Product | New nullable/defaulted columns (`slug`, `name_bn`, `description_bn`, `long_description`, `long_description_bn`, `storefront_visible`, `image_alt` en/bn). A small "Online store" panel in the product form. Hook that calls cache invalidation after product create/update/delete (failure must never break the product save). |
| Order | New columns (§6.7). Orders list: source filter, "Online" badge, new-order indicator. Storefront confirm/cancel must use a **shared, idempotent stock commit/restore helper**; existing POS/manual behavior must remain identical. |
| Permissions | New `website` module (§4). |
| App shell | "Website" sidebar entry; unseen-online-orders badge on Orders. |
| Subscription | **Read-only** use of the existing subscription/suspension check. |
| CORS / rate limiting | Apply **only to the new public storefront routes**. Do not change global behavior. (Note in `CMS_NOTES.md` that global CORS is still permissive.) |

---

## 4. Roles and permissions

New permission module `website` with actions:

| Action | Owner | Staff (if granted) |
|---|---|---|
| `website:view` | ✔ | see builder read-only |
| `website:edit` | ✔ | edit drafts, upload media, use AI, manage products-online |
| `website:publish` | ✔ | publish, unpublish, delete published pages, take down sections, pause ordering, change slug |

Rules:
- Owner always has all three. Default for staff: none.
- Order handling (confirm/cancel) continues to use the **existing** orders permission — do not invent a new one.
- A user without access sees a friendly "You don't have access to Website. Ask the shop owner." page (not blank, not a raw 403).
- A user with `edit` but not `publish` sees Publish as disabled with tooltip "Ask the owner to publish" and can use **"Request publish"** (in-app note visible to the owner in the publish dialog: "Rahim edited Home, About"). Keep this minimal: a flag on the site `publish_requested_by/at`, cleared on publish.
- Permission is re-checked server-side on every request. If a user's permission is removed mid-session, the next save fails with a friendly message and their unsaved changes are kept locally (§8.7).

---

## 5. Lifecycle and state model

### 5.1 Site
| State | Meaning | Public sees |
|---|---|---|
| `draft` | Created, never published | "Coming soon" branded page (404 if slug unknown) |
| `published` | Live | Storefront |
| `unpublished` | Was live, taken offline by owner | "Shop is temporarily closed" branded page |

Overlays (not states — they do not change stored `status`):
- **Suspended** (subscription lapsed): public shows branded "Shop unavailable" page (HTTP 503, `Retry-After`, `noindex`). The stored status is untouched, so on reinstatement the site returns exactly as it was.
- **Ordering paused** (`ordering_enabled=false`): site fully visible, cart works, checkout is disabled with the owner's message ("We're closed today, ordering resumes tomorrow"). Independent of publish state.

Transitions: `draft → published` (first publish) · `published → unpublished` (Unpublish site) · `unpublished → published` (Publish). `published`/`unpublished` never return to `draft`.

### 5.2 Page
| State | Meaning |
|---|---|
| `draft` | Never published |
| `published` | Live snapshot exists |
| `unpublished` | Snapshot kept but offline |
| deleted (`deleted_at` set) | In Trash for 30 days, then purged |

Derived UI badges (computed, not stored): **Live**, **Live · has unpublished changes**, **Draft**, **Offline**, **Trash**.

- `home` page: cannot be deleted or unpublished individually (only via site unpublish). It can be edited/replaced.
- Custom pages: unlimited transitions between draft/published/unpublished; delete allowed from any state.

### 5.3 Section
Sections live inside a page document. Each has `visible: boolean` and a derived badge by comparing draft vs published snapshot (by section id + content hash):
**Live**, **Live · changed**, **New (not published)**, **Hidden**, **Hidden · still live** (hidden in draft, visible in published — will disappear at next publish).

Actions:
- **Hide/Show** and **Delete** are draft edits (undoable), effective at next publish.
- **Take down now**: immediately sets `visible=false` in *both* the published snapshot and the draft (for urgent cases such as a wrong promo). Requires `website:publish` and confirmation; creates a revision; invalidates cache. Disabled if the section was never published.

### 5.4 What changes the live site (complete list)
Publish · Unpublish site · Unpublish page · Delete published page · Take down section now · Pause/resume ordering · Change shop slug · Restore from trash of a previously published page (returns as **Offline**, not live — must be published explicitly). Everything else touches drafts only. Product/price/stock changes flow to the live site automatically because products are read live (§11.4).

---

## 6. Data model

Use existing ID/timestamp/base-entity conventions. All CMS tables carry `organization_id` (indexed, NOT NULL) and every query filters by it.

### 6.1 `storefront_sites`
`id`, `organization_id` (unique), `slug` (unique, lowercase), `status` (`draft|published|unpublished`), `default_locale` (`en|bn`), `enabled_locales` (array), `ordering_enabled` (bool, default true), `ordering_paused_message` (jsonb `{en,bn}`), `draft_settings` (jsonb), `published_settings` (jsonb, null until first publish), `settings_version` (int), `shop_profile` (jsonb — AI/owner facts, §9.2), `ai_enabled` (bool default true; effective only if global flag on), `setup_progress` (jsonb), `publish_requested_by`, `publish_requested_at`, `first_published_at`, `last_published_at`, `slug_changes` (jsonb history for rate limit), timestamps.

`settings` JSON (both draft & published) contains: `brand` (name en/bn, logo asset id, favicon asset id), `theme` (primary, accent, background, text colors, font key from a fixed list, radius key), `contact` (phone, whatsapp optional, email optional, address en/bn, city, country, hours list), `header` (show search, show language switcher), `footer` (text en/bn, show contact), `seo` (default title/description en/bn, share image asset id), `orders` (`delivery_enabled`, `pickup_enabled`, `delivery_fee`, `free_delivery_over` nullable, `min_order_amount` nullable, `max_qty_per_line` default 20, `max_lines` default 30, `note_enabled`, `order_instructions` en/bn).

### 6.2 `storefront_pages`
`id`, `organization_id`, `site_id`, `kind` (`home|custom`), `slug` (null for home; unique per site among non-deleted), `title` jsonb `{en,bn}`, `status`, `draft_document` jsonb, `draft_version` int, `published_document` jsonb (null until first publish), `published_at`, `show_in_menu` bool, `menu_order` int, `seo` jsonb `{title,description}` per locale, `deleted_at`, `purge_after`, `created_by`, `updated_by`, `updated_at`.
Constraints: exactly one non-deleted `home` per site; partial unique index `(site_id, slug) WHERE deleted_at IS NULL`.
Limits: max 10 custom pages per site; max 20 sections per page; max document size 256 KB.

### 6.3 `storefront_revisions`
`id`, `organization_id`, `site_id`, `page_id` (null = site settings), `kind` (`published|checkpoint`), `label`, `document` jsonb, `created_by`, `created_at`.
- A `published` revision is written for every item on each publish/takedown/unpublish. Keep latest 20 per page/settings.
- `checkpoint` revisions are written automatically before: restoring a revision, AI whole-page generation, "Overwrite with mine" conflict resolution, "Reset to template", and conflict "keep mine as copy". Keep latest 10 per page.
- Restoring a revision **loads it into the draft** (never straight to live).

### 6.4 `storefront_assets`
`id`, `organization_id`, `site_id`, `url`/`storage_key`, `original_filename`, `mime_type` (JPEG/PNG/WebP only), `size_bytes`, `width`, `height`, `alt` jsonb `{en,bn}`, `decorative` bool, `sort_order`, `created_by`, `deleted_at`. Usage is computed on demand by scanning drafts, published docs and settings for the asset id.

### 6.5 `storefront_slug_aliases`
`id`, `site_id`, `old_slug` (globally unique), `expires_at` (30 days). Used for 301 redirects after a slug change.

### 6.6 `cms_ai_suggestions` (audit metadata only)
`id`, `organization_id`, `user_id`, `site_id`, `page_id`, `section_id`, `action`, `model`, `source_types` (labels), `outcome` (`shown|accepted|rejected|failed|fallback`), `failure_code`, `latency_ms`, `usage_estimate`, `created_at`. **No prompts, no generated text.**

### 6.7 Product additions (additive)
`slug` (unique per organization among non-null), `name_bn`, `description_bn`, `long_description`, `long_description_bn`, `storefront_visible` (bool), `image_alt_en`, `image_alt_bn`.
- **Migration default for existing products: `storefront_visible = false`** — existing products are never made public silently. The setup wizard (§8.1 step 3) and "Products online" page make it a one-click "Show all active products".
- **New products default to `storefront_visible = true`** when the shop already has a site; otherwise false.
- A product is shown publicly only if: `active` AND `storefront_visible` AND has a selling price > 0.
- Slug is generated from the English name on first save (transliteration fallback → `product-<shortid>`), lowercase, unique per org with numeric suffix. Editing the name never changes an existing slug automatically. Owner may edit the slug.

### 6.8 Order additions (additive)
`source` (`pos|manual|storefront`; existing rows backfilled `pos` or `manual` per existing logic — inspect and choose, default `manual` if indeterminable), `storefront_site_id` (nullable), `locale`, `delivery_method` (`delivery|pickup`), `delivery_address` (jsonb), `customer_note`, `idempotency_key` (unique per org when not null), `public_token` (random ≥128-bit, unique, nullable), `owner_seen_at`, `stock_committed_at`, `stock_restored_at`, `customer_snapshot` (name, phone).

---

## 7. Document schema (versioned JSON)

```
PageDocument { schemaVersion: 1, sections: Section[] }
Section { id: uuid, type, visible: boolean, ...fields }
LocalizedText = { en?: string, bn?: string }
Link = { kind: 'page', pageId } | { kind: 'catalog' } | { kind: 'product', productId }
     | { kind: 'category', categoryId } | { kind: 'url', url (https only) }
     | { kind: 'phone', value } | { kind: 'whatsapp', value } | { kind: 'none' }
ImageRef = { assetId, alt?: LocalizedText, decorative?: boolean }
```

Text is **plain text only** (line breaks allowed). No HTML, no markdown execution. Links are validated by kind; `url` allows `https:` only. Internal links reference IDs (not slugs) so renames/slug changes never break them.

### Section types
| Type | Fields | Required to publish (default locale) |
|---|---|---|
| `announcement` | `text`, `link?` | `text` (≤120 chars) |
| `hero` | `headline`, `subheadline?`, `image?`, `button?{label,link}`, `align` | `headline` (≤80) |
| `category_nav` | `title?`, `mode: all|manual`, `categoryIds?` | none (renders nothing if no categories with visible products) |
| `product_grid` | `title?`, `source: all|category|manual|latest`, `categoryId?`, `productIds?`, `limit` (4–24, default 8), `show_view_all` | none |
| `promo_banner` | `headline`, `text?`, `button?`, `image?`, `style: solid|image` | `headline` (≤80) |
| `image_text` | `title?`, `body`, `image?`, `image_position: left|right` | `body` (≤600) |
| `text_block` | `title?`, `body` | `body` (≤2000) |
| `contact_hours` | `title?`, `use_shop_contact: bool`, `extra_note?` | none (uses shop contact/hours from settings) |

Notes:
- Product/category sections store **rules or IDs, not copies of product data**. Names, prices, images and stock are read live at render time.
- Fixed header/footer are not sections; they are rendered from settings (§6.1). Navigation is automatic: Home, published `show_in_menu` custom pages (by `menu_order`), Catalog, Cart.
- Unknown section types or future `schemaVersion` values must be **skipped safely** by the renderer, never crash.

---

## 8. Owner experience

### 8.1 Setup wizard (first visit to Website)
Opening Website for the first time lazily creates nothing until step 1 is confirmed. Progress is saved after each step; every step after 1 is skippable; the owner can exit any time and resume from a **Setup checklist** card on the Website home screen.

1. **Shop address.** Suggest slugs from the shop name. Live availability check (debounced) with reasons: taken, too short (min 3), invalid characters, reserved. Reserved list includes: `www, api, admin, app, dashboard, static, assets, cdn, mail, support, help, bn, en, store, shop, busos, login, signup` plus any existing system subdomain. Concurrent claim race → unique constraint; on violation show "Just taken — try <suggestion>".
2. **Basics.** Display name (prefilled from organization), logo (optional), phone/address/city (prefilled from organization; editable here writes to *site contact settings*, never to the organization record), languages (default locale; enable second locale optional).
3. **Products online.** Shows counts ("42 active products, 0 online") with **Show all active products**, or pick individually. Flags products without price/image/Bangla name as warnings (not blockers).
4. **Look.** Choose a starter template (§8.2) and a brand color (auto-derives accessible button/text colors).
5. **Shop facts (optional).** Fill the shop profile used by AI (§9.2). "Skip" is always available.
6. **Review.** Preview + checks. Buttons: **Publish now** or **Save as draft and finish later**.

### 8.2 Starter templates
Deterministic, no AI needed, bilingual starter copy with tokens (`{shopName}`, `{topCategory}`, `{city}`). Templates: **General store**, **Clothing**, **Pharmacy/health**, **Food & restaurant**, **Blank**. Each defines the Home page sections and a suggested "About" page. Applying a template to a non-empty page requires confirmation and writes a checkpoint revision first ("Undo" available).

### 8.3 Builder screen
Layout (desktop): left = Pages list + Section list; center = live preview; right = edit panel. Top bar: page selector, save state, edit-language switch (EN | বাংলা), device switch (360 / 768 / 1440), Preview, **Publish changes**.
**Mobile/tablet (owner on a phone): the builder itself must work at 360px** — bottom tabs `Sections | Preview | Edit`; edit panel opens as a full-screen sheet with a clear Done button.

Section list:
- Add section (library with icon, one-line description, example thumbnail).
- Reorder by drag-and-drop **and** Move up / Move down buttons (keyboard + touch).
- Per section: badge (§5.3), visibility toggle, duplicate, delete (with Undo toast, 10 s), **Take down now** (when live).
- Sections with checks issues show an inline ⚠ that jumps to the problem field.

Edit panel:
- Only fields relevant to the section; plain labels ("Big heading", "Button text"), helper text, character counters.
- Each localized field has EN | বাংলা tabs; Bangla tab shows "Copy from English", and (if AI on) "Suggest Bangla". A yellow "Falls back to English" note appears when empty.
- Image picker: upload, choose from library, drag-drop, paste; shows size/type errors inline; alt text field with "Mark as decorative".
- **"Suggest for me"** button on every text-bearing section (§9).

Preview uses the **same shared rendering components** as the public storefront, fed with draft data + live products. A banner reads "Preview — this is not live".

### 8.4 Pages
- Pages list with status badges, "Show in menu" toggle, order controls, duplicate, unpublish/publish, delete.
- New page: from template ("About us", "Delivery info", "Contact", "Blank"). Slug is generated from title and editable (validation: a–z, 0–9, hyphen, 2–40 chars, unique per site, not reserved: `products, product, cart, checkout, order, orders, pages, bn, en, api, search, home`). Bangla-only titles get a generated `page-<n>` slug unless owner types one.
- **Unpublish page**: dialog states "This page will disappear from the shop and menu. Buttons linking to it will be hidden. You can publish it again any time." Then applies immediately.
- **Delete page**: if draft/offline → simple confirm, moves to Trash. If **published** → stronger dialog: shows live URL, states it goes offline immediately, lists which pages/menu link to it (buttons will be hidden automatically), checkbox not required. Moves to Trash for 30 days.
- **Trash**: list with days remaining, Restore, Delete forever. Restore of a formerly published page returns it as **Offline** (owner publishes explicitly). If its slug is now taken, restore prompts for a new slug — never fails silently.
- Purge job (daily): permanently delete rows where `purge_after < now()` (page + its revisions).

### 8.5 Products online page (`Website → Products`)
Table with search, category filter, status filter (Online / Not online / Needs attention), toggle per row, multi-select bulk **Show online / Hide**. "Needs attention" flags: no image, no Bangla name (if Bangla enabled), price missing, out of stock (informational). Row action opens the existing product edit form. Nothing here changes stock or price.

### 8.6 Publishing (the only "go live" action)
1. **Publish changes** button shows a count badge of changed items. Opening it calls `GET /cms/publish/preview`.
2. Dialog lists each changed item with a checkbox (default: all that have no blocking errors): *Site settings*, *Home*, *About (new)*… Each row shows a diff summary ("2 sections changed, 1 new") and its checks.
3. **Blocking errors** disable that item's checkbox and show a **Fix** link that jumps to the exact field (or an inline fix when trivial, e.g. phone). **Warnings** don't block. Other items can still be published.
4. **Dependencies**: if a selected page links to a page that's neither published nor selected, show it as a warning ("Button 'Read more' will be hidden until 'About' is published") with an "Also include About" shortcut.
5. Confirm → `POST /cms/publish` with the selected items, each with `expectedDraftVersion`, plus an idempotency key. The server locks the site row, re-validates, writes snapshots + revisions in **one transaction**, sets statuses, then invalidates caches (failure of invalidation is logged; short TTL guarantees eventual freshness; the publish still succeeds).
6. If any item's draft changed after the dialog opened (`409 STALE_ITEMS`), the dialog refreshes and highlights what changed; nothing is published.
7. Success screen: **View live site**, copy link, share buttons. First publish also shows "Your shop is live at …".
8. First-publish requirements (blocking): valid Home page with ≥1 visible section, shop phone present, valid slug, theme contrast OK. "No products online" is a **warning** (shop can launch as an info site; catalog shows a friendly empty state).

### 8.7 Saving, offline, sessions, concurrency
- Autosave draft with 1.5 s debounce and on blur; status indicator: `Saving…` / `Saved` / `Not saved — retrying` / `Conflict`.
- Save uses `expectedVersion` (optimistic concurrency).
- **Network/server failure**: keep changes in local storage (keyed by page + base version), retry with backoff, show a persistent non-blocking banner. On next load, if a newer local buffer exists, offer **Restore my unsaved changes**. Warn on tab close with unsaved changes.
- **Session expired / permission revoked (401/403)**: keep local buffer, show "Sign in again to save" (re-auth in a modal/tab, then resume automatically). Never discard.
- **Conflict (409)**: modal — "Rahim saved this page at 14:32." Choices: **Load their version (keep mine as a copy)** — my version is stored as a checkpoint revision and shown in Revisions; **Overwrite with mine** — theirs is first stored as a checkpoint; **Compare** (side-by-side section list). Never silent overwrite.
- Soft presence: if another user has the same page open (heartbeat every 30 s), show "Rahim is also editing this page".

### 8.8 Revisions
Per page: list of published and checkpoint revisions with time, author, label. Actions: Preview, **Restore to draft** (writes a checkpoint of the current draft first). Restore never touches live.

### 8.9 Theme and settings screens
- Brand color pickers show live contrast ratio. Text color for buttons is auto-computed to pass WCAG AA (4.5:1); if the owner overrides and it fails, show a blocking check with **Use suggested color**.
- Font choice from a fixed list of 4 that supports both Latin and Bangla glyphs (e.g. a Bangla-capable sans). Radius: 3 options.
- Site settings also hold: ordering options (§6.1), pause ordering toggle + message, AI on/off for this shop, slug change, **Unpublish site**, **Reset to template** (checkpointed).

### 8.10 Slug change
Allowed for `website:publish`. Confirmation warns that old links stop working after 30 days. Old slug becomes an alias (301 redirect) for 30 days and is reserved for that shop. Max 3 changes per 30 days. Change is immediate (it is live-affecting) and invalidates caches under both slugs.

### 8.11 Media
- Accept JPEG, PNG, WebP only; server verifies **magic bytes** (not just extension/MIME); max 5 MB and 6000 px on the longest side (configurable); reject animated/SVG/others with a clear message.
- Server re-encodes, strips EXIF, and generates responsive sizes (e.g. 480/960/1600 px). Filenames are randomized; served with `X-Content-Type-Options: nosniff` and long cache headers by immutable URL.
- Per-shop quota (default 200 files / 500 MB). At quota: message with "Delete unused images" shortcut (lists unused assets).
- Upload failure (network/db) → retry button; on DB failure the stored file is removed; cleanup errors are logged and swept by a nightly orphan job.
- **Delete asset**: shows where it's used. Used in **published** content → deletion blocked with list ("Replace it first") unless the owner chooses **Replace with…** (swaps references in drafts; published still points to old until publish, so deletion remains blocked until then). Used only in drafts → allowed with warning; drafts show "Image missing" placeholders with a **Choose image** button.

---

## 9. AI suggestions

Purpose: help a non-creative owner get good text **from their own input**. It is **never automatic**, never blocks the builder, and never publishes.

### 9.1 Availability
- Global flag `CMS_AI_ENABLED` (default `false`) and per-shop `ai_enabled`. When off/not configured, "Suggest for me" is replaced by **"Use an example"**, which inserts deterministic template text built from the shop profile (§9.5). No broken buttons.
- Everything works with AI off (templates, manual editing, publishing).

### 9.2 Shop profile (owner input)
Optional mini-form (wizard step 5 and reachable anywhere via "Tell us about your shop"). All plain fields, saved to `shop_profile`:
- Shop type (chips: grocery, clothing, pharmacy, restaurant, other + free text)
- What you sell (free text / category chips prefilled from categories)
- What makes you special (1–2 sentences, optional)
- Tone (Friendly / Professional / Simple)
- Delivery area, opening hours (prefilled from contact settings)
- Current offer (owner-typed only, e.g. "Free delivery over 1000 Tk this week")
The AI may only use facts present here, in the section's own fields, in public shop contact info, and in explicitly selected storefront-visible products/categories.

### 9.3 Actions
| Action | Behavior |
|---|---|
| `suggest_field` | Generate options for one text field from the shop profile + section context. Short fields (headline, button) return **3 options**; paragraphs return **1**. |
| `suggest_section` | Fill all text fields of one section together (e.g. hero headline + subheadline + button label). |
| `suggest_homepage` | Propose a section outline and copy for Home from shop type + categories. |
| `translate_field` | Translate the owner's existing text EN↔BN (owner's own words in, translation out). |
| `refine` | Re-generate with an instruction chip: *Shorter, Longer, More friendly, More formal, Mention delivery, Different idea* (+ optional short free-text instruction). |

If the owner already wrote text, `suggest_field` treats it as input ("make this better / different angle") — it should generate improved copy that keeps the owner's facts, not merely fix grammar.

### 9.4 UX
- Suggestions appear in a panel **beside the current value** as cards with **Use this**, **Regenerate**, refine chips and **Dismiss**. "Use this" writes into the draft field only (undoable). Nothing is auto-applied.
- **Thin input** (empty shop profile and empty section): don't call the provider; show an inline 3-question mini-form ("What do you sell? What are you known for? Which area do you serve?"), save answers to the profile, then generate.
- Progress state with **Cancel**; results that arrive after cancel/navigation are discarded (request-id check).
- Shows remaining quota ("18 suggestions left this month") and a small "AI-written — please check before publishing" note.
- `suggest_homepage`: available when Home has no owner-edited content, or after confirmation "Replace the current draft? You can undo." Writes **one draft transaction** (checkpoint first). Uses an idempotency key so double clicks create one result. The AI chooses section *types and order* and text; product selection uses rules (`all`, `category`, `latest`) — **AI never picks prices or invents products**.

### 9.5 Fallbacks (never a dead end)
| Situation | Behavior |
|---|---|
| AI disabled / no key | "Use an example" (template text from profile tokens) |
| Timeout (default 20 s), provider error, network | Message "Couldn't get suggestions" + **Try again** + **Use an example** |
| Malformed/invalid output | Retry once silently; then fallback to example |
| Output fails safety/protected-fact checks | Regenerate once with stricter instruction; then fallback to example |
| Wrong script (Bangla requested but output isn't) | Retry once; then fallback |
| Quota exhausted (minute) | "Please wait a moment" with countdown |
| Quota exhausted (month) | Message with reset date + **Use an example** |
| Provider key revoked | Same as disabled; admin alert |

### 9.6 Safety rules (server-side, before anything reaches the client)
- Output must match a strict JSON schema with per-field max lengths, and pass the same CMS validators.
- **Protected facts**: every number, currency amount, date, phone-like string, and percentage in the output must appear in the input (profile, fields, selected records). Names/places/routes not in input are rejected.
- Reject unsupported superlatives ("best in town", "#1"), guarantees, comparative claims about competitors, and price/discount claims not supplied by the owner.
- **Pharmacy/health shops**: reject medical efficacy claims ("cures", "treats"), prescription-drug promotion, and diagnosis language.
- Treat product text, filenames and user text as **untrusted data** in provider instructions (prompt-injection defense). Output is plain text and sanitized like any owner text.
- AI cannot publish, alter inventory/prices/products, or write organization records.

### 9.7 Privacy and operations
- Server-side only; key in `AI_API_KEY`; provider requests use `store: false`.
- Send only: owner-entered facts, public shop name/description/phone/address/city/country (unless owner turns off "Use current business information"), explicitly selected storefront-visible products (id, public name, description, category, price), selected category names, the target field/section outline.
- **Never send**: customers, orders, suppliers, costs/margins, stock quantities, staff/HR, analytics, credentials, unpublished/hidden products.
- Backend reloads products/categories within the authenticated organization; the browser cannot submit "trusted" records.
- Audit table stores metadata only (§6.6). Generated text persists only if the owner applies it to the draft.
- Limits: `CMS_AI_USER_LIMIT`, `CMS_AI_ORG_LIMIT` (per minute), `CMS_AI_USER_MONTHLY_LIMIT`, `CMS_AI_ORG_MONTHLY_LIMIT`. Per-section regeneration cap: 8 per hour.
- Roll out: keep global flag off in production until provider terms, region, retention and budget are approved. Provide a kill switch (flag off) that leaves all other features intact.

---

## 10. Backend API

Follow existing controller/DTO/guard conventions. Prefixes below are illustrative — match the project's routing style. All `/cms/*` routes: authenticated, organization taken from the token (never from the request), permission-guarded, subscription-guarded.

### 10.1 CMS (authenticated)
| Method & path | Purpose | Permission |
|---|---|---|
| `GET /cms/site` | Site, setup progress, counts, unseen changes, publish-request info | view |
| `GET /cms/site/slug-check?slug=` | Availability + reason + suggestions | edit |
| `POST /cms/site` | Create site (slug, default locale) — idempotent per org | edit |
| `PATCH /cms/site/settings` | Save draft settings (`expectedVersion`) | edit |
| `PATCH /cms/site/profile` | Save shop profile | edit |
| `POST /cms/site/slug` | Change slug | publish |
| `POST /cms/site/unpublish` | Take site offline | publish |
| `POST /cms/site/ordering` | Pause/resume ordering + message | publish |
| `POST /cms/site/reset` | Reset to template (checkpoint) | publish |
| `GET /cms/templates` | Starter templates | view |
| `GET/POST /cms/pages` | List / create (from template or blank) | view / edit |
| `GET /cms/pages/:id` | Page draft + published summary + section badges | view |
| `PATCH /cms/pages/:id` | Save draft document/meta (`expectedVersion`) | edit |
| `POST /cms/pages/:id/duplicate` | Duplicate as draft | edit |
| `POST /cms/pages/:id/unpublish` | Page offline | publish |
| `DELETE /cms/pages/:id` | Soft delete to Trash | edit (draft/offline) / publish (published) |
| `GET /cms/pages/trash` · `POST /cms/pages/:id/restore` · `DELETE /cms/pages/:id/purge` | Trash management | edit / publish for previously-published restore not required (returns Offline) |
| `POST /cms/pages/:id/sections/:sectionId/takedown` | Immediate section takedown | publish |
| `GET /cms/pages/:id/revisions` · `POST /cms/pages/:id/revisions/:rid/restore` | History; restore into draft | view / edit |
| `GET /cms/checks` | Live validation of all drafts (blocking + warnings) without publishing | view |
| `GET /cms/publish/preview` | Change list + per-item validation | view |
| `POST /cms/publish` | Atomic publish (items + versions + idempotency key) | publish |
| `GET/POST/PATCH/DELETE /cms/assets`, `GET /cms/assets/:id/usage` | Media | edit |
| `GET /cms/products-online`, `PATCH /cms/products-online/bulk` | Manage product visibility | edit |
| `GET /cms/ai/status`, `POST /cms/ai/suggest` | AI availability/quota; suggestions | edit |

Standard error shape (reuse project's): `{ code, message, details? }` with stable codes, e.g. `VERSION_CONFLICT`, `STALE_ITEMS`, `SLUG_TAKEN`, `SLUG_RESERVED`, `VALIDATION_FAILED` (with `details[]` of `{itemType,itemId,sectionId?,field,severity,code}`), `LIMIT_REACHED`, `ASSET_IN_USE`, `AI_UNAVAILABLE`, `AI_QUOTA`, `PERMISSION_DENIED`, `SITE_SUSPENDED`. Frontend maps each code to a friendly message + action.

### 10.2 Public (unauthenticated, rate-limited, CORS limited to storefront hosts)
| Method & path | Purpose |
|---|---|
| `GET /public/storefront/:slug` | Resolve site → `{state: live|coming_soon|closed|suspended|not_found, settings, nav, locales}` (never leaks drafts) |
| `GET /public/storefront/:slug/pages/home` · `/pages/:pageSlug` | Published page document (404-safe) |
| `GET /public/storefront/:slug/categories` | Categories that contain ≥1 visible product |
| `GET /public/storefront/:slug/products?query&category&sort&page&limit` | Paginated visible products |
| `GET /public/storefront/:slug/products/:productSlug` | Product detail |
| `POST /public/storefront/:slug/cart/quote` | Validate cart lines → current names/prices/availability/issues/totals |
| `POST /public/storefront/:slug/orders` | Submit order (idempotent) |
| `GET /public/storefront/:slug/orders/:token` | Order confirmation/status by unguessable token |
| `POST /public/storefront/:slug/orders/lookup` | Find order by order number + phone (rate-limited, generic errors) |

### 10.3 Existing Orders additions
- `GET /orders?source=storefront|pos|manual` filter.
- `GET /orders/storefront/unseen-count` and `POST /orders/:id/seen`.
- Confirm/cancel use the **existing** endpoints, now calling the shared stock helper (§12).

---

## 11. Public storefront

### 11.1 Routing
- Next.js middleware extracts the slug from the host (`<slug>.<STOREFRONT_ROOT_DOMAIN>`) and rewrites internally. Local dev: `demo.localhost:3000` and fallback `localhost:3000/store/demo`.
- Routes: `/` home · `/products` catalog · `/products/[productSlug]` · `/pages/[pageSlug]` · `/cart` · `/checkout` · `/order/[token]` · `/order/lookup`. Default locale at root; the other enabled locale under `/bn` (or `/en`).
- Unknown/unavailable → branded pages: **Coming soon**, **Temporarily closed**, **Unavailable (suspended)**, **Page not found** (real 404, with links to Home and Catalog), **Product not available** (404 with link to Catalog and similar products in the same category if any).
- Old-slug alias → 301 to the new host. Root domain without a slug → BusOS marketing/redirect (existing behavior, do not change).
- Host parsing must reject malformed hosts, uppercase (normalize), multi-level subdomains, and ports mismatches without throwing.

### 11.2 Rendering
- Server-rendered with shared components used by builder preview. Metadata per page/locale, canonical URL, `hreflang` alternates (only for enabled locales that have content), Open Graph, `robots` (noindex for coming-soon/closed/suspended/preview), `sitemap.xml` and `robots.txt` per storefront (published pages + visible products only).
- Product pages emit `Product` JSON-LD (name, image, description, price, currency, availability).
- Prices formatted via `Intl` for the locale (Bangla digits when locale is Bangla).
- Images: responsive `srcset`, lazy loading (except first hero), explicit dimensions to prevent layout shift; missing image → neutral placeholder. Empty alt falls back to section headline / product name unless marked decorative.

### 11.3 Catalog
- Search (name, both languages), category filter, sort (newest, price asc/desc), pagination (default 24). Filters in the URL so links are shareable and Back works.
- Unavailable (out of stock) products remain visible with an "Out of stock" label and disabled Add to cart.
- Zero results → friendly message with "Clear filters".
- Product detail: gallery (if multiple), price, description (Bangla fallback to English), quantity selector with min 1 / max per-line limit / available stock, Add to cart, sticky add bar on mobile.

### 11.4 Data freshness
- Published page documents: cached by tag `storefront:<slug>`; revalidated on publish/unpublish/takedown/slug change/subscription change; TTL 60 s.
- Product/category data: fetched live with a short TTL (≤30 s) and revalidated by the product-change hook. So price and availability changes appear without republishing.

### 11.5 Cart
- Client-side (localStorage, key per storefront slug): only `{productId, quantity}`. Survives refresh; expires after 30 days; corrupted storage is discarded silently.
- Cart page calls `/cart/quote` on load and on change; shows current names/prices. Lines with issues get inline banners: *No longer available* (with **Remove**), *Only N left* (with **Set to N**), *Price changed* (old→new). A one-click **"Fix my cart"** applies all safe fixes.
- Cart persists across languages; switching language keeps cart.

### 11.6 Checkout
- Single page, mobile-first. Fields: name, phone (Bangladesh formats accepted: `01XXXXXXXXX`, `+8801XXXXXXXXX`, `8801…`; normalized), delivery method (Delivery / Store pickup, if enabled), address (required for delivery), optional note. No account, no payment step — clearly labeled **"Cash on delivery"**.
- Shows server-computed totals (subtotal, tax if the org uses it, delivery fee, total) from `/cart/quote`. Delivery fee: flat fee; `0` when pickup or subtotal ≥ `free_delivery_over`. Min order amount enforced with an explicit message.
- Submit sends `{lines[{productId,quantity}], customer, deliveryMethod, address, note, locale, idempotencyKey, expectedTotal}`; `expectedTotal` is **advisory only** and never trusted.
- Responses:
  - `201` → redirect to `/order/[token]`, clear cart.
  - `409 PRICE_CHANGED` → show updated totals with "Prices changed — please review" and a **Place order at new total** button (new idempotency key).
  - `409 ITEMS_UNAVAILABLE` → return to the cart with per-line issues and **Fix my cart**.
  - `403/423 ORDERING_PAUSED / SITE_CLOSED` → show the owner's message and the shop phone; cart is kept.
  - `422` validation → inline field errors (phone, address).
  - `429` → "Too many attempts, try again in a minute" with countdown; cart kept.
  - Network error/timeout → **Retry** (same idempotency key, so no duplicate order); if the request actually succeeded, retry returns the same order.
- Double-click/refresh/back-button safe. Idempotency key stored on the order; same key + same payload returns the original order; same key + different payload → `409`.
- Basic anti-spam: honeypot field, per-IP+store rate limit, per-phone cap (e.g. 5 pending orders per phone per store per day, configurable), max lines and quantities.

### 11.7 Confirmation and tracking
- `/order/[token]`: order number, items, totals, delivery details, status (Pending / Confirmed / Cancelled / Completed mapped from existing statuses), shop phone with tap-to-call, "Order again". Refresh-safe and shareable only by the token holder. Remembers recent order tokens in localStorage ("Your recent orders").
- `/order/lookup`: order number + phone → same page; generic failure message that doesn't reveal whether the number exists; rate-limited.
- Status shown to customers is read-only; customers cannot cancel online (v1) — page says "To change or cancel, call <phone>".
- Copy states clearly: "Your order is received. The shop will contact you to confirm."

---

## 12. Orders and stock

1. **Intake.** Server determines tenant (from slug), reloads products (active + visible + priced), computes prices/tax/shipping/totals itself, snapshots customer + line data. Rejects: inactive/unpublished/suspended site, ordering paused, hidden/inactive/other-tenant products, quantity < 1 or > max, non-integer quantities (unless product supports decimals in existing model), duplicate lines (merged), empty cart, below min order, price mismatch (→ 409 as above).
2. **Customer record.** Match existing customer by normalized phone within the organization; reuse without overwriting existing fields. If none, create one. The order keeps its own `customer_snapshot`.
3. Order is created `pending`, `source=storefront`, with `public_token`. **Stock is not reserved.**
4. **Confirm** (owner): one transaction — lock product rows in stable order (by id) → re-validate stock for every line → decrement once → set `stock_committed_at` → status `confirmed`. Repeated confirm calls are no-ops (idempotent). Concurrent confirmations cannot oversell.
   - **Insufficient stock**: confirmation is blocked with a specific message per line ("Rice 5kg: 2 available, ordered 3") and options: *Edit quantities/remove line* (reuse existing order-edit capability if present; totals recomputed server-side, customer note added), *Cancel order with reason*, or *Restock and retry*. Never a silent failure and never negative stock.
5. **Cancel**: if `stock_committed_at` set and `stock_restored_at` null → restore stock once and set `stock_restored_at`; otherwise just cancel. Idempotent.
6. **Product deleted/hidden after order**: order keeps its snapshot; confirmation blocks only if the product record no longer exists — owner is told which line and can edit/cancel.
7. **Other statuses** (fulfilled/completed etc.) follow existing transitions unchanged.
8. **Owner notification.** Orders screen: source filter, "Online" badge, and a **new order indicator** (count of pending storefront orders with `owner_seen_at` null). Short polling every 30 s (pause when the tab is hidden; exponential backoff on errors up to 2 min; resume on focus). Browser tab title shows `(n)`. Opening an order marks it seen.
9. POS/manual order behavior and inventory effects remain exactly as before (proved by the characterization tests).

---

## 13. Availability and subscription

- Public resolver checks, in order: site exists → subscription active (existing check, read-only) → site status → ordering flag.
- Suspended: branded unavailable page (503). Owner dashboard behavior remains governed by the existing subscription logic; the CMS adds no separate lock. If the existing dashboard remains accessible when suspended, the builder is **read-only** with a "Renew subscription" banner (edits and publish disabled, data intact).
- Reinstated: everything returns automatically (cache revalidation on subscription change, TTL as fallback). No republish needed.
- Pending online orders during suspension/unpublish/pause remain visible to the owner and processable per existing rules.

---

## 14. Security and tenancy

- Every repository/query includes `organization_id`. Provide a single helper (e.g. `TenantScope`) and use it everywhere in the CMS module; lint/test for raw queries missing the filter.
- IDs from the client (page, section, asset, product, category IDs inside documents) are re-verified to belong to the caller's organization at save **and** publish time. Documents referencing foreign IDs are rejected (`VALIDATION_FAILED`), never rendered.
- Public endpoints resolve tenant only from slug; never accept `organizationId`, prices, totals, names, or tax from the client.
- Input validation on all DTOs; strict allow-lists for section types/fields; unknown fields stripped; size limits enforced. No HTML rendering of owner text; React escaping only. `url` links limited to `https:`; `tel:`/WhatsApp links built server-side from validated numbers.
- Public routes: CORS allow-list built from `STOREFRONT_ROOT_DOMAIN` (+ `localhost` in dev). Rate limits per IP+storefront on quote/order/lookup (in-memory locally; Redis-backed in production — document in `CMS_NOTES.md`).
- Uploads: magic-byte sniffing, size/dimension caps, re-encoding, randomized names, no SVG/HTML, safe headers, path traversal impossible (storage keys generated server-side).
- Order tokens are ≥128-bit random. Lookup requires token or number+phone; error messages are generic.
- Logs never contain phone numbers, addresses, AI text, tokens or secrets in full.
- Secrets: `JWT_SECRET`, `CONFIRMATION_TOKEN_SECRET`, `STOREFRONT_REVALIDATE_SECRET` (shared by backend/frontend), `AI_API_KEY`. Never `NEXT_PUBLIC_*`.
- Revalidation endpoint requires the shared secret and rejects unknown slugs quietly.

---

## 15. Edge-case catalog (each must be implemented and tested)

### Setup and slug
| # | Situation | Required behavior |
|---|---|---|
| 1 | Two shops claim the same slug simultaneously | DB unique constraint wins; loser sees "Just taken" + suggestions; no 500 |
| 2 | Slug reserved/invalid/too short | Inline reason; cannot continue until fixed |
| 3 | Owner abandons wizard midway | Progress saved; checklist card resumes; nothing public |
| 4 | Owner double-submits "Create site" | Idempotent; returns the existing site |
| 5 | Shop already has products but none visible | Wizard step 3 offers one-click show-all; empty site still publishable with warning |
| 6 | Slug changed after publish | Alias 301 for 30 days, caches invalidated for both, limited to 3 changes/30 days |
| 7 | Old slug requested after alias expired | Standard not-found page |
| 8 | Another shop wants an alias slug during the window | Rejected as taken/reserved |

### Drafts, saving, concurrency
| # | Situation | Required behavior |
|---|---|---|
| 9 | Two users/tabs edit the same page | 409 conflict modal (§8.7); both versions preserved |
| 10 | Save fails (offline/5xx) | Local buffer + retry + banner; restore prompt on reload |
| 11 | Session expires mid-edit | Re-auth modal; buffer preserved; auto-resume |
| 12 | Permission revoked mid-edit | Friendly message; buffer preserved; read-only view |
| 13 | Draft exceeds size/section limits | Precise message ("Max 20 sections"); prior draft untouched |
| 14 | Draft references a deleted asset/product/category | Draft saves; editor shows placeholders/warnings; publish check reports |
| 15 | Owner deletes a section by mistake | Undo toast; also recoverable via revisions |
| 16 | Browser tab closed with unsaved edits | `beforeunload` warning; buffer restored on next open |
| 17 | Malformed/legacy document version | Migrate on read; unknown parts preserved and skipped in render, not crash |

### Publishing
| # | Situation | Required behavior |
|---|---|---|
| 18 | Blocking errors on some items | Those items excluded; others publishable |
| 19 | Draft changed after dialog opened | `STALE_ITEMS`; dialog refreshes; nothing published |
| 20 | Double click on Publish / retry after timeout | Idempotency key; second call returns same result |
| 21 | Server error mid-publish | Transaction rolls back; live site unchanged; retry offered |
| 22 | Cache invalidation fails | Publish succeeds; error logged; TTL ensures freshness ≤60 s |
| 23 | Page links to unpublished page | Warning + "Also include"; at render, link hidden if still unpublished |
| 24 | Staff without publish permission | Disabled Publish + "Request publish"; owner sees request |
| 25 | Two publishers at once | Site row lock serializes; second sees stale-items if overlapping |
| 26 | First publish without phone | Blocking check with inline fix |
| 27 | Theme fails contrast | Blocking with "Use suggested color" |
| 28 | Publish when subscription suspended | Blocked with renew message |

### Unpublish, delete, restore, takedown
| # | Situation | Required behavior |
|---|---|---|
| 29 | Unpublish a page linked from menu/buttons | Menu entry removed automatically; buttons hidden at render; no republish needed |
| 30 | Delete a published page | Immediate offline, Trash 30 days, dependent links hidden, confirmation states consequences |
| 31 | Delete/unpublish Home | Not allowed; explain "Home can't be removed. Replace its content or unpublish the whole shop." |
| 32 | Restore page whose slug is now used | Prompt for a new slug |
| 33 | Restore formerly-live page | Returns as Offline; publish explicit |
| 34 | Trash retention passes | Purged by job with revisions; UI shows countdown |
| 35 | Take down a never-published section | Action disabled with explanation |
| 36 | Take down the only visible section of a live page | Allowed; page renders empty-state friendly message (not blank) and check warns |
| 37 | Unpublish site with pending orders | Orders untouched; owner notified pending orders still need handling |
| 38 | Republish after unpublish | Goes through normal checks; site returns with previous content if unchanged |
| 39 | Reset to template | Checkpoint first; Undo available |

### Content, products, media
| # | Situation | Required behavior |
|---|---|---|
| 40 | Product deleted/hidden/inactive that a grid references | Skipped at render; builder warns; grid with zero products not rendered |
| 41 | Category deleted or emptied | Nav/grid skips it; category page shows friendly empty state |
| 42 | Price or stock changes after publish | Shown live without republish (§11.4) |
| 43 | Product has no image | Placeholder; "Needs attention" flag |
| 44 | Product has no Bangla name/description | Falls back to English; warning only |
| 45 | Product name changed | Slug unchanged; URLs stay valid |
| 46 | Product slug collision | Numeric suffix |
| 47 | Product page for hidden/deleted product | 404 page with catalog link |
| 48 | Asset deleted while used in published | Blocked with usage list |
| 49 | Upload wrong type/too large/spoofed extension | Clear rejection; nothing stored |
| 50 | Upload interrupted or DB write fails | Retry; orphan file removed/swept |
| 51 | Storage quota reached | Message + unused-assets shortcut |
| 52 | Image alt missing | Falls back to headline/product name; warning only |
| 53 | Bangla enabled but text missing | Default-locale fallback + warning; never blank |
| 54 | Owner pastes HTML/script | Stored and rendered as plain text |
| 55 | External link malformed / non-https | Field error; cannot publish invalid link |
| 56 | Very long text | Counter + limit; no layout break (CSS wraps) |

### Ordering and checkout
| # | Situation | Required behavior |
|---|---|---|
| 57 | Item became unavailable in cart | Inline issue + Fix my cart; never blocks the whole page |
| 58 | Price changed between cart and submit | 409 with new totals and reconfirm |
| 59 | Client tampers price/tenant/total | Ignored/rejected; server totals only |
| 60 | Cross-store product ID | Rejected |
| 61 | Ordering paused / site closed mid-checkout | Friendly message + phone; cart kept |
| 62 | Double-click / refresh / network retry | Idempotent; one order |
| 63 | Same phone orders repeatedly / bots | Rate limits, honeypot, per-phone daily cap with friendly message |
| 64 | Invalid phone format | Inline error with example |
| 65 | Pickup selected | No address needed; fee 0 |
| 66 | Subtotal below minimum | Explicit message with amount remaining |
| 67 | Free-delivery threshold reached | Fee shown as 0 with note |
| 68 | Customer lost confirmation page | Token in localStorage list or number+phone lookup |
| 69 | Cart in localStorage corrupted/very old | Discarded quietly, empty-cart CTA |
| 70 | Product goes out of stock after order | Order remains pending; confirm handles it (§12) |

### Owner order handling
| # | Situation | Required behavior |
|---|---|---|
| 71 | Confirm with insufficient stock | Blocked, per-line detail, edit/cancel options |
| 72 | Two owners confirm concurrently | Row locks; exactly one decrement |
| 73 | Confirm twice / cancel twice | Idempotent |
| 74 | Cancel confirmed order | Stock restored once |
| 75 | Polling fails | Silent backoff; small "reconnecting" hint; recovers on focus |
| 76 | Storefront order with product later deleted | Snapshot kept; owner guided to edit/cancel |

### AI
| # | Situation | Required behavior |
|---|---|---|
| 77 | AI off/unconfigured | "Use an example" path everywhere |
| 78 | Thin input | Inline 3-question form instead of empty generation |
| 79 | Timeout / provider error / invalid JSON | Retry once → fallback example, no draft change |
| 80 | Output invents number/phone/discount | Rejected; regenerate; fallback |
| 81 | Injection text in product name/user field | Treated as data; no behavior change |
| 82 | Suggestion arrives after user moved on/cancelled | Discarded |
| 83 | Double click on full-homepage generation | One transaction via idempotency key |
| 84 | Monthly quota exhausted | Message with reset date + example fallback |
| 85 | Owner applies suggestion then regrets | Undo; checkpoint for whole-page |

### Platform
| # | Situation | Required behavior |
|---|---|---|
| 86 | Subscription lapses / returns | Overlay only; content untouched; auto-recovery |
| 87 | Cross-tenant IDs anywhere | Rejected at API and publish |
| 88 | Backend down while public site cached | Cached pages served until TTL; checkout shows retry message |
| 89 | Cache stale after product change | ≤30 s; hook revalidates; failure never breaks product save |
| 90 | Unknown host / weird host header | Generic not-found, no crash |

---

## 16. UX, accessibility, performance

- WCAG 2.1 AA: contrast, keyboard operation for all builder actions (including section move buttons), visible focus, landmarks, labels, `aria-live` for save/publish status, focus management in dialogs, reduced-motion respected, touch targets ≥ 44 px.
- Widths verified at **360, 768, 1440** for both the storefront and the builder.
- Loading: skeletons for builder and storefront lists; never a bare spinner > 3 s without an explanation and retry.
- Copy: short, plain, non-technical; English and Bangla for every user-facing string, including errors. Confirmation dialogs name the consequence ("This page will go offline immediately").
- Performance targets on the public storefront (mid-range phone, throttled 4G): LCP ≤ 2.5 s for home, CLS < 0.1; JS kept minimal (server components; cart/checkout are the only client-heavy parts). Builder preview must not re-fetch the world on each keystroke (debounce, local state).
- Bangla typography: fonts with proper Bangla glyphs; line-height tuned; no text truncation that breaks conjuncts.

---

## 17. Configuration (document in `.env.example` files)

Backend: `DATABASE_*`, `JWT_SECRET`, `CONFIRMATION_TOKEN_SECRET`, `STOREFRONT_ROOT_DOMAIN`, `STOREFRONT_REVALIDATE_SECRET`, `STOREFRONT_REVALIDATE_URL`, `STOREFRONT_UPLOAD_DIR`, `STOREFRONT_MAX_UPLOAD_MB`, `STOREFRONT_ASSET_QUOTA_MB`, `STOREFRONT_TRASH_DAYS` (default 30), `CMS_AI_ENABLED` (default `false`), `AI_API_KEY`, `CMS_AI_MODEL`, `CMS_AI_TIMEOUT_MS` (default 20000), `CMS_AI_USER_LIMIT`, `CMS_AI_ORG_LIMIT`, `CMS_AI_USER_MONTHLY_LIMIT`, `CMS_AI_ORG_MONTHLY_LIMIT`.
Frontend: `NEXT_PUBLIC_STOREFRONT_ROOT_DOMAIN`, `STOREFRONT_REVALIDATE_SECRET` (server-only), API base URL per existing convention.

Local development: PostgreSQL, filesystem uploads, in-memory public rate limits, single backend + frontend. `demo.localhost:3000` and `localhost:3000/store/demo` both work. Uploaded files are Git-ignored; back up DB + uploads together.

Scheduled jobs (use existing scheduler if present, otherwise a simple Nest scheduled task): daily Trash purge; alias expiry cleanup; nightly orphan-asset sweep; monthly AI counter reset (or computed by month window).

---

## 18. Delivery phases and acceptance criteria

### Phase 0 — Discovery and guardrails
- Inspect repo; write `CMS_NOTES.md` (stack findings, existing order/stock/permission/subscription behavior, decisions, conflicts).
- Add characterization tests for POS/manual orders and stock.
- **Done when**: tests green; no production code changed except test files.

### Phase 1 — Schema and shared logic
- Migrations for §6 (sites, pages, revisions, assets, aliases, ai audit, product columns, order columns, permission seed), tenant-aware indexes, backfills (products `storefront_visible=false`; orders `source`).
- Shared idempotent stock commit/restore helper; existing POS/manual paths call it only if behavior is provably identical, else leave them untouched.
- **Done when**: migrations run on clean and populated DBs and roll back; characterization tests still pass; helper unit-tested for concurrency and idempotency.

### Phase 2 — CMS backend
- Site/pages/settings/assets/products-online/templates/trash/revisions/checks/publish/takedown/unpublish/slug change/ordering pause endpoints; validators; permissions; optimistic concurrency; jobs.
- **Done when**: cross-tenant tests pass for read/write/upload/publish; draft edits never change published data; publish is atomic and idempotent; all §15 backend cases (1–39, 40–56 server side) covered by tests.

### Phase 3 — Owner UI
- Website entry, setup wizard, builder (desktop + 360px), section editors, EN/BN tabs, pages list, trash, revisions, products online, publish dialog, checks/fixes, conflict/offline handling, theme/settings.
- **Done when**: the whole flow "new shop → wizard → edit → publish → edit → republish → unpublish → delete → restore" works with keyboard only and at 360/768/1440; AI buttons show "Use an example" (AI not built yet).

### Phase 4 — Public storefront
- Middleware/routing, resolver states, shared renderer, catalog, product page, cart with quote, checkout, confirmation, tracking, SEO, sitemap, caching/revalidation, branded state pages.
- **Done when**: all §11 behaviors and §15 cases 40–70 pass in tests; Lighthouse/axe show no serious violations; public site works with AI disabled.

### Phase 5 — Orders integration
- Storefront order intake, customer matching, source filter/badge, unseen indicator + polling, confirm/cancel via shared helper, insufficient-stock flow.
- **Done when**: §12 and cases 57–76 pass; concurrent confirmation never oversells; POS/manual regression tests unchanged.

### Phase 6 — AI
- Provider adapter (server-side), schema validation, protected-fact and safety checks, quotas, audit metadata, UI panel, fallbacks, whole-homepage generation.
- **Done when**: cases 77–85 pass with a mocked provider (timeout, invalid JSON, injection, invented numbers, quota); with `CMS_AI_ENABLED=false` nothing else changes.

### Phase 7 — Hardening
- Accessibility pass, performance pass, locale check, seeded end-to-end tests, docs (`CMS_NOTES.md` final: setup, env, jobs, limitations, production checklist: wildcard DNS/TLS, object storage, Redis rate limiting, monitoring, backups).
- **Done when**: §20 definition of done is satisfied.

---

## 19. Test plan (minimum)

- **Tenant isolation:** two orgs cannot read/edit/publish/upload/order against each other's resources (incl. foreign IDs embedded in documents).
- **Draft vs live:** draft edits never alter public output until publish; section badges correct.
- **Lifecycle:** publish → edit → republish; unpublish/republish; delete → trash → restore; take down section; home protection; alias redirect.
- **Publish atomicity/idempotency/staleness** under simulated failures.
- **Concurrency:** save conflicts; simultaneous publish; simultaneous order confirmations (no oversell); double order submit (one order).
- **Order integrity:** tampered prices/totals/product IDs ignored/rejected; hidden/inactive/paused/suspended blocked; stock unchanged until confirm; restore once on cancel.
- **Graceful rendering:** deleted product/category/asset/page never breaks public pages.
- **i18n:** EN/BN switching, fallbacks, hreflang, metadata, price formatting.
- **AI (mocked provider):** disabled, timeout, malformed, injection, invented facts, quota, cancel, double click; audit contains no text.
- **Security:** upload spoofing, oversize, path traversal, XSS strings, CORS, rate limits, token guessing.
- **Accessibility:** automated axe on builder + storefront at 3 widths; manual keyboard walkthrough of section reorder and publish.
- **Regression:** the Phase 0 characterization tests; existing `build`, unit, locale, UI and e2e list checks (`npm run build`, `npm test -- --runInBand`, `npm run check:locales`, `npm run check:ui`, `npm run test:e2e:list`).

---

## 20. Definition of done

1. Every principle in §2 is demonstrably true (each has at least one test or manual check listed in `CMS_NOTES.md`).
2. Every row of §15 has an automated test or a documented manual check.
3. No file outside §3.2's allowed touch points changed behavior; Phase 0 regression tests pass unchanged.
4. Owner can go from zero to a live, orderable shop in under 10 minutes without AI, and the AI only makes it faster.
5. A customer can browse, order, and find their order status on a 360px phone without any dead end.
6. The app builds, all tests pass, migrations are reversible, and `CMS_NOTES.md` lists decisions, conflicts, env vars, jobs, and known v1 limitations.
