# ===== Stage 1: Build =====
FROM node:20-alpine AS builder

# npm workspaces：唯一 lockfile 在仓库根，必须在根目录安装，
# 且所有 workspace manifest 都要在场才能正确解析。
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --workspace=backend --include-workspace-root=false

# Copy shared content (backend imports ../../shared/... relative to src/)
COPY shared/ /app/shared/

# Copy source and build
WORKDIR /app/backend
COPY backend/tsconfig.json ./
COPY backend/src/ ./src/
RUN npx tsc -p tsconfig.json

# 编译完成后把 node_modules 换成纯生产依赖(npm ci 会清空重装)
WORKDIR /app
RUN npm ci --omit=dev --workspace=backend --include-workspace-root=false

# ===== Stage 2: Production =====
FROM node:20-alpine AS production

ENV NODE_ENV=production
WORKDIR /app/backend

# Copy shared content at correct relative path for compiled require("../../shared/...")
# dist/index.js → ../../shared resolves to /app/shared
COPY --from=builder /app/shared /app/shared

# Copy built output + production deps(根 hoisted node_modules)
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/node_modules /app/node_modules
COPY backend/package.json ./

# Security: run as non-root
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup
USER appuser

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3001/health || exit 1

CMD ["node", "dist/index.js"]
