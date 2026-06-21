#!/bin/bash
set -e

echo "=== ASTraM Parking Intelligence Setup ==="

# Check Python 3
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 is not installed. Please install Python 3 and try again."
    exit 1
fi

# Check Node.js and NPM
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed. Please install Node.js/NPM and try again."
    exit 1
fi

echo "--- Setting up Python Virtual Environment ---"
# Check if venv folder already exists
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    echo "Created virtual environment in .venv"
else
    echo "Virtual environment already exists in .venv"
fi

echo "--- Installing Backend Dependencies ---"
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r api/requirements.txt
.venv/bin/pip install fastapi uvicorn pandas pyarrow numpy

echo "--- Installing Frontend Dependencies ---"
cd frontend
npm install
cd ..

echo "==========================================="
echo "Setup complete! To run the application, run:"
echo "  ./start.sh"
echo "==========================================="
