# 📋 GUIA SIMPLES - Atualizar VPS

## 🔌 1. CONECTAR NA VPS
```bash
# Conectar na sua VPS
ssh root@84.247.174.164
# Senha: 62uDLW4RJ9ae28EPVfp5yzT
```

## 📁 2. IR PARA A PASTA DO PROJETO
```bash
# Vá para onde está instalado (normalmente uma dessas)
cd /opt/deriv-bots
# ou
cd /home/ubuntu/deriv-bots
# ou
cd /var/www/deriv-bots

# Para verificar onde está:
find / -name "deriv-bots" -type d 2>/dev/null
```

## ⬇️ 3. BAIXAR AS CORREÇÕES
```bash
# Baixar código atualizado do GitHub
git pull origin main
```

## 🔧 4. APLICAR CONFIGURAÇÕES

### 4.1 Configurar Backend:
```bash
# Copiar configuração de produção
cp .env.vps server/.env

# Ver se copiou certo
cat server/.env
```

### 4.2 Build do Frontend:
```bash
# Entrar na pasta client e fazer build
cd client
npm run build

# Voltar para raiz
cd ..
```

### 4.3 Copiar Frontend para Nginx:
```bash
# Remover antigo e copiar novo
sudo rm -rf /var/www/html/deriv-bots
sudo cp -r client/build /var/www/html/deriv-bots
sudo chown -R www-data:www-data /var/www/html/deriv-bots
```

### 4.4 Atualizar Nginx:
```bash
# Copiar nova configuração
sudo cp nginx.conf /etc/nginx/sites-available/deriv-bots

# Testar se está ok
sudo nginx -t

# Se deu ok, aplicar
sudo systemctl reload nginx
```

## 🔄 5. REINICIAR BACKEND

### Opção A - Se usando PM2:
```bash
# Ver processos rodando
pm2 list

# Parar o processo
pm2 stop all
# ou
pm2 stop deriv-bots

# Entrar na pasta server
cd server

# Iniciar novamente
pm2 start index.js --name deriv-bots

# Ver logs para verificar
pm2 logs
```

### Opção B - Se não tiver PM2:
```bash
# Parar processo antigo (Ctrl+C se estiver rodando)
# Depois iniciar:
cd server
node index.js
```

## ✅ 6. TESTAR

### Teste 1 - API funcionando:
```bash
curl http://www.afiliagreen.com.br/api/health
```
**Deve retornar:** `{"status":"OK",...}`

### Teste 2 - Site funcionando:
- Abra: http://www.afiliagreen.com.br
- Tente fazer login
- Se funcionar = ✅ Sucesso!

## 🚨 Se algo der errado:

### Ver logs de erro:
```bash
# Logs do nginx
sudo tail -f /var/log/nginx/error.log

# Logs do backend (se usando PM2)
pm2 logs

# Verificar se backend está rodando
ps aux | grep node
```

### Comandos úteis:
```bash
# Verificar se nginx está ok
sudo systemctl status nginx

# Reiniciar nginx se precisar
sudo systemctl restart nginx

# Verificar se porta 5001 está aberta
netstat -tulpn | grep :5001
```

---

## 📞 RESUMO RÁPIDO:
1. SSH na VPS
2. `cd /caminho/do/projeto`
3. `git pull origin main`
4. `cp .env.vps server/.env`
5. `cd client && npm run build && cd ..`
6. `sudo cp -r client/build /var/www/html/deriv-bots`
7. `sudo cp nginx.conf /etc/nginx/sites-available/deriv-bots`
8. `sudo nginx -t && sudo systemctl reload nginx`
9. `pm2 restart all` ou reiniciar backend
10. Testar: http://www.afiliagreen.com.br

**Se tiver dúvida em qualquer passo, me fale!**