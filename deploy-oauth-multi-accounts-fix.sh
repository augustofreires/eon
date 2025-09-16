#!/bin/bash

# Deploy OAuth Multi-Accounts Fix
# This script fixes the Deriv OAuth integration to show both real and virtual accounts

echo "🚀 Deploying OAuth Multi-Accounts Fix to VPS..."

VPS_IP="31.97.28.231"
VPS_USER="root"
VPS_PATH="/var/www/html"

echo "📦 Preparing deployment files..."

# Create deployment package
tar -czf oauth-multi-accounts-fix.tar.gz server/routes/auth.js

echo "📤 Uploading files to VPS..."

# Upload the fixed auth.js file
scp oauth-multi-accounts-fix.tar.gz $VPS_USER@$VPS_IP:/tmp/

echo "🔧 Applying fixes on VPS..."

# SSH to VPS and apply the fix
ssh $VPS_USER@$VPS_IP << 'EOF'
cd /var/www/html

echo "🔄 Creating backup of current auth.js..."
cp server/routes/auth.js server/routes/auth.js.backup.$(date +%Y%m%d_%H%M%S)

echo "📂 Extracting new files..."
cd /tmp
tar -xzf oauth-multi-accounts-fix.tar.gz
cp server/routes/auth.js /var/www/html/server/routes/auth.js

echo "🔍 Verifying deployment..."
ls -la /var/www/html/server/routes/auth.js

echo "♻️ Restarting PM2 services..."
pm2 restart all

echo "📊 Checking PM2 status..."
pm2 status

echo "🧹 Cleaning up..."
rm -f /tmp/oauth-multi-accounts-fix.tar.gz

echo "✅ OAuth Multi-Accounts Fix deployed successfully!"
echo ""
echo "🔍 CHANGES APPLIED:"
echo "1. ✅ Fixed validateTokenAndGetAccounts to use loginid_list API"
echo "2. ✅ Added proper account fetching via get_account_status + loginid_list"
echo "3. ✅ Fixed switch-account endpoint to use loginid switching"
echo "4. ✅ Added support for both is_virtual and loginid parameters"
echo "5. ✅ Improved error handling and logging"
echo ""
echo "🧪 TESTING:"
echo "1. Login with client account (cliente@iaeon.com)"
echo "2. Connect Deriv OAuth - should now fetch ALL accounts"
echo "3. Check /auth/deriv/account-info - should show multiple accounts"
echo "4. Test switching between Real and Virtual accounts"
echo ""
echo "📝 LOG MONITORING:"
echo "pm2 logs server --lines 50 --follow"
EOF

echo "🧹 Cleaning up local files..."
rm -f oauth-multi-accounts-fix.tar.gz

echo "✅ Deployment completed!"
echo ""
echo "🔗 NEXT STEPS:"
echo "1. Monitor logs: ssh $VPS_USER@$VPS_IP 'pm2 logs server --lines 20'"
echo "2. Test OAuth: https://iaeon.site/operations"
echo "3. Check database: ssh $VPS_USER@$VPS_IP 'psql -U postgres -d eon_pro -c \"SELECT email, deriv_account_id, deriv_accounts_tokens FROM users WHERE deriv_connected = true;\"'"
echo ""
echo "🐛 DEBUGGING:"
echo "If issues persist, check:"
echo "- Deriv app_id configuration"
echo "- WebSocket connection logs"
echo "- Database deriv_accounts_tokens JSON structure"