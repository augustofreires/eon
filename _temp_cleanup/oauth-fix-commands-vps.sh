#!/bin/bash

# 🎯 Comandos para executar NA VPS após transferir os arquivos
# Execute este script DENTRO da VPS em /var/www/iaeon

echo "🎯 CORREÇÃO OAUTH - Comandos para VPS"
echo "======================================"

echo "📍 Verificando diretório atual..."
pwd

echo "💾 Fazendo backup dos arquivos atuais..."
mkdir -p /tmp/backup-oauth-fix-$(date +%Y%m%d-%H%M%S)
cp -r client/src/contexts/AuthContext.tsx /tmp/backup-oauth-fix-$(date +%Y%m%d-%H%M%S)/ 2>/dev/null || echo "AuthContext.tsx não existe"
cp -r client/src/components/DerivAccountPanel.tsx /tmp/backup-oauth-fix-$(date +%Y%m%d-%H%M%S)/ 2>/dev/null || echo "DerivAccountPanel.tsx não existe"
cp -r client/src/pages/OperationsPage.tsx /tmp/backup-oauth-fix-$(date +%Y%m%d-%H%M%S)/ 2>/dev/null || echo "OperationsPage.tsx não existe"

echo "🏗️ Fazendo build do cliente..."
cd client

# Limpar build anterior
rm -rf build/

# Instalar dependências se necessário
echo "📦 Verificando dependências..."
npm install

# Build
echo "🔨 Compilando React..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build do cliente concluído com sucesso"
else
    echo "❌ Erro no build do cliente"
    exit 1
fi

echo "🔄 Reiniciando serviços..."
cd /var/www/iaeon

# Restart PM2
pm2 restart all

# Verificar status
echo "📊 Status dos serviços:"
pm2 status

echo ""
echo "🎉 DEPLOY CONCLUÍDO!"
echo "==================="
echo "🧪 TESTE AGORA:"
echo "   URL: https://iaeon.site/operations"
echo "   Login: cliente@iaeon.com"
echo "   Senha: 123456"
echo ""
echo "✅ RESULTADO ESPERADO:"
echo "   - Apenas 1 notificação de conexão"
echo "   - 3 contas no dropdown"
echo "   - Bots carregam normalmente"