# BizlInbox Production Fine-Tuning Document

Generated after a full codebase audit of the current main branch (SHA ~573e736).
This document categorizes findings by severity and provides concrete, actionable recommendations with migration requirements.

---

## 1. Security & Compliance (CRITICAL)

### 1.1 ENCRYPTION_KEY fallback is catastrophic
- **Current**: `utils/encryption.js` falls back to `JWT_SECRET`, then a hardcoded string `fallback-key-32chars-long!!!!!`.
- **Risk**: If `ENCRYPTION_KEY` is unset, all encrypted AI API keys use a publicly-known key. Anyone with DB access can decrypt them trivially.
- **Fix**: Remove fallbacks. Throw on startup if `ENCRYPTION_KEY` is missing or < 32 chars. Also require `JWT_SECRET` and `JWT_REFRESH_SECRET` to be >= 32 chars.
- **Migration**: None (runtime enforcement).
- **Files**: `backend/src/utils/encryption.js`, `backend/src/config.js`

### 1.2 JWT secrets have weak defaults
- **Current**: `config.js` falls back to `'change-me'` and `'change-me-refresh'`.
- **Risk**: Any deployment missing env vars is instantly compromisable.
- **Fix**: Remove fallbacks. Throw on startup if secrets are missing or < 32 chars.
- **Migration**: None.
- **Files**: `backend/src/config.js`

### 1.3 No rate limiting anywhere
- **Current**: Rate limiting was explicitly removed per git history (`ec1d0a6 remove: disable all rate limiting`).
- **Risk**: Login brute force, webhook flooding, campaign API abuse, registration spam.
- **Fix**: Re-introduce targeted rate limiting:
  - `express-rate-limit` on `/api/v1/auth/login`, `/api/v1/auth/register`, `/api/v1/webhooks`.
  - Stricter limits on webhook endpoints (Meta retries are expected, but unauthenticated floods are not).
  - Per-org campaign send throttling in BullMQ.
- **Migration**: None.
- **Files**: `backend/src/index.js`, `backend/src/routes/auth.js`, `backend/src/routes/webhooks.js`

### 1.4 Helmet CSP allows unsafe-inline scripts
- **Current**: `helmet` CSP config explicitly allows `'unsafe-inline'` for `scriptSrc` and `styleSrc`.
- **Risk**: XSS if user-generated content can inject scripts.
- **Fix**: Remove `'unsafe-inline'` from `scriptSrc`. Use nonces or hash-based CSP. For styles, keep `'unsafe-inline'` only if Tailwind requires it (it usually does not with standalone builds), or move to hash-based.
- **Migration**: None.
- **Files**: `backend/src/index.js`

### 1.5 AI Agent API keys stored with reversible encryption only
- **Current**: AI Agent API keys are encrypted with AES but the encryption key is shared across the app.
- **Risk**: Key compromise = all customer API keys exposed.
- **Fix**: Document this as a known architecture limitation. In a future major release, consider per-org key derivation or HSM/KMS integration. For now, enforce strong `ENCRYPTION_KEY` as above.
- **Migration**: None for now (architectural note).

---

## 2. Database & Migrations (CRITICAL)

### 2.1 Migration system is not versioned
- **Current**: `migrate.js` runs the entire `schema.sql` on every startup in a single transaction. The file is now ~540 lines mixing schema and migrations.
- **Risk**: As the file grows, startup time increases. Risk of transaction bloat. No rollback capability. Hard to reason about state.
- **Fix**: Implement a minimal versioned migration tracker.
  - Add a `migrations` table: `(id SERIAL PRIMARY KEY, name TEXT UNIQUE, applied_at TIMESTAMPTZ DEFAULT NOW())`.
  - Split `schema.sql` into:
    - `migrations/001_initial_schema.sql` (base schema)
    - `migrations/002_contact_fields.sql`
    - `migrations/003_reaction_support.sql`
    - `migrations/004_api_logs.sql`
    - `migrations/005_waba_accounts.sql`
    - `migrations/006_campaigns.sql`
    - `migrations/007_message_templates.sql`
    - `migrations/008_automations.sql`
    - `migrations/009_ai_agents.sql`
    - `migrations/010_agent_waba_access.sql`
    - etc.
  - `migrate.js` reads files from `migrations/`, checks `migrations` table, and runs only unapplied files in order inside transactions.
- **Migration**: The `migrations` table itself must be bootstrapped safely on existing DBs. We can detect an existing DB by checking if `organizations` exists and bootstrap `migrations` with all past migration names marked as applied.
- **Files**: `backend/src/db/migrate.js`, `backend/src/db/schema.sql` (refactor)

### 2.2 Missing indexes on high-traffic queries
- **Current**: No index on `messages.created_at` (used for conversation history pagination). No index on `conversations.last_message_at` (used for inbox sorting). No composite index on `campaign_recipients(campaign_id, status)`.
- **Fix**: Add indexes:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);
  CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign_status ON campaign_recipients(campaign_id, status);
  CREATE INDEX IF NOT EXISTS idx_messages_sender_type ON messages(sender_type);
  ```
- **Migration**: `migrations/011_performance_indexes.sql`
- **Files**: `backend/src/db/schema.sql` (or new migration)

### 2.3 whatsapp_numbers table is partially deprecated
- **Current**: `waba_accounts` replaced much of `whatsapp_numbers` functionality, but `whatsapp_numbers` still exists with a `waba_account_id` FK. There may be dead code referencing it.
- **Risk**: Confusion, potential data inconsistency, dead schema.
- **Fix**: Audit all references to `whatsapp_numbers`. If truly unused, drop the table in a migration after confirming no data references remain. If still used for some edge case, document it clearly.
- **Migration**: `migrations/012_cleanup_whatsapp_numbers.sql` (conditional, only if safe).
- **Files**: `backend/src/db/schema.sql`, audit all routes/services.

### 2.4 addresses table overlaps with contacts columns
- **Current**: `contacts` has `address`, `city`, `state`, `country`, `zip_code`. `addresses` also has `street`, `city`, `state`, `zip`, `country`. This is redundant.
- **Risk**: Data inconsistency, confusion about source of truth.
- **Fix**: Deprecate address columns on `contacts` in favor of `addresses` (which supports multiple addresses per contact). Or vice versa. Given the app shows a single contact profile, keeping the flattened columns on `contacts` and dropping `addresses` may be simpler. If WhatsApp-synced addresses are needed, migrate data from `addresses` to `contacts` and drop `addresses`.
- **Migration**: `migrations/013_normalize_addresses.sql` (data migration + DROP TABLE).
- **Files**: `backend/src/db/schema.sql`, `backend/src/routes/contacts.js`

---

## 3. Backend Reliability & Code Quality (HIGH)

### 3.1 Health check does not verify Redis
- **Current**: `/health` only checks PostgreSQL. Redis is required for BullMQ workers and queue operations.
- **Risk**: App appears healthy when Redis is down, but campaigns, message queuing, and analytics break silently.
- **Fix**: Add Redis ping to health check. Return 503 if Redis unavailable.
- **Migration**: None.
- **Files**: `backend/src/index.js`

### 3.2 No request timeouts on external API calls
- **Current**: WhatsApp API calls in `services/whatsapp.js` and AI API calls in `aiAgents.js` have some timeouts (30s for AI), but webhook processing, media downloads, and template sync may hang.
- **Risk**: Hanging requests exhaust Node.js event loop, causing cascading failures.
- **Fix**: Add `axios.defaults.timeout = 30000` or per-request timeouts. Use `http.Agent` with `timeout`. Add request timeout middleware for all Express routes.
- **Migration**: None.
- **Files**: `backend/src/index.js`, `backend/src/services/whatsapp.js`, `backend/src/routes/aiAgents.js`, `backend/src/routes/webhooks.js`

### 3.3 Error handler logs all 4xx with stack traces
- **Current**: `errorHandler.js` logs every error including 400/401/403 with full stack traces.
- **Risk**: Log noise, potential PII leakage in logs (validation errors may contain user data).
- **Fix**: Only log stack traces for 5xx errors. For 4xx, log minimal context (path, status, message) without stack.
- **Migration**: None.
- **Files**: `backend/src/middleware/errorHandler.js`

### 3.4 Webhook processing lacks retry / dead-letter handling
- **Current**: Webhooks ack immediately (200). If DB is briefly down or processing fails, the event is lost.
- **Risk**: Missed messages, status updates lost.
- **Fix**: For critical webhook events, enqueue to BullMQ for reliable processing instead of handling inline. Meta will retry if we return 500, but that blocks ack. Better pattern: ack immediately, process async via queue with retries.
- **Migration**: None (architectural improvement).
- **Files**: `backend/src/routes/webhooks.js`

### 3.5 Socket.IO auth disconnects unauthenticated sockets abruptly
- **Current**: `socket.js` disconnects sockets immediately if no accessToken cookie.
- **Risk**: Frontend may reconnect in a tight loop during token refresh window.
- **Fix**: Instead of `disconnect(true)`, emit an `auth_error` event and allow a short grace period (e.g., 5s) for the client to refresh before disconnecting. Or have the client handle reconnection with backoff properly.
- **Migration**: None.
- **Files**: `backend/src/services/socket.js`

### 3.6 Commented-out workflow routes
- **Current**: `workflows` routes are commented out in `index.js` but the table/schema still exists.
- **Risk**: Dead code confusion.
- **Fix**: Either restore workflows (if intended) or remove the table, routes, and frontend pages. Given automations replaced workflows per git history, fully remove workflows.
- **Migration**: `migrations/014_remove_workflows.sql`
- **Files**: `backend/src/index.js`, `backend/src/routes/workflows.js`, `backend/src/db/schema.sql`, frontend flows page.

### 3.7 Missing input validation on several routes
- **Current**: Some routes (e.g., automations create/update, campaigns create) check basic presence but lack deep validation (e.g., max string lengths, UUID format checks, SQL injection vectors via JSONB fields).
- **Fix**: Apply Zod schemas consistently across ALL routes that accept body params. Reject unknown keys.
- **Migration**: None.
- **Files**: `backend/src/routes/*.js`

### 3.8 No request ID / correlation tracing
- **Current**: No way to trace a single request across logs, socket events, and queue jobs.
- **Fix**: Generate a `request-id` header per request (or use `req.id` from `uuid`). Propagate to all logs, DB queries (via application_name or comment), and BullMQ job metadata.
- **Migration**: None.
- **Files**: `backend/src/index.js`, `backend/src/utils/logger.js`

---

## 4. Frontend Stability & UX (HIGH)

### 4.1 Frontend package.json claims MUI/Joy UI but does not include it
- **Current**: `features.md` lists MUI / Joy UI. `frontend/package.json` does not include `@mui/material` or `@mui/joy`. The app uses Tailwind CSS + Lucide icons.
- **Risk**: Documentation drift, potential build issues if someone tries to import MUI components.
- **Fix**: Update `features.md` to reflect actual stack (Tailwind CSS + Lucide React + custom components). Remove any MUI imports if they exist.
- **Migration**: None.
- **Files**: `features.md`, audit frontend imports.

### 4.2 API errors are silently swallowed in many components
- **Current**: `Inbox.tsx` has multiple `.catch(() => {})` patterns. `handleAssignAgent` catches and ignores errors.
- **Risk**: Users see no feedback when operations fail (e.g., network down, permission denied).
- **Fix**: Replace silent catches with `toastError` calls consistently. At minimum log to console in dev.
- **Migration**: None.
- **Files**: `frontend/src/components/Inbox.tsx`, `frontend/src/components/ChatWindow.tsx`, etc.

### 4.3 useAuth hook does not handle token refresh
- **Current**: `useAuth` fetches `/auth/me` once on mount. If the access token expires while the app is open, the next API call triggers a 401 redirect without attempting refresh first.
- **Risk**: Users get kicked out unnecessarily during sessions.
- **Fix**: Update `api.ts` interceptor to attempt `/auth/refresh` on 401 before redirecting. Use a flag to prevent multiple simultaneous refresh attempts.
- **Migration**: None.
- **Files**: `frontend/src/lib/api.ts`, `frontend/src/hooks/useAuth.ts`

### 4.4 Missing `offline.html` in PWA precache
- **Current**: `sw.js` precaches `/offline.html` but the file may not exist in `public/`.
- **Risk**: Service worker install may fail partially, or offline navigation falls through to browser error page.
- **Fix**: Create `frontend/public/offline.html` with a branded offline fallback page.
- **Migration**: None.
- **Files**: `frontend/public/offline.html`

### 4.5 No error boundary for dashboard sections
- **Current**: Only a root `error.tsx` exists. If a single dashboard page crashes, the whole app errors out.
- **Fix**: Add per-segment error boundaries (e.g., `dashboard/inbox/error.tsx`) so a crash in analytics does not break inbox.
- **Migration**: None.
- **Files**: `frontend/src/app/dashboard/*/error.tsx`

### 4.6 PWA manifest icons reference SVGs with maskable purpose
- **Current**: `manifest.json` uses SVG icons with `"purpose": "any maskable"`. Some platforms (older Android) do not handle SVG maskable icons well.
- **Fix**: Generate PNG fallbacks (192x192, 512x512) and reference them alongside SVGs, or remove maskable purpose from SVG.
- **Migration**: None.
- **Files**: `frontend/public/manifest.json`

---

## 5. DevOps & Infrastructure (MEDIUM)

### 5.1 start.sh does not restart crashed processes
- **Current**: `start.sh` runs backend and frontend with `&` and `wait`. If one crashes, the other continues but the container may not restart (depends on Docker restart policy).
- **Risk**: Partial outages where only one service is down inside the container.
- **Fix**: Use a lightweight process manager like `pm2` or `supervisord`, or a Node.js-based spawn monitor that restarts crashed children. Alternatively, split into two containers (recommended for production).
- **Migration**: None (or major architectural shift to multi-container).
- **Files**: `start.sh`, `Dockerfile`

### 5.2 Docker image uses `bizlintech/bizlinbox:develop` in compose
- **Current**: `docker-compose.yml` references a pre-built image but also has a local build context. This is confusing.
- **Fix**: Default to `image: bizlinbox-app:latest` or remove `image` and rely solely on `build` for local dev. Document the CI/CD image tag strategy.
- **Migration**: None.
- **Files**: `docker-compose.yml`

### 5.3 Traefik dashboard exposed without explicit IP whitelist
- **Current**: `traefik.yml` enables dashboard at `traefik.${DOMAIN}` with basic auth missing from dynamic config.
- **Risk**: If dynamic.yml does not have basic auth, the Traefik dashboard is publicly exposed.
- **Fix**: Verify `traefik/dynamic.yml` has basic auth middleware for the dashboard route. If not, add it.
- **Migration**: None.
- **Files**: `traefik/dynamic.yml`

### 5.4 No backup/restore documentation
- **Current**: No docs on how to back up PostgreSQL or Redis volumes.
- **Fix**: Add a `BACKUPS.md` with `pg_dump` / `pg_restore` commands and Redis `BGSAVE` notes.
- **Migration**: None.
- **Files**: New `BACKUPS.md`

---

## 6. Feature Completeness & UX (MEDIUM)

### 6.1 No message search
- **Current**: Conversations and messages are not searchable.
- **Fix**: Add a search API endpoint (`GET /api/v1/conversations/search?q=...`) that searches contact names, phones, and message content with `ILIKE` (or PostgreSQL full-text search for larger scale). Add a search bar to the inbox UI.
- **Migration**: `migrations/015_message_search_indexes.sql` (GIN index on messages.content and contacts.name/phone).
- **Files**: `backend/src/routes/conversations.js`, `frontend/src/components/Inbox.tsx`

### 6.2 No conversation tags / labels
- **Current**: Contacts have `tags TEXT[]`, but conversations do not.
- **Fix**: Add `tags TEXT[] DEFAULT '{}'` to `conversations`. Allow agents to tag conversations from the UI. Filter inbox by tags.
- **Migration**: `migrations/016_conversation_tags.sql`
- **Files**: `backend/src/db/schema.sql`, `backend/src/routes/conversations.js`, frontend inbox UI.

### 6.3 No typing indicators
- **Current**: No "agent is typing" or "contact is typing" support.
- **Fix**: Emit `typing` socket events. Show a typing indicator in `ChatWindow`. (Note: WhatsApp Cloud API does not expose contact typing, but agent-to-agent typing is useful.)
- **Migration**: None.
- **Files**: `backend/src/services/socket.js`, `frontend/src/components/ChatWindow.tsx`

### 6.4 No audit log for admin actions
- **Current**: No way to see who changed what (role edits, WABA changes, AI agent updates).
- **Fix**: Add an `audit_logs` table and middleware that logs all mutating admin actions.
- **Migration**: `migrations/017_audit_logs.sql`
- **Files**: New `backend/src/routes/auditLogs.js`, new frontend page.

### 6.5 Campaigns lack proper template variable substitution
- **Current**: `substituteVariables` in workers only replaces `{{key}}` with empty strings for template vars. No actual contact field mapping.
- **Fix**: Map template variables to contact fields (e.g., `{{name}}` -> `contact.name`, `{{phone}}` -> `contact.phone`).
- **Migration**: None.
- **Files**: `backend/src/queues/workers.js`, `backend/src/routes/campaigns.js`

### 6.6 Automations engine is storage-only (no execution)
- **Current**: Automation nodes and edges are stored, but there is no runtime engine to execute them when triggers fire. `webhooks.js` has a TODO comment about this.
- **Fix**: Build a minimal automation executor that runs inside the webhook handler or as a BullMQ job. For MVP, support: `trigger_message` -> `send_text` / `send_template` / `assign_agent` / `tag_contact`.
- **Migration**: None.
- **Files**: `backend/src/routes/webhooks.js`, new `backend/src/services/automationEngine.js`

---

## 7. Testing & Observability (MEDIUM)

### 7.1 Zero automated tests
- **Current**: No unit, integration, or E2E tests found.
- **Risk**: Regressions in critical paths (auth, webhooks, billing) go undetected.
- **Fix**:
  - Add Jest + Supertest for backend API route testing.
  - Add at least smoke tests for auth flow, webhook processing, and campaign creation.
  - Add a `test` script to `backend/package.json`.
- **Migration**: None.
- **Files**: New `backend/tests/...`

### 7.2 No structured logging for frontend
- **Current**: Frontend errors only go to `console.error`.
- **Fix**: Send critical frontend errors to backend `/api/v1/client-logs` endpoint (rate-limited). Or integrate a lightweight error tracking service.
- **Migration**: None.
- **Files**: `frontend/src/lib/api.ts`, new backend route.

### 7.3 No API documentation
- **Current**: No Swagger/OpenAPI spec.
- **Fix**: Add `swagger-jsdoc` + `swagger-ui-express` to backend. Document core endpoints (auth, conversations, messages, campaigns).
- **Migration**: None.
- **Files**: `backend/src/index.js`, new `backend/src/docs/swagger.js`

---

## Implementation Roadmap (Recommended Order)

1. **Security (1.1, 1.2, 1.3)** — Do not deploy without these.
2. **Database migrations (2.1, 2.2)** — Foundation for all future schema changes.
3. **Backend reliability (3.1, 3.3, 3.6, 3.7)** — Prevent outages and data loss.
4. **Frontend stability (4.2, 4.3, 4.4)** — Improve UX and reduce user friction.
5. **Feature gaps (6.1, 6.2, 6.5)** — High-value user-facing improvements.
6. **Observability (7.1, 7.3)** — Long-term maintainability.
7. **Infrastructure (5.1, 5.3)** — Harden deployment.

---

## Files to Create / Modify Summary

| File | Action | Priority |
|------|--------|----------|
| `backend/src/config.js` | Enforce required secrets, no fallbacks | CRITICAL |
| `backend/src/utils/encryption.js` | Remove fallbacks, throw on missing key | CRITICAL |
| `backend/src/db/migrate.js` | Rewrite with versioned migrations | CRITICAL |
| `backend/src/db/schema.sql` | Split into migration files | CRITICAL |
| `backend/src/index.js` | Add rate limiting, Redis health check, request timeout, request IDs | HIGH |
| `backend/src/middleware/errorHandler.js` | Reduce 4xx log noise | HIGH |
| `backend/src/routes/webhooks.js` | Async processing queue, remove dead TODOs | HIGH |
| `backend/src/services/socket.js` | Graceful auth error handling | MEDIUM |
| `frontend/src/lib/api.ts` | Add token refresh interceptor | HIGH |
| `frontend/public/offline.html` | Create branded offline page | MEDIUM |
| `features.md` | Correct frontend stack description | LOW |
| `docker-compose.yml` | Fix image reference ambiguity | LOW |
| `traefik/dynamic.yml` | Verify dashboard auth | MEDIUM |
| New `migrations/*.sql` | ~15 migration files | CRITICAL |
| New `BACKUPS.md` | Add backup documentation | LOW |
