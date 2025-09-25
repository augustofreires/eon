# PostgreSQL Requirements Analysis - Deriv Bots Platform

## Critical Database Issues Identified

### 1. **Missing `deriv_accounts_tokens` Column**
**PROBLEMA CRÍTICO**: A coluna `deriv_accounts_tokens` é essencial para o funcionamento do seletor de contas, mas pode não estar presente na tabela `users` do PostgreSQL na VPS.

**Evidência no Código**:
```javascript
// server/routes/auth.js:660
ADD COLUMN IF NOT EXISTS deriv_accounts_tokens TEXT
```

**Função**: Armazena as informações de múltiplas contas OAuth do Deriv em formato JSON.

### 2. **Database Schema Mismatch**
O arquivo `server/database/setup.js` NÃO inclui a coluna `deriv_accounts_tokens` na definição inicial da tabela `users`. Esta coluna é adicionada apenas via `ALTER TABLE` nos endpoints de autenticação.

**Problema**: Se o setup inicial não executou essas alterações, a coluna não existe.

### 3. **Environment Configuration Issues**

**Local .env (Development)**:
```
# DATABASE_URL=postgresql://username:password@localhost:5432/deriv_bots_db
```
- PostgreSQL está COMENTADO
- Sistema usa SQLite em desenvolvimento

**VPS .env (Production)** - DEVE ter:
```
NODE_ENV=production
DATABASE_URL=postgresql://username:password@localhost:5432/deriv_bots_db
# OU
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=deriv_bots_db
```

### 4. **Required Database Tables and Columns**

#### Tabela `users` - Colunas Deriv Essenciais:
```sql
-- Colunas básicas (do setup.js)
deriv_token VARCHAR(500)
deriv_account_id VARCHAR(100)

-- Colunas adicionadas dinamicamente (CRÍTICAS):
deriv_connected BOOLEAN DEFAULT false
deriv_access_token TEXT
deriv_email VARCHAR(255)
deriv_currency VARCHAR(10)
deriv_country VARCHAR(10)
deriv_is_virtual BOOLEAN DEFAULT false
deriv_fullname VARCHAR(255)
deriv_accounts_tokens TEXT  -- ⚠️ CRÍTICA PARA SELETOR DE CONTAS
```

### 5. **Account Selector Logic Flow**
1. **OAuth Callback**: Salva múltiplas contas em `deriv_accounts_tokens`
2. **Login**: Carrega contas de `deriv_accounts_tokens`
3. **Account Switch**: Busca conta específica em `deriv_accounts_tokens`
4. **Operations Page**: Usa dados de `deriv_accounts_tokens` para seletor

**Se `deriv_accounts_tokens` for NULL/inexistente** → Account selector vazio!

## Manual Commands for VPS Diagnosis

### Step 1: Connect to VPS
```bash
ssh root@31.97.28.231
# Password: 62uDLW4RJ9ae28EPVfp5yzT##
```

### Step 2: Execute Diagnostic Script
```bash
# Make script executable and run
chmod +x vps_postgresql_diagnostic.sh
./vps_postgresql_diagnostic.sh > diagnostic_output.txt 2>&1
cat diagnostic_output.txt
```

### Step 3: Manual PostgreSQL Tests
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Connect to PostgreSQL
sudo -u postgres psql

# In PostgreSQL prompt:
\l                                          # List databases
\c deriv_bots_db                           # Connect to database
\dt                                        # List tables
\d users                                   # Describe users table

# Check for missing columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name LIKE '%deriv%';

# Check actual user data
SELECT id, email, deriv_connected,
       LENGTH(deriv_accounts_tokens) as tokens_length,
       deriv_accounts_tokens IS NULL as tokens_null
FROM users
LIMIT 5;

\q                                         # Exit PostgreSQL
```

### Step 4: Fix Missing Columns (If Needed)
```sql
-- Connect to database
sudo -u postgres psql -d deriv_bots_db

-- Add missing columns (run ALL these):
ALTER TABLE users ADD COLUMN IF NOT EXISTS deriv_connected BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deriv_access_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deriv_email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS deriv_currency VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS deriv_country VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS deriv_is_virtual BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deriv_fullname VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS deriv_accounts_tokens TEXT;

-- Verify columns were added
\d users
```

### Step 5: Environment Check
```bash
# Check .env file
cat .env | grep -E "(DATABASE|POSTGRES|NODE_ENV)"

# Should contain:
# NODE_ENV=production
# DATABASE_URL=postgresql://user:pass@localhost:5432/deriv_bots_db
```

### Step 6: Application Restart Test
```bash
# Restart application
pm2 restart all
# OR
systemctl restart your-app-service

# Check logs
pm2 logs
# Look for database connection messages
```

## Expected Diagnostic Outcomes

### ✅ **Healthy System Should Show**:
- PostgreSQL running on port 5432
- Database `deriv_bots_db` exists
- Table `users` has ALL deriv columns including `deriv_accounts_tokens`
- At least one user with non-null `deriv_accounts_tokens`
- NODE_ENV=production
- Valid DATABASE_URL in .env

### ❌ **Problem Indicators**:
- Missing `deriv_accounts_tokens` column
- `deriv_accounts_tokens` is NULL for all users
- DATABASE_URL not set or wrong
- PostgreSQL not running
- Application connecting to SQLite instead

## Next Steps After Diagnosis
1. **Send full diagnostic output**
2. **Based on results, I'll provide specific fix commands**
3. **Test account selector functionality**
4. **Verify bot loading works**

The root cause is likely missing database columns or wrong environment configuration causing the app to use SQLite instead of PostgreSQL.