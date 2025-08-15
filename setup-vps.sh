#!/bin/bash

# VPS Setup Script for 3D Three.js Site
# This script installs all required dependencies for migrating from Railway to VPS

set -e  # Exit on error

echo "🚀 Starting VPS Setup for 3D Three.js Site"
echo "==========================================="

# Update package list
echo "📦 Updating package list..."
sudo apt update

# Install PostgreSQL
echo "🐘 Installing PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Install Redis
echo "🔴 Installing Redis..."
sudo apt install -y redis-server

# Start and enable Redis
sudo systemctl start redis
sudo systemctl enable redis

# Install Nginx
echo "🌐 Installing Nginx..."
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Create PostgreSQL database and user
echo "🗄️ Setting up PostgreSQL database..."
sudo -u postgres psql <<EOF
CREATE DATABASE threedworld;
CREATE USER threedworld WITH ENCRYPTED PASSWORD 'Secure3DWorld2025!';
GRANT ALL PRIVILEGES ON DATABASE threedworld TO threedworld;
\q
EOF

echo "✅ Database 'threedworld' created with user 'threedworld'"

# Test Redis
echo "🔴 Testing Redis connection..."
redis-cli ping

# Create backup directory
echo "📁 Creating backup directory..."
mkdir -p /home/mikecerqua/projects/3D-threejs-site/backups

echo ""
echo "✅ Installation complete!"
echo ""
echo "Installed components:"
echo "  ✓ PostgreSQL $(psql --version | head -1)"
echo "  ✓ Redis $(redis-server --version | head -1)"
echo "  ✓ Nginx $(nginx -v 2>&1)"
echo "  ✓ Node.js $(node --version)"
echo "  ✓ PM2 $(pm2 --version)"
echo ""
echo "Database credentials:"
echo "  Database: threedworld"
echo "  Username: threedworld"
echo "  Password: Secure3DWorld2025!"
echo ""
echo "Next steps:"
echo "  1. Run: cd /home/mikecerqua/projects/3D-threejs-site"
echo "  2. Create .env file with database credentials"
echo "  3. Run: npm install (if not already done)"
echo "  4. Run: npm run migrate:up"
echo "  5. Start with PM2: pm2 start signaling-server-persistent.js --name '3d-world'"