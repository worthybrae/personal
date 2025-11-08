#!/bin/bash
set -e

# Get the port Railway sets (default to 8000 for local dev)
BACKEND_PORT=${PORT:-8000}
export BACKEND_URL="http://127.0.0.1:${BACKEND_PORT}"

echo "Starting FastAPI backend on port ${BACKEND_PORT}..."
# Run backend in background but keep logs in stdout
cd /app/backend && python -u main.py &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Check if backend is still running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "Backend failed to start!"
    exit 1
fi

echo "Backend started successfully (PID: $BACKEND_PID) at ${BACKEND_URL}"

echo "Starting Vite frontend..."
cd /app && npm run dev -- --host 0.0.0.0

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?
