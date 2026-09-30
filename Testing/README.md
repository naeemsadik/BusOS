# BusOS Selenium system tests

This folder contains browser-level tests for the BusOS frontend, admin portal, and public storefront. Selenium Manager supplies the matching browser driver automatically.

## Coverage

| Area | Checks |
| --- | --- |
| Public frontend | Landing page at mobile, tablet, and desktop widths; login validation; registration validation; protected-route redirect |
| Owner application | Login and all 17 protected modules; HRM tabs; seeded POS cart; inventory editor; storefront publishing |
| Staff application | Login and attendance self-service without compensation details |
| Admin portal | Login and all 6 admin modules; seeded organization search |
| Public storefront | Homepage, catalog, optional Bangla route, and opt-in cash-on-delivery checkout |

Backend behavior is exercised through these browser journeys. Keep the backend Jest tests for endpoint-level and service-level coverage.

## Prerequisites

- Python 3.10 or newer
- Chrome, Firefox, or Edge
- PostgreSQL and the BusOS backend on port 5000
- Frontend on port 3000
- Admin portal on port 3001
- Seeded owner, staff, admin, inventory, HRM, organization, and published storefront records for the corresponding tests

Start each application with its existing project command. The frontend and admin applications proxy `/backend-api` to the backend, so their environment files must be configured before starting them.

## Setup

From `Testing` in PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Fill the seeded credentials and storefront slug in `.env`. Do not commit `.env`.

## Run

Run everything that the configured environment supports:

```powershell
.\run-tests.ps1
```

Useful focused runs:

```powershell
# Public checks only
.\run-tests.ps1 -Marker "smoke"

# Owner and staff areas in a visible Edge window
.\run-tests.ps1 -Browser edge -Headed -Marker "owner or staff"

# Admin portal
.\run-tests.ps1 -Marker "admin"

# Data-changing flows; also set BUSOS_E2E_MUTATIONS=true in .env
.\run-tests.ps1 -Marker "mutation"
```

The equivalent direct command is:

```powershell
python -m pytest --busos-browser chrome
```

Tests whose credentials or seed identifiers are absent are reported as skipped. A failed test writes a screenshot and page source to `Testing/artifacts/`.

## Configuration

All settings are listed in `.env.example`. Command-line `--base-url` and `--admin-url` override the application URLs. Use `BUSOS_E2E_STOREFRONT_URL` when the public storefront is not available at `<slug>.localhost`.

`BUSOS_E2E_MUTATIONS` is `false` by default. Enable it only for disposable test data because checkout creates an order and publishing updates the live seeded storefront.

For a Selenium Grid, set `SELENIUM_REMOTE_URL`. To use a headed browser without the wrapper script, add `--busos-headed`.

