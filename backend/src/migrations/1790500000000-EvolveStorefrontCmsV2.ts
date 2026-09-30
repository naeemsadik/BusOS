import { MigrationInterface, QueryRunner } from 'typeorm';

export class EvolveStorefrontCmsV21790500000000
  implements MigrationInterface
{
  name = 'EvolveStorefrontCmsV21790500000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Replace rather than ALTER ADD VALUE so the migration remains transactional.
    await q.query(
      `CREATE TYPE "storefront_sites_status_enum_v2" AS ENUM ('draft','published','unpublished','inactive')`,
    );
    await q.query(
      `ALTER TABLE "storefront_sites" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await q.query(
      `ALTER TABLE "storefront_sites" ALTER COLUMN "status" TYPE "storefront_sites_status_enum_v2" USING "status"::text::"storefront_sites_status_enum_v2"`,
    );
    await q.query(`DROP TYPE "storefront_sites_status_enum"`);
    await q.query(
      `ALTER TYPE "storefront_sites_status_enum_v2" RENAME TO "storefront_sites_status_enum"`,
    );
    await q.query(
      `ALTER TABLE "storefront_sites" ALTER COLUMN "status" SET DEFAULT 'draft'`,
    );
    await q.query(
      `UPDATE "storefront_sites" SET "status" = 'unpublished' WHERE "status" = 'inactive'`,
    );

    for (const sql of [
      `ADD COLUMN IF NOT EXISTS "orderingEnabled" boolean NOT NULL DEFAULT true`,
      `ADD COLUMN IF NOT EXISTS "orderingPausedMessage" jsonb NOT NULL DEFAULT '{"en":"Ordering is paused. Please contact the shop."}'::jsonb`,
      `ADD COLUMN IF NOT EXISTS "draftSettings" jsonb NOT NULL DEFAULT '{}'::jsonb`,
      `ADD COLUMN IF NOT EXISTS "publishedSettings" jsonb`,
      `ADD COLUMN IF NOT EXISTS "settingsVersion" integer NOT NULL DEFAULT 1`,
      `ADD COLUMN IF NOT EXISTS "shopProfile" jsonb NOT NULL DEFAULT '{}'::jsonb`,
      `ADD COLUMN IF NOT EXISTS "setupProgress" jsonb NOT NULL DEFAULT '{}'::jsonb`,
      `ADD COLUMN IF NOT EXISTS "publishRequestedBy" uuid`,
      `ADD COLUMN IF NOT EXISTS "publishRequestedAt" timestamp`,
      `ADD COLUMN IF NOT EXISTS "firstPublishedAt" timestamp`,
      `ADD COLUMN IF NOT EXISTS "lastPublishedAt" timestamp`,
      `ADD COLUMN IF NOT EXISTS "slugChanges" jsonb NOT NULL DEFAULT '[]'::jsonb`,
    ]) {
      await q.query(`ALTER TABLE "storefront_sites" ${sql}`);
    }
    await q.query(`UPDATE "storefront_sites" s SET
      "draftSettings" = jsonb_build_object(
        'brand', jsonb_build_object('name', jsonb_build_object('en', COALESCE(o."name", '')), 'logoAssetId', NULL, 'faviconAssetId', NULL),
        'theme', jsonb_build_object(
          'primary', COALESCE(s."themeTokens"->>'primary', '#0f766e'),
          'accent', COALESCE(s."themeTokens"->>'accent', '#f59e0b'),
          'background', '#ffffff', 'text', '#0f172a',
          'font', COALESCE(s."themeTokens"->>'font', 'manrope'),
          'radius', COALESCE(s."themeTokens"->>'radius', '12px')
        ),
        'contact', jsonb_build_object(
          'phone', COALESCE(s."orderSettings"->>'phone', o."phone", ''),
          'address', COALESCE(s."orderSettings"->'address', jsonb_build_object('en', COALESCE(o."address", ''))),
          'city', COALESCE(o."city", ''), 'country', COALESCE(o."country", ''), 'hours', '[]'::jsonb
        ),
        'header', jsonb_build_object('showSearch', true, 'showLanguageSwitcher', true),
        'footer', jsonb_build_object('text', jsonb_build_object('en', 'Thank you for visiting.'), 'showContact', true),
        'seo', s."seoSettings",
        'orders', COALESCE(s."orderSettings", '{}'::jsonb) || jsonb_build_object(
          'deliveryEnabled', true, 'pickupEnabled', false,
          'maxQtyPerLine', 20, 'maxLines', 30, 'noteEnabled', true,
          'orderInstructions', jsonb_build_object('en', '')
        )
      ),
      "publishedSettings" = CASE WHEN s."publishedDocument" IS NULL THEN NULL ELSE jsonb_build_object(
        'brand', jsonb_build_object('name', jsonb_build_object('en', COALESCE(o."name", '')), 'logoAssetId', NULL, 'faviconAssetId', NULL),
        'theme', jsonb_build_object(
          'primary', COALESCE(s."themeTokens"->>'primary', '#0f766e'),
          'accent', COALESCE(s."themeTokens"->>'accent', '#f59e0b'),
          'background', '#ffffff', 'text', '#0f172a',
          'font', COALESCE(s."themeTokens"->>'font', 'manrope'),
          'radius', COALESCE(s."themeTokens"->>'radius', '12px')
        ),
        'contact', jsonb_build_object(
          'phone', COALESCE(s."orderSettings"->>'phone', o."phone", ''),
          'address', COALESCE(s."orderSettings"->'address', jsonb_build_object('en', COALESCE(o."address", ''))),
          'city', COALESCE(o."city", ''), 'country', COALESCE(o."country", ''), 'hours', '[]'::jsonb
        ),
        'header', jsonb_build_object('showSearch', true, 'showLanguageSwitcher', true),
        'footer', jsonb_build_object('text', jsonb_build_object('en', 'Thank you for visiting.'), 'showContact', true),
        'seo', s."seoSettings",
        'orders', COALESCE(s."orderSettings", '{}'::jsonb) || jsonb_build_object(
          'deliveryEnabled', true, 'pickupEnabled', false,
          'maxQtyPerLine', 20, 'maxLines', 30, 'noteEnabled', true,
          'orderInstructions', jsonb_build_object('en', '')
        )
      ) END,
      "firstPublishedAt" = CASE WHEN s."publishedAt" IS NULL THEN NULL ELSE s."publishedAt" END,
      "lastPublishedAt" = s."publishedAt"
      FROM "organizations" o WHERE o."id" = s."organizationId"`);

    await q.query(
      `DO $$ BEGIN ALTER TABLE "storefront_sites" ADD CONSTRAINT "FK_storefront_sites_publish_requested_by" FOREIGN KEY ("publishRequestedBy") REFERENCES "users"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );

    await q.query(
      `DO $$ BEGIN CREATE TYPE "storefront_page_kind_enum" AS ENUM ('home','custom'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await q.query(
      `DO $$ BEGIN CREATE TYPE "storefront_page_lifecycle_status_enum" AS ENUM ('draft','published','unpublished'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    for (const sql of [
      `ADD COLUMN IF NOT EXISTS "kind" "storefront_page_kind_enum"`,
      `ADD COLUMN IF NOT EXISTS "localizedTitle" jsonb NOT NULL DEFAULT '{}'::jsonb`,
      `ADD COLUMN IF NOT EXISTS "lifecycleStatus" "storefront_page_lifecycle_status_enum" NOT NULL DEFAULT 'draft'`,
      `ADD COLUMN IF NOT EXISTS "showInMenu" boolean NOT NULL DEFAULT false`,
      `ADD COLUMN IF NOT EXISTS "menuOrder" integer NOT NULL DEFAULT 0`,
      `ADD COLUMN IF NOT EXISTS "deletedAt" timestamp`,
      `ADD COLUMN IF NOT EXISTS "purgeAfter" timestamp`,
    ]) {
      await q.query(`ALTER TABLE "storefront_pages" ${sql}`);
    }
    await q.query(`UPDATE "storefront_pages" SET
      "kind" = CASE WHEN "isHomePage" THEN 'home'::"storefront_page_kind_enum" ELSE 'custom'::"storefront_page_kind_enum" END,
      "localizedTitle" = COALESCE(NULLIF("navigationLabel", '{}'::jsonb), jsonb_build_object('en', "title")),
      "lifecycleStatus" = CASE
        WHEN "status" = 'published' THEN 'published'::"storefront_page_lifecycle_status_enum"
        WHEN "status" = 'archived' THEN 'unpublished'::"storefront_page_lifecycle_status_enum"
        ELSE 'draft'::"storefront_page_lifecycle_status_enum" END,
      "showInMenu" = "includeInNavigation", "menuOrder" = "navigationOrder",
      "deletedAt" = CASE WHEN "status" = 'archived' THEN "updatedAt" ELSE NULL END,
      "purgeAfter" = CASE WHEN "status" = 'archived' THEN "updatedAt" + interval '30 days' ELSE NULL END`);
    await q.query(
      `ALTER TABLE "storefront_pages" ALTER COLUMN "kind" SET NOT NULL`,
    );
    await q.query(`DROP INDEX IF EXISTS "IDX_storefront_pages_site_slug"`);
    await q.query(`DROP INDEX IF EXISTS "IDX_storefront_pages_one_home"`);
    await q.query(
      `CREATE UNIQUE INDEX "IDX_storefront_pages_site_slug_active" ON "storefront_pages" ("siteId", lower("slug")) WHERE "deletedAt" IS NULL`,
    );
    await q.query(
      `CREATE UNIQUE INDEX "IDX_storefront_pages_one_active_home" ON "storefront_pages" ("siteId") WHERE "kind" = 'home' AND "deletedAt" IS NULL`,
    );
    await q.query(
      `CREATE INDEX "IDX_storefront_pages_org_deleted" ON "storefront_pages" ("organizationId", "deletedAt")`,
    );

    await q.query(
      `DO $$ BEGIN CREATE TYPE "storefront_revision_kind_enum" AS ENUM ('published','checkpoint'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    for (const sql of [
      `ADD COLUMN IF NOT EXISTS "siteId" uuid`,
      `ADD COLUMN IF NOT EXISTS "kind" "storefront_revision_kind_enum" NOT NULL DEFAULT 'checkpoint'`,
      `ADD COLUMN IF NOT EXISTS "label" varchar(160) NOT NULL DEFAULT 'Legacy revision'`,
      `ADD COLUMN IF NOT EXISTS "createdBy" uuid`,
    ]) {
      await q.query(`ALTER TABLE "storefront_page_revisions" ${sql}`);
    }
    await q.query(`UPDATE "storefront_page_revisions" r SET
      "siteId" = p."siteId", "createdBy" = r."authorId",
      "kind" = CASE WHEN p."publishedVersion" = r."version" THEN 'published'::"storefront_revision_kind_enum" ELSE 'checkpoint'::"storefront_revision_kind_enum" END,
      "label" = CASE WHEN p."publishedVersion" = r."version" THEN 'Published' ELSE initcap(r."origin"::text) END
      FROM "storefront_pages" p WHERE p."id" = r."pageId"`);
    await q.query(
      `ALTER TABLE "storefront_page_revisions" ALTER COLUMN "pageId" DROP NOT NULL`,
    );
    await q.query(
      `DO $$ BEGIN ALTER TABLE "storefront_page_revisions" ADD CONSTRAINT "FK_storefront_revisions_site" FOREIGN KEY ("siteId") REFERENCES "storefront_sites"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await q.query(
      `CREATE INDEX "IDX_storefront_revisions_org_site" ON "storefront_page_revisions" ("organizationId", "siteId", "createdAt" DESC)`,
    );

    for (const sql of [
      `ADD COLUMN IF NOT EXISTS "siteId" uuid`,
      `ADD COLUMN IF NOT EXISTS "originalFilename" varchar(255) NOT NULL DEFAULT 'legacy-image'`,
      `ADD COLUMN IF NOT EXISTS "alt" jsonb NOT NULL DEFAULT '{}'::jsonb`,
      `ADD COLUMN IF NOT EXISTS "decorative" boolean NOT NULL DEFAULT false`,
      `ADD COLUMN IF NOT EXISTS "deletedAt" timestamp`,
    ]) {
      await q.query(`ALTER TABLE "storefront_assets" ${sql}`);
    }
    await q.query(`UPDATE "storefront_assets" a SET
      "siteId" = s."id", "alt" = jsonb_strip_nulls(jsonb_build_object('en', a."altTextEn", 'bn', a."altTextBn"))
      FROM "storefront_sites" s WHERE s."organizationId" = a."organizationId"`);
    await q.query(
      `DO $$ BEGIN ALTER TABLE "storefront_assets" ADD CONSTRAINT "FK_storefront_assets_site" FOREIGN KEY ("siteId") REFERENCES "storefront_sites"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await q.query(
      `CREATE INDEX "IDX_storefront_assets_org_deleted" ON "storefront_assets" ("organizationId", "deletedAt")`,
    );

    await q.query(`CREATE TABLE "storefront_slug_aliases" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organizationId" uuid NOT NULL,
      "siteId" uuid NOT NULL, "oldSlug" varchar(63) NOT NULL, "expiresAt" timestamp NOT NULL,
      "createdAt" timestamp NOT NULL DEFAULT now(), CONSTRAINT "PK_storefront_slug_aliases" PRIMARY KEY ("id"),
      CONSTRAINT "FK_storefront_slug_alias_site" FOREIGN KEY ("siteId") REFERENCES "storefront_sites"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_storefront_slug_alias_org" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
    )`);
    await q.query(
      `CREATE UNIQUE INDEX "IDX_storefront_slug_alias_old" ON "storefront_slug_aliases" (lower("oldSlug"))`,
    );
    await q.query(
      `CREATE INDEX "IDX_storefront_slug_alias_site_expiry" ON "storefront_slug_aliases" ("siteId", "expiresAt")`,
    );

    await q.query(
      `ALTER TYPE "cms_ai_suggestions_outcome_enum" ADD VALUE IF NOT EXISTS 'shown'`,
    );
    await q.query(
      `ALTER TYPE "cms_ai_suggestions_outcome_enum" ADD VALUE IF NOT EXISTS 'fallback'`,
    );
    await q.query(
      `ALTER TABLE "cms_ai_suggestions" ADD COLUMN IF NOT EXISTS "siteId" uuid`,
    );
    await q.query(`UPDATE "cms_ai_suggestions" a SET "siteId" = s."id"
      FROM "storefront_sites" s WHERE s."organizationId" = a."organizationId"`);
    await q.query(
      `DO $$ BEGIN ALTER TABLE "cms_ai_suggestions" ADD CONSTRAINT "FK_cms_ai_suggestions_site" FOREIGN KEY ("siteId") REFERENCES "storefront_sites"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );

    // The superseding v2 specification requires an explicit owner opt-in for every
    // product that predates this migration.
    await q.query(
      `ALTER TABLE "products" ALTER COLUMN "storefrontVisible" SET DEFAULT false`,
    );
    await q.query(`UPDATE "products" SET "storefrontVisible" = false`);

    await q.query(
      `DO $$ BEGIN CREATE TYPE "orders_delivery_method_enum" AS ENUM ('delivery','pickup'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    for (const sql of [
      `ADD COLUMN IF NOT EXISTS "locale" varchar(2)`,
      `ADD COLUMN IF NOT EXISTS "deliveryMethod" "orders_delivery_method_enum"`,
      `ADD COLUMN IF NOT EXISTS "deliveryAddress" jsonb`,
      `ADD COLUMN IF NOT EXISTS "customerNote" text`,
      `ADD COLUMN IF NOT EXISTS "idempotencyKey" varchar(100)`,
      `ADD COLUMN IF NOT EXISTS "publicToken" varchar(128)`,
      `ADD COLUMN IF NOT EXISTS "ownerSeenAt" timestamp`,
      `ADD COLUMN IF NOT EXISTS "customerSnapshot" jsonb`,
    ]) {
      await q.query(`ALTER TABLE "orders" ${sql}`);
    }
    await q.query(`UPDATE "orders" SET
      "locale" = COALESCE("storefrontLocale", 'en'),
      "deliveryMethod" = CASE WHEN "source" = 'storefront' THEN 'delivery'::"orders_delivery_method_enum" ELSE NULL END,
      "deliveryAddress" = CASE WHEN "source" = 'storefront' THEN jsonb_strip_nulls(jsonb_build_object(
        'address', "shippingAddress", 'city', "shippingCity", 'state', "shippingState",
        'postalCode', "shippingZipCode", 'country', "shippingCountry")) ELSE NULL END,
      "customerNote" = CASE WHEN "source" = 'storefront' THEN "notes" ELSE NULL END,
      "idempotencyKey" = "checkoutIdempotencyKey",
      "customerSnapshot" = CASE WHEN "source" = 'storefront' THEN jsonb_strip_nulls(jsonb_build_object(
        'name', "customerName", 'phone', "customerPhone")) ELSE NULL END`);
    await q.query(
      `CREATE UNIQUE INDEX "IDX_orders_org_idempotency" ON "orders" ("organizationId", "idempotencyKey") WHERE "idempotencyKey" IS NOT NULL`,
    );
    await q.query(
      `CREATE UNIQUE INDEX "IDX_orders_public_token" ON "orders" ("publicToken") WHERE "publicToken" IS NOT NULL`,
    );
    await q.query(
      `CREATE INDEX "IDX_orders_storefront_unseen" ON "orders" ("organizationId", "source", "ownerSeenAt", "createdAt" DESC)`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS "IDX_orders_storefront_unseen"`);
    await q.query(`DROP INDEX IF EXISTS "IDX_orders_public_token"`);
    await q.query(`DROP INDEX IF EXISTS "IDX_orders_org_idempotency"`);
    await q.query(`ALTER TABLE "orders"
      DROP COLUMN IF EXISTS "customerSnapshot", DROP COLUMN IF EXISTS "ownerSeenAt",
      DROP COLUMN IF EXISTS "publicToken", DROP COLUMN IF EXISTS "idempotencyKey",
      DROP COLUMN IF EXISTS "customerNote", DROP COLUMN IF EXISTS "deliveryAddress",
      DROP COLUMN IF EXISTS "deliveryMethod", DROP COLUMN IF EXISTS "locale"`);
    await q.query(`DROP TYPE IF EXISTS "orders_delivery_method_enum"`);
    await q.query(
      `ALTER TABLE "products" ALTER COLUMN "storefrontVisible" SET DEFAULT true`,
    );
    await q.query(
      `ALTER TABLE "cms_ai_suggestions" DROP CONSTRAINT IF EXISTS "FK_cms_ai_suggestions_site"`,
    );
    await q.query(
      `ALTER TABLE "cms_ai_suggestions" DROP COLUMN IF EXISTS "siteId"`,
    );
    await q.query(
      `UPDATE "cms_ai_suggestions" SET "outcome" = 'failed' WHERE "outcome"::text IN ('shown','fallback')`,
    );
    await q.query(
      `CREATE TYPE "cms_ai_suggestions_outcome_enum_old" AS ENUM ('pending','accepted','edited','rejected','failed')`,
    );
    await q.query(
      `ALTER TABLE "cms_ai_suggestions" ALTER COLUMN "outcome" DROP DEFAULT`,
    );
    await q.query(
      `ALTER TABLE "cms_ai_suggestions" ALTER COLUMN "outcome" TYPE "cms_ai_suggestions_outcome_enum_old" USING "outcome"::text::"cms_ai_suggestions_outcome_enum_old"`,
    );
    await q.query(`DROP TYPE "cms_ai_suggestions_outcome_enum"`);
    await q.query(
      `ALTER TYPE "cms_ai_suggestions_outcome_enum_old" RENAME TO "cms_ai_suggestions_outcome_enum"`,
    );
    await q.query(
      `ALTER TABLE "cms_ai_suggestions" ALTER COLUMN "outcome" SET DEFAULT 'pending'`,
    );
    await q.query(`DROP TABLE IF EXISTS "storefront_slug_aliases"`);
    await q.query(`DROP INDEX IF EXISTS "IDX_storefront_assets_org_deleted"`);
    await q.query(
      `ALTER TABLE "storefront_assets" DROP CONSTRAINT IF EXISTS "FK_storefront_assets_site"`,
    );
    await q.query(`ALTER TABLE "storefront_assets"
      DROP COLUMN IF EXISTS "deletedAt", DROP COLUMN IF EXISTS "decorative",
      DROP COLUMN IF EXISTS "alt", DROP COLUMN IF EXISTS "originalFilename",
      DROP COLUMN IF EXISTS "siteId"`);
    await q.query(`DROP INDEX IF EXISTS "IDX_storefront_revisions_org_site"`);
    await q.query(
      `ALTER TABLE "storefront_page_revisions" DROP CONSTRAINT IF EXISTS "FK_storefront_revisions_site"`,
    );
    await q.query(
      `DELETE FROM "storefront_page_revisions" WHERE "pageId" IS NULL`,
    );
    await q.query(
      `ALTER TABLE "storefront_page_revisions" ALTER COLUMN "pageId" SET NOT NULL`,
    );
    await q.query(`ALTER TABLE "storefront_page_revisions"
      DROP COLUMN IF EXISTS "createdBy", DROP COLUMN IF EXISTS "label",
      DROP COLUMN IF EXISTS "kind", DROP COLUMN IF EXISTS "siteId"`);
    await q.query(`DROP TYPE IF EXISTS "storefront_revision_kind_enum"`);
    await q.query(`DROP INDEX IF EXISTS "IDX_storefront_pages_org_deleted"`);
    await q.query(`DROP INDEX IF EXISTS "IDX_storefront_pages_one_active_home"`);
    await q.query(`DROP INDEX IF EXISTS "IDX_storefront_pages_site_slug_active"`);
    await q.query(`ALTER TABLE "storefront_pages"
      DROP COLUMN IF EXISTS "purgeAfter", DROP COLUMN IF EXISTS "deletedAt",
      DROP COLUMN IF EXISTS "menuOrder", DROP COLUMN IF EXISTS "showInMenu",
      DROP COLUMN IF EXISTS "lifecycleStatus", DROP COLUMN IF EXISTS "localizedTitle",
      DROP COLUMN IF EXISTS "kind"`);
    await q.query(
      `CREATE UNIQUE INDEX "IDX_storefront_pages_site_slug" ON "storefront_pages" ("siteId", lower("slug"))`,
    );
    await q.query(
      `CREATE UNIQUE INDEX "IDX_storefront_pages_one_home" ON "storefront_pages" ("siteId") WHERE "isHomePage" = true AND "status" <> 'archived'`,
    );
    await q.query(`DROP TYPE IF EXISTS "storefront_page_lifecycle_status_enum"`);
    await q.query(`DROP TYPE IF EXISTS "storefront_page_kind_enum"`);
    await q.query(
      `ALTER TABLE "storefront_sites" DROP CONSTRAINT IF EXISTS "FK_storefront_sites_publish_requested_by"`,
    );
    await q.query(`ALTER TABLE "storefront_sites"
      DROP COLUMN IF EXISTS "slugChanges", DROP COLUMN IF EXISTS "lastPublishedAt",
      DROP COLUMN IF EXISTS "firstPublishedAt", DROP COLUMN IF EXISTS "publishRequestedAt",
      DROP COLUMN IF EXISTS "publishRequestedBy", DROP COLUMN IF EXISTS "setupProgress",
      DROP COLUMN IF EXISTS "shopProfile", DROP COLUMN IF EXISTS "settingsVersion",
      DROP COLUMN IF EXISTS "publishedSettings", DROP COLUMN IF EXISTS "draftSettings",
      DROP COLUMN IF EXISTS "orderingPausedMessage", DROP COLUMN IF EXISTS "orderingEnabled"`);
    await q.query(
      `UPDATE "storefront_sites" SET "status" = 'inactive' WHERE "status" = 'unpublished'`,
    );
    await q.query(
      `CREATE TYPE "storefront_sites_status_enum_old" AS ENUM ('draft','published','inactive')`,
    );
    await q.query(
      `ALTER TABLE "storefront_sites" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await q.query(
      `ALTER TABLE "storefront_sites" ALTER COLUMN "status" TYPE "storefront_sites_status_enum_old" USING "status"::text::"storefront_sites_status_enum_old"`,
    );
    await q.query(`DROP TYPE "storefront_sites_status_enum"`);
    await q.query(
      `ALTER TYPE "storefront_sites_status_enum_old" RENAME TO "storefront_sites_status_enum"`,
    );
    await q.query(
      `ALTER TABLE "storefront_sites" ALTER COLUMN "status" SET DEFAULT 'draft'`,
    );
  }
}
