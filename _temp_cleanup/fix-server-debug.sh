#!/bin/bash

# Script para diagnosticar e corrigir problemas do servidor após migração de banco

echo "🔧 DIAGNÓSTICO E CORREÇÃO DO SERVIDOR EON"
echo "========================================"

# Ir para o diretório do projeto
cd /root/eon

echo "1. Verificando status do PM2..."
pm2 status

echo "2. Verificando logs de erro..."
pm2 logs server --lines 20 --nostream

echo "3. Parando o servidor..."
pm2 stop server

echo "4. Verificando sintaxe do servidor principal..."
node -c server/index.js
if [ $? -ne 0 ]; then
    echo "❌ Erro de sintaxe no index.js"
    exit 1
fi

echo "5. Verificando rotas migradas..."

# Verificar rota branding
echo "Verificando branding.js..."
node -c server/routes/branding.js
if [ $? -ne 0 ]; then
    echo "❌ Erro em branding.js - restaurando backup"
    cp server/routes/branding.js.backup server/routes/branding.js
fi

# Verificar rota action-cards
echo "Verificando action-cards.js..."
node -c server/routes/action-cards.js
if [ $? -ne 0 ]; then
    echo "❌ Erro em action-cards.js - restaurando backup"
    cp server/routes/action-cards.js.backup server/routes/action-cards.js
fi

# Verificar rota pages
echo "Verificando pages.js..."
node -c server/routes/pages.js
if [ $? -ne 0 ]; then
    echo "❌ Erro em pages.js - restaurando backup"
    cp server/routes/pages.js.backup server/routes/pages.js
fi

# Verificar rota useful-links
echo "Verificando useful-links.js..."
node -c server/routes/useful-links.js
if [ $? -ne 0 ]; then
    echo "❌ Erro em useful-links.js - restaurando backup"
    cp server/routes/useful-links.js.backup server/routes/useful-links.js
fi

# Verificar rota bank-management-fixed
echo "Verificando bank-management-fixed.js..."
node -c server/routes/bank-management-fixed.js
if [ $? -ne 0 ]; then
    echo "❌ Erro em bank-management-fixed.js - restaurando backup"
    cp server/routes/bank-management-fixed.js.backup server/routes/bank-management-fixed.js
fi

echo "6. Verificando conexão com banco de dados..."
node -e "
const db = require('./server/database/connection');
console.log('✅ Conexão com banco OK');
db.get('SELECT count(*) as count FROM users', (err, row) => {
    if (err) {
        console.log('❌ Erro ao consultar usuários:', err.message);
        process.exit(1);
    }
    console.log('✅ Usuários encontrados:', row.count);
});
"

echo "7. Reiniciando servidor..."
pm2 start server

echo "8. Aguardando inicialização..."
sleep 5

echo "9. Verificando status final..."
pm2 status

echo "10. Testando health check..."
curl -f http://localhost:5001/api/health || echo "❌ Health check falhou"

echo "🏁 Diagnóstico concluído!"