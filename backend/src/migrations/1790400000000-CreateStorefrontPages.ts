import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStorefrontPages1790400000000 implements MigrationInterface {
  name = 'CreateStorefrontPages1790400000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "storefront_sites" ADD COLUMN IF NOT EXISTS "aiEnabled" boolean NOT NULL DEFAULT true`,
    );
    await q.query(
      `DO $$ BEGIN CREATE TYPE "storefront_pages_pagetype_enum" AS ENUM ('home','about','contact','promotion','landing','delivery','faq','custom'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await q.query(
      `DO $$ BEGIN CREATE TYPE "storefront_pages_status_enum" AS ENUM ('draft','published','archived'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await q.query(
      `DO $$ BEGIN CREATE TYPE "storefront_page_revisions_origin_enum" AS ENUM ('manual','template','ai','restore'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await q.query(
      `DO $$ BEGIN CREATE TYPE "cms_ai_suggestions_outcome_enum" AS ENUM ('pending','accepted','edited','rejected','failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );

    await q.query(`CREATE TABLE IF NOT EXISTS "storefront_pages" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organizationId" uuid NOT NULL, "siteId" uuid NOT NULL,
      "title" varchar(120) NOT NULL, "slug" varchar(80) NOT NULL,
      "pageType" "storefront_pages_pagetype_enum" NOT NULL DEFAULT 'custom',
      "status" "storefront_pages_status_enum" NOT NULL DEFAULT 'draft',
      "isHomePage" boolean NOT NULL DEFAULT false, "includeInNavigation" boolean NOT NULL DEFAULT false,
      "navigationLabel" jsonb NOT NULL DEFAULT '{}', "navigationOrder" integer NOT NULL DEFAULT 0,
      "enabledLocales" jsonb NOT NULL DEFAULT '["en"]', "seoSettings" jsonb NOT NULL DEFAULT '{}',
      "draftDocument" jsonb NOT NULL, "publishedDocument" jsonb, "draftVersion" integer NOT NULL DEFAULT 1,
      "publishedVersion" integer, "publishedAt" timestamp, "createdBy" uuid, "updatedBy" uuid,
      "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_storefront_pages" PRIMARY KEY ("id"),
      CONSTRAINT "FK_storefront_pages_site" FOREIGN KEY ("siteId") REFERENCES "storefront_sites"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_storefront_pages_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
    )`);
    await q.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_storefront_pages_site_slug" ON "storefront_pages" ("siteId", lower("slug"))`,
    );
    await q.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_storefront_pages_one_home" ON "storefront_pages" ("siteId") WHERE "isHomePage" = true AND "status" <> 'archived'`,
    );
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_storefront_pages_org_status" ON "storefront_pages" ("organizationId", "status")`,
    );

    await q.query(`CREATE TABLE IF NOT EXISTS "storefront_page_revisions" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organizationId" uuid NOT NULL, "pageId" uuid NOT NULL,
      "version" integer NOT NULL, "document" jsonb NOT NULL, "settings" jsonb NOT NULL,
      "origin" "storefront_page_revisions_origin_enum" NOT NULL DEFAULT 'manual', "authorId" uuid,
      "createdAt" timestamp NOT NULL DEFAULT now(), CONSTRAINT "PK_storefront_page_revisions" PRIMARY KEY ("id"),
      CONSTRAINT "FK_storefront_page_revisions_page" FOREIGN KEY ("pageId") REFERENCES "storefront_pages"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_storefront_page_revisions_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
    )`);
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_storefront_page_revisions_page_created" ON "storefront_page_revisions" ("pageId", "createdAt" DESC)`,
    );

    await q.query(`CREATE TABLE IF NOT EXISTS "storefront_page_redirects" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organizationId" uuid NOT NULL, "siteId" uuid NOT NULL,
      "pageId" uuid NOT NULL, "fromSlug" varchar(80) NOT NULL, "toSlug" varchar(80) NOT NULL,
      "createdAt" timestamp NOT NULL DEFAULT now(), CONSTRAINT "PK_storefront_page_redirects" PRIMARY KEY ("id"),
      CONSTRAINT "FK_storefront_page_redirects_page" FOREIGN KEY ("pageId") REFERENCES "storefront_pages"("id") ON DELETE CASCADE
    )`);
    await q.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_storefront_page_redirects_site_from" ON "storefront_page_redirects" ("siteId", lower("fromSlug"))`,
    );

    await q.query(`CREATE TABLE IF NOT EXISTS "cms_ai_suggestions" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organizationId" uuid NOT NULL, "userId" uuid NOT NULL,
      "pageId" uuid, "sectionId" varchar(80), "actionType" varchar(40) NOT NULL, "providerModel" varchar(100) NOT NULL,
      "inputSourceTypes" jsonb NOT NULL DEFAULT '[]', "outcome" "cms_ai_suggestions_outcome_enum" NOT NULL DEFAULT 'pending',
      "latencyMs" integer, "usageEstimate" integer, "failureCode" varchar(255), "createdAt" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_cms_ai_suggestions" PRIMARY KEY ("id"),
      CONSTRAINT "FK_cms_ai_suggestions_page" FOREIGN KEY ("pageId") REFERENCES "storefront_pages"("id") ON DELETE SET NULL,
      CONSTRAINT "FK_cms_ai_suggestions_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
    )`);
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_cms_ai_suggestions_org_created" ON "cms_ai_suggestions" ("organizationId", "createdAt" DESC)`,
    );

    // Preserve every existing storefront as its published/draft homepage.
    await q.query(`INSERT INTO "storefront_pages" (
      "organizationId", "siteId", "title", "slug", "pageType", "status", "isHomePage", "includeInNavigation",
      "navigationLabel", "enabledLocales", "seoSettings", "draftDocument", "publishedDocument", "draftVersion",
      "publishedVersion", "publishedAt", "createdAt", "updatedAt"
    ) SELECT "organizationId", "id", 'Home', 'home', 'home',
      CASE WHEN "publishedDocument" IS NULL THEN 'draft'::"storefront_pages_status_enum" ELSE 'published'::"storefront_pages_status_enum" END,
      true, false, '{"en":"Home"}'::jsonb, "enabledLocales", "seoSettings", "draftDocument", "publishedDocument",
      "draftVersion", "publishedVersion", "publishedAt", "createdAt", "updatedAt"
      FROM "storefront_sites" s WHERE NOT EXISTS (SELECT 1 FROM "storefront_pages" p WHERE p."siteId" = s."id")`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "cms_ai_suggestions"`);
    await q.query(`DROP TABLE IF EXISTS "storefront_page_redirects"`);
    await q.query(`DROP TABLE IF EXISTS "storefront_page_revisions"`);
    await q.query(`DROP TABLE IF EXISTS "storefront_pages"`);
    await q.query(`DROP TYPE IF EXISTS "cms_ai_suggestions_outcome_enum"`);
    await q.query(
      `DROP TYPE IF EXISTS "storefront_page_revisions_origin_enum"`,
    );
    await q.query(`DROP TYPE IF EXISTS "storefront_pages_status_enum"`);
    await q.query(`DROP TYPE IF EXISTS "storefront_pages_pagetype_enum"`);
    await q.query(
      `ALTER TABLE "storefront_sites" DROP COLUMN IF EXISTS "aiEnabled"`,
    );
  }
}
