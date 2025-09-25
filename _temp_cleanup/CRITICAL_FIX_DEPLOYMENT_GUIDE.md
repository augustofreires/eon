# 🔧 CRITICAL FIX: WebSocket Account Switching Balance Update

## Issue Fixed
**Problem**: Account switching worked on backend, but balance didn't update on frontend because WebSocket wasn't properly calling `/get-token` to get new account's token.

**Solution**: Modified WebSocket service to call `/get-token` endpoint internally during account switching.

## Files Modified ✅

### 1. `/client/src/services/DerivWebSocketService.ts`
- **Fixed**: `switchAccount()` method now calls `/get-token` endpoint internally
- **Added**: Proper token validation and account mismatch detection
- **Improved**: Cleaner WebSocket reconnection flow

### 2. `/client/src/hooks/useDerivOperations.ts`
- **Fixed**: Removed token parameter dependency from `switchAccount()` calls
- **Updated**: Event handler to use new WebSocket API without token parameter
- **Improved**: Better error handling and logging

### 3. `/client/src/contexts/AuthContext.tsx`
- **Fixed**: Removed token passing from event dispatch (WebSocket gets it internally)
- **Simplified**: Account switching event now only passes accountId

## Deployment Instructions 🚀

### Step 1: Copy Fixed Files to Server
```bash
# Upload the three fixed files to your server
scp client/src/services/DerivWebSocketService.ts root@iaeon.site:/var/www/iaeon.site/client/src/services/
scp client/src/hooks/useDerivOperations.ts root@iaeon.site:/var/www/iaeon.site/client/src/hooks/
scp client/src/contexts/AuthContext.tsx root@iaeon.site:/var/www/iaeon.site/client/src/contexts/
```

### Step 2: SSH to Server and Rebuild
```bash
ssh root@iaeon.site
cd /var/www/iaeon.site/client
npm run build
pm2 restart eon-backend
```

### Step 3: Test the Fix
1. Go to https://iaeon.site
2. Login with your account
3. Connect Deriv account (if not already connected)
4. Switch between accounts using the dropdown
5. **Balance should update immediately after switching**
6. Check browser console for "DERIV OFFICIAL" success logs

## What the Fix Does 🔍

### Before (Broken Flow):
1. User switches accounts in UI
2. AuthContext calls backend `/switch-account`
3. Backend returns response (but token might not be current)
4. WebSocket tries to use potentially stale token
5. Balance doesn't update properly ❌

### After (Fixed Flow):
1. User switches accounts in UI
2. AuthContext calls backend `/switch-account`
3. WebSocket service calls `/get-token` to get fresh token ✅
4. WebSocket reconnects with correct account token ✅
5. Balance updates immediately ✅

## Key Technical Changes 🛠️

### WebSocket Service (`DerivWebSocketService.ts`):
```typescript
// OLD: Required token parameter
public async switchAccount(token: string, accountId: string): Promise<boolean>

// NEW: Gets token internally from /get-token
public async switchAccount(accountId: string): Promise<boolean> {
  // Step 3: Get new account token from /get-token endpoint
  const axios = (await import('axios')).default;
  const tokenResponse = await axios.get('/api/auth/deriv/get-token');
  const newToken = tokenResponse.data.token;

  // Continue with authorization...
}
```

### Hook (`useDerivOperations.ts`):
```typescript
// OLD: Pass token from event
derivWS.current.switchAccount(token, accountId)

// NEW: Only pass accountId (WebSocket gets token internally)
derivWS.current.switchAccount(accountId)
```

## Expected Behavior After Fix ✅

1. **Account Switching**: Should work seamlessly
2. **Balance Update**: Should happen within 3-5 seconds after switching
3. **Console Logs**: Should see "DERIV OFFICIAL: Account switch completed successfully"
4. **No Errors**: Should not see token-related errors in console
5. **WebSocket**: Should properly reconnect with new account's token

## Testing Checklist 📋

- [ ] Login to https://iaeon.site works
- [ ] Deriv connection works
- [ ] Account dropdown shows available accounts
- [ ] Switching accounts updates balance immediately
- [ ] No console errors during account switch
- [ ] Balance matches the selected account
- [ ] Multiple account switches work correctly

## Troubleshooting 🔧

If balance still doesn't update:
1. Check browser console for errors
2. Verify `/get-token` endpoint returns valid token
3. Check WebSocket connection status
4. Try hard refresh (Ctrl+F5)
5. Check backend PM2 logs: `pm2 logs eon-backend`

---
**Status**: ✅ Ready for deployment
**Priority**: 🔥 Critical - Fixes core account switching functionality
**Testing**: ✅ Build successful, ready for server deployment