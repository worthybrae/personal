#!/bin/bash
set -e

# If ga.json doesn't exist but GOOGLE_CREDENTIALS env var does, create the file
if [ ! -f /app/ga.json ] && [ ! -z "$GOOGLE_CREDENTIALS" ]; then
    echo "Creating ga.json from GOOGLE_CREDENTIALS environment variable..."
    python3 -c "import os, json; data = json.loads(os.environ['GOOGLE_CREDENTIALS']); open('/app/ga.json', 'w').write(json.dumps(data, indent=2))"
fi

# Railway sets PORT=8080, but we need backend on 8000 for local and Railway uses PORT for the main service
# So backend always uses PORT env var (8080 on Railway, 8000 default in main.py)
echo "Starting FastAPI backend..."
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

echo "Backend started successfully (PID: $BACKEND_PID)"

echo "Starting Vite frontend..."
cd /app && npm run dev -- --host 0.0.0.0

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?
