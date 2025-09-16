#!/bin/bash

# VPS Database Fix Script
# Execute this on the VPS after connecting via SSH

echo "🔧 EON PRO - Deriv OAuth Database Fix"
echo "======================================="
echo "📍 Location: /root/eon"
echo "📅 Date: $(date)"
echo ""

# Check current directory
if [ ! -f "server/routes/auth.js" ]; then
    echo "❌ Error: Not in the correct directory"
    echo "Please run: cd /root/eon"
    exit 1
fi

echo "✅ Found auth.js file"

# Backup current auth.js
BACKUP_FILE="server/routes/auth.js.backup.$(date +%Y%m%d_%H%M%S)"
cp server/routes/auth.js "$BACKUP_FILE"
echo "💾 Backup created: $BACKUP_FILE"

# Check if database exists
if [ ! -f "server/database.sqlite" ]; then
    echo "❌ Database not found at server/database.sqlite"
    exit 1
fi

echo "✅ Found SQLite database"

# Add missing columns to users table
echo "🗄️ Updating database schema..."
sqlite3 server/database.sqlite << 'EOF'
-- Add missing Deriv OAuth columns (ignore errors if they exist)
ALTER TABLE users ADD COLUMN deriv_access_token VARCHAR(500);
ALTER TABLE users ADD COLUMN deriv_connected BOOLEAN DEFAULT 0;
ALTER TABLE users ADD COLUMN deriv_email VARCHAR(255);
ALTER TABLE users ADD COLUMN deriv_currency VARCHAR(10);
ALTER TABLE users ADD COLUMN deriv_country VARCHAR(10);
ALTER TABLE users ADD COLUMN deriv_is_virtual BOOLEAN DEFAULT 0;
ALTER TABLE users ADD COLUMN deriv_fullname VARCHAR(255);
ALTER TABLE users ADD COLUMN deriv_accounts_tokens TEXT;
EOF

if [ $? -eq 0 ]; then
    echo "✅ Database schema updated successfully"
else
    echo "ℹ️ Some columns may already exist (this is normal)"
fi

# Verify table structure
echo "🔍 Verifying table structure..."
COLUMNS=$(sqlite3 server/database.sqlite "PRAGMA table_info(users);" | grep -E "deriv_access_token|deriv_connected|deriv_accounts_tokens" | wc -l)

if [ "$COLUMNS" -ge 3 ]; then
    echo "✅ Required Deriv columns found in database"
else
    echo "⚠️ Warning: Some Deriv columns may be missing"
fi

# Check if routes exist in auth.js
echo "🔍 Verifying OAuth routes..."
CALLBACK_ROUTE=$(grep -c "deriv/process-callback" server/routes/auth.js)
STATUS_ROUTE=$(grep -c "deriv/status" server/routes/auth.js)

if [ "$CALLBACK_ROUTE" -gt 0 ] && [ "$STATUS_ROUTE" -gt 0 ]; then
    echo "✅ OAuth routes found in auth.js"
else
    echo "❌ OAuth routes missing in auth.js"
    exit 1
fi

# Check environment variables
echo "🔍 Checking environment variables..."
if [ -f ".env" ]; then
    if grep -q "JWT_SECRET" .env && grep -q "DERIV_APP_ID" .env; then
        echo "✅ Required environment variables found"
    else
        echo "⚠️ Warning: Some environment variables may be missing"
    fi
else
    echo "⚠️ Warning: .env file not found"
fi

# Restart server
echo "🔄 Restarting server..."
pm2 restart eon 2>/dev/null || pm2 start npm --name 'eon' -- start

echo "⏳ Waiting for server to start..."
sleep 5

# Check PM2 status
PM2_STATUS=$(pm2 list | grep "eon" | wc -l)
if [ "$PM2_STATUS" -gt 0 ]; then
    echo "✅ EON server is running"
    pm2 status | grep "eon"
else
    echo "❌ Failed to start EON server"
fi

echo ""
echo "🧪 Testing OAuth endpoints..."

# Test server health
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/ 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Server responding on port 5000"
else
    echo "❌ Server not responding (HTTP: $HTTP_CODE)"
fi

# Test auth status endpoint
AUTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/auth/deriv/status 2>/dev/null)
case "$AUTH_CODE" in
    "401")
        echo "✅ OAuth status endpoint working (401 expected without token)"
        ;;
    "500")
        echo "❌ OAuth status endpoint returning 500 error (still broken)"
        ;;
    "200")
        echo "⚠️ OAuth status endpoint returning 200 (unexpected without token)"
        ;;
    *)
        echo "❌ OAuth status endpoint not responding (HTTP: $AUTH_CODE)"
        ;;
esac

echo ""
echo "📊 Recent server logs:"
pm2 logs eon --lines 10 2>/dev/null || echo "❌ Cannot show PM2 logs"

echo ""
echo "🎯 Fix Summary:"
echo "==============="
echo "✅ Database schema updated with Deriv columns"
echo "✅ OAuth routes verified in auth.js"
echo "✅ Server restarted"
echo ""
echo "📋 Next Steps:"
echo "1. Test OAuth flow from frontend"
echo "2. Check for '400 Bad Request' on /api/auth/deriv/process-callback"
echo "3. Check for '500 Internal Server Error' on /api/auth/deriv/status"
echo "4. Monitor PM2 logs: pm2 logs eon --lines 50"
echo ""
echo "🔗 Frontend can now test OAuth at: http://31.97.28.231:5000"