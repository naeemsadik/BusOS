# BusOS — Product Requirements Document

**Version:** 2.0 (Tightened Scope)
**Status:** Draft
**Owner:** [Your Name]
**Last Updated:** July 2026

---

## 1. Overview

BusOS is a subscription-based SaaS platform that gives single-owner retail businesses — grocery shops, clothing stores, pharmacies, small restaurants — a single dashboard to manage inventory and sales, oversee a small staff, and sell online through a drag-and-drop website. Everything is hosted and maintained by BusOS; customers pay a recurring subscription for access.

---

## 2. Problem Statement

Single-owner retail businesses currently rely on notebooks, spreadsheets, and WhatsApp to run their operations. They have no structured inventory system, no visibility into staff attendance, and no online presence — building a website or adopting an ERP is out of reach both technically and financially. Existing solutions are either too complex, too expensive, or not designed for businesses of this size.

---

## 3. Target Users

- Single-owner or family-run retail businesses
- Team size: **3–10 employees**
- Examples: grocery/convenience shops, clothing stores, pharmacies, small restaurants
- Out of scope for this version: clinics, agencies, manufacturers, schools

---

## 4. Business Model

BusOS is a **hosted SaaS product**, not self-hosted, open-source software.

- Shops sign up and pay a recurring subscription.
- All shop data (inventory, sales, staff, website) is stored on BusOS infrastructure.
- If a subscription lapses, BusOS suspends the shop's dashboard and live storefront until payment resumes.
- The platform's infrastructure is managed entirely by BusOS — shop owners never need to touch servers, hosting, or deployment.

---

## 5. Product Scope

### 5.1 Pillar 1 — Core Shop Management (Lite ERP)

| Feature Area | Included |
|---|---|
| Organization | Shop profile, single location |
| Users & Permissions | Owner account + staff accounts with limited roles (e.g. cashier vs. owner) |
| Sales | POS-style order entry, invoices, discounts, payments |
| Inventory | Products, categories, barcode/QR support, stock levels, low-stock alerts |
| Purchasing | Basic supplier purchase records to keep stock accurate (no full vendor/PO workflow) |
| Reporting | Sales summaries, inventory reports, simple owner dashboard (daily sales, top products, low stock) |

**Explicitly excluded:** full CRM, full Finance (ledger/journal/tax/balance sheet), full HR/payroll.

### 5.2 Pillar 2 — Staff Management (Lite)

- Staff accounts with role-based access (owner sees everything; staff see only what's relevant to their shift)
- Basic attendance / shift check-in and check-out
- Simple monthly attendance report per staff member

**Explicitly excluded:** payroll, leave management, performance reviews.

### 5.3 Pillar 3 — Website Builder & Online Storefront

- **Drag-and-drop CMS** — owner builds a storefront visually (banner, product grid, about/contact sections), no coding required
- **Product catalog sync** — products entered in the shop dashboard automatically appear on the storefront (single source of truth, no duplicate entry)
- **Online ordering** — customers browse and place orders online; fulfillment is manual (cash on delivery or manual confirmation by the owner)
- **Order notifications** — owner is notified in-dashboard (and potentially via SMS/WhatsApp) when a new online order arrives
- **Hosting & domain** — BusOS hosts the storefront; owners can optionally connect a custom domain

**Explicitly excluded (for now):** payment gateway checkout, cart abandonment flows, online coupons/discount codes, multi-currency support.

### 5.4 Pillar 4 — Hosting & Subscription Infrastructure (Internal)

- Multi-tenant backend with isolated data per shop, running on shared BusOS infrastructure
- Subscription and billing management, including automatic suspension on non-payment and reinstatement on payment
- Monitoring and backups (internal operations, not customer-facing in v1)
- Internal admin panel for the BusOS team to view tenants, subscription status, and intervene manually if needed

---

## 6. Out of Scope (v1)

The following are intentionally deferred, not rejected — they're strong candidates for later versions once the core product is validated:

- Automation/workflow engine
- AI assistant, OCR, forecasting
- Full CRM, Finance, HR/Payroll modules
- Plugin marketplace / vertical modules (restaurant, clinic, hotel, etc.)
- Payment gateway integration
- Multi-branch / multi-warehouse support

---

## 7. Roadmap

### Phase 1 — MVP
- Authentication and shop profile setup
- Staff accounts with role-based permissions
- Inventory and POS/sales management
- Low-stock alerts
- Sales and inventory reporting dashboard
- Staff attendance tracking
- Drag-and-drop website builder with live product sync
- Online ordering (manual confirmation / COD)
- Subscription billing with automatic access suspension

### Phase 2
- Custom domain support at scale
- WhatsApp/SMS order notifications
- Basic purchasing and vendor tracking
- Simple online discount/coupon codes
- Payment gateway integration (e.g. bKash, Nagad, card payments)

### Phase 3
- Multi-branch support
- Lightweight automation rules (e.g. low-stock alerts to staff)
- AI-powered sales insights
- Plugin-style add-ons for specific shop verticals

---

## 8. Differentiation

Most website builders have no awareness of a shop's inventory. Most POS or inventory tools don't offer a website at all. BusOS's core advantage is that **the inventory and the online storefront share the same data** — a product added once is immediately sellable both in-store and online, with zero re-entry and zero server management required from the owner.

---

## 9. Open Questions

- Pricing model: flat monthly fee, tiered by employee count, or usage-based (products/orders)?
- Should there be a free trial or freemium tier to drive initial adoption in an unproven market?