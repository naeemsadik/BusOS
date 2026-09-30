# BusOS CMS implementation notes

Authoritative specification: `CMS_Plan_C.md`. The untracked specification file is intentionally never modified or staged.

## Phase checklist

- [x] Phase 0 — Discovery and guardrails
- [x] Phase 1 — Schema and shared logic
- [ ] Phase 2 — CMS backend
- [ ] Phase 3 — Owner UI
- [ ] Phase 4 — Public storefront
- [ ] Phase 5 — Orders integration
- [ ] Phase 6 — AI
- [ ] Phase 7 — Hardening

## Preflight and baseline

- Branch: `feature/cms-storefront`, created from `feature/cms-ai-page-builder`; no commits made.
- Clean-tree exception: only untracked `CMS_Plan_C.md` is allowed.
- Dependency install: backend `npm ci` and frontend `npm ci --legacy-peer-deps` passed.
- Backend baseline: `npm run build` passed; Jest 5/5 suites, 25/25 tests passed.
- Frontend baseline: `npm run build` passed; Vitest 7/7 files, 20/20 tests passed.
- Locale parity baseline: passed, 218 messages.
- UI glyph baseline: passed.
- Playwright discovery baseline: passed, 144 tests in 4 files listed.
- Database safety: after explicit user authorization, the existing PostgreSQL 18.6 database was inspected and backed up in full custom format before migration work (`busos-existing-before-cms-c-20260930-115441.dump`, 140,889 bytes, stored outside the repository). It contains 41 public tables and all seven legacy migrations through `1790400000000` are recorded. CMS migration work will also be exercised against disposable clean/populated fixtures before it is applied here.
- Dependency audit output (not changed automatically): backend reported 17 vulnerabilities (12 moderate, 5 high); frontend reported 6 (1 low, 2 moderate, 2 high, 1 critical). Dependency remediation is outside CMS scope unless a CMS implementation requires it.

## Stack findings

- Backend: NestJS 11, TypeORM 0.3, PostgreSQL, class-validator, Jest. `synchronize` is disabled and migrations run through `backend/src/database/data-source.ts`.
- Frontend: Next.js 15 App Router, React 19, next-intl message catalogs, Tailwind/Radix components, Vitest, Playwright and axe.
- Existing CMS: `backend/src/storefront`, `frontend/features/storefront`, shared public renderer, host middleware, local filesystem asset storage, public catalog/order routes, and AI suggestion services.
- Existing migrations must remain immutable: `1790200000000-CreateStorefrontCms` and `1790400000000-CreateStorefrontPages`.

## Existing implementation vs spec

| Area | Disposition | Audit result and reason |
|---|---|---|
| Old migrations | **Keep** | They are already branch history. All v2 changes will use new reversible migrations; no old migration will be edited or deleted. |
| Tenant-scoped service queries | **Keep and strengthen** | Most CMS/page/product/order reads already include organization scope. Introduce one tenant-scope helper and add embedded foreign-ID and cross-tenant tests. |
| Optimistic draft versions | **Keep and change** | Existing site/page saves detect version conflicts. Add stable error codes, both-version preservation, checkpoint behavior, local recovery UX, and publish staleness checks. |
| Published snapshots | **Keep and change** | Draft/published JSON separation exists. Move to v2 settings/page lifecycle and atomic multi-item publishing while preserving live snapshots on failure. |
| Page revisions | **Keep and change** | Revisions exist but use the old origin/version model. Evolve to published/checkpoint kinds, labels, site-setting revisions and separate retention limits. |
| Asset storage and magic-byte inspection | **Keep and change** | Tenant ownership, randomized paths and cleanup on DB failure exist. Add site ownership, metadata/deletion state, quota, dimensions/re-encoding/responsive variants, usage reporting and orphan sweep. |
| Product storefront fields and slug generation | **Keep and change** | Most additive fields and stable slug generation exist. Correct the old `storefrontVisible=true` migration outcome with a new safe migration/backfill policy, add cache hooks and Products Online management. |
| Order source and stock timestamps | **Keep and change** | Source/filter and commit/restore timestamps exist. Add all v2 order metadata, public token, seen state, delivery/customer snapshots and tenant-aware idempotency. |
| Shared stock transition helper | **Keep and harden** | Product and order row locking, stable product ordering and idempotent commit/restore exist. Add characterization/concurrency tests and clearer insufficient-stock detail. POS behavior stays unchanged. |
| Website permission module | **Keep and change** | `website` is already present in the legacy four-boolean permission model. Map view/edit/publish explicitly, keep owner override, default staff to none, and add request-publish behavior/friendly denial. |
| Subscription checks | **Keep and change** | Existing active/trial date logic is reusable read-only. Expose v2 suspended overlays/read-only builder behavior without altering billing/subscription records. |
| Page service and templates | **Change** | Existing page types, states, archive behavior, direct per-page publish and URL strings differ from v2. Evolve to home/custom, offline/trash, ID links, required templates, checks and lifecycle actions. |
| Site entity/settings | **Change** | Existing site has old `inactive` status and split theme/SEO/order fields plus legacy document columns. Add v2 draft/published settings, setup progress, ordering, publish request, profile and slug history without dropping data. |
| Document schema/validator | **Change** | Existing schema uses `version`, fixed header/footer inside every document, camel-case section names and URL strings. Add schemaVersion 1 v2 sections/links, draft-tolerant structural validation, publish checks and safe legacy read migration. |
| Publishing | **Change** | Existing site and page publish paths are independent and publish permission is mapped to edit. Implement preview selection, publish-only permission, site row lock, versions/idempotency, one transaction and revisions. |
| Public API | **Change** | Catalog/detail/basic order intake exist. Add resolver states, home endpoint, quote, lookup, ordering pause, normalized phone/customer matching, current-total conflicts, per-phone limits and stable errors. |
| Storefront routing/rendering | **Keep and change** | Subdomain rewrite, direct fallback, SSR metadata, JSON-LD and a shared renderer exist. Align route names, host hardening, branded states, sitemap/robots, unknown-schema skipping and graceful empty/missing references. |
| Builder UI | **Change** | Existing builder has page/section editing, move buttons, preview, autosave/local buffer, revisions and AI controls. It lacks the v2 six-step setup, mobile tab layout, complete settings/products/trash/publish dialog, conflict choices, presence and full localized copy. |
| Cart/checkout/confirmation | **Change** | A basic local cart and COD submission exist. Add server quote, 30-day expiry, issue repair, delivery/pickup, totals reconfirmation, retry/idempotency UX, `/order/[token]`, lookup and recent orders. |
| Orders UI | **Keep and change** | Source filtering/badges and best-effort polling exist. Add persisted unseen state/API, mark-seen, 30-second visibility-aware exponential backoff and localized copy. |
| AI service | **Keep and change** | Server adapter, quotas, audit metadata, outline/page/field/translate/review and deterministic fallback exist. Align actions/schema, thin-input flow, protected facts, retry/cancel semantics, outcomes and kill-switch UX with v2 cases 77–85. |
| Global CORS | **Change back to scoped behavior** | Current `main.ts` accepts wildcard storefront subdomains globally. v2 permits storefront CORS only on new public routes; global behavior otherwise remains as existing and is documented as permissive. |
| Removals | **None yet** | No working feature or file has been removed. Obsolete v1 paths/types will only be retired when their v2 replacement is verified, and any removal will be recorded here first. |

## Existing order, stock, permission and subscription behavior

- POS creation writes a confirmed `source=pos` order in a transaction, snapshots line price/cost, locks tenant products, and commits stock immediately through `OrderInventoryService`.
- Manual order creation writes an order and items but does not currently commit stock until a status transition confirms it. It auto-attempts invoice creation without failing the order when invoice creation fails.
- Status transitions are currently: pending → confirmed/cancelled; confirmed → processing/cancelled; processing → shipped/cancelled; shipped → delivered/returned; delivered → returned. Commit occurs on confirm; restore occurs once on cancel/return when stock was committed.
- The stock helper locks the tenant order and tenant products, sorts product IDs before locking, blocks insufficient stock when backorders are disallowed, and uses commit/restore timestamps for idempotency.
- Owners bypass module permission rows. Staff permissions use view/create/edit/delete booleans; website currently reuses those actions and therefore needs an explicit v2 publish mapping.
- Subscription activity is active-through-end-date or trial-through-trial-end-date. CMS may read this result only.

## Decisions

- Preserve all legacy CMS tables/columns and migrate data in place; add/rename-compatible columns and enums through new migrations rather than recreate tables.
- The user explicitly authorized the configured existing database for this task. It was backed up before any migration work; implementation migrations are still tested first on separately named disposable localhost databases on port 5433.
- Keep English as a supported locale but allow Bangla to be the default, as required by v2; missing localized content falls back to the configured default and then English.
- Preserve existing POS/manual semantics first. Storefront-only stock timing is pending → confirm commit; cancellations restore once.
- Retain short in-memory public rate limiting locally. Production Redis remains a documented deployment requirement.

## Conflicts

- Legacy migration `1790200000000` defaulted existing `storefrontVisible` to true and populated every product slug. v2 requires existing products not to become public silently. A new migration and conservative populated-database backfill are required.
- Legacy site status enum uses `inactive`; v2 requires `unpublished` plus a non-persisted suspended overlay.
- Legacy page status uses `archived` and clears published snapshots on unpublish/archive; v2 requires `unpublished`, soft Trash, and preserved snapshots/revisions.
- Legacy Home can be unpublished and returned to draft; v2 forbids page-level Home unpublish/delete.
- Legacy document save performs publish-level completeness validation. v2 drafts accept incomplete content and enforce completeness only during checks/publish.
- Legacy permissions use create/edit/delete while v2 names website view/edit/publish. Existing permission storage must be mapped without changing unrelated modules.
- Current builder/storefront CMS strings are mostly hard-coded instead of using the existing EN/BN catalogs.
- Current global CORS accepts storefront wildcard origins for every route. v2 limits storefront-origin CORS to public storefront routes. Existing global CORS outside that addition remains permissive and is not otherwise refactored.

## Deferred / blockers

- Phase 1 migration verification: `1790500000000-EvolveStorefrontCmsV2` applied and reverted successfully on a schema-only pre-CMS fixture and applied → reverted → applied successfully on a populated clone of the authorized database. The fixed `npm run migration:*` scripts now pass the TypeORM data-source argument in the correct position.

- The repository has no baseline migration that creates the original application schema: running the full legacy migration chain on a literally empty database fails at `1642000000000` because `orders` does not exist. This pre-existing problem will not be “fixed” by adding unrelated schema migrations. CMS migration clean/populated/rollback verification uses explicit pre-CMS fixtures, while the authorized existing database provides the populated upgrade path.
- `npm run migration:run` created/read the migration ledger but did not execute pending migrations in the empty disposable database, whereas direct `DataSource.runMigrations()` correctly reported the missing base table. New CMS migration tests will call TypeORM directly so failures cannot be silently missed.

## Current phase status and verification

- Phase 2: core CMS endpoints, tenant scoping, optimistic versions, lifecycle operations, publishing, products-online, assets, slug aliases and maintenance jobs are implemented. Acceptance remains incomplete because every server-side edge case in 1-56 does not yet have its own automated test.
- Phase 3: the existing builder was extended with setup/checklist, products-online, Trash, ordering/site lifecycle actions, localized editing, limits and responsive controls. Acceptance remains incomplete: the full six-screen wizard, presence indicators, the three-choice conflict comparison modal and a complete offline/reauth/revoked-permission UX are not implemented to the specification.
- Phase 4: SSR storefront, path/subdomain routing, states, catalog/product/cart/quote/checkout/confirmation/lookup, Bangla route, SEO, sitemap and robots are implemented. Path-mode navigation was corrected during E2E verification. Acceptance remains incomplete for all catalog/media edge cases and formal performance budgets.
- Phase 5: storefront orders, source badge/filter, persistent unseen state, polling/backoff, stock commit/restore and insufficient-stock blocking are implemented. Live API checks confirmed confirm/cancel idempotency and exactly-once stock behavior. A true simultaneous two-owner database concurrency test remains outstanding.
- Phase 6: disabled-provider deterministic fallback and mock tests for timeout, malformed JSON, invented numbers and quota exhaustion pass. Thin-input questions, late-result cancellation and complete apply/undo UX remain incomplete.
- Phase 7: clean/populated migration cycles, seed data, tenant isolation, API lifecycle checks, production builds, unit tests, Playwright, axe and 360/768/1440 screenshots were run. Object-storage deployment, Redis-backed distributed limits, responsive image variants/re-encoding, orphan-disk sweeping and complete message-catalog migration remain production work.

### Latest verified results

- Backend: build passed; Jest 10/10 suites and 37/37 tests passed.
- Frontend: production build passed; Vitest 7/7 files and 20/20 tests passed; locale parity passed for 218 messages; UI glyph check passed.
- Playwright discovery: 168 tests in 5 files after adding CMS visual coverage.
- Playwright full unseeded matrix: 24 passed and 144 intentionally skipped because their seeded credentials/data flags were absent; the CMS visual seeded run passed 6/6 at 360, 768 and 1440; seeded owner navigation, storefront publish/orders navigation, path-mode Bangla navigation and COD checkout each passed in controlled runs.
- Accessibility: CMS builder and public storefront WCAG A/AA axe checks and full-page screenshots passed at 360, 768 and 1440. Pre-existing application-shell landmark best-practice warnings were kept out of the CMS-scoped audit and were not changed because the shell is outside CMS scope.
- Migrations: final rollback/apply/rollback/apply cycles passed on both `busos_cms_clean_test` and `busos_cms_populated_test`; both databases were backed up immediately before the cycles. The authorized configured database remains on all eight migrations.
- Live API: tenant read/edit/publish/product/order isolation returned 404/422 as appropriate; Home lifecycle actions returned 400; custom page publish/unpublish/republish/takedown/Trash/restore passed; ordering pause returned 423; site closed/live transitions passed; order lookup passed; insufficient-stock confirmation returned 400 without changing stock.

## Known limitations / differences from `CMS_Plan_C.md`

- Setup is a compact guided builder/checklist, not the exact six-step wizard described in section 8.1.
- Conflict handling preserves the local buffer and reports a conflict, but does not yet provide the specified Reload / Keep mine as copy / Compare modal or presence avatars.
- Asset validation/quota/usage and safe randomized storage exist; server-side re-encoding, responsive variants and a full orphan-file sweep do not.
- The renderer remains backward compatible with the existing version-1 document shape while accepting the new structural shape; it is not a complete schema-v1 ID-link migration of every legacy document.
- A number of new CMS labels remain component-local instead of being fully moved into both next-intl catalogs. Existing catalog parity still passes.
- AI failure fallback is deterministic, but the provider adapter currently falls back after the first failed request rather than performing the exact one automatic retry described in edge case 79.
- In-memory caches/rate limits are suitable for this local demo only. Production still requires shared Redis, object storage/CDN, wildcard DNS/TLS, monitoring and backup/restore procedures.

## Automated project demonstration

- Added `scripts/demo-test.ps1` with guarded `Smoke` and `Full` modes. It overwrites database configuration in-process, refuses reset/seed outside localhost or a database ending in `_demo_test`, and redirects provider traffic to a local simulator.
- Added deterministic seed coverage for owner, staff, admin, a second tenant, operations, HRM, CMS, SMS balance and mock payment records. Production TypeORM synchronization remains disabled; synchronization is enabled only inside the guarded disposable-database reset script.
- Verified production builds for backend, owner frontend and admin frontend. The production backend entry point was restored to `dist/main.js` by excluding demo scripts from `tsconfig.build.json`.
- Verified critical smoke tests: backend 7/7 suites and 25/25 tests; frontend 7/7 files and 20/20 tests; Playwright demonstration 14/14 tests with no skips. The browser portion completed in 1.3 minutes and the complete runner reached the browser stage in about 5.3 minutes.
- Verified the full backend suite after adding the email JSON-transport tests: 11/11 suites and 39/39 tests. Frontend coverage ran 20/20 tests and truthfully reported 6.98% global line coverage; no higher coverage claim is made.
- Verified frontend locale parity (218 messages), admin locale parity (17 messages), and both UI glyph checks. Verified by negative test that the reset script refuses a remote/SSL database target before opening a connection.
- PostgreSQL 16 system installation could not be completed from the non-elevated Codex Windows session. End-to-end validation used an existing disposable PostgreSQL 18.6 instance under Windows Temp; `TESTING_DEMO.md` contains the Administrator PowerShell command required for the permanent PostgreSQL 16 setup.
- Full mode is implemented but the complete 168-case viewport/locale/theme Playwright matrix was not rerun during this demonstration-harness change. Existing CMS matrix results remain recorded above.

## Section 15 edge-case coverage

Legend: **Automated** = a repeatable unit/E2E assertion; **Scripted** = exercised against the running app/API and authorized demo DB; **Partial** = some required behavior exists or was checked, but the full case is not proven; **Not done** = missing or not independently verified. This table deliberately does not infer coverage from implementation alone.

| # | Coverage | Evidence / gap |
|---:|---|---|
| 1 | Not done | Unique DB constraint exists; simultaneous slug race and friendly loser response were not exercised. |
| 2 | Partial | Slug validator/reserved responses exist; full inline UI matrix not exercised. |
| 3 | Partial | Setup progress is persisted; abandon/resume browser flow not exercised. |
| 4 | Partial | Create is idempotent in service; double-submit was not independently tested. |
| 5 | Scripted | Isolation shop published with zero products; Products Online/show-all UI exists. |
| 6 | Partial | Alias, 30-day expiry, max-change and invalidation logic exists; 301/limit cycle not exercised. |
| 7 | Not done | Expired-alias behavior not time-travel tested. |
| 8 | Partial | Alias participates in availability; two-shop collision not exercised. |
| 9 | Partial | Optimistic 409 exists and buffers are preserved; specified three-choice comparison modal is missing. |
| 10 | Partial | Local retry buffer/banner exists; forced offline/5xx recovery was not exercised. |
| 11 | Not done | Re-auth modal/automatic resume is not complete. |
| 12 | Not done | Revoked-permission read-only recovery is not complete. |
| 13 | Automated | Document size/section limits are validator-tested; UI enforces the 20-section cap. |
| 14 | Partial | Draft validation is tolerant; missing-reference warning matrix not exercised. |
| 15 | Partial | Revisions exist; specified delete-section Undo toast was not exercised. |
| 16 | Partial | `beforeunload` and local buffer exist; close/reopen recovery not exercised. |
| 17 | Automated | Legacy structural documents are accepted and renderer tests cover safe rendering; complete ID-link migration is partial. |
| 18 | Partial | Publish preview/checks exist; mixed blocking/publishable selection not exercised. |
| 19 | Partial | Version checks return stale conflicts; dialog refresh/zero-publish assertion not exercised. |
| 20 | Partial | Publish idempotency storage exists; publish timeout retry was not exercised. |
| 21 | Partial | Publish uses a transaction; injected mid-transaction failure was not tested. |
| 22 | Partial | Invalidation failures are best-effort; failure logging/TTL assertion not tested. |
| 23 | Not done | “Also include” dependency UX was not verified. |
| 24 | Partial | Publish permission/request endpoint exists; staff denial/request UI was not exercised. |
| 25 | Not done | Simultaneous publisher serialization was not load-tested. |
| 26 | Partial | First-publish phone check exists; inline fix flow not exercised. |
| 27 | Not done | Complete contrast blocker/suggested-color flow is missing. |
| 28 | Partial | Subscription overlay/check integration exists; suspended publish was not exercised. |
| 29 | Scripted | Custom page unpublish passed; dependent menu/button behavior is implemented but only partially observed. |
| 30 | Scripted | Published page delete → Trash passed against the demo DB. |
| 31 | Scripted | Home unpublish and delete both returned 400. |
| 32 | Partial | Restore accepts replacement slug; collision prompt was not exercised. |
| 33 | Scripted | Restored formerly-live page returned offline. |
| 34 | Partial | Daily purge job/countdown data exists; retention time travel was not tested. |
| 35 | Not done | Never-published takedown disabled explanation not exercised. |
| 36 | Partial | Live section takedown passed; only-visible-section empty state was not exercised. |
| 37 | Scripted | Site was unpublished while pending demo orders existed; orders remained present. |
| 38 | Scripted | Unpublish → closed state → republish → live state passed. |
| 39 | Not done | Reset-to-template checkpoint/Undo flow was not exercised. |
| 40 | Partial | Public queries skip non-public products; referenced-grid warning/zero-grid rendering not fully exercised. |
| 41 | Partial | Empty catalog states exist; deleted/emptied-category path was not exercised. |
| 42 | Scripted | Stock changes were visible without republishing during order verification. |
| 43 | Scripted | Seeded no-image product rendered during storefront visual/E2E runs. |
| 44 | Scripted | Seeded missing-Bangla product and `/bn` fallback path were exercised. |
| 45 | Not done | Product rename/stable URL was not exercised. |
| 46 | Partial | Stable numeric-suffix slug generation exists; collision test not added. |
| 47 | Partial | Hidden products return not found; catalog-link 404 presentation not independently checked. |
| 48 | Partial | Asset usage endpoint/blocking logic exists; live-use delete was not exercised. |
| 49 | Automated | Magic bytes, spoofed content, extreme dimensions and traversal are tested; multipart size is configured. |
| 50 | Partial | DB-failure cleanup exists; interrupted upload/orphan sweep is incomplete. |
| 51 | Partial | Storage quota response exists; unused-assets shortcut not exercised. |
| 52 | Partial | Fallback logic exists; explicit missing-alt warning test not added. |
| 53 | Scripted | Bangla route and English fallback were exercised and did not render blank. |
| 54 | Automated | React renderer and no-HTML schema keep content as text; unsafe section/link inputs are validator-tested. |
| 55 | Automated | Unsafe links are rejected by validator tests; exact non-HTTPS field UX remains partial. |
| 56 | Automated | Field limits plus 360/768/1440 overflow checks passed. |
| 57 | Scripted | Sold-out/unavailable quote returned item issues; browser cart repair UI was not fully exercised. |
| 58 | Partial | Expected-total 409 behavior exists; price mutation during browser checkout was not exercised. |
| 59 | Scripted | Checkout used server quote/current total and ignored client pricing fields. |
| 60 | Scripted | Isolation storefront rejected the demo shop product with issue/422. |
| 61 | Scripted | Paused checkout returned 423; site unpublish returned closed state and cart code preserves local state. |
| 62 | Scripted | Same checkout idempotency key returned the same order; changed payload returned conflict. |
| 63 | Automated / Partial | Request-key rate limiting is unit-tested and honeypot/cap exist; daily-cap browser message not exercised. |
| 64 | Partial | Bangladesh phone normalization/validation exists; full inline UI formats not exercised. |
| 65 | Scripted | Pickup quote/order used no address and zero fee. |
| 66 | Scripted | Minimum-order rejection reported the remaining amount during API verification. |
| 67 | Partial | Free-delivery calculation exists; threshold note was not exercised. |
| 68 | Scripted | Number+phone lookup passed; recent token storage is used by browser checkout. |
| 69 | Partial | Corrupt/expired cart is discarded in code; browser storage corruption test not added. |
| 70 | Scripted | Order created before stock became unavailable remained pending; confirm then blocked. |
| 71 | Scripted | Insufficient-stock confirm returned 400 with clear detail and unchanged stock. |
| 72 | Not done | True simultaneous two-owner confirm test is outstanding. |
| 73 | Automated / Scripted | Repeated confirm/cancel is unit-tested and passed against PostgreSQL with no extra stock change. |
| 74 | Automated / Scripted | Confirmed cancel restored stock once in unit and live DB checks. |
| 75 | Partial | Visibility-aware exponential polling/focus recovery exists; forced network failure hint was not exercised. |
| 76 | Partial | Order/customer/product snapshots exist; later product deletion guidance was not exercised. |
| 77 | Scripted | With `CMS_AI_ENABLED=false`, status returned `use_example` and deterministic fallback. |
| 78 | Not done | Specified inline three-question thin-input flow is incomplete. |
| 79 | Automated / Partial | Mock timeout and invalid JSON fall back without draft mutation; exact one automatic retry is not implemented. |
| 80 | Automated | Invented protected numbers are rejected by the AI safety test. |
| 81 | Partial | Prompts explicitly isolate untrusted data; dedicated injection-output behavior test is missing. |
| 82 | Not done | Late-result cancellation/discard was not exercised. |
| 83 | Partial | Full-page idempotency cache exists; double-click transaction test not added. |
| 84 | Automated | Mock monthly organization quota exhaustion throws the configured fallback error. |
| 85 | Partial | Page revisions/checkpoints exist; apply-then-Undo browser flow not exercised. |
| 86 | Partial | Subscription is computed as an overlay and content remains stored; lapse/return cycle not exercised. |
| 87 | Automated / Scripted | Tenant helper tests pass; second org received 404 for first-org page/product reads, edits and publish. |
| 88 | Not done | Backend-down cached page/checkout retry behavior was not fault-injected. |
| 89 | Partial | Product saves use best-effort revalidation; 30-second/failure injection was not tested. |
| 90 | Automated | Middleware host tests cover malformed/multi-level hosts; implementation returns generic not-found. |
