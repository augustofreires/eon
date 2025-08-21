# Guia de Deploy - Plataforma de Bots Deriv

## Pré-requisitos

- Node.js 16+ 
- PostgreSQL 12+
- PM2 (para produção)
- Nginx (opcional, para proxy reverso)

## 1. Preparação do Servidor

### Ubuntu/Debian
```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Instalar PM2
sudo npm install -g pm2

# Instalar Nginx (opcional)
sudo apt install nginx -y
```

### CentOS/RHEL
```bash
# Instalar Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Instalar PostgreSQL
sudo yum install postgresql-server postgresql-contrib -y
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Instalar PM2
sudo npm install -g pm2
```

## 2. Configuração do PostgreSQL

```bash
# Acessar PostgreSQL
sudo -u postgres psql

# Criar banco de dados
CREATE DATABASE deriv_bots_db;

# Criar usuário
CREATE USER deriv_user WITH PASSWORD 'sua_senha_segura';

# Conceder privilégios
GRANT ALL PRIVILEGES ON DATABASE deriv_bots_db TO deriv_user;

# Sair
\q
```

## 3. Deploy da Aplicação

```bash
# Clonar repositório
git clone <seu-repositorio>
cd deriv-bots-platform

# Instalar dependências
npm run install-all

# Configurar variáveis de ambiente
cp env.example .env
nano .env
```

### Configuração do .env (Produção)
```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://deriv_user:sua_senha_segura@localhost:5432/deriv_bots_db
JWT_SECRET=sua_chave_secreta_muito_segura_aqui
JWT_EXPIRES_IN=24h
DERIV_APP_ID=seu_app_id_deriv
DERIV_OAUTH_URL=https://oauth.deriv.com/oauth2/authorize
DERIV_API_URL=https://ws.binaryws.com/websockets/v3
DERIV_APP_TOKEN=seu_token_deriv
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
CORS_ORIGIN=https://seudominio.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
ADMIN_EMAIL=admin@seudominio.com
ADMIN_PASSWORD=senha_admin_segura
```

## 4. Configuração do Banco de Dados

```bash
# Configurar banco
npm run setup-db
```

## 5. Build da Aplicação

```bash
# Build do frontend
npm run build

# Verificar se tudo está funcionando
npm start
```

## 6. Configuração do PM2

```bash
# Criar arquivo ecosystem.config.js
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'deriv-bots-server',
    script: './server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
EOF

# Criar diretório de logs
mkdir logs

# Iniciar aplicação
pm2 start ecosystem.config.js

# Salvar configuração
pm2 save

# Configurar para iniciar com o sistema
pm2 startup
```

## 7. Configuração do Nginx (Opcional)

```bash
# Criar configuração do site
sudo nano /etc/nginx/sites-available/deriv-bots
```

```nginx
server {
    listen 80;
    server_name seudominio.com www.seudominio.com;

    # Redirecionar para HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seudominio.com www.seudominio.com;

    # Certificado SSL (usar Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/seudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seudominio.com/privkey.pem;

    # Configurações SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Headers de segurança
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Proxy para API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Proxy para Socket.io
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Servir arquivos estáticos do React
    location / {
        root /var/www/deriv-bots/client/build;
        try_files $uri $uri/ /index.html;
        
        # Cache para arquivos estáticos
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Upload de arquivos
    location /uploads {
        alias /var/www/deriv-bots/server/uploads;
        expires 1d;
        add_header Cache-Control "public";
    }
}
```

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/deriv-bots /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 8. SSL com Let's Encrypt

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obter certificado
sudo certbot --nginx -d seudominio.com -d www.seudominio.com

# Renovação automática
sudo crontab -e
# Adicionar: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 9. Firewall

```bash
# Configurar UFW
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## 10. Monitoramento

```bash
# Status da aplicação
pm2 status
pm2 logs

# Monitoramento do sistema
htop
df -h
free -h
```

## 11. Backup

```bash
# Script de backup automático
cat > backup.sh << EOF
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/deriv-bots"

mkdir -p \$BACKUP_DIR

# Backup do banco
pg_dump deriv_bots_db > \$BACKUP_DIR/db_\$DATE.sql

# Backup dos uploads
tar -czf \$BACKUP_DIR/uploads_\$DATE.tar.gz server/uploads/

# Manter apenas últimos 7 backups
find \$BACKUP_DIR -name "*.sql" -mtime +7 -delete
find \$BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
EOF

chmod +x backup.sh

# Adicionar ao crontab
crontab -e
# Adicionar: 0 2 * * * /path/to/backup.sh
```

## 12. Troubleshooting

### Logs importantes
- PM2: `pm2 logs`
- Nginx: `sudo tail -f /var/log/nginx/error.log`
- PostgreSQL: `sudo tail -f /var/log/postgresql/postgresql-*.log`

### Comandos úteis
```bash
# Reiniciar aplicação
pm2 restart deriv-bots-server

# Verificar status
pm2 status
systemctl status nginx
systemctl status postgresql

# Verificar portas
netstat -tlnp | grep :5000
netstat -tlnp | grep :80
netstat -tlnp | grep :443
```

## 13. Atualizações

```bash
# Atualizar código
git pull origin main

# Instalar dependências
npm run install-all

# Build
npm run build

# Reiniciar
pm2 restart deriv-bots-server
```

## 14. Segurança

- Mantenha o sistema atualizado
- Use senhas fortes
- Configure firewall
- Monitore logs regularmente
- Faça backups frequentes
- Use HTTPS sempre
- Configure rate limiting
- Implemente autenticação de dois fatores (opcional)

## Suporte

Para suporte técnico, consulte a documentação ou entre em contato através do painel admin. 