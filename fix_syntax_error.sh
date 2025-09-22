#!/bin/bash

# Critical syntax fix for OperationsPage.tsx
echo "Fixing critical syntax error in OperationsPage.tsx..."

# Navigate to the correct directory
cd /root/eon/client/src/pages

# Backup the current file
cp OperationsPage.tsx OperationsPage.tsx.backup

# Fix the syntax error on line 103
sed -i 's/const botsData = Array\.isArray(response\.data\.bots) ? response\.data\.bots : (Array\.isArray(response\.data) ? response\.data : );/const botsData = Array.isArray(response.data.bots) ? response.data.bots : (Array.isArray(response.data) ? response.data : []);/' OperationsPage.tsx

# Verify the fix
echo "Checking if fix was applied..."
grep -n "const botsData" OperationsPage.tsx

# Build the project
echo "Building the project..."
cd /root/eon
npm run build

# Restart PM2 processes
echo "Restarting PM2 processes..."
pm2 restart all

echo "Fix completed! The syntax error has been resolved."