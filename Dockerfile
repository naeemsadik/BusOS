# syntax=docker/dockerfile:1.7
ARG NODE_IMAGE=node:22-alpine

FROM ${NODE_IMAGE} AS backend-deps
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

FROM backend-deps AS backend-builder
COPY backend/ ./
RUN npm run build

FROM ${NODE_IMAGE} AS backend-production-deps
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

FROM ${NODE_IMAGE} AS backend
WORKDIR /app
ENV NODE_ENV=production \
    PORT=5000
COPY --from=backend-production-deps --chown=node:node /app/backend/node_modules ./node_modules
COPY --from=backend-builder --chown=node:node /app/backend/dist ./dist
COPY --chown=node:node backend/package.json ./package.json
COPY --chown=node:node backend/scripts ./scripts
RUN mkdir -p /app/uploads/storefront && chown -R node:node /app/uploads
USER node
EXPOSE 5000
CMD ["sh", "-c", "node scripts/bootstrap-production.js && node scripts/create-admin.js && exec node dist/main.js"]

FROM ${NODE_IMAGE} AS frontend-deps
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --legacy-peer-deps

FROM frontend-deps AS frontend-builder
ARG NEXT_PUBLIC_STOREFRONT_ROOT_DOMAIN=localhost
ARG NEXT_PUBLIC_BRAND_NAME=BusOS
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    BACKEND_INTERNAL_URL=http://backend:5000 \
    NEXT_PUBLIC_STOREFRONT_ROOT_DOMAIN=${NEXT_PUBLIC_STOREFRONT_ROOT_DOMAIN} \
    NEXT_PUBLIC_BRAND_NAME=${NEXT_PUBLIC_BRAND_NAME}
COPY frontend/ ./
RUN npm run build

FROM ${NODE_IMAGE} AS frontend
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
COPY --from=frontend-builder --chown=node:node /app/frontend/public ./public
COPY --from=frontend-builder --chown=node:node /app/frontend/.next/standalone ./
COPY --from=frontend-builder --chown=node:node /app/frontend/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]

FROM ${NODE_IMAGE} AS admin-deps
WORKDIR /app/admin
COPY admin/package.json admin/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --legacy-peer-deps

FROM admin-deps AS admin-builder
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    BACKEND_INTERNAL_URL=http://backend:5000
COPY admin/ ./
RUN npm run build

FROM ${NODE_IMAGE} AS admin
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3001
COPY --from=admin-builder --chown=node:node /app/admin/public ./public
COPY --from=admin-builder --chown=node:node /app/admin/.next/standalone ./
COPY --from=admin-builder --chown=node:node /app/admin/.next/static ./.next/static
USER node
EXPOSE 3001
CMD ["node", "server.js"]
