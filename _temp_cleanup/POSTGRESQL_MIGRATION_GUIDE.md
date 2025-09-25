# PostgreSQL Migration Guide - Deriv Trading Platform

## Overview
This guide provides step-by-step instructions to fix the PostgreSQL migration issues and get your Deriv trading platform working with PostgreSQL instead of SQLite.

## Issues Found & Solutions

### 1. Missing `affiliate_link` Column
**Problem**: The `deriv_config` table in PostgreSQL was missing the `affiliate_link` column that exists in SQLite.
**Solution**: Updated `database/setup.js` to include this column.

### 2. Missing `image_url` Column
**Problem**: The `bots` table was missing the `image_url` column needed for bot images.
**Solution**: Added `image_url` column to the bots table schema.

### 3. Database Setup Issues
**Problem**: PostgreSQL tables were not properly created with all required columns.
**Solution**: Enhanced the setup script with proper column migrations.

## Step-by-Step Deployment Instructions

### Step 1: Connect to Your VPS
```bash
ssh root@your-vps-ip
cd /root/eon
```

### Step 2: Backup Your Current SQLite Database
```bash
cp server/database.sqlite server/database.sqlite.backup
cp server/database.db server/database.db.backup
```

### Step 3: Ensure PostgreSQL is Running
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Start PostgreSQL if not running
sudo systemctl start postgresql

# Enable PostgreSQL to start on boot
sudo systemctl enable postgresql
```

### Step 4: Create PostgreSQL Database
```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE eon_platform;
CREATE USER eonuser WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE eon_platform TO eonuser;
\q
```

### Step 5: Update Environment Variables
```bash
# Edit your .env file
nano server/.env

# Update DATABASE_URL
DATABASE_URL=postgresql://eonuser:your_secure_password@localhost:5432/eon_platform
```

### Step 6: Install Dependencies
```bash
cd server
npm install sqlite3  # For migration script
```

### Step 7: Run Database Setup
```bash
# Run the updated setup script
node database/setup.js
```

### Step 8: Migrate Data from SQLite to PostgreSQL
```bash
# Run the migration script
node migrate-sqlite-to-postgresql.js
```

### Step 9: Restart Your Application
```bash
# Restart with PM2
pm2 restart all

# Check logs
pm2 logs
```

## Manual Commands to Run on VPS

Copy these commands and run them on your VPS:

```bash
# 1. Navigate to project directory
cd /root/eon

# 2. Backup existing databases
cp server/database.sqlite server/database.sqlite.backup
cp server/database.db server/database.db.backup

# 3. Install sqlite3 for migration
cd server && npm install sqlite3

# 4. Setup PostgreSQL database tables
node database/setup.js

# 5. Migrate data from SQLite
node migrate-sqlite-to-postgresql.js

# 6. Restart application
pm2 restart all

# 7. Check status
pm2 status
pm2 logs --lines 50
```

## Verification Steps

### 1. Check Database Tables
```bash
sudo -u postgres psql -d eon_platform -c "\dt"
```

### 2. Verify Data Migration
```bash
# Check users count
sudo -u postgres psql -d eon_platform -c "SELECT COUNT(*) FROM users;"

# Check bots count
sudo -u postgres psql -d eon_platform -c "SELECT COUNT(*) FROM bots;"

# Check deriv_config
sudo -u postgres psql -d eon_platform -c "SELECT * FROM deriv_config;"
```

### 3. Test API Endpoints
```bash
# Test affiliate link endpoint
curl -X GET http://localhost:3001/api/auth/deriv-affiliate-link

# Test bots endpoint (requires authentication)
curl -X GET http://localhost:3001/api/bots \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Troubleshooting

### If Database Setup Fails
```bash
# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### If Migration Script Fails
```bash
# Check if SQLite files exist
ls -la server/database.*

# Check PostgreSQL connection
sudo -u postgres psql -d eon_platform -c "SELECT version();"
```

### If API Still Returns 500 Errors
```bash
# Check PM2 logs
pm2 logs --lines 100

# Restart specific process
pm2 restart server

# Check database connection in logs
pm2 logs | grep -i "database\|postgres\|error"
```

## Expected Results

After successful migration:

1. **API Endpoints Working**:
   - `/api/auth/deriv-affiliate-link` returns 200 status
   - `/api/bots` returns array of bots (not Object)

2. **Database Tables Created**:
   - `users` with all required columns
   - `bots` with `image_url` column
   - `deriv_config` with `affiliate_link` column
   - All other required tables

3. **Data Migrated**:
   - All users from SQLite
   - All bots from SQLite (should show 3 bots: "Bot Martingale", "Bot Max Take", "cc")
   - All configuration data

4. **Frontend Working**:
   - Bot count shows actual number instead of "0 disponíveis"
   - No 500 server errors in browser console
   - OAuth and authentication working properly

## Files Modified

1. **`server/database/setup.js`**:
   - Added `affiliate_link` column to `deriv_config` table
   - Added `image_url` column to `bots` table
   - Added missing columns to `users` table
   - Added default data insertion for `deriv_config`

2. **`migrate-sqlite-to-postgresql.js`**:
   - New migration script to transfer all data from SQLite to PostgreSQL

## Next Steps

After successful migration:

1. **Remove SQLite Dependencies**:
   ```bash
   # In package.json, remove sqlite3 dependency if not needed
   npm uninstall sqlite3
   ```

2. **Archive SQLite Files**:
   ```bash
   mkdir server/sqlite-backup
   mv server/database.* server/sqlite-backup/
   ```

3. **Monitor Performance**:
   ```bash
   pm2 monit
   ```

4. **Setup Database Backups**:
   ```bash
   # Create daily backup script
   sudo crontab -e
   # Add: 0 2 * * * pg_dump eon_platform > /root/backups/eon_$(date +\%Y\%m\%d).sql
   ```

## Contact Support

If you encounter any issues during migration, provide:
1. PM2 logs: `pm2 logs --lines 100`
2. PostgreSQL logs: `sudo tail -f /var/log/postgresql/postgresql-*.log`
3. Database schema: `sudo -u postgres psql -d eon_platform -c "\d+ users; \d+ bots; \d+ deriv_config;"`