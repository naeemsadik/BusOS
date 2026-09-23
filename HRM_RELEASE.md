# HRM Release Runbook

This release adds tenant-isolated employee records, attendance, compensation history, payroll records, exports, and audit history. Payroll is informational: it does not initiate payments or salary transfers.

## Pre-deployment

1. Back up the PostgreSQL database and confirm that the backup can be restored.
2. Record current user and permission counts for each organization.
3. Confirm every organization has a valid owner and that production uses an IANA timezone.
4. Put the application in a maintenance window before running the migration.

## Deployment order

1. Deploy the backend artifact with database migrations available.
2. Run `npm run migration:show` from `backend` and review the pending migration.
3. Run `npm run migration:run` once.
4. Verify that every existing staff user has one linked employee and one disabled HRM permission row.
5. Deploy the frontend and backend application processes.
6. Have each owner review and save HRM settings before enabling self-attendance or payroll.

The initial settings are `Asia/Dhaka`, `BDT`, Saturday through Thursday, 09:00–17:00, and a 10-minute grace period.

## Verification

Run before release:

```powershell
Set-Location backend
npm test -- --runInBand
npm run build

Set-Location ../frontend
npm test
npm exec -- tsc --noEmit
npm run check:locales
npm run check:ui
npm run build
npm run test:e2e:list
```

Seeded browser checks use `BUSOS_E2E_OWNER_EMAIL`, `BUSOS_E2E_OWNER_PASSWORD`, `BUSOS_E2E_STAFF_EMAIL`, and `BUSOS_E2E_STAFF_PASSWORD`. Do not store these values in source control.

After deployment, verify tenant separation with two test organizations, clock-in concurrency, owner-only compensation access, unresolved-attendance finalization blocking, exports, and the `draft` to `finalized` to `paid` workflow.

## Data checks

Use read-only queries to confirm:

- each staff account maps to at most one employee in its own organization;
- HRM permission rows default to disabled for existing staff;
- employee numbers and attendance work dates are unique within an organization;
- compensation effective periods do not overlap;
- paid payroll runs and their snapshot items remain unchanged.

## Rollback

Stop application processes before rollback. Prefer restoring the verified pre-deployment backup if production data has been written. Only use `npm run migration:revert` when no HRM production data must be retained. Never force-push or rewrite release history during rollback.
