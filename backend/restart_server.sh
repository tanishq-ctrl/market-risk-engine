#!/bin/bash
# Script to restart the backend server with proper setup

echo "Stopping any running servers on port 8000..."
lsof -ti:8000 | xargs kill -9 2>/dev/null || echo "No server running on port 8000"

echo "Clearing Python cache..."
find . -type d -name __pycache__ -exec rm -r {} + 2>/dev/null
find . -name "*.pyc" -delete 2>/dev/null

echo "Activating virtual environment..."
source venv/bin/activate

echo "Starting server..."
uvicorn app.main:app --reload --port 8000

