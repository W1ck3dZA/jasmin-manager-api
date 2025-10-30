#!/bin/bash

# Jasmin API Runner Script
# This script starts the Jasmin REST API using CherryPy server

echo "Starting Jasmin API..."
echo "API will be available at: http://0.0.0.0:8000"
echo ""

# Check if virtual environment exists
if [ -d "venv" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
fi

# Check if requirements are installed
if ! python -c "import django" 2>/dev/null; then
    echo "Django not found. Installing requirements..."
    pip install -r requirements.txt
fi

# Navigate to jasmin_api directory and run the CherryPy server
cd jasmin_api
python run_cherrypy.py
