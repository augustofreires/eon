#!/bin/bash

# Script para testar o endpoint fetch-all-accounts diretamente
# Obter JWT token do usuário logado

echo "🔍 Testando endpoint /fetch-all-accounts..."

# Fazer login primeiro para obter token (simular)
echo "📋 Para obter o JWT token:"
echo "1. Acesse https://iaeon.site"
echo "2. Faça login"
echo "3. Abra DevTools > Application > LocalStorage"
echo "4. Copie o valor de 'token'"
echo ""

# Se você passar o token como argumento
if [ -n "$1" ]; then
    JWT_TOKEN="$1"
    echo "🔑 Usando token fornecido: ${JWT_TOKEN:0:20}..."

    echo "🚀 Fazendo requisição..."
    curl -X POST "https://iaeon.site/api/auth/deriv/fetch-all-accounts" \
         -H "Content-Type: application/json" \
         -H "Authorization: Bearer $JWT_TOKEN" \
         -d '{}' \
         -v \
         2>&1 | tee fetch-accounts-response.log

    echo ""
    echo "📄 Resposta salva em: fetch-accounts-response.log"
else
    echo "❌ Usage: $0 <JWT_TOKEN>"
    echo "Exemplo: $0 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
fi