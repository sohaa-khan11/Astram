#!/bin/bash

echo "=== Starting ASTraM Parking Intelligence ==="

# Check virtual environment exists
if [ ! -d ".venv" ]; then
    echo "Error: Virtual environment not found. Please run ./setup.sh first."
    exit 1
fi

# Trap Ctrl+C (SIGINT) and kill background jobs
cleanup() {
    echo ""
    echo "Shutting down servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}
trap cleanup SIGINT

# Start Backend
echo "Starting Backend API on http://localhost:8000 ..."
.venv/bin/python3 -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Start Frontend
echo "Starting Frontend UI on http://localhost:5173 ..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for both background processes
wait $BACKEND_PID $FRONTEND_PID
