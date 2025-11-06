#!/bin/bash

# EduOne Mobile App Setup Script

echo "Setting up EduOne Mobile App..."

# Check if node is installed
if ! command -v node &> /dev/null
then
    echo "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null
then
    echo "npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Check if we're on macOS to install iOS dependencies
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Installing iOS dependencies..."
    cd ios && pod install && cd ..
fi

echo "Setup complete!"
echo ""
echo "To run the app:"
echo "  Android: npx react-native run-android"
echo "  iOS: npx react-native run-ios"