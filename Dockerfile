# Stage 1: Build TypeScript libraries and bundle Angular 22 SPAs
FROM node:22-alpine AS builder

WORKDIR /app

# Ensure public npm registry
RUN npm config set registry https://registry.npmjs.org/

# Copy manifests for layer caching (omit lockfile to avoid corporate nexus registry lock-in)
COPY package.json tsconfig.base.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/generators/package.json ./packages/generators/
COPY packages/pnp-compiler/package.json ./packages/pnp-compiler/
COPY packages/server/package.json ./packages/server/
COPY apps/client/package.json ./apps/client/
COPY apps/hub/package.json ./apps/hub/
COPY apps/studio/package.json ./apps/studio/
COPY apps/gateway/package.json ./apps/gateway/

RUN npm install

# Copy full repository source
COPY . .

# Build all TypeScript declarations and bundle browser SPAs
RUN npm run build

# Stage 2: Minimal production runtime
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Ensure public npm registry
RUN npm config set registry https://registry.npmjs.org/

# Copy manifests
COPY package.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/generators/package.json ./packages/generators/
COPY packages/pnp-compiler/package.json ./packages/pnp-compiler/
COPY packages/server/package.json ./packages/server/
COPY apps/client/package.json ./apps/client/
COPY apps/hub/package.json ./apps/hub/
COPY apps/studio/package.json ./apps/studio/
COPY apps/gateway/package.json ./apps/gateway/

RUN npm install --omit=dev

# Copy built artifacts and static web bundles
COPY --from=builder /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder /app/packages/generators/dist ./packages/generators/dist
COPY --from=builder /app/packages/pnp-compiler/dist ./packages/pnp-compiler/dist
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/apps/hub/dist ./apps/hub/dist
COPY --from=builder /app/apps/client/dist ./apps/client/dist
COPY --from=builder /app/apps/studio/dist ./apps/studio/dist
COPY --from=builder /app/apps/gateway/dist ./apps/gateway/dist

USER node

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "apps/gateway/dist/index.js"]
