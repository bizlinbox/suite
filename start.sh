#!/bin/sh
set -e

# Start Backend (port 4000)
echo "[BizlInbox] Starting backend on port 4000..."
cd /app/backend
node src/index.js &
BACKEND_PID=$!

# Start Flutter Web Frontend (port 3000)
echo "[BizlInbox] Starting frontend on port 3000..."
serve -s /app/frontend/build/web -l 3000 &
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
