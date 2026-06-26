#!/bin/sh
set -e

# Generate frontend runtime env config
cd /app/frontend
node env-replace.js

# Start Backend (port 4000)
echo "[BizlInbox] Starting backend on port 4000..."
cd /app/backend
node src/index.js &
BACKEND_PID=$!

# Start Frontend (port 3000)
echo "[BizlInbox] Starting frontend on port 3000..."
cd /app/frontend
node server.js &
FRONTEND_PID=$!

# Graceful shutdown handler
cleanup() {
  echo "[BizlInbox] Shutting down services..."
  kill -TERM $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
  wait $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
  exit 0
}

trap cleanup TERM INT

# Wait for both processes
wait $BACKEND_PID
wait $FRONTEND_PID
