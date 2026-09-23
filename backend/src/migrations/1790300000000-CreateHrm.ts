import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHrm1790300000000 implements MigrationInterface {
  name = 'CreateHrm1790300000000';
  transaction = false;

  public async up(q: QueryRunner): Promise<void> {
    await q.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await q.query(`DO $$ BEGIN CREATE TYPE "hrm_employees_status_enum" AS ENUM ('active','inactive','terminated'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await q.query(`DO $$ BEGIN CREATE TYPE "hrm_attendance_status_enum" AS ENUM ('present','absent','paid_leave','unpaid_leave','holiday'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await q.query(`DO $$ BEGIN CREATE TYPE "hrm_attendance_source_enum" AS ENUM ('self','manual'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await q.query(`DO $$ BEGIN CREATE TYPE "hrm_compensations_pay_type_enum" AS ENUM ('monthly','daily'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await q.query(`DO $$ BEGIN CREATE TYPE "hrm_payroll_status_enum" AS ENUM ('draft','finalized','paid'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await q.query(`DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_permissions_module_enum') THEN ALTER TYPE "user_permissions_module_enum" ADD VALUE IF NOT EXISTS 'hrm'; END IF; END $$`);

    await q.query(`CREATE TABLE IF NOT EXISTS "hrm_settings" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organizationId" uuid NOT NULL,
      "timezone" varchar NOT NULL DEFAULT 'Asia/Dhaka', "currencyCode" varchar(3) NOT NULL DEFAULT 'BDT',
      "workDays" jsonb NOT NULL DEFAULT '[0,1,2,3,4,6]'::jsonb,
      "workStartTime" time NOT NULL DEFAULT '09:00:00', "workEndTime" time NOT NULL DEFAULT '17:00:00',
      "graceMinutes" integer NOT NULL DEFAULT 10, "isConfigured" boolean NOT NULL DEFAULT false,
      "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_hrm_settings" PRIMARY KEY ("id"),
      CONSTRAINT "FK_hrm_settings_org" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
    )`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_hrm_settings_org" ON "hrm_settings" ("organizationId")`);

    await q.query(`CREATE TABLE IF NOT EXISTS "hrm_departments" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organizationId" uuid NOT NULL,
      "name" varchar(100) NOT NULL, "description" text, "isActive" boolean NOT NULL DEFAULT true,
      "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_hrm_departments" PRIMARY KEY ("id"),
      CONSTRAINT "FK_hrm_departments_org" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
    )`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_hrm_departments_org_name" ON "hrm_departments" ("organizationId", "name")`);

    await q.query(`CREATE TABLE IF NOT EXISTS "hrm_designations" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organizationId" uuid NOT NULL,
      "departmentId" uuid, "name" varchar(100) NOT NULL, "description" text,
      "isActive" boolean NOT NULL DEFAULT true, "createdAt" timestamp NOT NULL DEFAULT now(),
      "updatedAt" timestamp NOT NULL DEFAULT now(), CONSTRAINT "PK_hrm_designations" PRIMARY KEY ("id"),
      CONSTRAINT "FK_hrm_designations_org" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_hrm_designations_department" FOREIGN KEY ("departmentId") REFERENCES "hrm_departments"("id") ON DELETE SET NULL
    )`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_hrm_designations_org_name" ON "hrm_designations" ("organizationId", "name")`);

    await q.query(`CREATE TABLE IF NOT EXISTS "hrm_employees" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organizationId" uuid NOT NULL, "linkedUserId" uuid,
      "employeeCode" varchar(32) NOT NULL, "firstName" varchar(100) NOT NULL, "lastName" varchar(100) NOT NULL,
      "email" varchar, "phone" varchar, "dateOfBirth" date, "address" text,
      "emergencyContactName" varchar, "emergencyContactPhone" varchar, "joiningDate" date NOT NULL,
      "terminationDate" date, "terminationReason" text,
      "status" "hrm_employees_status_enum" NOT NULL DEFAULT 'active',
      "departmentId" uuid, "designationId" uuid, "workDaysOverride" jsonb,
      "workStartTimeOverride" time, "workEndTimeOverride" time, "graceMinutesOverride" integer,
      "notes" text, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_hrm_employees" PRIMARY KEY ("id"),
      CONSTRAINT "FK_hrm_employees_org" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_hrm_employees_user" FOREIGN KEY ("linkedUserId") REFERENCES "users"("id") ON DELETE SET NULL,
      CONSTRAINT "FK_hrm_employees_department" FOREIGN KEY ("departmentId") REFERENCES "hrm_departments"("id") ON DELETE SET NULL,
      CONSTRAINT "FK_hrm_employees_designation" FOREIGN KEY ("designationId") REFERENCES "hrm_designations"("id") ON DELETE SET NULL
    )`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_hrm_employees_org_code" ON "hrm_employees" ("organizationId", "employeeCode")`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_hrm_employees_linked_user" ON "hrm_employees" ("linkedUserId") WHERE "linkedUserId" IS NOT NULL`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_hrm_employees_org_status" ON "hrm_employees" ("organizationId", "status")`);

    await q.query(`CREATE TABLE IF NOT EXISTS "hrm_attendance" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organizationId" uuid NOT NULL, "employeeId" uuid NOT NULL,
      "workDate" date NOT NULL, "status" "hrm_attendance_status_enum" NOT NULL,
      "source" "hrm_attendance_source_enum" NOT NULL DEFAULT 'manual', "checkInAt" timestamptz,
      "checkOutAt" timestamptz, "scheduledStartAt" timestamptz, "scheduledEndAt" timestamptz,
      "workedMinutes" integer NOT NULL DEFAULT 0, "lateMinutes" integer NOT NULL DEFAULT 0,
      "notes" text, "createdById" uuid, "updatedById" uuid,
      "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_hrm_attendance" PRIMARY KEY ("id"),
      CONSTRAINT "FK_hrm_attendance_org" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_hrm_attendance_employee" FOREIGN KEY ("employeeId") REFERENCES "hrm_employees"("id") ON DELETE CASCADE
    )`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_hrm_attendance_employee_date" ON "hrm_attendance" ("organizationId", "employeeId", "workDate")`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_hrm_attendance_org_date" ON "hrm_attendance" ("organizationId", "workDate")`);

    await q.query(`CREATE TABLE IF NOT EXISTS "hrm_holidays" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organizationId" uuid NOT NULL,
      "holidayDate" date NOT NULL, "name" varchar(150) NOT NULL, "isPaid" boolean NOT NULL DEFAULT true,
      "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_hrm_holidays" PRIMARY KEY ("id"),
      CONSTRAINT "FK_hrm_holidays_org" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
    )`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_hrm_holidays_org_date" ON "hrm_holidays" ("organizationId", "holidayDate")`);

    await q.query(`CREATE TABLE IF NOT EXISTS "hrm_employee_compensations" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organizationId" uuid NOT NULL, "employeeId" uuid NOT NULL,
      "payType" "hrm_compensations_pay_type_enum" NOT NULL, "baseRate" numeric(14,2) NOT NULL,
      "currencyCode" varchar(3) NOT NULL, "effectiveFrom" date NOT NULL, "effectiveTo" date,
      "notes" text, "createdById" uuid NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now(),
      "updatedAt" timestamp NOT NULL DEFAULT now(), CONSTRAINT "PK_hrm_compensations" PRIMARY KEY ("id"),
      CONSTRAINT "FK_hrm_compensations_employee" FOREIGN KEY ("employeeId") REFERENCES "hrm_employees"("id") ON DELETE CASCADE
    )`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_hrm_compensations_employee_from" ON "hrm_employee_compensations" ("organizationId", "employeeId", "effectiveFrom")`);

    await q.query(`CREATE TABLE IF NOT EXISTS "hrm_payroll_runs" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organizationId" uuid NOT NULL,
      "year" integer NOT NULL, "month" integer NOT NULL, "periodStart" date NOT NULL, "periodEnd" date NOT NULL,
      "currencyCode" varchar(3) NOT NULL, "status" "hrm_payroll_status_enum" NOT NULL DEFAULT 'draft',
      "totalNetPay" numeric(14,2) NOT NULL DEFAULT 0, "generatedById" uuid NOT NULL,
      "finalizedAt" timestamptz, "paidAt" timestamptz, "paymentReference" varchar, "paymentNote" text,
      "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_hrm_payroll_runs" PRIMARY KEY ("id"),
      CONSTRAINT "FK_hrm_payroll_runs_org" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
    )`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_hrm_payroll_org_period" ON "hrm_payroll_runs" ("organizationId", "year", "month")`);

    await q.query(`CREATE TABLE IF NOT EXISTS "hrm_payroll_items" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "runId" uuid NOT NULL, "employeeId" uuid NOT NULL,
      "compensationId" uuid NOT NULL, "employeeCode" varchar NOT NULL, "employeeName" varchar NOT NULL,
      "payType" "hrm_compensations_pay_type_enum" NOT NULL, "baseRate" numeric(14,2) NOT NULL,
      "baseEarnings" numeric(14,2) NOT NULL, "adjustments" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "additionsTotal" numeric(14,2) NOT NULL DEFAULT 0, "deductionsTotal" numeric(14,2) NOT NULL DEFAULT 0,
      "netPay" numeric(14,2) NOT NULL, "scheduledDays" integer NOT NULL DEFAULT 0,
      "presentDays" integer NOT NULL DEFAULT 0, "absentDays" integer NOT NULL DEFAULT 0,
      "paidLeaveDays" integer NOT NULL DEFAULT 0, "unpaidLeaveDays" integer NOT NULL DEFAULT 0,
      "paidHolidayDays" integer NOT NULL DEFAULT 0, "unresolvedDays" integer NOT NULL DEFAULT 0,
      "workedMinutes" integer NOT NULL DEFAULT 0, "lateMinutes" integer NOT NULL DEFAULT 0,
      "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_hrm_payroll_items" PRIMARY KEY ("id"),
      CONSTRAINT "FK_hrm_payroll_items_run" FOREIGN KEY ("runId") REFERENCES "hrm_payroll_runs"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_hrm_payroll_items_employee" FOREIGN KEY ("employeeId") REFERENCES "hrm_employees"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_hrm_payroll_items_compensation" FOREIGN KEY ("compensationId") REFERENCES "hrm_employee_compensations"("id") ON DELETE RESTRICT
    )`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_hrm_payroll_item_employee" ON "hrm_payroll_items" ("runId", "employeeId")`);

    await q.query(`CREATE TABLE IF NOT EXISTS "hrm_audit_logs" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organizationId" uuid NOT NULL,
      "actorUserId" uuid NOT NULL, "action" varchar(80) NOT NULL, "entityType" varchar(80) NOT NULL,
      "entityId" uuid, "before" jsonb, "after" jsonb, "createdAt" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_hrm_audit_logs" PRIMARY KEY ("id"),
      CONSTRAINT "FK_hrm_audit_logs_org" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
    )`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_hrm_audit_org_created" ON "hrm_audit_logs" ("organizationId", "createdAt")`);

    await q.query(`INSERT INTO "hrm_employees" (
      "id", "organizationId", "linkedUserId", "employeeCode", "firstName", "lastName", "email",
      "joiningDate", "status", "createdAt", "updatedAt"
    ) SELECT uuid_generate_v4(), u."organizationId", u."id",
      'EMP-' || upper(substr(replace(u."id"::text, '-', ''), 1, 8)), u."firstName", u."lastName", u."email",
      u."createdAt"::date, CASE WHEN u."status"::text = 'active' THEN 'active'::"hrm_employees_status_enum" ELSE 'inactive'::"hrm_employees_status_enum" END,
      now(), now() FROM "users" u WHERE u."role"::text = 'staff' AND u."organizationId" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "hrm_employees" e WHERE e."linkedUserId" = u."id")`);

    await q.query(`INSERT INTO "user_permissions" ("id", "module", "canView", "canCreate", "canEdit", "canDelete", "userId", "createdAt", "updatedAt")
      SELECT uuid_generate_v4(), 'hrm'::"user_permissions_module_enum", false, false, false, false, u."id", now(), now()
      FROM "users" u WHERE u."role"::text = 'staff'
      AND NOT EXISTS (SELECT 1 FROM "user_permissions" p WHERE p."userId" = u."id" AND p."module"::text = 'hrm')`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE IF EXISTS "hrm_audit_logs" CASCADE');
    await q.query('DROP TABLE IF EXISTS "hrm_payroll_items" CASCADE');
    await q.query('DROP TABLE IF EXISTS "hrm_payroll_runs" CASCADE');
    await q.query('DROP TABLE IF EXISTS "hrm_employee_compensations" CASCADE');
    await q.query('DROP TABLE IF EXISTS "hrm_holidays" CASCADE');
    await q.query('DROP TABLE IF EXISTS "hrm_attendance" CASCADE');
    await q.query('DROP TABLE IF EXISTS "hrm_employees" CASCADE');
    await q.query('DROP TABLE IF EXISTS "hrm_designations" CASCADE');
    await q.query('DROP TABLE IF EXISTS "hrm_departments" CASCADE');
    await q.query('DROP TABLE IF EXISTS "hrm_settings" CASCADE');
    await q.query('DROP TYPE IF EXISTS "hrm_payroll_status_enum"');
    await q.query('DROP TYPE IF EXISTS "hrm_compensations_pay_type_enum"');
    await q.query('DROP TYPE IF EXISTS "hrm_attendance_source_enum"');
    await q.query('DROP TYPE IF EXISTS "hrm_attendance_status_enum"');
    await q.query('DROP TYPE IF EXISTS "hrm_employees_status_enum"');
  }
}
