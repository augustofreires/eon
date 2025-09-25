# 🔧 Correção do Problema de Login

## 📋 Problema Identificado
O erro de CORS acontece porque:
- Frontend está em: `http://afiliagreen.com.br` (porta 80)
- Backend está em: `http://afiliagreen.com.br:5001` (porta 5001)
- CORS configurado para: `http://localhost:3000`

## ✅ Solução Implementada

### 1. Configuração do Nginx
Criado arquivo `nginx.conf` que:
- Serve o frontend na porta 80
- Faz proxy das rotas `/api/*` para a porta 5001
- Resolve o problema de CORS automaticamente

### 2. Variáveis de Ambiente Atualizadas
- `.env.vps` atualizado com CORS correto
- `REACT_APP_API_URL` configurado para usar proxy

## 🚀 Comandos para Executar na VPS

```bash
# 1. Copiar configuração do Nginx
sudo cp /caminho/do/seu/projeto/nginx.conf /etc/nginx/sites-available/deriv-bots

# 2. Habilitar o site
sudo ln -sf /etc/nginx/sites-available/deriv-bots /etc/nginx/sites-enabled/

# 3. Remover configuração padrão
sudo rm -f /etc/nginx/sites-enabled/default

# 4. Testar configuração
sudo nginx -t

# 5. Recarregar Nginx
sudo systemctl reload nginx

# 6. Fazer build do frontend e copiar
cd /caminho/do/seu/projeto/client
npm run build
sudo mkdir -p /var/www/html/deriv-bots
sudo cp -r build/* /var/www/html/deriv-bots/
sudo chown -R www-data:www-data /var/www/html/deriv-bots

# 7. Atualizar backend
cd /caminho/do/seu/projeto/server
cp ../.env.vps .env
pm2 restart deriv-bots-api || pm2 start index.js --name deriv-bots-api
```

## 🧪 Teste de Funcionamento

Após aplicar as correções, teste:

```bash
# 1. Testar health check
curl http://afiliagreen.com.br/api/health

# 2. Testar login (deve retornar erro de credenciais, não CORS)
curl -X POST http://afiliagreen.com.br/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'
```

## 📝 Resultado Esperado
- ✅ Sem mais erros de CORS
- ✅ API acessível via `http://afiliagreen.com.br/api/*`
- ✅ Frontend funcionando normalmente
- ✅ Login funcionará com credenciais válidas

## ⚠️ Verificações Importantes
1. PostgreSQL está rodando?
2. Portas 80 e 5001 estão liberadas no firewall?
3. PM2 está gerenciando a aplicação?
4. Existem usuários cadastrados no banco?

## 🔑 Para Criar Usuário Teste (Opcional)
```bash
# Via API (depois que estiver funcionando)
curl -X POST http://afiliagreen.com.br/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste","email":"teste@teste.com","password":"123456"}'
```