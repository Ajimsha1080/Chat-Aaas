# =================================================================
# PRODUCTION FRONTEND DOCKERFILE: AGENT-AS-A-SERVICE (AaaS)
# =================================================================

# ----------------- Stage 1: Build Frontend Assets -----------------
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ----------------- Stage 2: Nginx Static Server -----------------
FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
