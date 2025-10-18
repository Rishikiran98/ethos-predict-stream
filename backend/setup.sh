#!/bin/bash

# Automated Backend Setup Script
# No manual configuration required!

set -e

echo ""
echo "=========================================="
echo "  🚀 Automated Backend Setup"
echo "=========================================="
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    echo "   Please install Python 3.10+ and try again."
    exit 1
fi

echo "✓ Python 3 found: $(python3 --version)"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo ""
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    echo "✓ Virtual environment created"
fi

# Activate virtual environment
echo ""
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo ""
echo "📥 Installing dependencies..."
pip install --upgrade pip -q
pip install -r requirements.txt -q
echo "✓ Dependencies installed"

# Run automated setup
echo ""
python auto_setup.py

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Backend is ready to use!"
    echo ""
    echo "To start the server, run:"
    echo "  source venv/bin/activate"
    echo "  uvicorn main:app --reload --host 0.0.0.0 --port 8000"
    echo ""
else
    echo ""
    echo "⚠️  Setup completed with warnings. Check logs above."
    echo ""
fi
