#!/bin/bash

echo "🔍 DIAGNÓSTICO POSTGRESQL VPS - DERIV BOTS PLATFORM"
echo "=================================================="

# Conectar à VPS e executar diagnósticos
expect -c "
spawn ssh root@31.97.28.231
expect \"password:\"
send \"62uDLW4RJ9ae28EPVfp5yzT##\r\"

expect \"#\"
send \"echo '1. Verificando localização atual'\r\"
expect \"#\"  
send \"pwd && ls -la\r\"

expect \"#\"
send \"echo '2. Verificando PostgreSQL'\r\"
expect \"#\"
send \"sudo systemctl status postgresql --no-pager -l | head -10\r\"

expect \"#\"
send \"echo '3. Verificando banco deriv_bots_db'\r\"
expect \"#\"
send \"sudo -u postgres psql -c '\\\\l' | grep deriv\r\"

expect \"#\"
send \"echo '4. Verificando tabela users'\r\"
expect \"#\"
send \"sudo -u postgres psql -d deriv_bots_db -c '\\\\d users' 2>&1\r\"

expect \"#\"
send \"echo '5. Verificando coluna deriv_accounts_tokens'\r\"
expect \"#\"
send \"sudo -u postgres psql -d deriv_bots_db -c 'SELECT column_name FROM information_schema.columns WHERE table_name = \\\"users\\\" AND column_name LIKE \\\"%deriv%\\\";' 2>&1\r\"

expect \"#\"
send \"echo '6. Contando registros'\r\"
expect \"#\"
send \"sudo -u postgres psql -d deriv_bots_db -c 'SELECT count(*) as total_users FROM users;' 2>&1\r\"

expect \"#\"
send \"echo '7. Verificando .env'\r\"
expect \"#\"
send \"cat .env | grep -E '(DATABASE|POSTGRES)' || echo 'Sem config PostgreSQL em .env'\r\"

expect \"#\"
send \"echo 'Diagnóstico completo!'\r\"

expect \"#\"
send \"exit\r\"
expect eof
"
