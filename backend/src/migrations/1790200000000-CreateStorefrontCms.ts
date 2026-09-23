import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStorefrontCms1790200000000 implements MigrationInterface {
  name = 'CreateStorefrontCms1790200000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await q.query(`DO $$ BEGIN CREATE TYPE "storefront_sites_status_enum" AS ENUM ('draft','published','inactive'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await q.query(`DO $$ BEGIN CREATE TYPE "orders_source_enum" AS ENUM ('pos','manual','storefront'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);

    await q.query(`CREATE TABLE IF NOT EXISTS "storefront_sites" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organizationId" uuid NOT NULL,
      "slug" varchar(63) NOT NULL, "status" "storefront_sites_status_enum" NOT NULL DEFAULT 'draft',
      "enabledLocales" jsonb NOT NULL DEFAULT '["en"]'::jsonb, "defaultLocale" varchar(2) NOT NULL DEFAULT 'en',
      "themeTokens" jsonb NOT NULL DEFAULT '{}', "seoSettings" jsonb NOT NULL DEFAULT '{}',
      "orderSettings" jsonb NOT NULL DEFAULT '{}', "draftDocument" jsonb NOT NULL,
      "publishedDocument" jsonb, "draftVersion" integer NOT NULL DEFAULT 1,
      "publishedVersion" integer, "publishedAt" timestamp, "createdAt" timestamp NOT NULL DEFAULT now(),
      "updatedAt" timestamp NOT NULL DEFAULT now(), CONSTRAINT "PK_storefront_sites" PRIMARY KEY ("id"),
      CONSTRAINT "FK_storefront_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
    )`);
    await q.query(`ALTER TABLE "storefront_sites" ADD COLUMN IF NOT EXISTS "publishedVersion" integer`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_storefront_sites_organization" ON "storefront_sites" ("organizationId")`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_storefront_sites_slug" ON "storefront_sites" (lower("slug"))`);

    await q.query(`CREATE TABLE IF NOT EXISTS "storefront_assets" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organizationId" uuid NOT NULL,
      "url" varchar(500) NOT NULL, "storageKey" varchar(255), "mimeType" varchar(32) NOT NULL,
      "size" integer NOT NULL, "width" integer NOT NULL DEFAULT 1, "height" integer NOT NULL DEFAULT 1,
      "sortOrder" integer NOT NULL DEFAULT 0, "altTextEn" varchar(255), "altTextBn" varchar(255),
      "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_storefront_assets" PRIMARY KEY ("id"),
      CONSTRAINT "FK_storefront_asset_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
    )`);
    await q.query(`ALTER TABLE "storefront_assets" ADD COLUMN IF NOT EXISTS "storageKey" varchar(255)`);
    await q.query(`ALTER TABLE "storefront_assets" ADD COLUMN IF NOT EXISTS "width" integer NOT NULL DEFAULT 1`);
    await q.query(`ALTER TABLE "storefront_assets" ADD COLUMN IF NOT EXISTS "height" integer NOT NULL DEFAULT 1`);
    await q.query(`ALTER TABLE "storefront_assets" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp NOT NULL DEFAULT now()`);
    await q.query(`UPDATE "storefront_assets" SET "storageKey" = concat("organizationId", '/', "id") WHERE "storageKey" IS NULL`);
    await q.query(`ALTER TABLE "storefront_assets" ALTER COLUMN "storageKey" SET NOT NULL`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_storefront_assets_key" ON "storefront_assets" ("storageKey")`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_storefront_assets_org_sort" ON "storefront_assets" ("organizationId", "sortOrder")`);

    for (const sql of [
      `ADD COLUMN IF NOT EXISTS "slug" varchar(255)`, `ADD COLUMN IF NOT EXISTS "nameBn" varchar(255)`,
      `ADD COLUMN IF NOT EXISTS "descriptionBn" varchar(255)`, `ADD COLUMN IF NOT EXISTS "longDescription" text`,
      `ADD COLUMN IF NOT EXISTS "longDescriptionBn" text`, `ADD COLUMN IF NOT EXISTS "storefrontVisible" boolean NOT NULL DEFAULT true`,
      `ADD COLUMN IF NOT EXISTS "imageAltText" varchar(255)`, `ADD COLUMN IF NOT EXISTS "imageAltTextBn" varchar(255)`,
    ]) await q.query(`ALTER TABLE "products" ${sql}`);
    await q.query(`UPDATE "products" SET "slug" = concat(COALESCE(NULLIF(trim(both '-' from regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g')), ''), 'product'), '-', left("id"::text, 8)) WHERE "slug" IS NULL`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_products_org_slug" ON "products" ("organizationId", lower("slug")) WHERE "slug" IS NOT NULL`);

    for (const sql of [
      `ADD COLUMN IF NOT EXISTS "source" "orders_source_enum" NOT NULL DEFAULT 'manual'`,
      `ADD COLUMN IF NOT EXISTS "storefrontSiteId" uuid`, `ADD COLUMN IF NOT EXISTS "storefrontLocale" varchar(2)`,
      `ADD COLUMN IF NOT EXISTS "checkoutIdempotencyKey" varchar(100)`, `ADD COLUMN IF NOT EXISTS "confirmationTokenHash" varchar(64)`,
      `ADD COLUMN IF NOT EXISTS "confirmationExpiresAt" timestamp`, `ADD COLUMN IF NOT EXISTS "stockCommittedAt" timestamp`,
      `ADD COLUMN IF NOT EXISTS "stockRestoredAt" timestamp`,
    ]) await q.query(`ALTER TABLE "orders" ${sql}`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_orders_org_source_created" ON "orders" ("organizationId", "source", "createdAt")`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_orders_storefront_idempotency" ON "orders" ("storefrontSiteId", "checkoutIdempotencyKey") WHERE "checkoutIdempotencyKey" IS NOT NULL`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_orders_confirmation_hash" ON "orders" ("confirmationTokenHash") WHERE "confirmationTokenHash" IS NOT NULL`);
    await q.query(`DO $$ BEGIN ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_storefront" FOREIGN KEY ("storefrontSiteId") REFERENCES "storefront_sites"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await q.query(`ALTER TYPE "user_permissions_module_enum" ADD VALUE IF NOT EXISTS 'website'`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS "IDX_orders_confirmation_hash"`);
    await q.query(`DROP INDEX IF EXISTS "IDX_orders_storefront_idempotency"`);
    await q.query(`ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "FK_orders_storefront"`);
    await q.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "confirmationExpiresAt", DROP COLUMN IF EXISTS "confirmationTokenHash", DROP COLUMN IF EXISTS "checkoutIdempotencyKey", DROP COLUMN IF EXISTS "stockRestoredAt", DROP COLUMN IF EXISTS "stockCommittedAt", DROP COLUMN IF EXISTS "storefrontLocale", DROP COLUMN IF EXISTS "storefrontSiteId", DROP COLUMN IF EXISTS "source"`);
    await q.query(`DROP INDEX IF EXISTS "IDX_products_org_slug"`);
    await q.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "imageAltTextBn", DROP COLUMN IF EXISTS "imageAltText", DROP COLUMN IF EXISTS "storefrontVisible", DROP COLUMN IF EXISTS "longDescriptionBn", DROP COLUMN IF EXISTS "longDescription", DROP COLUMN IF EXISTS "descriptionBn", DROP COLUMN IF EXISTS "nameBn", DROP COLUMN IF EXISTS "slug"`);
    await q.query(`DROP TABLE IF EXISTS "storefront_assets"`);
    await q.query(`DROP TABLE IF EXISTS "storefront_sites"`);
    await q.query(`DROP TYPE IF EXISTS "orders_source_enum"`);
    await q.query(`DROP TYPE IF EXISTS "storefront_sites_status_enum"`);
  }
}
