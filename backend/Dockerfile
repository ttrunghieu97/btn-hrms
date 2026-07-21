FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store CI=true pnpm install --frozen-lockfile
RUN pnpm --filter @project/api build

FROM base AS runner
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs
WORKDIR /usr/src/app
COPY --from=build --chown=nodejs:nodejs /usr/src/app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /usr/src/app/backend/node_modules ./backend/node_modules
COPY --from=build --chown=nodejs:nodejs /usr/src/app/package.json ./
COPY --from=build --chown=nodejs:nodejs /usr/src/app/backend/package.json ./backend/package.json
COPY --from=build --chown=nodejs:nodejs /usr/src/app/backend/dist ./backend/dist
COPY --from=build --chown=nodejs:nodejs /usr/src/app/backend/config ./backend/config

EXPOSE 3001
ENV PORT=3001
ENV NODE_ENV=production
WORKDIR /usr/src/app/backend
USER nodejs
CMD ["node", "dist/main.js"]
