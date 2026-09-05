# =================================================================
# PRODUCTION MULTI-STAGE DOCKERFILE: AGENT-AS-A-SERVICE (AaaS)
# =================================================================

# ----------------- Stage 1: Build Dependencies & Code -----------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install build prerequisites
RUN apk add --no-cache libc6-compat

# Copy package descriptors
COPY package*.json ./

# Clean install all dependencies (including devDependencies for build)
RUN npm ci

# Copy entire source tree
COPY . .

# Run validation checks: typecheck, oxlint, and automated backend test suites
RUN npm run lint
RUN npm run test

# Build production assets (Vite + TypeScript)
RUN npm run build

# ----------------- Stage 2: Runtime Production Image -----------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Create non-privileged system user for enterprise container security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 aaasapp

# Copy built frontend distribution and server modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/server ./server
COPY --from=builder /app/node_modules ./node_modules

# Assign permissions
RUN chown -R aaasapp:nodejs /app

USER aaasapp

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

# Start production server
CMD ["node", "-e", "import('./server/server.js').catch(() => import('tsx/cli').then(tsx => tsx.run(['./server/server.ts'])))"]
