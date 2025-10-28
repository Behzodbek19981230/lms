#!/bin/bash

echo "🚀 Starting Backend Server..."
echo "=============================="

# Check if dist folder exists
if [ ! -d "dist" ]; then
    echo "❌ Build folder not found. Building..."
    npm run build
fi

# Start the server
echo "✅ Starting backend server..."
npm run start:prod
