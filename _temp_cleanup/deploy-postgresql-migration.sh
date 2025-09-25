#!/bin/bash

# Deriv Trading Platform - PostgreSQL Migration Script
# This script automates the migration from SQLite to PostgreSQL

set -e  # Exit on any error

echo "🚀 Starting PostgreSQL Migration for Deriv Trading Platform"
echo "============================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root (use sudo)"
   exit 1
fi

# Check if we're in the right directory
if [[ ! -f "server/package.json" ]]; then
    print_error "Please run this script from the project root directory (/root/eon)"
    exit 1
fi

print_status "Step 1: Backing up existing SQLite databases"
if [[ -f "server/database.sqlite" ]]; then
    cp server/database.sqlite server/database.sqlite.backup
    print_status "SQLite database backed up"
else
    print_warning "SQLite database not found in server/database.sqlite"
fi

if [[ -f "server/database.db" ]]; then
    cp server/database.db server/database.db.backup
    print_status "Secondary SQLite database backed up"
fi

print_status "Step 2: Checking PostgreSQL service"
if systemctl is-active --quiet postgresql; then
    print_status "PostgreSQL is running"
else
    print_warning "Starting PostgreSQL service"
    systemctl start postgresql
    systemctl enable postgresql
    print_status "PostgreSQL started and enabled"
fi

print_status "Step 3: Checking database connection"
if sudo -u postgres psql -d eon_platform -c "SELECT 1;" &> /dev/null; then
    print_status "Database eon_platform exists and is accessible"
else
    print_warning "Database eon_platform not accessible, please ensure it exists"
    echo "To create the database, run:"
    echo "sudo -u postgres createdb eon_platform"
fi

print_status "Step 4: Installing dependencies"
cd server
if npm list sqlite3 &> /dev/null; then
    print_status "sqlite3 dependency already installed"
else
    print_warning "Installing sqlite3 dependency for migration"
    npm install sqlite3
fi

print_status "Step 5: Setting up PostgreSQL database schema"
if node database/setup.js; then
    print_status "Database schema created successfully"
else
    print_error "Failed to setup database schema"
    exit 1
fi

print_status "Step 6: Migrating data from SQLite to PostgreSQL"
if [[ -f "migrate-sqlite-to-postgresql.js" ]]; then
    if node migrate-sqlite-to-postgresql.js; then
        print_status "Data migration completed successfully"
    else
        print_error "Data migration failed"
        exit 1
    fi
else
    print_error "Migration script not found"
    exit 1
fi

print_status "Step 7: Restarting application"
if command -v pm2 &> /dev/null; then
    pm2 restart all
    print_status "Application restarted with PM2"

    echo ""
    echo "🔍 Checking application status:"
    pm2 status

    echo ""
    echo "📋 Recent logs:"
    pm2 logs --lines 10
else
    print_warning "PM2 not found, please manually restart your application"
fi

print_status "Step 8: Verifying migration"
echo ""
echo "🔍 Verification Results:"
echo "========================"

# Check users count
USER_COUNT=$(sudo -u postgres psql -d eon_platform -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs)
echo "👥 Users migrated: ${USER_COUNT:-'Error checking'}"

# Check bots count
BOT_COUNT=$(sudo -u postgres psql -d eon_platform -t -c "SELECT COUNT(*) FROM bots;" 2>/dev/null | xargs)
echo "🤖 Bots migrated: ${BOT_COUNT:-'Error checking'}"

# Check deriv_config
DERIV_CONFIG=$(sudo -u postgres psql -d eon_platform -t -c "SELECT COUNT(*) FROM deriv_config;" 2>/dev/null | xargs)
echo "⚙️ Deriv configs: ${DERIV_CONFIG:-'Error checking'}"

echo ""
print_status "Migration completed successfully!"
echo ""
echo "🧪 Test your endpoints:"
echo "curl -X GET http://localhost:3001/api/auth/deriv-affiliate-link"
echo "curl -X GET http://localhost:3001/api/bots -H \"Authorization: Bearer YOUR_JWT_TOKEN\""
echo ""
echo "📊 Monitor your application:"
echo "pm2 monit"
echo "pm2 logs"
echo ""
echo "🗄️ Your SQLite backups are saved as:"
echo "- server/database.sqlite.backup"
echo "- server/database.db.backup"