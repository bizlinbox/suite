![BizlInbox Logo](bizinbox.png)

# BizlInbox - WhatsApp Cloud API Inbox

A production-ready, multi-tenant WhatsApp inbox platform built on the WhatsApp Cloud API.

## About

BizlInbox is a production-ready, multi-tenant WhatsApp inbox platform built on the WhatsApp Cloud API. It provides a complete solution for managing WhatsApp Business API conversations with support for multiple phone numbers, team collaboration, and real-time messaging.

## Env Sample

```bash
# Backend
NODE_ENV=production
PORT=4000
DATABASE_URL=postgres://bizlinbox:bizlinbox@localhost:5432/bizlinbox
REDIS_URL=redis://localhost:6379

# Auth secrets (generate strong random values in production)
JWT_SECRET=change-me-to-a-256-bit-random-string
JWT_REFRESH_SECRET=change-me-to-another-256-bit-random-string

# WhatsApp Cloud API
WHATSAPP_API_VERSION=v20.0
WHATSAPP_APP_ID=
WHATSAPP_APP_SECRET=

# Optional: fallback global verify token for legacy webhook endpoint.
# Each WABA now auto-generates its own verify token on creation.

# Storage
UPLOAD_DIR=uploads

# Domain & Traefik
DOMAIN=example.com
LETSENCRYPT_EMAIL=admin@example.com

# API base URL is configured at runtime in the Flutter web app via the domain screen.
```

## Docker Compose

```yaml
version: '3.8'

networks:
  bizlinbox:
    driver: bridge

services:
  traefik:
    image: traefik:v2.11
    container_name: bizlinbox-traefik
    restart: unless-stopped
    command:
      - "--configFile=/etc/traefik/traefik.yml"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik/traefik.yml:/etc/traefik/traefik.yml:ro
      - ./traefik/dynamic.yml:/etc/traefik/dynamic.yml:ro
      - ./traefik/acme:/letsencrypt
    networks:
      - bizlinbox
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.traefik.rule=Host(`traefik.${DOMAIN}`)"
      - "traefik.http.routers.traefik.entrypoints=websecure"
      - "traefik.http.routers.traefik.tls.certresolver=letsencrypt"
      - "traefik.http.routers.traefik.service=api@internal"
    deploy:
      resources:
        limits:
          memory: 256M

  postgres:
    image: postgres:15-alpine
    container_name: bizlinbox-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: bizlinbox
      POSTGRES_PASSWORD: bizlinbox
      POSTGRES_DB: bizlinbox
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - bizlinbox
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U bizlinbox -d bizlinbox"]
      interval: 5s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 512M

  redis:
    image: redis:7-alpine
    container_name: bizlinbox-redis
    restart: unless-stopped
    networks:
      - bizlinbox
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 256M

  app:
    image: bizlintech/bizinbox:develop
    build:
      context: .
      dockerfile: Dockerfile
    container_name: bizlinbox-app
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://bizlinbox:bizlinbox@postgres:5432/bizlinbox
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET:-change-me-in-production}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET:-change-me-in-production}
      PORT: 4000
      CLIENT_URL: https://${DOMAIN}
      PUBLIC_URL: https://${DOMAIN}
      INTERNAL_API_URL: http://localhost:4000
    networks:
      - bizlinbox
    volumes:
      - uploads:/app/uploads
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://127.0.0.1:4000/health', (r) => { process.exit(r && r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 15s
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.bizlinbox-api.rule=Host(`${DOMAIN}`) && (PathPrefix(`/api`) || PathPrefix(`/socket.io`) || PathPrefix(`/uploads`))"
      - "traefik.http.routers.bizlinbox-api.priority=100"
      - "traefik.http.routers.bizlinbox-api.entrypoints=websecure"
      - "traefik.http.routers.bizlinbox-api.tls.certresolver=letsencrypt"
      - "traefik.http.routers.bizlinbox-api.service=bizlinbox-api"
      - "traefik.http.services.bizlinbox-api.loadbalancer.server.port=4000"
      - "traefik.http.routers.bizlinbox-web.rule=Host(`${DOMAIN}`)"
      - "traefik.http.routers.bizlinbox-web.priority=10"
      - "traefik.http.routers.bizlinbox-web.entrypoints=websecure"
      - "traefik.http.routers.bizlinbox-web.tls.certresolver=letsencrypt"
      - "traefik.http.routers.bizlinbox-web.service=bizlinbox-web"
      - "traefik.http.services.bizlinbox-web.loadbalancer.server.port=3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    deploy:
      resources:
        limits:
          memory: 1G

volumes:
  postgres_data:
  redis_data:
  uploads:
```
