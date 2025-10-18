#!/bin/bash

# Quick Start Script - Runs setup and starts server automatically

echo ""
echo "=========================================="
echo "  🚀 Starting Ethical AI Backend"
echo "=========================================="
echo ""

# Run setup if needed
if [ ! -f "models/crime_predictor.pkl" ] || [ ! -d "venv" ]; then
    echo "⚙️  Running initial setup..."
    ./setup.sh
    if [ $? -ne 0 ]; then
        echo "❌ Setup failed. Please check errors above."
        exit 1
    fi
fi

# Activate virtual environment
source venv/bin/activate

# Start server
echo ""
echo "🚀 Starting API server..."
echo ""
echo "  📍 API: http://localhost:8000"
echo "  📚 Docs: http://localhost:8000/docs"
echo "  📊 Metrics: http://localhost:8000/metrics/prometheus"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

uvicorn main:app --reload --host 0.0.0.0 --port 8000
