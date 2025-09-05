#!/bin/bash

# Script de deploy automatizado via GitHub
# Execute na sua VPS: ./deploy-github.sh

set -e  # Para em caso de erro

# Configurações
REPO_URL="https://github.com/augustofreires/eon.git"
PROJECT_DIR="/var/www/deriv-bots"
NGINX_SITE="/etc/nginx/sites-available/deriv-bots"
WEB_ROOT="/var/www/html/deriv-bots"

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
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

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

echo "🚀 Deploy automatizado - Deriv Bots Platform"
echo "=============================================="

# Verificar se está rodando como root ou com sudo
if [[ $EUID -ne 0 ]]; then
   log_error "Execute este script com sudo: sudo ./deploy-github.sh"
   exit 1
fi

log_step "1. Parando serviços..."
systemctl stop nginx || log_warning "Nginx não estava rodando"
pm2 stop deriv-bots-api || log_warning "App não estava rodando no PM2"

log_step "2. Fazendo backup (se existir)..."
if [ -d "$PROJECT_DIR" ]; then
    mv "$PROJECT_DIR" "${PROJECT_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
    log_info "Backup criado: ${PROJECT_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
fi

log_step "3. Clonando repositório..."
git clone "$REPO_URL" "$PROJECT_DIR"
cd "$PROJECT_DIR"

log_step "4. Configurando permissões..."
chown -R www-data:www-data "$PROJECT_DIR"

log_step "5. Instalando dependências do servidor..."
cd "$PROJECT_DIR/server"
npm install --production

log_step "6. Instalando dependências do cliente..."
cd "$PROJECT_DIR/client"
npm install

log_step "7. Fazendo build do frontend..."
npm run build

log_step "8. Configurando Nginx..."
cp "$PROJECT_DIR/nginx.conf" "$NGINX_SITE"
ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testar configuração do Nginx
if nginx -t; then
    log_info "Configuração do Nginx OK"
else
    log_error "Erro na configuração do Nginx"
    exit 1
fi

log_step "9. Copiando arquivos do frontend..."
mkdir -p "$WEB_ROOT"
cp -r "$PROJECT_DIR/client/build/"* "$WEB_ROOT/"
chown -R www-data:www-data "$WEB_ROOT"

log_step "10. Configurando variáveis de ambiente..."
cd "$PROJECT_DIR/server"
cp "../.env.vps" ".env"

log_step "11. Configurando banco de dados (se necessário)..."
# Se você tem script de criação de DB
if [ -f "create-db.js" ]; then
    log_info "Executando script de criação do banco..."
    node create-db.js || log_warning "Script de DB falhou ou já existe"
fi

log_step "12. Iniciando serviços..."
systemctl start nginx
systemctl enable nginx

cd "$PROJECT_DIR/server"
pm2 start index.js --name deriv-bots-api
pm2 save
pm2 startup

log_step "13. Configurando firewall (se necessário)..."
ufw allow 80/tcp || log_warning "UFW não configurado"
ufw allow 22/tcp || log_warning "UFW não configurado"

echo ""
echo "🎉 Deploy concluído com sucesso!"
echo "================================="
log_info "Site: http://afiliagreen.com.br"
log_info "API Health: http://afiliagreen.com.br/api/health"
log_info "Logs Nginx: /var/log/nginx/deriv-bots.*.log"
log_info "PM2 Status: pm2 status"

echo ""
log_warning "Próximos passos:"
echo "1. Verifique se o PostgreSQL está rodando"
echo "2. Teste o login na interface"
echo "3. Crie um usuário admin se necessário"
echo ""
echo "Para atualizações futuras, execute:"
echo "cd $PROJECT_DIR && git pull && ./deploy-update.sh"