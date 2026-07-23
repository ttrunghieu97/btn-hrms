# ============================================
# BTN HRMS API — production image
# ============================================
# Uses pnpm deploy to extract only @project/api's
# production dependency tree — no devDeps, no
# workspace sibling packages, no monorepo overhead.

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /usr/src/app

# ---- Build: full workspace install + compile ----
FROM base AS build
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store CI=true pnpm install --frozen-lockfile
RUN pnpm --filter @project/api build
# Strip source maps from production dist
RUN find apps/api/dist -name "*.js.map" -delete
# Extract production-only dependency subtree
RUN pnpm deploy --filter @project/api --prod --legacy /tmp/deploy

# ---- Runner: production deps + dist only, read-only root FS ----
FROM base AS runner
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs
WORKDIR /usr/src/app
# Production node_modules from pnpm deploy
COPY --from=build --chown=nodejs:nodejs /tmp/deploy/node_modules ./node_modules
# Package manifests
COPY --from=build --chown=nodejs:nodejs /usr/src/app/package.json ./
COPY --from=build --chown=nodejs:nodejs /usr/src/app/apps/api/package.json ./apps/api/package.json
# Compiled output + config (no source maps)
COPY --from=build --chown=nodejs:nodejs /usr/src/app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=nodejs:nodejs /usr/src/app/apps/api/config ./apps/api/config
COPY --from=build --chown=nodejs:nodejs /usr/src/app/apps/api/drizzle ./apps/api/drizzle
COPY --from=build --chown=nodejs:nodejs /usr/src/app/apps/api/drizzle.config.ts ./apps/api/drizzle.config.ts

EXPOSE 3001
ENV PORT=3001
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"
WORKDIR /usr/src/app/apps/api
USER nodejs
CMD ["node", "dist/main.js"]
