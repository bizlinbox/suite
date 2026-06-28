# ============================================================
# BizlInbox — Single Image (Backend + Frontend)
# Image: bizlintech/bizlinbox:develop
# ============================================================

# ---- Stage 1: Build Frontend ----
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ .
RUN npm run build

# ---- Stage 2: Build Backend ----
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY backend/src ./src

# ---- Stage 3: Production Runner ----
FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Backend setup
WORKDIR /app/backend
COPY --from=backend-builder /app/backend/node_modules ./node_modules
COPY --from=backend-builder /app/backend/src ./src
RUN mkdir -p /app/uploads && chown -R nodejs:nodejs /app

# Frontend setup
WORKDIR /app/frontend
COPY --from=frontend-builder /app/frontend/.next/standalone ./
COPY --from=frontend-builder /app/frontend/.next/static ./.next/static
COPY --from=frontend-builder /app/frontend/public ./public
COPY --from=frontend-builder /app/frontend/env-replace.js ./env-replace.js

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
