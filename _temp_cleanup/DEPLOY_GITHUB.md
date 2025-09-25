# 🚀 Deploy Automatizado via GitHub

## 📋 Pré-requisitos na VPS

### 1. Instalar dependências básicas:
```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js e npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2 globalmente
sudo npm install -g pm2

# Instalar Nginx
sudo apt install nginx -y

# Instalar Git
sudo apt install git -y

# Verificar instalações
node --version
npm --version
pm2 --version
nginx -v
git --version
```

### 2. Configurar PostgreSQL (se ainda não estiver):
```bash
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Configurar banco (ajustar conforme sua configuração)
sudo -u postgres psql -c "CREATE DATABASE deriv_bots_prod;"
sudo -u postgres psql -c "CREATE USER postgres WITH PASSWORD 'Kp9mL2xR8qE5wT3nF7vB';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE deriv_bots_prod TO postgres;"
```

## 🔧 Deploy Inicial

### 1. Primeira instalação:
```bash
# Baixar o script de deploy
wget https://raw.githubusercontent.com/SEU-USUARIO/SEU-REPO/main/deploy-github.sh
chmod +x deploy-github.sh

# O script já está configurado com seu repositório:
# REPO_URL="https://github.com/augustofreires/eon.git"

# Executar deploy
sudo ./deploy-github.sh
```

### 2. Configurações pós-deploy:
```bash
# Verificar se tudo está funcionando
curl http://afiliagreen.com.br/api/health

# Verificar logs se houver problemas
sudo tail -f /var/log/nginx/deriv-bots.error.log
pm2 logs deriv-bots-api

# Criar usuário admin (opcional)
curl -X POST http://afiliagreen.com.br/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@empresa.com","password":"senha123"}'
```

## 🔄 Atualizações Futuras

### Processo simples de atualização:
```bash
cd /var/www/deriv-bots
sudo git pull origin main
sudo ./deploy-update.sh
```

### Ou fazer deploy completo (se houver problemas):
```bash
sudo ./deploy-github.sh
```

## 📁 Estrutura de Arquivos na VPS

```
/var/www/deriv-bots/           # Projeto clonado do GitHub
├── client/                    # Frontend React
├── server/                    # Backend Node.js
├── nginx.conf                 # Configuração do Nginx
├── .env.vps                   # Variáveis de ambiente
├── deploy-github.sh           # Script de deploy inicial
└── deploy-update.sh           # Script de atualização

/var/www/html/deriv-bots/      # Arquivos estáticos do frontend
├── index.html
├── static/
└── ...

/etc/nginx/sites-available/    # Configuração do Nginx
└── deriv-bots

/etc/nginx/sites-enabled/      # Site ativo
└── deriv-bots -> ../sites-available/deriv-bots
```

## 🛠️ Comandos Úteis

### Monitoramento:
```bash
# Status dos serviços
sudo systemctl status nginx
pm2 status
pm2 logs deriv-bots-api

# Logs em tempo real
sudo tail -f /var/log/nginx/deriv-bots.access.log
sudo tail -f /var/log/nginx/deriv-bots.error.log
pm2 logs --lines 50

# Verificar portas
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :5001
```

### Reiniciar serviços:
```bash
# Reiniciar Nginx
sudo systemctl restart nginx

# Reiniciar aplicação
pm2 restart deriv-bots-api

# Recarregar configuração do Nginx (sem parar)
sudo nginx -s reload
```

### Backup:
```bash
# Fazer backup do projeto
sudo tar -czf deriv-bots-backup-$(date +%Y%m%d).tar.gz /var/www/deriv-bots

# Backup do banco (PostgreSQL)
sudo -u postgres pg_dump deriv_bots_prod > backup-$(date +%Y%m%d).sql
```

## 🔍 Resolução de Problemas

### 1. Erro 502 Bad Gateway:
```bash
# Verificar se a aplicação está rodando
pm2 status
pm2 logs deriv-bots-api

# Verificar configuração do Nginx
sudo nginx -t
```

### 2. Erro de CORS:
```bash
# Verificar variáveis de ambiente
cd /var/www/deriv-bots/server
cat .env | grep CORS_ORIGIN
```

### 3. Erro de banco de dados:
```bash
# Verificar se PostgreSQL está rodando
sudo systemctl status postgresql

# Testar conexão
sudo -u postgres psql -d deriv_bots_prod -c "SELECT 1;"
```

## ✅ Checklist Pós-Deploy

- [ ] Site carrega: http://afiliagreen.com.br
- [ ] API responde: http://afiliagreen.com.br/api/health
- [ ] Login funciona sem erro de CORS
- [ ] PM2 está gerenciando a aplicação
- [ ] Nginx está servindo arquivos estáticos
- [ ] PostgreSQL está conectado
- [ ] Logs não mostram erros críticos

## 🔐 Segurança

### Configurações recomendadas:
```bash
# Configurar firewall
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw enable

# Configurar fail2ban (opcional)
sudo apt install fail2ban -y

# Configurar SSL (Certbot - opcional)
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d afiliagreen.com.br
```