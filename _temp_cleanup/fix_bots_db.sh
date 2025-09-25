#!/bin/bash

# Script para corrigir banco de dados de bots
echo "🔧 Corrigindo banco de dados de bots..."

# Conectar via SSH e executar comandos
sshpass -p '62uDLW4RJ9ae28EPVfp5yzT##' ssh -o StrictHostKeyChecking=no root@31.97.28.231 << 'ENDSSH'

# Verificar status do banco
echo "📊 Verificando status atual da tabela bots..."
sudo -u postgres psql -d eon_pro -c "\d bots"

echo "📋 Verificando dados atuais na tabela bots..."
sudo -u postgres psql -d eon_pro -c "SELECT COUNT(*) as total_bots FROM bots;"

echo "📝 Verificando se coluna description existe..."
sudo -u postgres psql -d eon_pro -c "SELECT column_name FROM information_schema.columns WHERE table_name='bots' AND column_name='description';"

# Se a tabela existe mas está com schema incorreto, vamos adicionar a coluna description
echo "✅ Adicionando coluna description se não existir..."
sudo -u postgres psql -d eon_pro -c "ALTER TABLE bots ADD COLUMN IF NOT EXISTS description TEXT;"

# Verificar schema atualizado
echo "📊 Schema atualizado da tabela bots:"
sudo -u postgres psql -d eon_pro -c "\d bots"

# Inserir bots padrão se não existirem
echo "🤖 Inserindo bots padrão..."

# Bot 1: Bot Martingale
sudo -u postgres psql -d eon_pro -c "
INSERT INTO bots (name, description, xml_content, xml_filename, is_active, created_by)
SELECT
  'Bot Martingale',
  'Bot avançado com estratégia Martingale para operações automatizadas. Aumenta progressivamente o valor das apostas após perdas para recuperar rapidamente.',
  '<?xml version=\"1.0\" encoding=\"UTF-8\"?><xml xmlns=\"http://www.w3.org/1999/xhtml\"><block type=\"trade\" id=\"1\"><field name=\"MARKET\">synthetic_indices</field><field name=\"TRADETYPE\">callput</field><field name=\"CONTRACT_TYPE\">rise_fall</field></block></xml>',
  'bot-martingale.xml',
  true,
  1
WHERE NOT EXISTS (SELECT 1 FROM bots WHERE name = 'Bot Martingale');
"

# Bot 2: Bot Max Take
sudo -u postgres psql -d eon_pro -c "
INSERT INTO bots (name, description, xml_content, xml_filename, is_active, created_by)
SELECT
  'Bot Max Take',
  'Bot inteligente com gestão de risco avançada. Utiliza estratégia de take profit máximo para otimizar ganhos e minimizar perdas em operações de trading.',
  '<?xml version=\"1.0\" encoding=\"UTF-8\"?><xml xmlns=\"http://www.w3.org/1999/xhtml\"><block type=\"trade\" id=\"2\"><field name=\"MARKET\">synthetic_indices</field><field name=\"TRADETYPE\">callput</field><field name=\"CONTRACT_TYPE\">higher_lower</field></block></xml>',
  'bot-max-take.xml',
  true,
  1
WHERE NOT EXISTS (SELECT 1 FROM bots WHERE name = 'Bot Max Take');
"

# Bot 3: cc
sudo -u postgres psql -d eon_pro -c "
INSERT INTO bots (name, description, xml_content, xml_filename, is_active, created_by)
SELECT
  'cc',
  'Bot personalizado com algoritmos de análise técnica. Executa operações baseadas em indicadores customizados para maximizar precisão nas entradas.',
  '<?xml version=\"1.0\" encoding=\"UTF-8\"?><xml xmlns=\"http://www.w3.org/1999/xhtml\"><block type=\"trade\" id=\"3\"><field name=\"MARKET\">synthetic_indices</field><field name=\"TRADETYPE\">callput</field><field name=\"CONTRACT_TYPE\">touch_notouch</field></block></xml>',
  'bot-cc.xml',
  true,
  1
WHERE NOT EXISTS (SELECT 1 FROM bots WHERE name = 'cc');
"

echo "✅ Verificando bots inseridos..."
sudo -u postgres psql -d eon_pro -c "SELECT id, name, description, is_active FROM bots ORDER BY id;"

echo "🔄 Reiniciando serviço PM2..."
cd /root/eon
pm2 restart all

echo "🌐 Testando API endpoint..."
sleep 3
curl -s http://localhost:3000/api/bots | head -200

echo "📊 Status final do PM2..."
pm2 status

ENDSSH

echo "✅ Correção concluída!"