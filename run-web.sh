#!/bin/bash

# Jasmin Web Interface Runner Script
# This script starts a simple HTTP server to serve the web interface

PORT=8081

echo "Starting Jasmin Web Interface..."
echo "Web interface will be available at: http://localhost:$PORT"
echo ""
echo "Make sure the API is running on http://localhost:8000"
echo "Press Ctrl+C to stop the server"
echo ""

# Navigate to jasmin_web directory and start HTTP server
cd jasmin_web
python3 -m http.server $PORT
