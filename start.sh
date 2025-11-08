#!/bin/bash

# Start FastAPI backend in the background
cd /app/backend && python main.py &

# Start Vite frontend in the foreground
cd /app && npm run dev -- --host 0.0.0.0

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?
