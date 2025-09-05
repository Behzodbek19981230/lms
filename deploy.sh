#!/bin/bash

# EduNimbus Connect - CI/CD Deployment Script
# PDF generatsiya bilan

set -e

echo "🚀 EduNimbus Connect deployment started..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root (for system packages)
if [[ $EUID -eq 0 ]]; then
   print_warning "Running as root. This script should be run with sudo privileges only when needed."
fi

# 1. System Dependencies for PDF generation
print_status "Installing system dependencies for PDF generation..."

# Update package list
sudo apt-get update -y

# Install Node.js if not present (Node 18+)
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 18 ]]; then
    print_status "Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    print_status "Node.js $(node -v) is already installed"
fi

# Install Chromium for Puppeteer
print_status "Installing Chromium and dependencies for Puppeteer..."
sudo apt-get install -y \
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

# Install PM2 for process management
if ! command -v pm2 &> /dev/null; then
    print_status "Installing PM2..."
    sudo npm install -g pm2
else
    print_status "PM2 is already installed"
fi

# 2. Backend Setup
print_status "Setting up backend..."

cd backend

# Install dependencies
print_status "Installing backend dependencies..."
npm ci --only=production

# Build application
print_status "Building backend application..."
npm run build

# Set Puppeteer environment variables
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create .env.production if it doesn't exist
if [ ! -f .env.production ]; then
    print_warning "Creating .env.production file..."
    cat > .env.production << EOF
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/edunimbus

# JWT
JWT_SECRET=your-production-jwt-secret

# Telegram
TELEGRAM_BOT_TOKEN=your-telegram-bot-token

# PDF Generation
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
PUPPETEER_ARGS=--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage
EOF
    print_error "Please update .env.production with your actual values!"
fi

# 3. Database migration
print_status "Running database migrations..."
if [ -f "dist/datasource.js" ]; then
    npm run migration:run || print_warning "Migration failed, continuing..."
else
    print_warning "No datasource.js found, skipping migrations"
fi

# 4. Frontend Setup
print_status "Setting up frontend..."
cd ../frontend

# Install dependencies
print_status "Installing frontend dependencies..."
npm ci

# Build frontend
print_status "Building frontend application..."
npm run build

# 5. Nginx Configuration (if nginx is used)
cd ..
if command -v nginx &> /dev/null; then
    print_status "Configuring Nginx..."
    
    # Create nginx config for the app
    sudo tee /etc/nginx/sites-available/edunimbus << EOF
server {
    listen 80;
    server_name your-domain.com;

    # Frontend files
    location / {
        root /path/to/your/project/frontend/dist;
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # PDF download timeout
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
}
EOF
    
    # Enable site
    sudo ln -sf /etc/nginx/sites-available/edunimbus /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx || print_warning "Nginx config error"
fi

# 6. PM2 Process Management
print_status "Setting up PM2 processes..."

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'edunimbus-backend',
    script: 'backend/dist/main.js',
    cwd: '$(pwd)',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: 'true',
      PUPPETEER_EXECUTABLE_PATH: '/usr/bin/chromium-browser',
      PUPPETEER_ARGS: '--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage'
    },
    error_file: 'logs/backend-error.log',
    out_file: 'logs/backend-out.log',
    log_file: 'logs/backend.log',
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
EOF

# Create logs directory
mkdir -p logs

# Stop existing processes
pm2 delete edunimbus-backend 2>/dev/null || true

# Start application
print_status "Starting application with PM2..."
pm2 start ecosystem.config.js

# Save PM2 processes for auto-restart on reboot
pm2 save
pm2 startup

# 7. Test PDF generation
print_status "Testing PDF generation..."

# Wait for application to start
sleep 10

# Test if backend is running
if curl -f http://localhost:3000/health 2>/dev/null; then
    print_status "Backend is running successfully"
    
    # Test PDF endpoints (you'll need to add auth token)
    print_status "PDF generation endpoints available at:"
    echo "  - GET /pdf/test/:testId/debug"
    echo "  - GET /pdf/test/:testId?method=puppeteer"
    echo "  - GET /pdf/test/:testId?method=pdfkit"
else
    print_warning "Backend might not be fully started yet"
fi

# 8. System service setup (alternative to PM2)
print_status "Creating systemd service (backup option)..."

sudo tee /etc/systemd/system/edunimbus.service << EOF
[Unit]
Description=EduNimbus Connect Backend
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$(pwd)/backend
ExecStart=/usr/bin/node dist/main.js
Environment=NODE_ENV=production
Environment=PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
Environment=PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
Environment=PUPPETEER_ARGS=--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable edunimbus

print_status "Deployment completed successfully!"
print_status "Application is running with PM2"
print_status "Systemd service 'edunimbus' is available as backup"

# 9. Show final status
echo ""
echo "📊 Deployment Summary:"
echo "======================"
pm2 list
echo ""
echo "🔗 Important URLs:"
echo "  - Backend: http://localhost:3000"
echo "  - Frontend: Check your Nginx configuration"
echo "  - PDF Test: http://localhost:3000/pdf/test/1/debug"
echo ""
echo "📝 Next Steps:"
echo "  1. Update .env.production with your actual values"
echo "  2. Test PDF generation with: curl http://localhost:3000/pdf/test/1/debug"
echo "  3. Configure your domain in Nginx"
echo "  4. Add SSL certificate (Let's Encrypt recommended)"
echo ""
print_status "Deployment script finished!"
