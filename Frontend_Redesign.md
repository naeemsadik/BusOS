## `Frontend_Redesign.md`

### Audit summary

The project contains two separate Next.js applications. The owner/staff frontend has 27 page routes, while major pages such as Orders, POS, and Inventory contain approximately 2,171, 1,429, and 958 lines respectively.

The redesign must address:

- Default-looking neutral shadcn styling and extensive hardcoded colors.
- Inconsistent typography, loading indicators, filters, spacing, alerts, and responsive patterns.
- Oversized client components mixing data access, business logic, and presentation.
- Unsupported marketing claims and inactive controls such as “Watch Demo”.
- Missing accessible names on several icon controls.
- Duplicate sidebar/mobile primitives despite existing shared components.
- Production-risk mock fallback behavior in the admin application.
- Existing emoji and text-arrow usage, which violates the project instruction.

### Visual system

Use the selected bold-commerce direction:

- Warm cream canvas, white surfaces, dark ink text.
- Coral primary action and violet accent.
- Emerald, amber, and red reserved for semantic statuses.
- Dark mode for owner/staff and admin applications.
- Owner-configured light storefront branding without automatic system dark mode.
- Manrope for English and Noto Sans Bengali for Bangla.
- Twelve-pixel default radius, restrained shadows, clear borders, and a consistent spacing scale.
- Motion limited to short state transitions with reduced-motion support.
- Lucide icons only. Replace every emoji, text arrow, and checkmark glyph with an icon.

Define the same token contract in both Next.js applications. Build reusable page headers, toolbars, metric cards, status badges, tables, mobile card lists, empty/error states, skeletons, dialogs, form fields, and locale controls.

### Owner and staff application

Replace the custom shell with the existing accessible sidebar primitives and group navigation into:

- Sell: POS and Orders.
- Catalog: Inventory, Customers, and Suppliers.
- Operations: Expenses, Reports, and Delivery.
- Growth: Website, Content Studio, and SMS.
- Account: Subscription and Settings.

Redesign priority:

1. Dashboard: four essential metrics, attention queue, sales trend, low-stock products, and recent storefront orders.
2. Orders: source/status views, compact filters, responsive cards, detail drawer, and clear fulfillment actions.
3. POS: fast two-pane desktop workflow and bottom-sheet cart on mobile.
4. Inventory: compact health summary, unified toolbar, responsive table, bulk actions, and clearer stock states.
5. Customers, suppliers, expenses, reports, delivery, subscription, settings, profile, and payment states.
6. Marketing and authentication pages with accurate BusOS positioning and CMS/storefront value propositions.

Split oversized pages into feature-level components, hooks, schemas, and service adapters. Preserve existing URLs and business behavior unless the CMS plan explicitly extends them.

### Admin application

Apply the same brand tokens with a denser internal-operations layout.

- Organize navigation around organizations, subscriptions, payments, SMS, users, and platform health.
- Standardize tables, filters, metrics, charts, warnings, and error states.
- Remove automatic production fallback to mock users and mock business data.
- Permit fixture data only through an explicit development setting.
- Present backend failures visibly instead of silently showing believable fake results.

### Bilingual and responsive behavior

Add `next-intl` to both applications and move user-facing text into English and Bangla dictionaries. Persist the application locale to the user profile and a cookie.

- English and Bangla interfaces must have feature parity.
- Existing business data falls back to English when Bangla content is absent.
- Use locale-aware dates, numbers, and currency.
- Test Bangla text wrapping in tables, dialogs, navigation, charts, and narrow screens.
- Replace desktop tables with purposeful mobile card layouts where horizontal scrolling prevents common actions.

### Delivery order

1. Establish tokens, typography, localization, responsive page primitives, and loading/error patterns.
2. Replace both application shells and navigation.
3. Redesign Dashboard, Orders, POS, and Inventory.
4. Redesign remaining owner/staff workflows.
5. Redesign marketing, authentication, CMS builder, and public storefront.
6. Redesign the internal admin application.
7. Complete accessibility, responsive, localization, visual-regression, and performance QA.

Search the 21st catalog before creating complex new UI and run deterministic `21st review` checks before signoff. The current machine lacks Node, npm, and the 21st CLI, so these checks are implementation prerequisites.

### Test and acceptance plan

- Add component tests for shared states, forms, locale switching, and responsive navigation.
- Add Playwright coverage for registration, login, POS sale, inventory editing, storefront publication, public ordering, owner order confirmation, and admin organization management.
- Capture stable screenshots at 360, 768, 1280, and 1536 pixels in English and Bangla; cover internal light and dark modes.
- Run automated accessibility checks and complete keyboard-only review.
- Require no page-level horizontal overflow at 360 pixels and no clipped actions at 200% zoom.
- Require storefront Lighthouse accessibility and performance scores of at least 90 on seeded production builds.
- Add a repository check preventing emoji and text-arrow glyphs in software UI source.
- Run lint, type checking, production builds, backend tests, and critical end-to-end flows before release.

### Assumptions

- Both `frontend/` and `admin/` are included.
- The existing organization remains the tenant boundary.
- Each organization receives one storefront in v1.
- English and Bangla are supported at launch.
- One configurable storefront theme is sufficient.
- Subdomains launch first; custom domains are deferred.
- Storefront checkout is guest, delivery-only, manual confirmation, and cash on delivery.
- Online storefront payments, customer accounts, revision history, plugins, and freeform canvas positioning are deferred.
