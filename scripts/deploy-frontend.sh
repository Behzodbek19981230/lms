#!/bin/bash

# Frontend Deployment Script
# Bu script frontend build qiladi va serverga yuboradi

set -e  # Exit on any error

echo "🚀 Frontend Deployment Script"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_DIR="frontend"
DIST_DIR="$FRONTEND_DIR/dist"
SERVER_PATH="/var/www/html"
BACKUP_DIR="$SERVER_PATH/dist_backup_$(date +%Y%m%d_%H%M%S)"

# Check if we're in the right directory
if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}❌ Frontend directory not found!${NC}"
    echo "Please run this script from the project root directory."
    exit 1
fi

echo -e "${YELLOW}📁 Working directory: $(pwd)${NC}"

# Step 1: Clean previous build
echo -e "${YELLOW}🧹 Cleaning previous build...${NC}"
cd "$FRONTEND_DIR"
npm run clean || true
cd ..

# Step 2: Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
cd "$FRONTEND_DIR"
npm ci
cd ..

# Step 3: Build frontend
echo -e "${YELLOW}🔨 Building frontend...${NC}"
cd "$FRONTEND_DIR"
npm run build:prod
cd ..

# Step 4: Verify build
echo -e "${YELLOW}🔍 Verifying build...${NC}"
if [ ! -f "$DIST_DIR/index.html" ]; then
    echo -e "${RED}❌ Build failed! index.html not found in $DIST_DIR${NC}"
    echo "Build contents:"
    ls -la "$DIST_DIR" || echo "Dist directory doesn't exist!"
    exit 1
fi

echo -e "${GREEN}✅ Build verification successful!${NC}"
echo "Build contents:"
ls -la "$DIST_DIR"

# Step 5: Create backup (if deploying to server)
if [ -d "$SERVER_PATH/dist" ]; then
    echo -e "${YELLOW}💾 Creating backup of current deployment...${NC}"
    sudo mv "$SERVER_PATH/dist" "$BACKUP_DIR"
    echo -e "${GREEN}✅ Backup created at: $BACKUP_DIR${NC}"
fi

# Step 6: Deploy to server
echo -e "${YELLOW}🚀 Deploying to server...${NC}"
sudo mkdir -p "$SERVER_PATH/dist"
sudo cp -r "$DIST_DIR"/* "$SERVER_PATH/dist/"

# Step 7: Set permissions
echo -e "${YELLOW}🔐 Setting permissions...${NC}"
sudo chown -R www-data:www-data "$SERVER_PATH/dist"
sudo chmod -R 755 "$SERVER_PATH/dist"

# Step 8: Verify deployment
echo -e "${YELLOW}🔍 Verifying deployment...${NC}"
if [ -f "$SERVER_PATH/dist/index.html" ]; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo -e "${GREEN}🌐 Frontend is now available at: http://your-domain.com${NC}"
else
    echo -e "${RED}❌ Deployment failed! index.html not found in server directory${NC}"
    exit 1
fi

# Step 9: Cleanup old backups (keep last 5)
echo -e "${YELLOW}🧹 Cleaning up old backups...${NC}"
sudo find "$SERVER_PATH" -name "dist_backup_*" -type d | sort -r | tail -n +6 | sudo xargs rm -rf

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo "📋 Summary:"
echo "- Build directory: $DIST_DIR"
echo "- Server directory: $SERVER_PATH/dist"
echo "- Backup created: $BACKUP_DIR"
echo "- Files deployed: $(find "$SERVER_PATH/dist" -type f | wc -l) files"
