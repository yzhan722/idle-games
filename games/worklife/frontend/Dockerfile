# ===== Stage 1: Build =====
FROM node:20-alpine AS builder

# npm workspaces：lockfile 在仓库根，必须在根目录安装。
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --workspace=frontend --include-workspace-root=false

# Copy all frontend source
WORKDIR /app/frontend
COPY frontend/index.html ./index.html
COPY frontend/vite.config.ts ./vite.config.ts
COPY frontend/tsconfig.json ./tsconfig.json
COPY frontend/tsconfig.node.json ./tsconfig.node.json
COPY frontend/public/ ./public/
COPY frontend/src/ ./src/

RUN npm run build

# ===== Stage 2: Serve with Nginx =====
FROM nginx:alpine AS production

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx config
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
