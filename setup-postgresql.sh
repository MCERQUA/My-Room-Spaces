#!/bin/bash

# PostgreSQL Setup Script for 3D World Project
# Run this script with sudo: sudo bash setup-postgresql.sh

set -e  # Exit on error

echo "🚀 Starting PostgreSQL installation and setup..."

# Update package list
echo "📦 Updating package list..."
apt update

# Install PostgreSQL and contrib
echo "📦 Installing PostgreSQL..."
apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
echo "🔧 Starting PostgreSQL service..."
systemctl start postgresql
systemctl enable postgresql

# Wait for PostgreSQL to be ready
sleep 3

# Create database and user
echo "🗄️ Setting up database and user..."
sudo -u postgres psql <<EOF
-- Create database
CREATE DATABASE threedworld;

-- Create user with secure password
CREATE USER threedworld WITH ENCRYPTED PASSWORD 'ThreeD2024World!Secure';

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE threedworld TO threedworld;

-- Allow user to create schemas
ALTER USER threedworld CREATEDB;

-- Show databases to confirm
\l

-- Show users to confirm
\du
EOF

# Create tables for the 3D World application
echo "📊 Creating application tables..."
PGPASSWORD='ThreeD2024World!Secure' psql -U threedworld -d threedworld <<EOF
-- Visitors table
CREATE TABLE IF NOT EXISTS visitors (
    id SERIAL PRIMARY KEY,
    space_name VARCHAR(255) NOT NULL,
    visitor_id VARCHAR(255) NOT NULL,
    first_visit TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_visit TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(space_name, visitor_id)
);

-- Space stats table
CREATE TABLE IF NOT EXISTS space_stats (
    id SERIAL PRIMARY KEY,
    space_name VARCHAR(255) UNIQUE NOT NULL,
    total_visits INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    socket_id VARCHAR(255) NOT NULL,
    space_name VARCHAR(255) NOT NULL,
    connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    disconnected_at TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- World state table for object persistence
CREATE TABLE IF NOT EXISTS world_objects (
    id SERIAL PRIMARY KEY,
    object_id VARCHAR(255) UNIQUE NOT NULL,
    space_name VARCHAR(255) NOT NULL,
    object_type VARCHAR(50),
    position_x FLOAT,
    position_y FLOAT,
    position_z FLOAT,
    rotation_x FLOAT,
    rotation_y FLOAT,
    rotation_z FLOAT,
    scale_x FLOAT,
    scale_y FLOAT,
    scale_z FLOAT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    space_name VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    username VARCHAR(255),
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_visitors_space ON visitors(space_name);
CREATE INDEX idx_visitors_visitor ON visitors(visitor_id);
CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_space ON user_sessions(space_name);
CREATE INDEX idx_objects_space ON world_objects(space_name);
CREATE INDEX idx_chat_space ON chat_messages(space_name);
CREATE INDEX idx_chat_created ON chat_messages(created_at DESC);

-- Show tables to confirm
\dt
EOF

# Test the connection
echo "🧪 Testing PostgreSQL connection..."
PGPASSWORD='ThreeD2024World!Secure' psql -U threedworld -d threedworld -c "SELECT version();"

echo "✅ PostgreSQL installation and setup complete!"
echo ""
echo "📝 Database Details:"
echo "   Database: threedworld"
echo "   User: threedworld"
echo "   Password: ThreeD2024World!Secure"
echo "   Host: localhost"
echo "   Port: 5432"
echo ""
echo "🔗 Connection string for .env file:"
echo "   DATABASE_URL=postgresql://threedworld:ThreeD2024World!Secure@localhost:5432/threedworld"
echo ""
echo "Next steps:"
echo "1. Create a .env file with the database connection string"
echo "2. Update signaling-server.js to use PostgreSQL instead of SQLite"
echo "3. Restart the Node.js server"