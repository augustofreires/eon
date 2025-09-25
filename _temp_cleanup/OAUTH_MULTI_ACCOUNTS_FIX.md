# OAuth Multi-Accounts Fix - Deriv Integration

## Problem Summary

The current Deriv OAuth integration was only showing **1 account** (CR6656944 USD real account) instead of showing both **real and virtual accounts**. This prevented users from switching between account types.

### Root Causes Identified:

1. **Incorrect API Call**: Using `account_list` from authorize response instead of dedicated `loginid_list` API
2. **Single Token Limitation**: Not properly handling account switching with same OAuth token
3. **Missing Account Discovery**: Not calling the right Deriv APIs to discover all available accounts
4. **Switch Logic Error**: Switch-account endpoint wasn't using correct Deriv WebSocket commands

## Solution Implemented

### 1. Fixed Account Discovery (`validateTokenAndGetAccounts`)

**Before**: Only used `response.authorize.account_list` (unreliable)
```javascript
// OLD - unreliable method
if (response.authorize.account_list && Array.isArray(response.authorize.account_list)) {
    // Only sometimes worked
}
```

**After**: Uses proper Deriv API sequence
```javascript
// NEW - reliable method
1. authorize (req_id: 1) - validate token
2. get_account_status (req_id: 2) - get account status
3. loginid_list (req_id: 3) - get ALL available accounts
```

### 2. Fixed Account Switching (`/deriv/switch-account`)

**Before**: Tried to use different tokens for different accounts (incorrect)

**After**: Uses correct Deriv WebSocket loginid switching
```javascript
// Correct Deriv API sequence for switching:
1. authorize with current token
2. send { loginid: "target_account_id", req_id: 2 }
3. re-authorize to confirm switch
```

### 3. Enhanced Error Handling

- Added comprehensive logging for debugging
- Better timeout handling (20 seconds for multi-step operations)
- Fallback mechanisms when API calls fail
- Detailed error messages for troubleshooting

## Files Modified

### `/server/routes/auth.js`
- ✅ **validateTokenAndGetAccounts()** - Fixed to use `loginid_list` API
- ✅ **POST /deriv/switch-account** - Fixed to use loginid switching
- ✅ **Added getVirtualAccountTokens()** - Helper for virtual account handling
- ✅ **Enhanced logging** - Better debugging information

## Expected Results After Fix

### Database Changes
**Before**:
```json
deriv_accounts_tokens: [{"token":"a1-ePwzj5xTq2Hkm1wzC40yhgmEesRwt","loginid":"CR6656944","currency":"USD","is_virtual":0}]
```

**After** (with multiple accounts):
```json
deriv_accounts_tokens: [
  {"token":"a1-ePwzj5xTq2Hkm1wzC40yhgmEesRwt","loginid":"CR6656944","currency":"USD","is_virtual":false},
  {"token":"a1-ePwzj5xTq2Hkm1wzC40yhgmEesRwt","loginid":"VRTC1234567","currency":"USD","is_virtual":true}
]
```

### Frontend Behavior
- ✅ **Account Dropdown**: Shows both Real and Virtual accounts
- ✅ **Account Switching**: User can switch between account types
- ✅ **Balance Display**: Shows correct balance for selected account
- ✅ **Bot Operations**: Work with both account types

### Log Output
**Before**:
```
📊 PARSED available accounts: 1 contas
400 Bad Request on switch attempt
```

**After**:
```
📊 Total de 2 contas encontradas
  1. CR6656944 (Real) - USD - real
  2. VRTC1234567 (Virtual) - USD - virtual
🎉 Switch confirmado: from CR6656944 to VRTC1234567
```

## Deployment Instructions

### 1. Deploy the Fix
```bash
./deploy-oauth-multi-accounts-fix.sh
```

### 2. Monitor Deployment
```bash
ssh root@31.97.28.231 'pm2 logs server --lines 20 --follow'
```

### 3. Test the Fix

#### A. Database Verification
```bash
ssh root@31.97.28.231 'psql -U postgres -d eon_pro -c "SELECT email, deriv_account_id, deriv_accounts_tokens FROM users WHERE deriv_connected = true;"'
```

#### B. OAuth Re-connection Test
1. Go to https://iaeon.site/operations
2. Login as **cliente@iaeon.com** / **123456**
3. Disconnect Deriv (if connected)
4. Reconnect Deriv OAuth
5. **Expected**: Should see multiple accounts in dropdown

#### C. Account Switching Test
1. Select different account type (Real ↔ Virtual)
2. Click switch
3. **Expected**: 200 success response + account info updates

#### D. API Testing
```bash
# Test account info endpoint
curl -H "Authorization: Bearer YOUR_JWT" https://iaeon.site/api/auth/deriv/account-info

# Test switch endpoint
curl -X POST -H "Authorization: Bearer YOUR_JWT" -H "Content-Type: application/json" \
-d '{"is_virtual": true}' https://iaeon.site/api/auth/deriv/switch-account
```

## Testing Tools

### 1. Automated Test Script
```bash
# Set token in test file first
node test-oauth-multi-accounts.js
```

### 2. Manual Testing Checklist

- [ ] OAuth connection shows multiple accounts
- [ ] Database contains multiple accounts in JSON
- [ ] Account dropdown shows Real/Virtual options
- [ ] Switching to Virtual account works (200 response)
- [ ] Switching to Real account works (200 response)
- [ ] Balance updates correctly after switch
- [ ] Bot operations work on both account types

## Troubleshooting

### Issue: Still only 1 account
**Cause**: User might only have 1 account type in Deriv
**Solution**:
1. Check Deriv.com account - create Virtual account if needed
2. Re-run OAuth connection
3. Check logs for API response details

### Issue: Switch returns 400 Bad Request
**Cause**: Target account not found or invalid loginid
**Solution**:
1. Check `deriv_accounts_tokens` in database
2. Verify account exists in stored JSON
3. Check WebSocket logs for Deriv API errors

### Issue: Token validation fails
**Cause**: Deriv token expired or invalid app_id
**Solution**:
1. Re-authorize OAuth
2. Check DERIV_APP_ID environment variable
3. Verify WebSocket connection to Deriv

## Security Notes

- ✅ All tokens are validated against Deriv API before use
- ✅ Account switching requires proper authentication
- ✅ No sensitive data exposed in logs
- ✅ Timeout protections prevent hanging connections

## API Changes Summary

| Endpoint | Change | Purpose |
|----------|--------|---------|
| `GET /auth/deriv/status` | Enhanced | Returns available_accounts array |
| `GET /auth/deriv/account-info` | Enhanced | Shows all accounts + current active |
| `POST /auth/deriv/switch-account` | Fixed | Now accepts `loginid` parameter |
| `POST /auth/deriv/fetch-all-accounts` | Enhanced | Re-fetches account list from API |

---

**Deployment Status**: ✅ Ready for deployment
**Testing Status**: ✅ Scripts provided
**Monitoring**: PM2 logs + database queries