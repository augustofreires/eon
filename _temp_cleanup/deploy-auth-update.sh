#!/bin/bash

# Deployment script for auth.js updates to VPS
# Usage: ./deploy-auth-update.sh

set -e

# VPS Configuration
VPS_HOST="31.97.28.231"
VPS_USER="root"
VPS_PASSWORD="62uDLW4RJ9ae28EPVfp5yzT#"
REMOTE_PATH="/root/eon/server/routes"
LOCAL_AUTH_FILE="./server/routes/auth.js"
BACKUP_DIR="/root/eon/backups"

echo "🚀 Starting auth.js deployment to VPS..."

# Check if local auth.js exists
if [ ! -f "$LOCAL_AUTH_FILE" ]; then
    echo "❌ Error: Local auth.js file not found at $LOCAL_AUTH_FILE"
    exit 1
fi

# Function to execute remote commands via sshpass
execute_remote() {
    sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" "$1"
}

# Function to copy files via sshpass
copy_file() {
    sshpass -p "$VPS_PASSWORD" scp -o StrictHostKeyChecking=no "$1" "$VPS_USER@$VPS_HOST:$2"
}

echo "📋 Step 1: Checking VPS connection..."
if ! execute_remote "echo 'Connection successful'"; then
    echo "❌ Error: Could not connect to VPS"
    exit 1
fi
echo "✅ VPS connection established"

echo "📋 Step 2: Creating backup directory..."
execute_remote "mkdir -p $BACKUP_DIR"

echo "📋 Step 3: Creating backup of current auth.js..."
BACKUP_NAME="auth_$(date +%Y%m%d_%H%M%S).js"
execute_remote "cp $REMOTE_PATH/auth.js $BACKUP_DIR/$BACKUP_NAME"
echo "✅ Backup created: $BACKUP_NAME"

echo "📋 Step 4: Uploading new auth.js..."
copy_file "$LOCAL_AUTH_FILE" "$REMOTE_PATH/auth.js"
echo "✅ File uploaded successfully"

echo "📋 Step 5: Setting correct permissions..."
execute_remote "chown root:root $REMOTE_PATH/auth.js"
execute_remote "chmod 644 $REMOTE_PATH/auth.js"

echo "📋 Step 6: Validating file syntax..."
if execute_remote "cd /root/eon && node -c server/routes/auth.js"; then
    echo "✅ File syntax is valid"
else
    echo "❌ Syntax error in auth.js! Rolling back..."
    execute_remote "cp $BACKUP_DIR/$BACKUP_NAME $REMOTE_PATH/auth.js"
    echo "🔄 Rollback completed"
    exit 1
fi

echo "📋 Step 7: Checking PM2 status..."
PM2_STATUS=$(execute_remote "cd /root/eon && pm2 list | grep -c 'online' || echo '0'")
echo "PM2 processes online: $PM2_STATUS"

if [ "$PM2_STATUS" -gt "0" ]; then
    echo "📋 Step 8: Restarting PM2 processes..."
    execute_remote "cd /root/eon && pm2 restart all"
    echo "✅ PM2 processes restarted"
    
    echo "📋 Step 9: Waiting for services to stabilize..."
    sleep 10
    
    echo "📋 Step 10: Checking service health..."
    NEW_STATUS=$(execute_remote "cd /root/eon && pm2 list | grep -c 'online' || echo '0'")
    if [ "$NEW_STATUS" -eq "$PM2_STATUS" ]; then
        echo "✅ All services are running properly"
    else
        echo "⚠️  Warning: Some services may have issues. Check PM2 logs."
    fi
else
    echo "⚠️  No PM2 processes running. You may need to start them manually."
fi

echo "📋 Step 11: Displaying deployment summary..."
echo ""
echo "=== DEPLOYMENT SUMMARY ==="
echo "✅ Auth.js successfully updated on VPS"
echo "📁 Backup created: $BACKUP_DIR/$BACKUP_NAME"
echo "🔄 PM2 processes: $([ "$PM2_STATUS" -gt "0" ] && echo "Restarted" || echo "Not running")"
echo "🌐 VPS: $VPS_HOST"
echo "📅 Deployment time: $(date)"
echo ""

echo "📋 Step 12: Testing OAuth endpoints (optional)..."
echo "You can test the OAuth flow by:"
echo "1. Accessing: https://iaeon.site/operations"
echo "2. Trying to connect Deriv account"
echo "3. Checking server logs: pm2 logs"
echo ""

echo "🎉 Deployment completed successfully!"
echo ""
echo "🔧 Manual verification commands:"
echo "ssh root@$VPS_HOST"
echo "cd /root/eon"
echo "pm2 logs"
echo "pm2 status"