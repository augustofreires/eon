#!/bin/bash

# SCRIPT PARA TESTAR OAUTH DEBUG DA DERIV
#
# Este script:
# 1. Reinicia o servidor com logs detalhados
# 2. Mostra como usar o debug do OAuth callback
# 3. Testa a nova funcionalidade de múltiplas contas

echo "🚀 TESTANDO OAUTH DEBUG DA DERIV"
echo "================================="

echo ""
echo "📋 ARQUIVOS MODIFICADOS:"
echo "✅ server/routes/auth.js - Callback OAuth melhorado"
echo "✅ debug-oauth-callback.js - Script de debug"
echo "✅ test-oauth-debug.sh - Este script"

echo ""
echo "🔧 PRINCIPAIS MELHORIAS:"
echo "• Debugging completo do callback OAuth"
echo "• Suporte para cur1 E curr1 (formato duplo r)"
echo "• Detecção melhorada de contas Virtual vs Real"
echo "• Função para buscar múltiplas contas via API"
echo "• Switch entre contas com tokens individuais"

echo ""
echo "📖 COMO TESTAR:"
echo "1. Execute 'pm2 restart server' ou 'npm run dev'"
echo "2. Faça OAuth da Deriv no app"
echo "3. Verifique os logs detalhados no console"
echo "4. Use o script debug-oauth-callback.js se necessário"

echo ""
echo "🔍 EXEMPLO DE USO DO DEBUG:"
echo "node debug-oauth-callback.js \"https://iaeon.site/operations?acct1=CR123&token1=a1-xyz&cur1=USD&acct2=VR456&token2=a1-abc&cur2=USD\""

echo ""
echo "📊 ENDPOINTS NOVOS/MODIFICADOS:"
echo "• GET  /auth/deriv/callback - Callback melhorado"
echo "• POST /auth/deriv/fetch-all-accounts - Buscar múltiplas contas"
echo "• POST /auth/deriv/switch-account - Switch melhorado"

# Verificar se PM2 está rodando
if command -v pm2 &> /dev/null; then
    echo ""
    echo "🔄 REINICIANDO SERVIDOR COM PM2..."
    pm2 restart server || echo "❌ Falha ao reiniciar com PM2"
    echo "📝 Para ver logs: pm2 logs server"
else
    echo ""
    echo "ℹ️  PM2 não encontrado. Execute manualmente:"
    echo "   cd server && npm run dev"
fi

echo ""
echo "🎯 PRÓXIMOS PASSOS:"
echo "1. Teste com usuário que tem contas Virtual E Real"
echo "2. Verifique se múltiplas contas aparecem nos logs"
echo "3. Teste switch entre contas"
echo "4. Verifique se tokens diferentes são usados"

echo ""
echo "================================="
echo "✅ SETUP COMPLETO!"