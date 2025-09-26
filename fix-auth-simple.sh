#!/bin/bash

# Script simples para corrigir autenticação PostgreSQL
# Alternativa ao script Python para usuários sem paramiko

set -e

# Configurações
VPS_HOST="31.97.28.231"
VPS_USER="root"
VPS_PASS="62uDLW4RJ9ae28EPVfp5yzT##"
EMAIL="admin@iaeon.com"
PASSWORD="admin123"
DATABASE="eon_platform"

echo "🚀 Iniciando correção de autenticação PostgreSQL"
echo "================================================"

# Função para executar comandos via SSH
ssh_exec() {
    sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" "$1"
}

# 1. Gerar hash bcrypt localmente (mais seguro)
echo "🔑 Gerando hash bcrypt para password..."
NEW_HASH=$(python3 -c "
import bcrypt
password = '$PASSWORD'
salt = bcrypt.gensalt(rounds=12)
hash_bytes = bcrypt.hashpw(password.encode('utf-8'), salt)
print(hash_bytes.decode('utf-8'))
")

echo "📝 Hash gerado: ${NEW_HASH:0:20}..."

# 2. Verificar conexão SSH
echo "🔗 Testando conexão SSH..."
if ! ssh_exec "echo 'Conexão SSH funcionando'"; then
    echo "❌ Falha na conexão SSH"
    exit 1
fi

# 3. Verificar PostgreSQL
echo "🔍 Verificando PostgreSQL..."
ssh_exec "sudo systemctl status postgresql --no-pager | head -5"

# 4. Atualizar password no banco
echo "🔐 Atualizando password no banco..."
SSH_COMMAND="sudo -u postgres psql -d $DATABASE -c \"UPDATE users SET password_hash = '$NEW_HASH' WHERE email = '$EMAIL';\""

if ssh_exec "$SSH_COMMAND"; then
    echo "✅ Password atualizado com sucesso"
else
    echo "❌ Erro ao atualizar password"
    exit 1
fi

# 5. Verificar atualização
echo "🔍 Verificando atualização..."
ssh_exec "sudo -u postgres psql -d $DATABASE -c \"SELECT email, LEFT(password_hash, 20) as hash_preview FROM users WHERE email = '$EMAIL';\""

# 6. Reiniciar servidor Node.js
echo "🔄 Reiniciando servidor..."
ssh_exec "pkill -f 'node.*server' || true"
sleep 2
ssh_exec "cd /root/eon && nohup node server/index.js > server.log 2>&1 &"
sleep 3

# 7. Verificar se servidor iniciou
echo "🖥️ Verificando status do servidor..."
ssh_exec "ps aux | grep node | grep -v grep | head -5"

# 8. Testar login local
echo "🧪 Testando login local..."
LOGIN_RESPONSE=$(ssh_exec "curl -s -X POST http://localhost:5000/api/auth/login -H 'Content-Type: application/json' -d '{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}'")

echo "📄 Resposta local: $LOGIN_RESPONSE"

# 9. Testar login externo
echo "🌐 Testando login externo..."
EXTERNAL_RESPONSE=$(ssh_exec "curl -s -X POST https://iaeon.site/api/auth/login -H 'Content-Type: application/json' -d '{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}'")

echo "📄 Resposta externa: $EXTERNAL_RESPONSE"

# 10. Verificar logs em caso de erro
if [[ "$EXTERNAL_RESPONSE" == *"token"* ]]; then
    echo "🎉 SUCESSO! Login funcionando corretamente"
else
    echo "🔍 Verificando logs do servidor..."
    ssh_exec "cd /root/eon && tail -20 server.log 2>/dev/null || echo 'Sem server.log'"
fi

echo ""
echo "================================================"
echo "✅ Processo concluído"
echo "🔐 Credenciais: $EMAIL / $PASSWORD"
echo "🌐 URL: https://iaeon.site"