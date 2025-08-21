#!/bin/bash

echo "🚀 Instalando Plataforma de Bots Deriv..."
echo "=========================================="

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Por favor, instale o Node.js primeiro."
    exit 1
fi

# Verificar se o npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ npm não encontrado. Por favor, instale o npm primeiro."
    exit 1
fi

echo "✅ Node.js e npm encontrados"

# Verificar se o PostgreSQL está instalado
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL não encontrado. Você precisará instalá-lo manualmente."
    echo "   Instruções: https://www.postgresql.org/download/"
fi

# Instalar dependências do projeto principal
echo "📦 Instalando dependências do projeto principal..."
npm install

# Instalar dependências do servidor
echo "📦 Instalando dependências do servidor..."
cd server
npm install
cd ..

# Instalar dependências do cliente
echo "📦 Instalando dependências do cliente..."
cd client
npm install
cd ..

# Criar arquivo .env se não existir
if [ ! -f .env ]; then
    echo "🔧 Criando arquivo .env..."
    cp env.example .env
    echo "✅ Arquivo .env criado. Configure as variáveis de ambiente antes de executar."
fi

# Criar diretório de uploads
echo "📁 Criando diretório de uploads..."
mkdir -p server/uploads

echo ""
echo "✅ Instalação concluída!"
echo ""
echo "📋 Próximos passos:"
echo "1. Configure o arquivo .env com suas credenciais"
echo "2. Configure o banco de dados PostgreSQL"
echo "3. Execute: npm run setup-db"
echo "4. Execute: npm run dev"
echo ""
echo "🔧 Configuração do .env:"
echo "- DATABASE_URL: URL do seu banco PostgreSQL"
echo "- JWT_SECRET: Chave secreta para JWT"
echo "- DERIV_APP_ID: ID da sua aplicação Deriv"
echo "- DERIV_OAUTH_URL: URL OAuth da Deriv"
echo ""
echo "🌐 URLs padrão:"
echo "- Frontend: http://localhost:3000"
echo "- Backend: http://localhost:5000"
echo "- Admin padrão: admin@derivbots.com / admin123456" 