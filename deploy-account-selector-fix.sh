#!/bin/bash

# Script completo para diagnosticar e corrigir o seletor de contas na VPS
# Usage: ./deploy-account-selector-fix.sh

VPS_HOST="31.97.28.231"
VPS_USER="root"
VPS_PATH="/root/eon"

echo "🔧 DIAGNÓSTICO E CORREÇÃO DO SELETOR DE CONTAS DERIV"
echo "====================================================="

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

echo ""
echo "📋 ETAPA 1: DIAGNÓSTICO INICIAL"
echo "================================"

# 1. Copiar scripts de diagnóstico
echo "1️⃣ Enviando scripts de diagnóstico..."
copy_to_vps "debug-account-info-api.js" "debug-account-info-api.js"
copy_to_vps "check-deriv-accounts-db.sql" "check-deriv-accounts-db.sql"

# 2. Dar permissões
echo "2️⃣ Configurando permissões..."
execute_on_vps "chmod +x debug-account-info-api.js"

# 3. Instalar dependências
echo "3️⃣ Verificando dependências..."
execute_on_vps "npm list pg ws || npm install pg ws"

# 4. Diagnóstico do banco de dados
echo "4️⃣ Executando diagnóstico do banco..."
execute_on_vps "psql -U postgres -d eon_pro -f check-deriv-accounts-db.sql"

# 5. Diagnóstico da API
echo "5️⃣ Executando diagnóstico da API..."
execute_on_vps "node debug-account-info-api.js 1"

echo ""
echo "📋 ETAPA 2: APLICANDO CORREÇÕES"
echo "==============================="

# 6. Backup do arquivo atual
echo "6️⃣ Fazendo backup do arquivo atual..."
execute_on_vps "cp client/src/components/DerivAccountPanel.tsx client/src/components/DerivAccountPanel.tsx.backup.$(date +%Y%m%d_%H%M%S)"

# 7. Aplicar versão melhorada
echo "7️⃣ Aplicando versão melhorada..."
copy_to_vps "DerivAccountPanel-improved.tsx" "client/src/components/DerivAccountPanel.tsx"

# 8. Build do frontend
echo "8️⃣ Construindo frontend..."
execute_on_vps "cd client && npm run build"

# 9. Verificar se o serviço precisa ser reiniciado
echo "9️⃣ Verificando status do serviço..."
execute_on_vps "sudo systemctl status eon-server --no-pager -l"

echo ""
echo "📋 ETAPA 3: VERIFICAÇÃO FINAL"
echo "============================"

# 10. Verificar logs do serviço
echo "🔍 Verificando logs recentes..."
execute_on_vps "sudo journalctl -u eon-server --since='1 minute ago' --no-pager"

echo ""
echo "✅ DEPLOYMENT CONCLUÍDO!"
echo "========================"

echo ""
echo "🎯 PRÓXIMOS PASSOS:"
echo "1. Acesse a aplicação e teste o seletor de contas"
echo "2. Verifique se múltiplas contas aparecem (se disponíveis)"
echo "3. Teste a troca entre contas virtual e real"
echo "4. Se ainda houver problemas, analise os logs de diagnóstico acima"

echo ""
echo "📋 COMANDOS ÚTEIS PARA DEBUG:"
echo "• Ver logs em tempo real: sudo journalctl -u eon-server -f"
echo "• Reiniciar serviço: sudo systemctl restart eon-server"
echo "• Verificar banco: psql -U postgres -d eon_pro -c \"SELECT deriv_account_id, deriv_accounts_tokens FROM users WHERE deriv_connected = true;\""
echo "• Testar endpoint: curl -H \"Authorization: Bearer \$TOKEN\" http://localhost:3000/api/auth/deriv/account-info"

echo ""
echo "🔍 INTERPRETAÇÃO DOS RESULTADOS:"
echo "• Se deriv_accounts_tokens está vazio → usuário precisa reconectar conta"
echo "• Se há apenas 1 conta → comportamento normal, melhor UX aplicado"
echo "• Se há múltiplas contas → seletor deve mostrar todas agora"
echo "• Se ainda não funciona → problema pode ser no token OAuth ou permissões"

echo ""
echo "📝 ARQUIVOS MODIFICADOS:"
echo "• /root/eon/client/src/components/DerivAccountPanel.tsx (melhorado)"
echo "• Backup criado em: DerivAccountPanel.tsx.backup.[timestamp]"