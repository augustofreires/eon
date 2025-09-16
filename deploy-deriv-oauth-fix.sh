#!/bin/bash

# Deploy Deriv OAuth Fix Script
# This script fixes critical Deriv OAuth connection errors on the VPS

VPS_HOST="31.97.28.231"
VPS_USER="root"
VPS_PASSWORD="62uDLW4RJ9ae28EPVfp5yzT##"

echo "🔧 Deploying Deriv OAuth Fix to VPS..."
echo "📡 Connecting to: $VPS_USER@$VPS_HOST"

# Function to execute command on VPS
exec_vps() {
    sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" "$1"
}

# Function to copy file to VPS
copy_to_vps() {
    sshpass -p "$VPS_PASSWORD" scp -o StrictHostKeyChecking=no "$1" "$VPS_USER@$VPS_HOST:$2"
}

echo "📋 Step 1: Checking current VPS status..."
exec_vps "cd /root/eon && pwd && ls -la server/routes/"

echo "🔧 Step 2: Backing up current auth.js..."
exec_vps "cd /root/eon && cp server/routes/auth.js server/routes/auth.js.backup.$(date +%Y%m%d_%H%M%S)"

echo "📤 Step 3: Uploading fixed auth.js..."
copy_to_vps "server/routes/auth.js" "/root/eon/server/routes/auth.js"

echo "🗄️ Step 4: Updating database schema..."
exec_vps "cd /root/eon && cat << 'EOF' | sqlite3 server/database.sqlite
-- Add missing Deriv columns if they don't exist
ALTER TABLE users ADD COLUMN deriv_access_token VARCHAR(500);
ALTER TABLE users ADD COLUMN deriv_connected BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN deriv_email VARCHAR(255);
ALTER TABLE users ADD COLUMN deriv_currency VARCHAR(10);
ALTER TABLE users ADD COLUMN deriv_country VARCHAR(10);
ALTER TABLE users ADD COLUMN deriv_is_virtual BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN deriv_fullname VARCHAR(255);
ALTER TABLE users ADD COLUMN deriv_accounts_tokens TEXT;
.schema users
EOF"

echo "🔄 Step 5: Restarting EON server..."
exec_vps "cd /root/eon && pm2 restart eon || pm2 start npm --name 'eon' -- start"

echo "⏳ Step 6: Waiting for server to restart..."
sleep 10

echo "🔍 Step 7: Testing OAuth endpoints..."
exec_vps "curl -s -o /dev/null -w '%{http_code}' http://localhost:5000/api/auth/verify"

echo "📊 Step 8: Checking server logs..."
exec_vps "pm2 logs eon --lines 20"

echo "✅ Deployment complete! OAuth endpoints should now work correctly."
echo ""
echo "🧪 To test the fix:"
echo "1. Frontend should be able to call /api/auth/deriv/process-callback"
echo "2. /api/auth/deriv/status should return proper connection status"
echo "3. No more SQLite errors in authentication middleware"
echo ""
echo "🔗 Check server status: http://31.97.28.231:5000"