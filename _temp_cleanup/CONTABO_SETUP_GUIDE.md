# Guia de Configuração - Contabo Cloud VPS 20

## 📋 Pré-requisitos
- [ ] VPS Contabo Cloud VPS 20 contratado
- [ ] Dados de acesso SSH recebidos
- [ ] Domínio configurado (opcional)

## 🚀 Passo 1: Configuração Inicial do Servidor

### 1.1 Conectar via SSH
```bash
ssh root@SEU_IP_DO_VPS
```

### 1.2 Atualizar sistema
```bash
apt update && apt upgrade -y
```

### 1.3 Configurar firewall básico
```bash
ufw allow ssh
ufw allow 80
ufw allow 443
ufw allow 5001
ufw --force enable
```

### 1.4 Criar usuário não-root
```bash
adduser deploy
usermod -aG sudo deploy
usermod -aG docker deploy
```

## 🐳 Passo 2: Instalar Docker & Docker Compose

### 2.1 Instalar Docker
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl enable docker
systemctl start docker
```

### 2.2 Instalar Docker Compose
```bash
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### 2.3 Verificar instalação
```bash
docker --version
docker-compose --version
```

## 📁 Passo 3: Preparar Aplicação

### 3.1 Clonar repositório
```bash
su - deploy
git clone https://github.com/augustofreires/eon.git /home/deploy/eon
cd /home/deploy/eon
```

### 3.2 Configurar variáveis de ambiente
```bash
cp .env.production .env
nano .env
```

**Variáveis essenciais:**
```env
# Database
DB_PASSWORD=senha_super_segura_123
DB_HOST=postgres
DB_NAME=deriv_bots_prod
DB_USER=postgres

# JWT
JWT_SECRET=jwt_secret_super_seguro_456

# Deriv API
DERIV_APP_ID=seu_app_id
DERIV_OAUTH_CLIENT_ID=seu_oauth_client_id  
DERIV_OAUTH_CLIENT_SECRET=seu_oauth_client_secret

# URLs
REACT_APP_API_URL=http://SEU_IP:5001
# ou https://seu-dominio.com se tiver domínio

# Outros
NODE_ENV=production
PORT=5001
```

## 🚢 Passo 4: Deploy da Aplicação

### 4.1 Construir e iniciar containers
```bash
docker-compose up --build -d
```

### 4.2 Verificar status
```bash
docker-compose ps
docker-compose logs -f
```

### 4.3 Configurar banco de dados inicial
```bash
docker-compose exec api npm run setup-db
```

## 🔒 Passo 5: Configurar SSL (com Certbot)

### 5.1 Instalar Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 5.2 Obter certificado SSL
```bash
sudo certbot --nginx -d seu-dominio.com
```

### 5.3 Configurar renovação automática
```bash
sudo crontab -e
# Adicionar linha:
0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔧 Passo 6: Configurações de Produção

### 6.1 Configurar logrotate
```bash
sudo nano /etc/logrotate.d/deriv-bots
```

Conteúdo:
```
/home/deploy/deriv-bots/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    notifempty
    create 0644 deploy deploy
}
```

### 6.2 Configurar restart automático
```bash
sudo nano /etc/systemd/system/deriv-bots.service
```

Conteúdo:
```ini
[Unit]
Description=Deriv Bots Platform
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
User=deploy
WorkingDirectory=/home/deploy/deriv-bots
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable deriv-bots.service
```

## 📊 Passo 7: Monitoring

### 7.1 Monitorar recursos
```bash
# CPU e RAM
htop

# Espaço em disco
df -h

# Status containers
docker stats
```

### 7.2 Logs importantes
```bash
# Logs da aplicação
docker-compose logs -f api

# Logs do nginx
docker-compose logs -f frontend

# Logs do postgres
docker-compose logs -f postgres
```

## 🔄 Passo 8: Backup e Manutenção

### 8.1 Script de backup automático
```bash
nano /home/deploy/backup.sh
```

Conteúdo:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/deploy/backups"

mkdir -p $BACKUP_DIR

# Backup banco de dados
docker-compose exec -T postgres pg_dump -U postgres deriv_bots_prod > $BACKUP_DIR/db_$DATE.sql

# Backup arquivos
tar -czf $BACKUP_DIR/files_$DATE.tar.gz /home/deploy/deriv-bots/uploads

# Manter apenas últimos 7 backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

```bash
chmod +x /home/deploy/backup.sh
```

### 8.2 Agendar backup diário
```bash
crontab -e
# Adicionar:
0 2 * * * /home/deploy/backup.sh
```

## ✅ Checklist Final

- [ ] VPS acessível via SSH
- [ ] Docker e Docker Compose instalados
- [ ] Aplicação rodando nos containers
- [ ] Banco de dados configurado
- [ ] Firewall configurado
- [ ] SSL configurado (se tiver domínio)
- [ ] Backup automático configurado
- [ ] Logs funcionando
- [ ] Aplicação acessível via IP/domínio

## 🆘 Comandos Úteis

```bash
# Reiniciar aplicação
docker-compose restart

# Ver logs em tempo real
docker-compose logs -f

# Atualizar aplicação
git pull
docker-compose up --build -d

# Backup manual
docker-compose exec postgres pg_dump -U postgres deriv_bots_prod > backup.sql

# Restaurar backup
docker-compose exec -T postgres psql -U postgres deriv_bots_prod < backup.sql

# Verificar uso de recursos
docker stats
```

## 📞 Próximos Passos

Após a configuração inicial, me avise que vou te ajudar com:
1. Configuração do domínio
2. Otimizações de performance
3. Configuração de CI/CD
4. Monitoramento avançado