#!/bin/bash

echo "🔍 DIAGNÓSTICO POSTGRESQL VPS - DERIV BOTS PLATFORM"
echo "=================================================="
echo "VPS: 31.97.28.231"
echo "Data: $(date)"
echo ""

echo "1. 🔧 VERIFICANDO CONFIGURAÇÕES DE AMBIENTE"
echo "--------------------------------------------"
echo "📁 Localização do projeto:"
pwd
ls -la

echo ""
echo "📄 Verificando arquivo .env:"
if [ -f ".env" ]; then
    echo "✅ Arquivo .env encontrado"
    echo "🔍 Configurações PostgreSQL:"
    grep -E "(DATABASE_URL|DB_HOST|NODE_ENV|POSTGRES)" .env || echo "❌ Nenhuma configuração PostgreSQL encontrada"
else
    echo "❌ Arquivo .env NÃO encontrado"
    echo "🔍 Procurando arquivos .env em subpastas:"
    find . -name ".env" -type f 2>/dev/null
fi

echo ""
echo "2. 🐘 VERIFICANDO POSTGRESQL"
echo "----------------------------"
echo "📊 Status do PostgreSQL:"
sudo systemctl status postgresql --no-pager -l

echo ""
echo "🔌 Verificando se PostgreSQL está rodando:"
ps aux | grep postgres | head -5

echo ""
echo "📡 Portas PostgreSQL ativas:"
netstat -tlnp | grep 5432 || echo "❌ PostgreSQL não está escutando na porta 5432"

echo ""
echo "3. 🔑 TESTANDO CONEXÃO POSTGRESQL"
echo "----------------------------------"
echo "🧪 Tentativa de conexão como postgres:"
sudo -u postgres psql -c "SELECT version();" 2>&1 || echo "❌ Falha na conexão PostgreSQL"

echo ""
echo "📋 Listando bancos de dados:"
sudo -u postgres psql -c "\l" 2>&1 || echo "❌ Não foi possível listar bancos"

echo ""
echo "4. 🗃️ VERIFICANDO BANCO DERIV_BOTS_DB"
echo "------------------------------------"
echo "🔍 Verificando se banco deriv_bots_db existe:"
DBEXISTS=$(sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -w deriv_bots_db | wc -l)
if [ $DBEXISTS -eq 1 ]; then
    echo "✅ Banco deriv_bots_db encontrado"

    echo ""
    echo "📊 Tabelas no banco deriv_bots_db:"
    sudo -u postgres psql -d deriv_bots_db -c "\dt" 2>&1

    echo ""
    echo "🔍 Verificando estrutura da tabela users:"
    sudo -u postgres psql -d deriv_bots_db -c "\d users" 2>&1

    echo ""
    echo "🧪 Verificando coluna deriv_accounts_tokens:"
    sudo -u postgres psql -d deriv_bots_db -c "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'users' AND column_name LIKE '%deriv%';" 2>&1

    echo ""
    echo "📈 Contando registros nas tabelas principais:"
    sudo -u postgres psql -d deriv_bots_db -c "SELECT 'users' as tabela, count(*) as registros FROM users UNION SELECT 'bots', count(*) FROM bots UNION SELECT 'operations', count(*) FROM operations;" 2>&1

    echo ""
    echo "🔐 Verificando usuários com tokens Deriv:"
    sudo -u postgres psql -d deriv_bots_db -c "SELECT id, email, deriv_connected, LENGTH(deriv_accounts_tokens) as tokens_length FROM users WHERE deriv_accounts_tokens IS NOT NULL;" 2>&1

else
    echo "❌ Banco deriv_bots_db NÃO encontrado"
    echo "📋 Bancos disponíveis:"
    sudo -u postgres psql -l
fi

echo ""
echo "5. 🌐 VERIFICANDO APLICAÇÃO NODE.JS"
echo "-----------------------------------"
echo "📊 Processos Node.js em execução:"
ps aux | grep node | grep -v grep || echo "❌ Nenhum processo Node.js encontrado"

echo ""
echo "🔌 Portas da aplicação ativas:"
netstat -tlnp | grep :5000 || echo "ℹ️ Aplicação não está rodando na porta 5000"
netstat -tlnp | grep :3000 || echo "ℹ️ Aplicação não está rodando na porta 3000"

echo ""
echo "📁 Verificando estrutura do projeto:"
if [ -d "server" ]; then
    echo "✅ Pasta server encontrada"
    ls -la server/

    echo ""
    echo "📄 Verificando arquivos de configuração do banco:"
    ls -la server/database/ 2>/dev/null || echo "❌ Pasta server/database não encontrada"

    echo ""
    echo "📦 Verificando package.json:"
    if [ -f "package.json" ]; then
        echo "✅ package.json encontrado"
        grep -A 5 -B 5 "pg\|postgres" package.json || echo "ℹ️ Dependência PostgreSQL não encontrada no package.json"
    fi
else
    echo "❌ Pasta server não encontrada"
    echo "📁 Conteúdo do diretório atual:"
    ls -la
fi

echo ""
echo "6. 📋 LOGS E DEBUGGING"
echo "----------------------"
echo "🔍 Últimos logs do sistema:"
journalctl -n 20 --no-pager | grep -E "(postgres|node|error)" || echo "ℹ️ Nenhum log relevante encontrado"

echo ""
echo "📊 Memória e CPU:"
free -h
top -bn1 | head -5

echo ""
echo "🔚 RESUMO DO DIAGNÓSTICO"
echo "========================"
echo "✅ Execute este script e envie a saída completa"
echo "📧 Informações coletadas ajudarão a identificar o problema"
echo "🔧 Próximos passos serão baseados nos resultados"

echo ""
echo "💡 COMANDOS ADICIONAIS PARA TESTE MANUAL:"
echo "-------------------------------------------"
echo "# Testar conexão direta ao PostgreSQL:"
echo "sudo -u postgres psql -d deriv_bots_db -c 'SELECT COUNT(*) FROM users;'"
echo ""
echo "# Verificar usuário específico:"
echo "sudo -u postgres psql -d deriv_bots_db -c 'SELECT email, deriv_connected, deriv_accounts_tokens FROM users LIMIT 5;'"
echo ""
echo "# Criar banco se não existir:"
echo "sudo -u postgres createdb deriv_bots_db"
echo ""
echo "# Executar setup do banco (se necessário):"
echo "cd /path/to/project && node server/database/setup.js"