# BusOS CMS and Frontend Redesign

## Deliverables

Create two root-level documents: `CMS_Plan.md` and `Frontend_Redesign.md`.

## `CMS_Plan.md`

### Summary

Extend the existing `Organization` model as the tenant boundary. Each organization receives one public storefront backed by its existing products, inventory, customers, and orders.

The first release will provide:

- A responsive section-based website builder.
- One customizable storefront theme.
- English and Bangla storefront content.
- Public storefronts at `<slug>.<STOREFRONT_ROOT_DOMAIN>`.
- Guest ordering with cash on delivery and manual confirmation.
- Online orders inside the existing owner order workflow.
- No custom domains, customer accounts, or online storefront payments in v1.

### Data and interfaces

Add these models and types:

- `StorefrontSite`: unique organization and slug, publication status, enabled/default locales, theme tokens, SEO settings, order settings, draft document, published document, and publication timestamp.
- `StorefrontAsset`: tenant-owned JPEG, PNG, or WebP media with size, MIME type, URL, sort order, and English/Bangla alternative text.
- `StorefrontDocument`: versioned JSON schema containing fixed header/footer settings and ordered typed sections.
- Section types: announcement, hero, category navigation, product grid, promotional banner, image/text, and contact/hours.
- Product additions: tenant-scoped slug, Bangla name and description, long-form descriptions, storefront visibility, and image alternative text.
- Order additions: `source` (`pos`, `manual`, `storefront`), storefront reference, locale, and idempotent stock-commit/restore timestamps.
- User and permission additions: preferred locale and a `website` permission module.

Create TypeORM migrations with tenant-aware unique constraints and indexes. Do not rely on schema synchronization.

### Backend and tenant safety

Create authenticated CMS endpoints for loading settings, saving drafts, uploading assets, and publishing. Saving uses optimistic concurrency; publishing validates the complete document and atomically copies draft content to the published snapshot.

Create public endpoints for:

- Published storefront resolution by slug.
- Paginated active products and product details.
- Storefront order submission.

Public checkout accepts only customer details and `{productId, quantity}` lines. The server determines tenant, prices, tax, shipping, names, and totals. It must reject inactive sites, expired subscriptions, hidden products, invalid quantities, cross-tenant products, and price tampering.

Orders begin as `pending`. Stock remains available until the owner confirms the order. Confirmation locks product rows in a transaction, validates stock, decrements inventory once, and records the commit. Cancellation restores committed stock once.

Apply organization filtering inside every CMS query. Add cross-tenant tests for reads, writes, uploads, publication, and orders. Tighten the current permissive CORS behavior and rate-limit public order submissions by IP and storefront.

### Builder and public storefront

Add a protected Website area containing:

- Setup flow for reserving a unique slug.
- Theme controls for brand colors, typography, radius, contact details, and flat delivery fee.
- English/Bangla content fields with English fallback warnings.
- Section library, sortable section list, visibility controls, editing panel, responsive preview, save state, and publish action.
- Accessible move controls in addition to pointer-based drag-and-drop.
- Shared rendering components used by both preview and the published storefront.

Public routes include home, catalog, product detail, cart, checkout, and confirmation. All active storefront-visible products appear by default; unavailable products remain visible with ordering disabled.

Next.js middleware extracts the storefront slug from the host and rewrites internally. English uses the root URL and Bangla uses `/bn`, with matching metadata and `hreflang`. Public pages are server-rendered, use product structured data, and invalidate cached site content after publication.

The existing Orders screen gains source filters, storefront badges, and a new-order indicator. Use short polling initially; websockets and SMS notifications remain deferred.

### Delivery order

1. Add tenant-hardening migrations and shared order transition logic.
2. Implement storefront entities, validation, permissions, media storage, and CMS APIs.
3. Implement the shared renderer and owner builder.
4. Implement subdomain routing, catalog, cart, checkout, and order confirmation.
5. Integrate storefront orders into dashboard and order management.
6. Deploy wildcard DNS and TLS, object storage, rate limiting, monitoring, and backups.

### Test and acceptance plan

- Verify two organizations cannot resolve, edit, publish, upload to, or order from each other’s resources.
- Verify draft edits never affect the published site until publication.
- Verify English/Bangla switching and fallback behavior.
- Verify inactive subscriptions return a branded unavailable page.
- Verify client-supplied totals and cross-store product IDs are ignored or rejected.
- Verify simultaneous confirmations cannot oversell stock.
- Verify POS, manual, and storefront orders retain correct inventory behavior.
- Verify storefront navigation and checkout at 360, 768, and 1440-pixel widths.
- Require WCAG AA contrast, keyboard operation, visible focus, meaningful alternative text, and no serious automated accessibility violations.
