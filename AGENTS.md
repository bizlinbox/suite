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
- Flutter web: `cd app && flutter build web --release`
- Backend check: `node -c backend/src/routes/<file>.js`

## Auth & Token Refresh
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- Frontend interceptor catches 401 and auto-refreshes via `/auth/refresh`
- On refresh failure, redirect to `/login`
- Logout clears cookies and all `localStorage` items prefixed with `bizlinbox:`
- Flutter web service worker (if enabled) must NEVER cache `/auth/*` endpoints

## Routing
- `/dashboard/inbox` - Inbox list
- `/dashboard/inbox/:id` - Conversation chat (Flutter GoRouter path parameter)

## Pagination
- Conversations: `limit=20`, `offset` query params; `q` for search
- Messages: `limit=50`, `offset`, `direction=asc|desc`
