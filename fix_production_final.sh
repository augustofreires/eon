#!/bin/bash

# Script para força rebuild completo em produção
sshpass -p "62uDLW4RJ9ae28EPVfp5yzT##" ssh -o StrictHostKeyChecking=no root@31.97.28.231 << 'ENDSSH'

cd /root/eon

echo "🛑 Parando servidor..."
pm2 stop iaeon-server

echo "🧹 Limpando cache completo..."
rm -rf client/build
rm -rf client/node_modules/.cache
rm -rf client/.cache

echo "📦 Reinstalando dependências..."
cd client
npm cache clean --force
npm install

echo "🏗️ Force rebuild completo..."
npm run build

echo "🔄 Reiniciando servidor..."
cd /root/eon
pm2 start iaeon-server

echo "📊 Status final:"
pm2 status

echo ""
echo "🎉 REBUILD COMPLETO FINALIZADO!"
echo "🧪 TESTE AGORA: https://iaeon.site/operations"
echo "✅ Deve mostrar 3 bots disponíveis"

ENDSSH