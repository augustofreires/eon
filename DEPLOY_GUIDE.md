# 🚀 Guia de Deploy - Deriv Bots Platform

## ✅ Status Atual
- **Backend:** ✅ Funcionando (porta 5001)
- **Frontend:** ✅ Funcionando (porta 3000)
- **Database:** ⚠️ Precisa configurar PostgreSQL
- **Deploy:** 🟡 Pronto para produção

## 📋 Pré-requisitos

### 1. Configuração do Banco de Dados
```bash
# Instalar PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Criar usuário e banco
sudo -u postgres createuser --interactive --pwprompt deriv_user
sudo -u postgres createdb deriv_bots_prod -O deriv_user

# Executar scripts de criação das tabelas
psql -U deriv_user -d deriv_bots_prod -f server/database/setup.sql
```

### 2. Configurar Variáveis de Ambiente
```bash
# Copiar arquivo de exemplo
cp .env.production .env

# Editar com suas configurações
nano .env
```

**Configurações obrigatórias:**
- `DB_PASSWORD`: Senha do PostgreSQL
- `JWT_SECRET`: Chave secreta para JWT (min 32 caracteres)
- `DERIV_APP_ID`: ID da aplicação Deriv
- `DERIV_OAUTH_CLIENT_ID`: Cliente OAuth da Deriv
- `DERIV_OAUTH_CLIENT_SECRET`: Secret OAuth da Deriv

## 🐳 Deploy com Docker (Recomendado)

### 1. Instalar Docker e Docker Compose
```bash
# Ubuntu/Debian
sudo apt install docker.io docker-compose

# Configurar usuário
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Deploy da Aplicação
```bash
# Clonar repositório
cd /opt
sudo git clone <seu-repositorio> deriv-bots-platform
cd deriv-bots-platform

# Configurar ambiente
sudo cp .env.production .env
sudo nano .env  # Editar com suas configurações

# Executar deploy
sudo docker-compose up -d

# Verificar status
sudo docker-compose ps
sudo docker-compose logs -f
```

### 3. Configurar SSL (Opcional)
```bash
# Instalar Certbot
sudo apt install certbot

# Obter certificado
sudo certbot certonly --standalone -d seu-dominio.com

# Copiar certificados
sudo mkdir -p ssl
sudo cp /etc/letsencrypt/live/seu-dominio.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/seu-dominio.com/privkey.pem ssl/

# Reiniciar containers
sudo docker-compose restart
```

## 🔧 Deploy Manual (sem Docker)

### 1. Servidor Backend
```bash
cd server

# Instalar dependências
npm install --production

# Configurar ambiente
cp ../.env.production .env
nano .env

# Iniciar com PM2
npm install -g pm2
pm2 start index.js --name "deriv-bots-api"
pm2 startup
pm2 save
```

### 2. Cliente Frontend
```bash
cd client

# Instalar dependências
npm install

# Build para produção
npm run build

# Servir com Nginx
sudo cp build/* /var/www/html/
sudo systemctl restart nginx
```

### 3. Configurar Nginx
```bash
# Copiar configuração
sudo cp nginx.conf /etc/nginx/sites-available/deriv-bots
sudo ln -s /etc/nginx/sites-available/deriv-bots /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 🔍 Verificar Funcionamento

### 1. Health Checks
```bash
# Backend
curl http://localhost:5001/api/health

# Frontend
curl http://localhost:3000

# Base de dados
psql -U deriv_user -d deriv_bots_prod -c "SELECT version();"
```

### 2. Logs
```bash
# Docker
sudo docker-compose logs -f api
sudo docker-compose logs -f frontend

# PM2
pm2 logs deriv-bots-api

# Nginx
sudo tail -f /var/log/nginx/access.log
```

## 🔐 Configuração da Deriv API

### 1. Criar Aplicação na Deriv
1. Acessar [Deriv Developer Portal](https://developers.deriv.com/)
2. Criar nova aplicação
3. Configurar callback URLs:
   - `https://seu-dominio.com/auth/deriv/callback`
4. Obter `App ID`, `Client ID` e `Client Secret`

### 2. Configurar OAuth
```env
DERIV_APP_ID=1234
DERIV_OAUTH_CLIENT_ID=abc123
DERIV_OAUTH_CLIENT_SECRET=xyz789
DERIV_OAUTH_REDIRECT_URI=https://seu-dominio.com/auth/deriv/callback
```

## 📊 Monitoramento

### 1. Métricas do Sistema
```bash
# Uso de recursos
docker stats

# Logs em tempo real
docker-compose logs -f --tail=100

# Status dos serviços
systemctl status nginx postgresql
```

### 2. Backup do Banco de Dados
```bash
# Criar backup
pg_dump -U deriv_user deriv_bots_prod > backup_$(date +%Y%m%d).sql

# Restaurar backup
psql -U deriv_user -d deriv_bots_prod < backup_20231225.sql
```

## 🛠️ Manutenção

### 1. Atualizações
```bash
# Parar serviços
docker-compose down

# Atualizar código
git pull

# Reconstruir imagens
docker-compose build --no-cache

# Reiniciar serviços
docker-compose up -d
```

### 2. Limpeza
```bash
# Remover imagens não utilizadas
docker system prune -a

# Limpar logs
docker-compose logs --tail=0 -f > /dev/null &
```

## 🆘 Solução de Problemas

### 1. Problemas Comuns

**Erro de conexão com o banco:**
```bash
# Verificar se PostgreSQL está rodando
systemctl status postgresql

# Testar conexão
psql -U deriv_user -d deriv_bots_prod -c "SELECT 1;"
```

**Frontend não carrega:**
```bash
# Verificar se Nginx está servindo corretamente
nginx -t
systemctl status nginx

# Verificar logs
tail -f /var/log/nginx/error.log
```

**API não responde:**
```bash
# Verificar se o backend está rodando
curl localhost:5001/api/health

# Verificar logs
docker-compose logs api
```

### 2. Contatos de Suporte
- **Documentação:** Verificar arquivos README.md
- **Logs:** Sempre incluir logs relevantes
- **Configuração:** Verificar variáveis de ambiente

---

## 📝 Checklist de Deploy

- [ ] PostgreSQL configurado e rodando
- [ ] Variáveis de ambiente configuradas
- [ ] Aplicação Deriv criada e configurada
- [ ] SSL configurado (produção)
- [ ] Nginx configurado
- [ ] Backup do banco configurado
- [ ] Monitoramento ativo
- [ ] DNS apontando para servidor

**🎉 Sua plataforma Deriv Bots está pronta para uso!**