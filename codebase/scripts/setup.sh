#!/bin/bash

set -e

echo "Checking prerequisites..."

# Check Python version
python_version=$(python3 --version 2>&1 | awk '{print $2}' | cut -d. -f1)
if [ "$python_version" -lt 3 ] || [ "$python_version" -gt 11 ]; then
    echo "Error: Python 3.11+ is required. Found: $(python3 --version)"
    exit 1
fi
echo "✓ Python $(python3 --version)"

# Check Node version
node_version=$(node --version 2>&1 | cut -d. -f1 | tr -d 'v')
if [ "$node_version" -lt 20 ]; then
    echo "Error: Node.js 20+ is required. Found: $(node --version)"
    exit 1
fi
echo "✓ Node.js $(node --version)"

cd "$(dirname "$0")/.."

echo "Setting up backend..."
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi
source .venv/bin/activate
pip install -r app/backend/requirements.txt
echo "✓ Backend dependencies installed"

echo "Setting up frontend..."
cd app/frontend
npm install
echo "✓ Frontend dependencies installed"

cd ../..

echo ""
echo "Setup complete. Run: docker compose up"