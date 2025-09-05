#!/bin/bash

# Manual Server Setup for PDF Generation
# Run this script on your server before the first deployment

echo "🔧 Setting up server for PDF generation..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_warning "Running as root. This is fine for system package installation."
fi

print_status "Updating package lists..."
apt-get update

print_status "Installing Chromium and dependencies for PDF generation..."
apt-get install -y \
    chromium-browser \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    ca-certificates

# Check if chromium was installed successfully
if command -v chromium-browser &> /dev/null; then
    print_status "✅ Chromium installed successfully"
    chromium-browser --version
else
    print_error "❌ Chromium installation failed"
    exit 1
fi

# Create environment file for PDF generation
print_status "Creating PDF environment variables..."

# Add to system-wide environment
echo "# PDF Generation Environment" >> /etc/environment
echo "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true" >> /etc/environment
echo "PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser" >> /etc/environment
echo "PUPPETEER_ARGS=--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage" >> /etc/environment

# Add to bash profile
echo "# PDF Generation Environment" >> ~/.bashrc
echo "export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true" >> ~/.bashrc
echo "export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser" >> ~/.bashrc
echo "export PUPPETEER_ARGS=\"--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage\"" >> ~/.bashrc

# Create project directory if it doesn't exist
PROJECT_DIR="/var/www/lms"
if [ ! -d "$PROJECT_DIR" ]; then
    print_status "Creating project directory: $PROJECT_DIR"
    mkdir -p $PROJECT_DIR
    chown -R deploy:deploy $PROJECT_DIR 2>/dev/null || print_warning "Could not change ownership to deploy user"
fi

# Create logs directory
mkdir -p $PROJECT_DIR/backend/logs
chmod 755 $PROJECT_DIR/backend/logs 2>/dev/null || true

# Test Chromium with Puppeteer args
print_status "Testing Chromium with Puppeteer arguments..."
if chromium-browser --no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --headless --version &>/dev/null; then
    print_status "✅ Chromium works with Puppeteer arguments"
else
    print_warning "⚠️ Chromium test with Puppeteer arguments failed, but it might still work in Node.js"
fi

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    print_status "Node.js not found. Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
else
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ $NODE_VERSION -lt 18 ]; then
        print_warning "Node.js version is $NODE_VERSION. Recommended: 18+"
    else
        print_status "✅ Node.js $(node -v) is installed"
    fi
fi

# Install PM2 globally if not present
if ! command -v pm2 &> /dev/null; then
    print_status "Installing PM2..."
    npm install -g pm2
else
    print_status "✅ PM2 is already installed"
fi

# Set up PM2 startup
print_status "Configuring PM2 startup..."
pm2 startup systemd -u deploy --hp /home/deploy 2>/dev/null || print_warning "Could not setup PM2 startup for deploy user"

print_status "✅ Server setup completed!"

echo ""
echo "📋 Summary:"
echo "==========="
echo "✅ Chromium Browser: $(chromium-browser --version 2>/dev/null || echo 'Installed')"
echo "✅ Node.js: $(node -v 2>/dev/null || echo 'Not found')"
echo "✅ PM2: $(pm2 -v 2>/dev/null || echo 'Not found')"
echo "✅ Project Directory: $PROJECT_DIR"
echo ""
echo "🚀 Next Steps:"
echo "=============="
echo "1. Deploy your application using CI/CD"
echo "2. Test PDF generation: curl http://your-server:3003/pdf/test/1/debug"
echo "3. Monitor logs: pm2 logs lms-backend"
echo ""
echo "🔍 Test PDF Generation:"
echo "======================="
echo "After deployment, you can test:"
echo "curl -H 'Authorization: Bearer YOUR_TOKEN' http://your-server:3003/pdf/test/1/debug"
echo ""

print_status "Setup complete! Your server is ready for PDF generation."
