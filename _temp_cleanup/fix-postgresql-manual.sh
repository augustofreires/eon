#!/bin/bash

echo "🚀 APLICANDO CORREÇÕES POSTGRESQL PARA EON TRADING PLATFORM..."
cd /root/eon

# Criar script SQL para adicionar colunas faltantes
echo "📝 Criando script de correção SQL..."
cat > fix_postgresql_schema.sql << 'EOF'
-- Adicionar colunas faltantes à tabela deriv_config
ALTER TABLE deriv_config ADD COLUMN IF NOT EXISTS affiliate_link TEXT;

-- Adicionar colunas faltantes à tabela bots
ALTER TABLE bots ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Adicionar colunas faltantes à tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT;

-- Inserir dados padrão se não existirem
INSERT INTO deriv_config (user_id, app_id, api_token, is_active, affiliate_link)
SELECT 1, '82349', 'default_token', true, 'https://deriv.com/?a=82349'
WHERE NOT EXISTS (SELECT 1 FROM deriv_config WHERE user_id = 1);
EOF

echo "🔧 Aplicando correções no banco de dados..."
sudo -u postgres psql -d eon_platform -f fix_postgresql_schema.sql

echo "🔍 Verificando estrutura do banco..."
echo "=== TABELA DERIV_CONFIG ==="
sudo -u postgres psql -d eon_platform -c '\d+ deriv_config'

echo "=== TABELA BOTS ==="
sudo -u postgres psql -d eon_platform -c '\d+ bots'

echo "📊 Verificando dados..."
echo "=== CONTAGEM DE REGISTROS ==="
sudo -u postgres psql -d eon_platform -c 'SELECT
  (SELECT COUNT(*) FROM users) as users_count,
  (SELECT COUNT(*) FROM bots) as bots_count,
  (SELECT COUNT(*) FROM deriv_config) as deriv_config_count;'

echo "🔄 Reiniciando servidor..."
pm2 restart iaeon-server
sleep 5

echo "📋 Verificando logs do servidor..."
pm2 logs iaeon-server --lines 15

echo "🧪 Testando endpoints..."
echo "=== TESTE AFFILIATE LINK ==="
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/auth/deriv-affiliate-link)
echo "Status Code: $HTTP_CODE"

echo "=== TESTE BOTS ENDPOINT ==="
curl -s http://localhost:5000/api/bots | head -50

echo ""
echo "✅ PROCESSO CONCLUÍDO!"
echo "📝 Próximos passos:"
echo "   1. Verifique se os endpoints retornam 200 em vez de 500"
echo "   2. Teste o frontend para ver se os bots carregam"
echo "   3. Verifique se o saldo da conta Deriv aparece"