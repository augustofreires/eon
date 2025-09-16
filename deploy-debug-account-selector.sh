#!/bin/bash

# Script para enviar e executar debugging na VPS do seletor de contas
# Usage: ./deploy-debug-account-selector.sh

VPS_HOST="31.97.28.231"
VPS_USER="root"
VPS_PATH="/root/eon"

echo "🚀 Deploy Debug Script para VPS"
echo "================================"

# Função para copiar arquivos para VPS
copy_to_vps() {
    local local_file="$1"
    local remote_file="$2"

    echo "📋 Copiando $local_file para VPS..."
    scp "$local_file" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/${remote_file}"

    if [ $? -eq 0 ]; then
        echo "✅ Arquivo copiado com sucesso!"
    else
        echo "❌ Erro ao copiar arquivo"
        exit 1
    fi
}

# Função para executar comandos na VPS
execute_on_vps() {
    local cmd="$1"
    echo "🔧 Executando: $cmd"
    ssh "${VPS_USER}@${VPS_HOST}" "cd ${VPS_PATH} && $cmd"
}

# 1. Copiar script de debug
echo "1️⃣ Enviando script de debug..."
copy_to_vps "debug-account-info-api.js" "debug-account-info-api.js"

# 2. Dar permissão de execução
echo "2️⃣ Configurando permissões..."
execute_on_vps "chmod +x debug-account-info-api.js"

# 3. Instalar dependências se necessário
echo "3️⃣ Verificando dependências..."
execute_on_vps "npm list pg ws || npm install pg ws"

# 4. Executar debug
echo "4️⃣ Executando debug do account-info..."
execute_on_vps "node debug-account-info-api.js 1"

echo ""
echo "🎯 PRÓXIMOS PASSOS:"
echo "1. Analise o output acima para identificar o problema"
echo "2. Se deriv_accounts_tokens está vazio, o usuário precisa reconectar a conta"
echo "3. Se há apenas 1 conta, verifique se o usuário tem conta virtual E real"
echo "4. Se há múltiplas contas mas seletor não mostra, problema está no frontend"

echo ""
echo "📋 COMANDOS ÚTEIS NA VPS:"
echo "• Verificar logs: sudo journalctl -u eon-server -f"
echo "• Verificar dados do banco: psql -U postgres -d eon_pro -c \"SELECT deriv_account_id, deriv_accounts_tokens FROM users WHERE id = 1;\""
echo "• Testar endpoint: curl -H \"Authorization: Bearer TOKEN\" http://localhost:3000/api/auth/deriv/account-info"