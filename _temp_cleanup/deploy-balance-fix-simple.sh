#!/bin/bash

# CRITICAL FIX: Deploy WebSocket balance update fix
echo "🔧 CRITICAL FIX: Deploying WebSocket account switching fix..."

# Build frontend locally first to ensure no build errors
echo "📤 Building frontend locally..."
cd client
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed locally!"
    exit 1
fi

echo "✅ Frontend built successfully"

# Upload fixed files to server
echo "📤 Uploading fixed files..."

# Upload WebSocket service
scp src/services/DerivWebSocketService.ts root@iaeon.site:/var/www/iaeon.site/client/src/services/

# Upload useDerivOperations hook
scp src/hooks/useDerivOperations.ts root@iaeon.site:/var/www/iaeon.site/client/src/hooks/

# Upload AuthContext
scp src/contexts/AuthContext.tsx root@iaeon.site:/var/www/iaeon.site/client/src/contexts/

echo "✅ Files uploaded successfully"

echo "🔧 CRITICAL FIX SUMMARY:"
echo "1. ✅ WebSocket switchAccount method now calls /get-token internally"
echo "2. ✅ Removed token parameter dependency from frontend code"
echo "3. ✅ Proper WebSocket reconnection with new account token"
echo "4. ✅ Fixed balance subscription after account switch"
echo ""
echo "🔍 NEXT STEPS:"
echo "1. SSH to server and rebuild frontend: cd /var/www/iaeon.site/client && npm run build"
echo "2. Restart backend: pm2 restart eon-backend"
echo "3. Test account switching at https://iaeon.site"