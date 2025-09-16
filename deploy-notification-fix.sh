#!/bin/bash

# Deploy Notification and Multiple Account Fixes to VPS
# Usage: ./deploy-notification-fix.sh

echo "🚀 Starting deployment of notification and account fixes..."

# VPS connection details
VPS_HOST="31.97.28.231"
VPS_USER="root"
VPS_PATH="/root/eon"

# Build the application first
echo "📦 Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please fix build errors first."
    exit 1
fi

# Create deployment package
echo "📁 Creating deployment package..."
tar -czf notification-fix-deploy.tar.gz \
    client/build \
    server \
    package.json \
    package-lock.json

# Deploy to VPS
echo "🔄 Deploying to VPS..."

# Upload files
scp notification-fix-deploy.tar.gz ${VPS_USER}@${VPS_HOST}:/tmp/

# Execute deployment commands on VPS
ssh ${VPS_USER}@${VPS_HOST} << 'ENDSSH'
cd /root/eon

# Stop the application
echo "⏹️ Stopping application..."
pm2 stop eon-app || true

# Backup current version
echo "💾 Creating backup..."
cp -r /root/eon /root/eon-backup-$(date +%Y%m%d-%H%M%S)

# Extract new files
echo "📦 Extracting new files..."
cd /tmp
tar -xzf notification-fix-deploy.tar.gz

# Update server files
echo "🔄 Updating server files..."
cp -r server/* /root/eon/server/
cp package*.json /root/eon/

# Update client build
echo "🌐 Updating client files..."
rm -rf /root/eon/client/build
cp -r client/build /root/eon/client/

# Install dependencies (if needed)
cd /root/eon
npm install --production

# Clear PM2 logs (to remove old notification spam logs)
echo "🗑️ Clearing old logs..."
pm2 flush

# Restart application
echo "🚀 Starting application..."
pm2 start ecosystem.config.js --env production || pm2 start server/index.js --name eon-app

# Check status
echo "📊 Checking application status..."
pm2 status

echo "✅ Deployment completed!"
echo ""
echo "🔍 Fixed Issues:"
echo "   - Notification spam eliminated"
echo "   - Multiple accounts properly displayed"
echo "   - Route conflicts resolved"
echo ""
echo "🌐 Application should be running at: https://iaeon.site"
echo ""
echo "📝 To monitor logs: pm2 logs eon-app"
echo "📊 To check status: pm2 status"

# Cleanup
rm -f /tmp/notification-fix-deploy.tar.gz

ENDSSH

# Clean up local files
rm -f notification-fix-deploy.tar.gz

echo "🎉 Deployment complete! Test your OAuth login now."
echo ""
echo "Expected behavior:"
echo "1. 🔕 Only ONE notification per OAuth session"
echo "2. 📋 Multiple accounts displayed in dropdown"
echo "3. 🔄 Account switching works properly"
echo ""
echo "To test:"
echo "1. Go to https://iaeon.site/operations"
echo "2. Click 'Conectar Conta'"
echo "3. Complete Deriv OAuth"
echo "4. Check that notification appears only once"
echo "5. Click on account balance to see multiple accounts"