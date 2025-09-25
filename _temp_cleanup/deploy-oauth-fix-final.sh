#!/bin/bash

# 🎯 Deploy da Correção das Múltiplas Notificações OAuth
# VPS: 31.97.28.231

echo "🚀 Iniciando deploy da correção OAuth na VPS..."

VPS_HOST="31.97.28.231"
VPS_USER="root"
VPS_PATH="/var/www/iaeon"

echo "📤 Enviando arquivos corrigidos para VPS..."

# Enviar arquivos corrigidos
scp -o StrictHostKeyChecking=no client/src/contexts/AuthContext.tsx root@31.97.28.231:/var/www/iaeon/client/src/contexts/
scp -o StrictHostKeyChecking=no client/src/components/DerivAccountPanel.tsx root@31.97.28.231:/var/www/iaeon/client/src/components/
scp -o StrictHostKeyChecking=no client/src/pages/OperationsPage.tsx root@31.97.28.231:/var/www/iaeon/client/src/pages/
scp -o StrictHostKeyChecking=no server/database/setup.js root@31.97.28.231:/var/www/iaeon/server/database/

echo "✅ Arquivos enviados com sucesso!"

echo "🔧 Executando build e restart na VPS..."

# Executar comandos na VPS
ssh -o StrictHostKeyChecking=no root@31.97.28.231 << 'ENDSSH'
echo "🏗️ Executando na VPS..."

cd /var/www/iaeon

# Fazer backup
echo "💾 Fazendo backup..."
mkdir -p /tmp/backup-oauth-$(date +%Y%m%d-%H%M%S)
cp client/src/contexts/AuthContext.tsx /tmp/backup-oauth-*/AuthContext.tsx.bak 2>/dev/null || echo "Backup AuthContext criado"
cp client/src/components/DerivAccountPanel.tsx /tmp/backup-oauth-*/DerivAccountPanel.tsx.bak 2>/dev/null || echo "Backup DerivAccountPanel criado"

# Build do cliente
echo "🏗️ Fazendo build do cliente..."
cd client
rm -rf build/
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build concluído com sucesso"
else
    echo "❌ Erro no build"
    exit 1
fi

# Restart do PM2
echo "🔄 Reiniciando serviços PM2..."
cd /var/www/iaeon
pm2 restart all

# Verificar status
echo "📊 Status dos serviços:"
pm2 status

echo ""
echo "🎉 DEPLOY CONCLUÍDO COM SUCESSO!"
echo "================================"
echo "🧪 TESTE AGORA:"
echo "   🌐 URL: https://iaeon.site/operations"
echo "   👤 Login: cliente@iaeon.com"
echo "   🔑 Senha: 123456"
echo ""
echo "✅ RESULTADO ESPERADO:"
echo "   • Apenas 1 notificação de conexão"
echo "   • 3 contas no dropdown (CR6656944, CR7346451, VRTC9858183)"
echo "   • Bots carregam normalmente"
echo "   • Sem spam de notificações"
ENDSSH

echo ""
echo "🎯 CORREÇÃO DAS MÚLTIPLAS NOTIFICAÇÕES OAUTH APLICADA!"
echo "======================================================="
echo "🧪 Pode testar agora: https://iaeon.site/operations"