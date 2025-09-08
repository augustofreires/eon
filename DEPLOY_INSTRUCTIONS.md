# 🚀 Instruções de Deploy - Deriv Bots Platform

## Problemas Corrigidos

### ✅ Principais correções realizadas:

1. **Nginx Configuration** (`nginx.conf`):
   - Corrigido proxy para API: `proxy_pass http://localhost:5001/api/`
   - Adicionado suporte para Socket.io
   - Corrigido CORS para domínio específico
   - Adicionado Content-Security-Policy para Deriv domains

2. **Environment Variables** (`.env.vps`):
   - Corrigidas URLs para produção
   - Database host alterado para `localhost` (VPS local)
   - URLs consistentes para API e CORS

3. **Client Environment** (`client/.env.production`):
   - Criado arquivo de produção específico
   - API URL corrigida: `http://afiliagreen.com.br/api`

4. **Server Environment** (`server/.env`):
   - Reorganizado para desenvolvimento
   - Adicionadas todas as variáveis necessárias

## 📋 Steps para Deploy na VPS

### 1. Backup dos arquivos atuais
```bash
# Na VPS, faça backup dos arquivos atuais
sudo cp /etc/nginx/sites-available/deriv-bots /etc/nginx/sites-available/deriv-bots.backup
sudo cp -r /opt/deriv-bots /opt/deriv-bots-backup
```

### 2. Atualizar código na VPS
```bash
# Na VPS, vá para o diretório do projeto
cd /opt/deriv-bots

# Pull do código atualizado
git pull origin main

# Copiar arquivo .env.vps para .env na pasta server
cp .env.vps server/.env

# Instalar dependências (se necessário)
npm install
cd server && npm install
cd ../client && npm install
```

### 3. Build do Frontend
```bash
# Na pasta client
cd /opt/deriv-bots/client
npm run build

# Copiar build para nginx
sudo rm -rf /var/www/html/deriv-bots
sudo cp -r build /var/www/html/deriv-bots
sudo chown -R www-data:www-data /var/www/html/deriv-bots
```

### 4. Atualizar Nginx
```bash
# Copiar configuração atualizada
sudo cp /opt/deriv-bots/nginx.conf /etc/nginx/sites-available/deriv-bots

# Testar configuração
sudo nginx -t

# Se ok, recarregar nginx
sudo systemctl reload nginx
```

### 5. Reiniciar Backend
```bash
# Parar processo atual (se usando PM2)
pm2 stop deriv-bots

# Ou se usando systemctl
# sudo systemctl stop deriv-bots

# Iniciar com novas configurações
cd /opt/deriv-bots/server
pm2 start index.js --name deriv-bots

# Ou com systemctl
# sudo systemctl start deriv-bots
```

### 6. Verificar Logs
```bash
# Logs do nginx
sudo tail -f /var/log/nginx/deriv-bots.error.log
sudo tail -f /var/log/nginx/deriv-bots.access.log

# Logs do backend
pm2 logs deriv-bots

# Verificar status
pm2 status
```

## 🔍 Testes Após Deploy

### 1. Health Check
```bash
curl http://afiliagreen.com.br/api/health
```
Deve retornar: `{"status":"OK","timestamp":"...","environment":"production"}`

### 2. Teste de Login
1. Acesse: http://afiliagreen.com.br
2. Tente fazer login
3. Verifique se não há erros de CORS no console

### 3. Verificar API Routes
```bash
# Teste de rota inexistente (deve retornar 404)
curl http://afiliagreen.com.br/api/teste-inexistente

# Deve retornar: {"error":"Rota não encontrada"}
```

## 🚨 Troubleshooting

### Se ainda houver problemas de login:

1. **Verificar logs do backend:**
```bash
pm2 logs deriv-bots --lines 50
```

2. **Verificar logs do nginx:**
```bash
sudo tail -f /var/log/nginx/deriv-bots.error.log
```

3. **Verificar se o backend está rodando:**
```bash
ps aux | grep node
netstat -tulpn | grep :5001
```

4. **Verificar CORS no navegador:**
- Abra DevTools (F12)
- Vá para Network tab
- Tente fazer login
- Procure por erros CORS

### Comandos úteis:

```bash
# Restart completo
pm2 restart deriv-bots
sudo systemctl reload nginx

# Verificar configuração nginx
sudo nginx -t

# Verificar status dos serviços
sudo systemctl status nginx
pm2 status
```

## 📁 Estrutura de Arquivos Importante

```
/opt/deriv-bots/
├── nginx.conf                 # Configuração nginx atualizada
├── .env.vps                   # Environment para produção
├── server/.env               # Link/cópia do .env.vps
├── client/.env.production    # Environment do frontend
└── DEPLOY_INSTRUCTIONS.md    # Este arquivo
```

## ✅ Checklist Final

- [ ] Código atualizado na VPS
- [ ] Build do frontend copiado para nginx
- [ ] Arquivo .env.vps copiado para server/.env
- [ ] Nginx configuração atualizada
- [ ] Backend reiniciado
- [ ] Health check funcionando
- [ ] Login funcionando sem erros CORS
- [ ] Socket.io funcionando (se aplicável)

---

**Nota:** Após seguir estes passos, a plataforma deve funcionar corretamente na VPS. Os principais problemas de roteamento e CORS foram corrigidos.