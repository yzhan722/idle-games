# ===== Stage 1: Build =====
FROM node:20-alpine AS builder

WORKDIR /app/backend

# Copy shared content (backend imports ../../shared/... relative to src/)
COPY shared/ /app/shared/

# Install backend dependencies
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --omit=dev && cp -r node_modules /app/prod_modules
RUN npm ci

# Copy source and build
COPY backend/tsconfig.json ./
COPY backend/src/ ./src/

RUN npx tsc -p tsconfig.json

# ===== Stage 2: Production =====
FROM node:20-alpine AS production

ENV NODE_ENV=production
WORKDIR /app/backend

# Copy shared content at correct relative path for compiled require("../../shared/...")
# dist/index.js → ../../shared resolves to /app/shared
COPY --from=builder /app/shared /app/shared

# Copy built output + production deps
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/prod_modules ./node_modules
COPY backend/package.json ./

# Security: run as non-root
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup
USER appuser

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "dist/index.js"]
