# BizlInbox Project Rules

## Google Chat Webhook Notifications

**Webhook URL:**  
Set via `GOOGLE_CHAT_WEBHOOK_URL` environment variable (see `.env.example`).

**Purpose:**
When enabled, always send notifications to Google Chat when tasks are completed.

**Payload Format:**
```json
{
  "text": "Task completed: [Task Name] (ID: [TaskID]) by [User] at [Timestamp]. Details: [Notes]"
}
```

## Build Commands
- Frontend: `cd frontend && npm run build`
- Type check: `cd frontend && npx tsc --noEmit --skipLibCheck`
- Backend check: `node -c backend/src/routes/<file>.js`

## Auth & Token Refresh
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- Frontend interceptor catches 401 and auto-refreshes via `/auth/refresh`
- On refresh failure, redirect to `/login`
- Logout clears cookies and all `localStorage` items prefixed with `bizlinbox:`
- Service worker must NEVER cache `/auth/*` endpoints

## Routing
- `/dashboard/inbox` - Inbox list
- `/dashboard/inbox/[id]` - Conversation chat (Next.js 15+ async params)
- Dynamic route `[id]/page.tsx` must `await params` before using `params.id`

## Pagination
- Conversations: `limit=20`, `offset` query params; `q` for search
- Messages: `limit=50`, `offset`, `direction=asc|desc`
