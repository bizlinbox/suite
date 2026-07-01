# syntax=docker/dockerfile:1

# ============================================================
# BizlInbox — Single Image (Backend + Flutter Web Frontend)
# ============================================================

# ---- Stage 1: Build Flutter Web Frontend ----
FROM --platform=$BUILDPLATFORM ghcr.io/cirruslabs/flutter:stable AS flutter-builder

WORKDIR /app

COPY app/pubspec.yaml app/pubspec.lock ./
RUN flutter pub get

COPY app/ .
RUN flutter build web --release

# ---- Stage 2: Build Backend ----
FROM node:20-slim AS backend-builder

WORKDIR /app/backend

COPY backend/package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm install --omit=dev

COPY backend/src ./src

# ---- Stage 3: Production Runner ----
FROM node:20-slim AS runner

WORKDIR /app

# Create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs nodejs

# Install static file server for Flutter web build
RUN npm install -g serve

# Backend setup
WORKDIR /app/backend
COPY --from=backend-builder /app/backend/node_modules ./node_modules
COPY --from=backend-builder /app/backend/src ./src
RUN mkdir -p /app/uploads && chown -R nodejs:nodejs /app

# Flutter Web setup
WORKDIR /app/frontend
COPY --from=flutter-builder /app/build/web ./build/web

# Copy startup script
WORKDIR /app
COPY start.sh ./start.sh
RUN chmod +x start.sh && chown -R nodejs:nodejs /app

USER nodejs

ENV NODE_ENV=production
ENV PORT=4000
ENV FRONTEND_PORT=3000

EXPOSE 3000 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:4000/health', (r) => { process.exit(r && r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

CMD ["/bin/sh", "./start.sh"]
