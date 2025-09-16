#!/bin/bash

# Script para deploy das correções de persistência do estado Deriv
# Execute este script manualmente no VPS

echo "🚀 Deploy: Correções de persistência do estado Deriv"
echo "================================================"

# Verificar se estamos no diretório correto
if [ ! -f "/root/app/server/index.js" ]; then
    echo "❌ Erro: Execute este script no VPS como root"
    exit 1
fi

echo "📁 Criando backup do frontend atual..."
cd /root/app
cp -r frontend frontend-backup-$(date +%Y%m%d-%H%M%S)

echo "📦 Baixando nova versão do frontend..."
cd /tmp
if [ -f "client-build-deriv-persist.tar.gz" ]; then
    echo "✅ Arquivo encontrado: client-build-deriv-persist.tar.gz"

    echo "🔄 Extraindo arquivos..."
    rm -rf /root/app/frontend/*
    tar -xzf client-build-deriv-persist.tar.gz -C /root/app/frontend/

    echo "🔧 Ajustando permissões..."
    chown -R root:root /root/app/frontend/
    chmod -R 755 /root/app/frontend/

    echo "🔄 Reiniciando servidor..."
    pm2 restart all

    echo "✅ Deploy concluído!"
    echo ""
    echo "🧪 Teste as seguintes correções:"
    echo "1. Acesse https://iaeon.site/operations"
    echo "2. Faça login se necessário"
    echo "3. Se já tiver Deriv conectado, recarregue a página"
    echo "4. Verifique se o estado 'ONLINE' permanece após reload"
    echo "5. Verifique se as 3 contas aparecem no painel"
    echo ""
    echo "📋 Logs em tempo real:"
    echo "pm2 logs"

else
    echo "❌ Erro: Arquivo client-build-deriv-persist.tar.gz não encontrado em /tmp"
    echo "💡 Para fazer upload do arquivo:"
    echo "1. No computador local, execute:"
    echo "   scp client-build-deriv-persist.tar.gz root@81.19.216.158:/tmp/"
    echo "2. Execute este script novamente"
fi