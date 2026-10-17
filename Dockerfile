FROM node:22-alpine AS base

ARG NPM_REGISTRY=https://registry.npmjs.org/

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_NPM_REGISTRY=$NPM_REGISTRY
ENV NODE_OPTIONS=--dns-result-order=ipv4first

RUN corepack enable \
    && pnpm config set registry $NPM_REGISTRY \
    && pnpm config set store-dir /pnpm/store \
    && pnpm config set fetch-timeout 600000 \
    && pnpm config set fetch-retries 10 \
    && pnpm config set fetch-retry-factor 2 \
    && pnpm config set fetch-retry-mintimeout 20000 \
    && pnpm config set fetch-retry-maxtimeout 120000 \
    && pnpm config set network-concurrency 4


FROM base AS deps

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages/*/package.json packages/

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile


FROM deps AS builder

WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile

RUN pnpm build


FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Production-only workspace install (same layout as the deps stage, no dev deps).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages/*/package.json packages/

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod

# The deployment entrypoint is the custom server (apps/web/server.mjs): it
# serves Next AND relays the /api/graphql-ws websocket to the backend.
# Standalone output is intentionally NOT used — Next does not trace custom
# server files, and standalone's generated server.js has no WS relay.
COPY --from=builder --chown=node:node /app/apps/web/.next apps/web/.next
COPY --from=builder --chown=node:node /app/apps/web/next.config.ts apps/web/next.config.ts
COPY --from=builder --chown=node:node /app/apps/web/server.mjs apps/web/server.mjs

USER node

WORKDIR /app/apps/web

EXPOSE 3000

CMD ["node", "server.mjs", "--prod"]
