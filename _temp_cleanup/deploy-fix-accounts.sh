#!/bin/bash

# Script para fazer deploy da correção das contas Deriv
# Execute este script na VPS como root

echo "🚀 Iniciando deploy da correção das contas Deriv..."

# Parar os serviços
echo "⏹️ Parando serviços..."
pm2 stop all

# Fazer backup do build atual
echo "💾 Fazendo backup do build atual..."
cd /home/deriv-bots/client
cp -r build build_backup_$(date +%Y%m%d_%H%M%S)

# Baixar a correção (você precisa fazer upload do arquivo client-build-all-accounts.tar.gz para /root/)
echo "📥 Aplicando correção..."
rm -rf build/*
cd /root
tar -xzf client-build-all-accounts.tar.gz -C /home/deriv-bots/client/build/

# Verificar se o deploy foi bem-sucedido
echo "✅ Verificando deploy..."
if [ -f "/home/deriv-bots/client/build/index.html" ]; then
    echo "✅ Deploy realizado com sucesso!"

    # Reiniciar serviços
    echo "🔄 Reiniciando serviços..."
    pm2 restart all

    echo "🎉 Deploy concluído! O painel agora deve mostrar todas as contas disponíveis."
else
    echo "❌ Erro no deploy! Restaurando backup..."
    cd /home/deriv-bots/client
    rm -rf build/*
    cp -r build_backup_*/. build/
    pm2 restart all
    echo "🔄 Backup restaurado."
fi

echo "📊 Status dos serviços:"
pm2 status