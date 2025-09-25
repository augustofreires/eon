# Manual Deriv OAuth Fix Deployment Guide

## Critical Issues Found:

1. **Database Schema Missing**: VPS database lacks Deriv OAuth columns
2. **Missing Route Processing**: OAuth callback endpoints exist but database operations fail
3. **SQLite Error**: Authentication middleware fails due to missing database columns

## Fix Steps (Execute on VPS: 31.97.28.231)

### Step 1: Connect to VPS
```bash
ssh root@31.97.28.231
# Password: 62uDLW4RJ9ae28EPVfp5yzT##
```

### Step 2: Navigate to EON directory
```bash
cd /root/eon
pwd
ls -la server/routes/
```

### Step 3: Backup current auth.js
```bash
cp server/routes/auth.js server/routes/auth.js.backup.$(date +%Y%m%d_%H%M%S)
```

### Step 4: Update Database Schema (Add Missing Columns)
```bash
sqlite3 server/database.sqlite << 'EOF'
-- Add missing Deriv columns (ignore errors if they already exist)
ALTER TABLE users ADD COLUMN deriv_access_token VARCHAR(500);
ALTER TABLE users ADD COLUMN deriv_connected BOOLEAN DEFAULT 0;
ALTER TABLE users ADD COLUMN deriv_email VARCHAR(255);
ALTER TABLE users ADD COLUMN deriv_currency VARCHAR(10);
ALTER TABLE users ADD COLUMN deriv_country VARCHAR(10);
ALTER TABLE users ADD COLUMN deriv_is_virtual BOOLEAN DEFAULT 0;
ALTER TABLE users ADD COLUMN deriv_fullname VARCHAR(255);
ALTER TABLE users ADD COLUMN deriv_accounts_tokens TEXT;

-- Verify schema
.schema users
.quit
EOF
```

### Step 5: Update auth.js with the Fixed Version

**IMPORTANT**: The current auth.js file already contains all necessary OAuth routes. The issue is the database schema.

Verify the routes exist:
```bash
grep -n "deriv/process-callback\|deriv/status" server/routes/auth.js
```

You should see:
- Line ~845: `router.post('/deriv/process-callback', ...)`
- Line ~1013: `router.get('/deriv/status', ...)`

### Step 6: Check Environment Variables
```bash
cat .env | grep -E "DERIV_APP_ID|JWT_SECRET|DATABASE_URL"
```

Make sure these are set:
- `DERIV_APP_ID=82349` (or your app ID)
- `JWT_SECRET=your_secret_key`
- Database connection string

### Step 7: Restart Server
```bash
pm2 restart eon || pm2 start npm --name 'eon' -- start
pm2 status
```

### Step 8: Test OAuth Endpoints
```bash
# Test authentication endpoint (should return 401 - expected without token)
curl -v http://localhost:5000/api/auth/deriv/status

# Test server health
curl -v http://localhost:5000/health || curl -v http://localhost:5000/

# Check server logs
pm2 logs eon --lines 30
```

## Expected Results After Fix:

1. **✅ /api/auth/deriv/process-callback**: Should accept POST requests with OAuth data
2. **✅ /api/auth/deriv/status**: Should return proper JSON (not "Token de acesso necessário" error)
3. **✅ No SQLite Errors**: Authentication middleware should work without database errors
4. **✅ Frontend Integration**: OAuth flow should complete successfully

## Testing the Fix:

### Frontend Should Be Able To:
1. Call `POST /api/auth/deriv/process-callback` with OAuth tokens
2. Receive proper response from `GET /api/auth/deriv/status`
3. Complete the OAuth flow without 400/500 errors

### Backend Should Show:
- No more SQLite errors in logs
- Successful OAuth token validation
- Proper database storage of Deriv account information

## If Issues Persist:

1. **Check PM2 logs**: `pm2 logs eon --lines 50`
2. **Verify database**: `sqlite3 server/database.sqlite "SELECT COUNT(*) FROM users;"`
3. **Test route existence**: `curl -v http://localhost:5000/api/auth/verify`
4. **Check file permissions**: `ls -la server/routes/auth.js`

## Technical Details:

The auth.js file contains comprehensive OAuth handling:
- Lines 13-128: `validateTokenAndGetAccounts()` - WebSocket validation
- Lines 845-985: `POST /deriv/process-callback` - Process OAuth callback
- Lines 1013-1069: `GET /deriv/status` - Check connection status
- Lines 1414-1485: `POST /deriv/fetch-all-accounts` - Fetch multiple accounts
- Lines 1488-1614: `POST /deriv/switch-account` - Switch between accounts

The main issue was the database missing the required columns for storing Deriv OAuth data.