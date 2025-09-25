#!/bin/bash

# 🎯 Deploy da Correção das Múltiplas Notificações OAuth
# Aplica as correções no AuthContext, DerivAccountPanel e OperationsPage

echo "🚀 Iniciando deploy da correção das múltiplas notificações OAuth..."

# Conectar à VPS
scp -o StrictHostKeyChecking=no client/src/contexts/AuthContext.tsx root@www.afiliagreen.com.br:/var/www/iaeon/client/src/contexts/
scp -o StrictHostKeyChecking=no client/src/components/DerivAccountPanel.tsx root@www.afiliagreen.com.br:/var/www/iaeon/client/src/components/
scp -o StrictHostKeyChecking=no client/src/pages/OperationsPage.tsx root@www.afiliagreen.com.br:/var/www/iaeon/client/src/pages/
scp -o StrictHostKeyChecking=no server/database/setup.js root@www.afiliagreen.com.br:/var/www/iaeon/server/database/

echo "✅ Arquivos enviados para VPS"

# Executar comandos na VPS
ssh -o StrictHostKeyChecking=no root@www.afiliagreen.com.br << 'ENDSSH'
echo "🔧 Executando comandos na VPS..."

cd /var/www/iaeon

# Fazer backup
echo "💾 Fazendo backup..."
cp -r client/src /tmp/backup-client-src-$(date +%Y%m%d-%H%M%S)

# Build do cliente
echo "🏗️ Fazendo build do cliente..."
cd client
npm run build

# Restart do PM2
echo "🔄 Reiniciando serviços..."
cd ..
pm2 restart all

# Verificar status
echo "✅ Status dos serviços:"
pm2 status

echo "🎉 Deploy concluído com sucesso!"
echo "🧪 Teste agora em: https://iaeon.site/operations"
echo "👤 Login: cliente@iaeon.com / 123456"
ENDSSH

echo "✅ Deploy da correção das múltiplas notificações OAuth concluído!"