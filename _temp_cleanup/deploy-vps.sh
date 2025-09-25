#!/bin/bash

# Script de deploy para VPS
# Execute como: ./deploy-vps.sh

echo "🚀 Iniciando deploy da plataforma Deriv Bots..."

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Função para log colorido
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar se está na pasta correta
if [ ! -f "package.json" ]; then
    log_error "Execute este script na pasta raiz do projeto!"
    exit 1
fi

log_info "1. Fazendo build do frontend..."
cd client
npm run build
if [ $? -ne 0 ]; then
    log_error "Falha no build do frontend!"
    exit 1
fi
cd ..

log_info "2. Copiando configuração do Nginx..."
# Você precisa executar estes comandos na sua VPS:
echo ""
log_warning "Execute estes comandos na sua VPS:"
echo ""
echo "# 1. Copiar configuração do Nginx:"
echo "sudo cp /path/to/your/project/nginx.conf /etc/nginx/sites-available/deriv-bots"
echo ""
echo "# 2. Habilitar o site:"
echo "sudo ln -sf /etc/nginx/sites-available/deriv-bots /etc/nginx/sites-enabled/"
echo ""
echo "# 3. Remover configuração padrão (se existir):"
echo "sudo rm -f /etc/nginx/sites-enabled/default"
echo ""
echo "# 4. Testar configuração do Nginx:"
echo "sudo nginx -t"
echo ""
echo "# 5. Recarregar Nginx:"
echo "sudo systemctl reload nginx"
echo ""
echo "# 6. Copiar build do frontend:"
echo "sudo mkdir -p /var/www/html/deriv-bots"
echo "sudo cp -r client/build/* /var/www/html/deriv-bots/"
echo "sudo chown -R www-data:www-data /var/www/html/deriv-bots"
echo ""
echo "# 7. Copiar variáveis de ambiente do servidor:"
echo "cp .env.vps server/.env"
echo ""
echo "# 8. Instalar dependências do servidor (se necessário):"
echo "cd server && npm install --production"
echo ""
echo "# 9. Reiniciar aplicação (usando PM2):"
echo "pm2 restart deriv-bots-api || pm2 start index.js --name deriv-bots-api"
echo ""

log_info "3. Build concluído!"
log_info "Arquivos estão em: client/build/"
log_info "Configure o Nginx seguindo os comandos acima na sua VPS."

echo ""
log_warning "IMPORTANTE:"
echo "- Execute os comandos acima na sua VPS"
echo "- Verifique se o PostgreSQL está rodando"
echo "- Verifique se as portas 80 e 5001 estão liberadas no firewall"
echo "- Teste o login após aplicar as configurações"