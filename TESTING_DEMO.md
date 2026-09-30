# BusOS automated testing demonstration

This demonstration uses a disposable local PostgreSQL database. It never reads the database settings from `backend/.env` because the runner supplies explicit localhost-only overrides.

## One-time setup

Install PostgreSQL 16 from an Administrator PowerShell window:

```powershell
choco install postgresql16 --yes --params="'/Password:BusOSDemo!2026 /Port:5432'"
```

Then open a new terminal so PostgreSQL commands and services are refreshed. Install project dependencies with the repository's normal `npm ci` commands and install the Playwright Chromium browser once:

```powershell
cd frontend
npx playwright install chromium
```

The runner accepts a different local PostgreSQL password through `BUSOS_DEMO_DB_PASSWORD`. Do not put that value in a tracked file.

## Five-to-eight-minute live demonstration

From the repository root:

```powershell
.\scripts\demo-test.ps1 -Mode Smoke -Headed
```

The command recreates `busos_demo_test`, seeds two organizations and representative operational data, runs critical Jest and Vitest tests, opens the Playwright browser, and produces `frontend/playwright-report-demo/index.html`.

Use `-KeepRunning` to leave the three applications available after the tests:

```powershell
.\scripts\demo-test.ps1 -Mode Smoke -Headed -KeepRunning
```

Demo credentials:

- Owner: `cms.demo.owner@busos.local` / `DemoCMS!2026`
- Staff: `cms.demo.staff@busos.local` / `DemoCMS!2026`
- Admin: `admin` / `admin123`

## Comprehensive verification

```powershell
.\scripts\demo-test.ps1 -Mode Full
```

Full mode adds production builds, backend and frontend coverage, locale/UI checks, admin checks, and the complete Playwright viewport/locale/theme matrix. It is intentionally longer than the live presentation.

## Safety behavior

Database reset and seed scripts stop unless the host is `localhost`/`127.0.0.1`, the database name ends in `_demo_test`, SSL is disabled, and `BUSOS_ALLOW_TEST_RESET=true`. External AI, SMS, email and payment URLs are redirected to a local simulator; no real provider credentials are used.
