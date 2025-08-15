#!/bin/bash

# Comprehensive VPS Deployment Script for 3D Three.js World
# This script handles the complete migration from Railway to VPS

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_DIR="/home/mikecerqua/projects/3D-threejs-site"
cd $PROJECT_DIR

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}      🚀 3D Three.js World - VPS Migration from Railway${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a service is running
service_running() {
    systemctl is-active --quiet "$1"
}

# Step 1: Check prerequisites
echo -e "${YELLOW}📋 Step 1: Checking prerequisites...${NC}"

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}  ✓ Node.js installed: $NODE_VERSION${NC}"
else
    echo -e "${RED}  ✗ Node.js not installed${NC}"
    exit 1
fi

# Check PM2
if command_exists pm2; then
    PM2_VERSION=$(pm2 --version)
    echo -e "${GREEN}  ✓ PM2 installed: v$PM2_VERSION${NC}"
else
    echo -e "${RED}  ✗ PM2 not installed${NC}"
    echo "Installing PM2 globally..."
    npm install -g pm2
fi

# Check for required services (will be installed if missing)
echo ""
echo -e "${YELLOW}📦 Step 2: Checking required services...${NC}"

SERVICES_MISSING=false

# Check PostgreSQL
if command_exists psql; then
    echo -e "${GREEN}  ✓ PostgreSQL installed${NC}"
else
    echo -e "${RED}  ✗ PostgreSQL not installed${NC}"
    SERVICES_MISSING=true
fi

# Check Redis
if command_exists redis-cli; then
    echo -e "${GREEN}  ✓ Redis installed${NC}"
else
    echo -e "${RED}  ✗ Redis not installed${NC}"
    SERVICES_MISSING=true
fi

# Check Nginx
if command_exists nginx; then
    echo -e "${GREEN}  ✓ Nginx installed${NC}"
else
    echo -e "${RED}  ✗ Nginx not installed${NC}"
    SERVICES_MISSING=true
fi

if [ "$SERVICES_MISSING" = true ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Some services are missing. Please run the setup script first:${NC}"
    echo -e "${BLUE}   sudo ./setup-vps.sh${NC}"
    echo ""
    echo "After installing the services, run this deployment script again."
    exit 1
fi

# Step 3: Check if services are running
echo ""
echo -e "${YELLOW}🔍 Step 3: Checking service status...${NC}"

if service_running postgresql; then
    echo -e "${GREEN}  ✓ PostgreSQL is running${NC}"
else
    echo -e "${YELLOW}  ⚠ PostgreSQL is not running, attempting to start...${NC}"
    sudo systemctl start postgresql
fi

if service_running redis; then
    echo -e "${GREEN}  ✓ Redis is running${NC}"
else
    echo -e "${YELLOW}  ⚠ Redis is not running, attempting to start...${NC}"
    sudo systemctl start redis
fi

if service_running nginx; then
    echo -e "${GREEN}  ✓ Nginx is running${NC}"
else
    echo -e "${YELLOW}  ⚠ Nginx is not running, attempting to start...${NC}"
    sudo systemctl start nginx
fi

# Step 4: Check Node.js dependencies
echo ""
echo -e "${YELLOW}📦 Step 4: Checking Node.js dependencies...${NC}"

if [ -d "node_modules" ]; then
    echo -e "${GREEN}  ✓ Dependencies already installed${NC}"
else
    echo -e "${YELLOW}  Installing dependencies...${NC}"
    npm install
fi

# Step 5: Test database connection
echo ""
echo -e "${YELLOW}🗄️ Step 5: Testing database connection...${NC}"

# Check if .env file exists
if [ -f ".env" ]; then
    echo -e "${GREEN}  ✓ .env file exists${NC}"
    
    # Try to connect to database
    export $(cat .env | grep DATABASE_URL | xargs)
    if psql "$DATABASE_URL" -c '\q' 2>/dev/null; then
        echo -e "${GREEN}  ✓ Database connection successful${NC}"
    else
        echo -e "${YELLOW}  ⚠ Cannot connect to database, checking configuration...${NC}"
        echo "  Database URL: $DATABASE_URL"
    fi
else
    echo -e "${RED}  ✗ .env file not found${NC}"
    echo "  Creating .env from template..."
    cp .env.example .env
    echo -e "${YELLOW}  Please update .env with your database credentials${NC}"
fi

# Step 6: Run database migrations
echo ""
echo -e "${YELLOW}🔄 Step 6: Running database migrations...${NC}"

if [ -f "migrations/001_initial_schema.sql" ]; then
    echo "  Found migration files, attempting to run..."
    
    # Export environment variables
    export $(cat .env | grep -v '^#' | xargs)
    
    # Check if we can run migrations
    if [ ! -z "$DATABASE_URL" ]; then
        echo "  Running migrations..."
        npm run migrate:up 2>/dev/null && echo -e "${GREEN}  ✓ Migrations completed${NC}" || echo -e "${YELLOW}  ⚠ Migrations may have already been applied${NC}"
    else
        echo -e "${YELLOW}  ⚠ DATABASE_URL not configured, skipping migrations${NC}"
    fi
else
    echo -e "${YELLOW}  ⚠ No migration files found${NC}"
fi

# Step 7: Configure Nginx
echo ""
echo -e "${YELLOW}🌐 Step 7: Configuring Nginx...${NC}"

NGINX_CONFIG="/etc/nginx/sites-available/3d-world"
if [ -f "$NGINX_CONFIG" ]; then
    echo -e "${GREEN}  ✓ Nginx configuration already exists${NC}"
else
    echo "  Creating Nginx configuration..."
    sudo cp config/nginx-3d-world.conf $NGINX_CONFIG
    sudo ln -sf $NGINX_CONFIG /etc/nginx/sites-enabled/3d-world
    echo "  Testing Nginx configuration..."
    sudo nginx -t && echo -e "${GREEN}  ✓ Nginx configuration valid${NC}"
    sudo systemctl reload nginx
fi

# Step 8: Start application with PM2
echo ""
echo -e "${YELLOW}🚀 Step 8: Starting application with PM2...${NC}"

# Check if app is already running
if pm2 list | grep -q "3d-world"; then
    echo "  Application already running, restarting..."
    pm2 restart 3d-world
    echo -e "${GREEN}  ✓ Application restarted${NC}"
else
    echo "  Starting application..."
    pm2 start ecosystem.config.js
    pm2 save
    echo -e "${GREEN}  ✓ Application started${NC}"
fi

# Step 9: Update frontend connection URL
echo ""
echo -e "${YELLOW}🔗 Step 9: Checking frontend configuration...${NC}"

# Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}')

echo "  Your VPS IP: $SERVER_IP"
echo ""
echo -e "${YELLOW}  ⚠ Important: Update the frontend connection URL in index.html${NC}"
echo "  Current Railway URL: https://3d-threejs-site-production.up.railway.app"
echo "  New VPS URL: http://$SERVER_IP (or https://your-domain.com if configured)"

# Step 10: Final status check
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Deployment Status Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Show PM2 status
pm2 status

echo ""
echo -e "${GREEN}📊 Service URLs:${NC}"
echo "  • Frontend: http://$SERVER_IP"
echo "  • Backend API: http://$SERVER_IP:3001"
echo "  • Socket.IO: ws://$SERVER_IP:3001"
echo ""

echo -e "${GREEN}📝 Useful Commands:${NC}"
echo "  • View logs: pm2 logs 3d-world"
echo "  • Monitor: pm2 monit"
echo "  • Restart: pm2 restart 3d-world"
echo "  • Stop: pm2 stop 3d-world"
echo ""

echo -e "${GREEN}🔧 Next Steps:${NC}"
echo "  1. Update index.html with VPS server URL"
echo "  2. Configure domain name (optional)"
echo "  3. Set up SSL with Let's Encrypt (optional)"
echo "  4. Test multi-user functionality"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Deployment script complete! Your 3D World is ready for VPS hosting.${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"