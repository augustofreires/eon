# ⚡ Deploy Rápido - Projeto EON

## 🚀 Comandos para Executar na VPS

### 1. Fazer commit dos arquivos (no seu computador):
```bash
cd "/Users/augustofreires/Desktop/bots deriv"
git add .
git commit -m "🔧 Adicionar configuração de deploy e correção CORS"
git push origin main
```

### 2. Deploy na VPS (execute como root ou com sudo):
```bash
# Baixar script de deploy
wget https://raw.githubusercontent.com/augustofreires/eon/main/deploy-github.sh
chmod +x deploy-github.sh

# Executar deploy automatizado
sudo ./deploy-github.sh
```

### 3. Verificar se funcionou:
```bash
# Testar API
curl http://afiliagreen.com.br/api/health

# Testar login (deve dar erro de credenciais, não CORS)
curl -X POST http://afiliagreen.com.br/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@teste.com","password":"123456"}'
```

## 🎯 O que será corrigido:

✅ **Problema de CORS resolvido**
- Frontend: `http://afiliagreen.com.br`
- API: `http://afiliagreen.com.br/api/*` (sem porta)
- Nginx fará o proxy automaticamente

✅ **Estrutura organizada:**
- Frontend servido pelo Nginx na porta 80
- Backend rodando na porta 5001 (interno)
- Proxy automático das rotas `/api/*`

✅ **Deploy automatizado:**
- Clone do GitHub
- Build automático
- Configuração do Nginx
- Restart dos serviços

## 🔄 Para atualizações futuras:

```bash
cd /var/www/deriv-bots
sudo ./deploy-update.sh
```

## ⚠️ Se der algum erro:

```bash
# Ver logs do Nginx
sudo tail -f /var/log/nginx/deriv-bots.error.log

# Ver logs da aplicação
pm2 logs deriv-bots-api

# Verificar serviços
sudo systemctl status nginx
pm2 status
```

## 🎉 Resultado Final:

Após o deploy, você poderá:
- Acessar o site: `http://afiliagreen.com.br`
- Fazer login sem erro de CORS
- API funcionando: `http://afiliagreen.com.br/api/*`

**Tempo estimado do deploy: 3-5 minutos** ⏱️