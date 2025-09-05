#!/bin/bash

# Script para atualizar a aplicação (após primeira instalação)
# Execute na VPS: sudo ./deploy-update.sh

set -e

# Configurações
PROJECT_DIR="/var/www/deriv-bots"
WEB_ROOT="/var/www/html/deriv-bots"

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

echo "🔄 Atualizando Deriv Bots Platform..."
echo "===================================="

cd "$PROJECT_DIR"

log_step "1. Fazendo pull das últimas alterações..."
git pull origin main

log_step "2. Atualizando dependências do servidor..."
cd server
npm install --production

log_step "3. Atualizando dependências do cliente..."
cd ../client
npm install

log_step "4. Fazendo novo build..."
npm run build

log_step "5. Atualizando arquivos do frontend..."
rm -rf "$WEB_ROOT"/*
cp -r build/* "$WEB_ROOT/"
chown -R www-data:www-data "$WEB_ROOT"

log_step "6. Atualizando configuração do servidor..."
cd ../server
cp ../.env.vps .env

log_step "7. Reiniciando serviços..."
pm2 restart deriv-bots-api
nginx -s reload

echo ""
echo "✅ Atualização concluída!"
log_info "Verifique: http://afiliagreen.com.br"