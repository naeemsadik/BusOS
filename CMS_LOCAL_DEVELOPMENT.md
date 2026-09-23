# CMS v1 local development

CMS v1 uses PostgreSQL, local filesystem assets, and process-memory public rate limits. It is intended for one local backend and one local frontend process.

## Setup

1. Copy `backend/.env.example` to `backend/.env` and `frontend/.env.example` to `frontend/.env.local`.
2. Use different long random values for `JWT_SECRET`, `CONFIRMATION_TOKEN_SECRET`, and `STOREFRONT_REVALIDATE_SECRET`. The revalidation secret must match in both applications.
3. Create the PostgreSQL database configured by `DATABASE_*`.
4. In `backend`, run `npm ci`, then `npm run migration:run`, then `npm run start:dev`.
5. In `frontend`, run `npm ci --legacy-peer-deps`, then `npm run dev`.

TypeORM synchronization must remain disabled. The CMS migration is safe to run on a clean database or a database containing either earlier storefront table shape; back up a populated database before any migration.

## Local storefront hosts

Set both root-domain variables to `localhost`. A store with slug `demo` is available at `http://demo.localhost:3000`; `http://localhost:3000/store/demo` is the direct routing fallback. English is at the root and Bangla is at `/bn` only when Bangla is enabled.

Uploaded JPEG, PNG, and WebP files are stored under `backend/uploads/storefront` unless `STOREFRONT_UPLOAD_DIR` is set. The directory is intentionally ignored by Git. Back it up together with the database because asset rows and files must be restored as one unit.

## Release checks

Run these before publishing changes:

```text
cd backend
npm run build
npm test -- --runInBand

cd ../frontend
npm run build
npm test
npm run check:locales
npm run check:ui
npm run test:e2e:list
```

Seeded browser tests additionally use `BUSOS_E2E_OWNER_EMAIL`, `BUSOS_E2E_OWNER_PASSWORD`, and `BUSOS_E2E_STOREFRONT_SLUG`. Set `BUSOS_E2E_MUTATIONS=true` only against disposable test data.

## Recovery and limitations

Publishing is transactional: the last published snapshot remains public if draft validation or cache invalidation fails. Cache entries also expire after the short server TTL. If an upload database write fails, the new file is removed; cleanup errors should be investigated before retrying.

This local profile does not provide production wildcard DNS/TLS, object storage, Redis-backed rate limiting, customer accounts, online storefront payments, websockets, SMS notifications, horizontal scaling, monitoring, or automated backups. Those require separate production infrastructure and operational review.
