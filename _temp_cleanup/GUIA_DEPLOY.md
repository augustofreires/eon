# 🚀 Guia de Deploy - Plataforma EON PRO

## 📋 **Pré-requisitos**

### **1. Servidor VPS/Cloud**
- **Sistema**: Ubuntu 20.04+ ou Debian 11+
- **RAM**: Mínimo 2GB (recomendado 4GB)
- **CPU**: 2 cores (recomendado 4 cores)
- **Disco**: 20GB SSD
- **Rede**: IP público

### **2. Domínio**
- Domínio configurado (ex: `eonpro.app.br`)
- DNS apontando para o servidor

## 🔧 **Instalação no Servidor**

### **1. Conectar ao Servidor**
```bash
ssh root@seu-servidor.com
```

### **2. Atualizar Sistema**
```bash
apt update && apt upgrade -y
```

### **3. Instalar Dependências**
```bash
# Instalar Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Instalar PostgreSQL
apt install postgresql postgresql-contrib -y

# Instalar Nginx
apt install nginx -y

# Instalar PM2
npm install -g pm2

# Instalar Certbot (SSL)
apt install certbot python3-certbot-nginx -y
```

### **4. Configurar PostgreSQL**
```bash
# Acessar PostgreSQL
sudo -u postgres psql

# Criar banco e usuário
CREATE DATABASE eonpro;
CREATE USER eonpro_user WITH PASSWORD 'sua_senha_forte';
GRANT ALL PRIVILEGES ON DATABASE eonpro TO eonpro_user;
\q

# Configurar acesso remoto (opcional)
sudo nano /etc/postgresql/*/main/postgresql.conf
# Descomente: listen_addresses = '*'

sudo nano /etc/postgresql/*/main/pg_hba.conf
# Adicione: host eonpro eonpro_user 0.0.0.0/0 md5

# Reiniciar PostgreSQL
sudo systemctl restart postgresql
```

### **5. Clonar Projeto**
```bash
# Criar diretório
mkdir -p /var/www/eonpro
cd /var/www/eonpro

# Clonar projeto (substitua pela URL do seu repositório)
git clone https://github.com/seu-usuario/eonpro.git .

# Ou fazer upload dos arquivos via SFTP
```

### **6. Configurar Variáveis de Ambiente**
```bash
# Copiar arquivo de exemplo
cp env.example .env

# Editar configurações
nano .env
```

**Conteúdo do .env:**
```env
# Servidor
NODE_ENV=production
PORT=3001

# Banco de Dados
DB_HOST=localhost
DB_PORT=5432
DB_NAME=eonpro
DB_USER=eonpro_user
DB_PASSWORD=sua_senha_forte

# JWT
JWT_SECRET=sua_chave_jwt_super_secreta

# Deriv
DERIV_APP_ID=seu_app_id_da_deriv
DERIV_APP_TOKEN=seu_app_token_da_deriv

# Frontend
REACT_APP_API_URL=https://eonpro.app.br/api
```

### **7. Instalar Dependências**
```bash
# Instalar dependências do projeto
npm run install-all

# Build do frontend
npm run build
```

### **8. Configurar Banco de Dados**
```bash
# Executar setup do banco
npm run setup-db
```

### **9. Configurar PM2**
```bash
# Iniciar aplicação com PM2
pm2 start ecosystem.config.js --env production

# Salvar configuração
pm2 save

# Configurar para iniciar com o sistema
pm2 startup
```

### **10. Configurar Nginx**
```bash
# Criar configuração do site
sudo nano /etc/nginx/sites-available/eonpro
```

**Conteúdo da configuração:**
```nginx
server {
    listen 80;
    server_name eonpro.app.br;

    # Frontend (React)
    location / {
        root /var/www/eonpro/client/build;
        try_files $uri $uri/ /index.html;
        
        # Cache para arquivos estáticos
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API (Node.js)
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/eonpro /etc/nginx/sites-enabled/

# Remover site padrão
sudo rm /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

### **11. Configurar SSL (Let's Encrypt)**
```bash
# Obter certificado SSL
sudo certbot --nginx -d eonpro.app.br

# Configurar renovação automática
sudo crontab -e
# Adicionar: 0 12 * * * /usr/bin/certbot renew --quiet
```

### **12. Configurar Firewall**
```bash
# Instalar UFW
apt install ufw -y

# Configurar regras
ufw allow ssh
ufw allow 'Nginx Full'
ufw allow 3001

# Ativar firewall
ufw enable
```

## 🚀 **Iniciar Aplicação**

### **1. Verificar Status**
```bash
# Verificar PM2
pm2 status

# Verificar Nginx
sudo systemctl status nginx

# Verificar PostgreSQL
sudo systemctl status postgresql
```

### **2. Logs**
```bash
# Logs da aplicação
pm2 logs eon-pro-server

# Logs do Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### **3. Reiniciar Serviços**
```bash
# Reiniciar aplicação
pm2 restart eon-pro-server

# Reiniciar Nginx
sudo systemctl restart nginx

# Reiniciar PostgreSQL
sudo systemctl restart postgresql
```

## 🔧 **Configuração da Deriv**

### **1. Criar App na Deriv**
1. Acesse [Deriv Developer Portal](https://app.deriv.com/account/api-token)
2. Crie um novo app
3. Configure o markup desejado
4. Copie o App ID e Token

### **2. Configurar na Plataforma**
1. Acesse `https://eonpro.app.br/admin/affiliate`
2. Insira o App ID e Token da Deriv
3. Teste a conexão

## 📊 **Monitoramento**

### **1. Status da Aplicação**
```bash
# Verificar uso de recursos
pm2 monit

# Verificar logs em tempo real
pm2 logs --lines 100
```

### **2. Backup do Banco**
```bash
# Criar script de backup
nano /var/www/eonpro/backup.sh
```

**Conteúdo do script:**
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/eonpro"
mkdir -p $BACKUP_DIR

# Backup do banco
pg_dump -h localhost -U eonpro_user eonpro > $BACKUP_DIR/eonpro_$DATE.sql

# Comprimir
gzip $BACKUP_DIR/eonpro_$DATE.sql

# Manter apenas últimos 7 backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

```bash
# Tornar executável
chmod +x /var/www/eonpro/backup.sh

# Adicionar ao cron (backup diário às 2h)
crontab -e
# Adicionar: 0 2 * * * /var/www/eonpro/backup.sh
```

## 🔒 **Segurança**

### **1. Atualizações**
```bash
# Atualizar sistema regularmente
apt update && apt upgrade -y

# Atualizar Node.js
npm update -g pm2
```

### **2. Firewall**
```bash
# Verificar status
ufw status

# Bloquear portas desnecessárias
ufw deny 22/tcp
ufw allow from seu_ip_ssh to any port 22
```

### **3. Logs de Segurança**
```bash
# Monitorar tentativas de login
tail -f /var/log/auth.log

# Monitorar acessos ao Nginx
tail -f /var/log/nginx/access.log | grep -E "(404|403|500)"
```

## 🚨 **Troubleshooting**

### **1. Aplicação não inicia**
```bash
# Verificar logs
pm2 logs eon-pro-server

# Verificar variáveis de ambiente
pm2 env eon-pro-server

# Reiniciar aplicação
pm2 restart eon-pro-server
```

### **2. Banco não conecta**
```bash
# Verificar PostgreSQL
sudo systemctl status postgresql

# Testar conexão
psql -h localhost -U eonpro_user -d eonpro

# Verificar logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### **3. SSL não funciona**
```bash
# Verificar certificado
sudo certbot certificates

# Renovar certificado
sudo certbot renew

# Verificar configuração Nginx
sudo nginx -t
```

## 📞 **Suporte**

### **Comandos Úteis**
```bash
# Status geral
pm2 status
sudo systemctl status nginx postgresql

# Logs
pm2 logs --lines 50
sudo journalctl -u nginx -f

# Recursos
htop
df -h
free -h
```

### **Contatos**
- **Email**: suporte@eonpro.app.br
- **Telegram**: @eonpro_support
- **Documentação**: https://docs.eonpro.app.br

---

## ✅ **Checklist de Deploy**

- [ ] Servidor configurado
- [ ] PostgreSQL instalado e configurado
- [ ] Node.js instalado
- [ ] Nginx configurado
- [ ] SSL configurado
- [ ] Firewall ativo
- [ ] Aplicação rodando com PM2
- [ ] Banco de dados configurado
- [ ] Deriv configurado
- [ ] Backup configurado
- [ ] Monitoramento ativo

**🎉 Sua plataforma EON PRO está pronta para produção!** 