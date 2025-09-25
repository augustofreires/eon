#!/bin/bash

echo "🚀 Fazendo deploy das correções de conta..."

# Conectar via SSH e executar comandos
sshpass -p "62uDLW4RJ9ae28EPVfp5yzT##" ssh -o StrictHostKeyChecking=no root@31.97.28.231 << 'ENDSSH'

cd /root/eon-pro-trading-bot

echo "=== Fazendo backup do arquivo atual ==="
cp client/src/pages/OperationsPage.tsx client/src/pages/OperationsPage.tsx.backup

echo "=== Atualizando do repositório ==="
git pull origin main

echo "=== Verificando mudanças ==="
grep -n "currentAccount?.loginid" client/src/pages/OperationsPage.tsx | head -3

echo "=== Rebuilding aplicação ==="
cd client
npm run build
cd ..

echo "=== Reiniciando PM2 ==="
pm2 restart all

echo "=== Verificando status ==="
pm2 status

echo "=== Deploy concluído! ==="

ENDSSH

echo "✅ Deploy finalizado!"