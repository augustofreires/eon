# Manual VPS Deployment Guide for auth.js Updates

## Connection Information
- **VPS IP:** 31.97.28.231
- **User:** root  
- **Password:** 62uDLW4RJ9ae28EPVfp5yzT#
- **Remote Path:** /root/eon/server/routes/auth.js

## Step-by-Step Deployment

### 1. Connect to VPS
```bash
ssh root@31.97.28.231
# Enter password when prompted: 62uDLW4RJ9ae28EPVfp5yzT#
```

### 2. Navigate to project directory
```bash
cd /root/eon
```

### 3. Create backup of current auth.js
```bash
mkdir -p backups
cp server/routes/auth.js backups/auth_$(date +%Y%m%d_%H%M%S).js
ls -la backups/
```

### 4. Download/Upload the updated auth.js file
Option A - Using nano editor (copy-paste method):
```bash
nano server/routes/auth.js
# Clear the file content and paste the new auth.js content
# Save with Ctrl+X, Y, Enter
```

Option B - Using SCP from local machine:
```bash
# From your local machine
scp "/Users/augustofreires/Desktop/Bots deriv/server/routes/auth.js" root@31.97.28.231:/root/eon/server/routes/auth.js
```

### 5. Verify file permissions
```bash
chown root:root server/routes/auth.js
chmod 644 server/routes/auth.js
ls -la server/routes/auth.js
```

### 6. Validate syntax
```bash
node -c server/routes/auth.js
echo "Exit code: $?"
# Should show exit code 0 for success
```

### 7. Check current PM2 status
```bash
pm2 status
pm2 list
```

### 8. Restart PM2 processes
```bash
pm2 restart all
# or restart specific processes:
# pm2 restart server
# pm2 restart app
```

### 9. Monitor for issues
```bash
pm2 logs --lines 50
# Press Ctrl+C to exit log monitoring
```

### 10. Verify services are running
```bash
pm2 status
curl -I http://localhost:3001/api/auth/verify || echo "Service may be starting..."
```

## Key Changes Made to auth.js

1. **Enhanced `/deriv/authorize` route:**
   - Added environment variable validation
   - Improved JWT token generation with purpose field
   - Extended token expiry to 15 minutes
   - Better error handling and logging

2. **Improved `/deriv/callback` route:**
   - Added comprehensive error handling with user-friendly HTML responses
   - Enhanced input validation and sanitization
   - Better JWT state parameter validation
   - Improved postMessage communication
   - Added demo account detection

3. **Security improvements:**
   - Added input sanitization function
   - Implemented simple rate limiting
   - Enhanced error messages without exposing sensitive information
   - Better HTML escaping for XSS prevention

## Testing the OAuth Flow

1. **Access the application:**
   ```
   https://iaeon.site/operations
   ```

2. **Try connecting Deriv account:**
   - Login to your account
   - Go to account/settings section
   - Click "Connect Deriv Account"
   - Complete OAuth flow

3. **Check server logs for issues:**
   ```bash
   pm2 logs | grep -E "(OAuth|deriv|callback)"
   ```

## Rollback Procedure (if needed)

```bash
# If something goes wrong, restore backup
cd /root/eon
ls -la backups/
cp backups/auth_YYYYMMDD_HHMMSS.js server/routes/auth.js
pm2 restart all
pm2 status
```

## Environment Variables to Verify

Ensure these are properly set in your `.env` file:
```bash
cat .env | grep -E "(DERIV|JWT|CORS)"
```

Required variables:
- `DERIV_APP_ID`
- `JWT_SECRET`
- `CORS_ORIGIN`
- `DERIV_OAUTH_REDIRECT_URL` (optional, has fallback)

## Troubleshooting

### If services won't start:
```bash
pm2 stop all
pm2 delete all
npm install  # if needed
pm2 start ecosystem.config.js
```

### If OAuth isn't working:
1. Check environment variables
2. Verify Deriv app configuration 
3. Check CORS settings
4. Monitor browser console for postMessage errors
5. Check server logs for JWT errors

### Common log locations:
- PM2 logs: `pm2 logs`
- System logs: `/var/log/nginx/error.log`
- Application logs: Check pm2 output

## Security Notes

- The VPS password is included in this guide for deployment purposes
- Consider changing the password after deployment
- Ensure firewall rules are properly configured
- Keep Node.js and dependencies updated