# =================================================================
# FAST PRODUCTION FRONTEND DOCKERFILE: AGENT-AS-A-SERVICE (AaaS)
# =================================================================

# ----------------- Stage 1: Build Frontend Assets -----------------
FROM node:20-slim AS builder

WORKDIR /app

# Cache package installation
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --prefer-offline

# Copy application source only
COPY tsconfig*.json vite.config.ts index.html ./
COPY src/ ./src/
COPY public/ ./public/

# Build optimized production bundle directly with Vite (ultra-fast esbuild)
RUN npx vite build

# ----------------- Stage 2: Nginx Static Server -----------------
FROM nginx:alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
