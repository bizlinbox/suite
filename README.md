![BizInbox Logo](bizinbox.png)

# BizlInbox - WhatsApp Cloud API Inbox

A production-ready, multi-tenant WhatsApp inbox platform built on the WhatsApp Cloud API.

## Quick Start

### Prerequisites

| Requirement | Purpose |
|-------------|---------|
| Docker & Docker Compose | Container orchestration |
| Domain name | For Traefik reverse proxy & Let's Encrypt HTTPS |
| Server with ports 80/443 open | Web traffic & certificate validation |

### 1. Docker Compose (Recommended)

The fastest way to get BizlInbox running in production:

```bash
# 1. Clone or download the repository
cd bizlinbox

# 2. Create and configure environment
cp .env.example .env
# Edit .env with your values:
#   DOMAIN=yourdomain.com
#   LETSENCRYPT_EMAIL=admin@yourdomain.com
#   JWT_SECRET=$(openssl rand -hex 32)
#   JWT_REFRESH_SECRET=$(openssl rand -hex 32)

# 3. Prepare ACME directory for Let's Encrypt
mkdir -p traefik/acme

# 4. Pull pre-built images (fastest)
docker compose pull

# 5. Start all services in detached mode
docker compose up -d
```

**Access points after startup:**

| Service | URL | Description |
|---------|-----|-------------|
| Application | `https://yourdomain.com` | Main BizlInbox app |
| Traefik Dashboard | `https://traefik.yourdomain.com` | Reverse proxy status |
| API Health | `https://yourdomain.com/health` | Backend health check |

### 2. Standalone docker-compose.yml (Copy & Run)

Save the following as `docker-compose.yml` anywhere on your server, edit the variables, and run `docker compose up -d`:

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
      - "--api.dashboard=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedByDefault=false"
      - "--entryPoints.web.address=:80"
      - "--entryPoints.web.http.redirections.entryPoint.to=websecure"
      - "--entryPoints.web.http.redirections.entryPoint.scheme=https"
      - "--entryPoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.email=${LETSENCRYPT_EMAIL}"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--certificatesresolvers.letsencrypt.acme.httpChallenge.entryPoint=web"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./acme:/letsencrypt
    networks:
      - bizlinbox
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.traefik.rule=Host(`traefik.${DOMAIN}`)"
      - "traefik.http.routers.traefik.entrypoints=websecure"
      - "traefik.http.routers.traefik.tls.certresolver=letsencrypt"
      - "traefik.http.routers.traefik.service=api@internal"

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

  app:
    image: bizlintech/bizinbox:develop
    container_name: bizlinbox-app
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://bizlinbox:bizlinbox@postgres:5432/bizlinbox
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      PORT: 4000
      CLIENT_URL: https://${DOMAIN}
      PUBLIC_URL: https://${DOMAIN}
      INTERNAL_API_URL: http://localhost:4000
      NEXT_PUBLIC_API_URL: ""
    networks:
      - bizlinbox
    volumes:
      - uploads:/app/uploads
    labels:
      - "traefik.enable=true"
      # API routes → backend port 4000
      - "traefik.http.routers.bizlinbox-api.rule=Host(`${DOMAIN}`) && (PathPrefix(`/api`) || PathPrefix(`/socket.io`) || PathPrefix(`/uploads`))"
      - "traefik.http.routers.bizlinbox-api.entrypoints=websecure"
      - "traefik.http.routers.bizlinbox-api.tls.certresolver=letsencrypt"
      - "traefik.http.routers.bizlinbox-api.service=bizlinbox-api"
      - "traefik.http.services.bizlinbox-api.loadbalancer.server.port=4000"
      # Frontend routes → frontend port 3000
      - "traefik.http.routers.bizlinbox-web.rule=Host(`${DOMAIN}`)"
      - "traefik.http.routers.bizlinbox-web.entrypoints=websecure"
      - "traefik.http.routers.bizlinbox-web.tls.certresolver=letsencrypt"
      - "traefik.http.routers.bizlinbox-web.service=bizlinbox-web"
      - "traefik.http.services.bizlinbox-web.loadbalancer.server.port=3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

volumes:
  postgres_data:
  redis_data:
  uploads:
```

Create a `.env` file in the same directory:

```bash
DOMAIN=yourdomain.com
LETSENCRYPT_EMAIL=admin@yourdomain.com
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
```

Then run:

```bash
mkdir -p acme
docker compose up -d
```

### 3. First Login

After the containers start, a demo admin account is automatically seeded:

| Credential | Value |
|------------|-------|
| Email | `admin@bizlinbox.local` |
| Password | `admin123` |

> **Warning:** Change this password immediately in production.

### 4. Local Development

For code changes and debugging:

```bash
# Terminal 1 — Backend
cd backend
npm install
cp .env.example .env
npm run migrate
npm run seed
npm run dev

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

## Environment Variables

### Backend

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port | `4000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@localhost:5432/db` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | JWT signing secret (256-bit random) | `...` |
| `JWT_REFRESH_SECRET` | Refresh token secret (256-bit random) | `...` |
| `CLIENT_URL` | Allowed CORS origin(s) | `https://example.com` |
| `WHATSAPP_VERIFY_TOKEN` | Meta webhook verification token | `custom-verify-token` |
| `UPLOAD_DIR` | Upload storage path | `uploads` |

### Frontend (Runtime Configurable)

All frontend configuration is applied at container runtime — no rebuild required.

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL. Leave empty for same-origin (Traefik path-based routing). | `` or `https://api.example.com` |
| `INTERNAL_API_URL` | Internal backend URL for SSR | `http://backend:4000` |

### Traefik

| Variable | Description | Example |
|----------|-------------|---------|
| `DOMAIN` | Root domain for the application | `example.com` |
| `LETSENCRYPT_EMAIL` | Email for Let's Encrypt registration | `admin@example.com` |

## Production Checklist

1. Change default secrets in `.env`
2. Set strong `JWT_SECRET` and `JWT_REFRESH_SECRET` (256-bit random strings)
3. Set `DOMAIN` to your actual domain
4. Configure WhatsApp Cloud API credentials
5. Enable PostgreSQL backups
6. Remove demo admin account or change password
7. Set up log aggregation (Winston JSON logs are ready for ingestion)
8. Configure monitoring on `/health` endpoint
9. (Optional) Add basic auth to Traefik dashboard
10. (Optional) Use a separate subdomain for the API instead of path-based routing


