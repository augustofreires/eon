#!/bin/bash

echo "🔧 Corrigindo problemas do servidor iaeon.site..."

# 1. Corrigir configuração de proxy no Express
echo "📝 Configurando trust proxy..."
cat > /tmp/proxy-fix.js << 'EOF'
// Adicionar no arquivo principal do servidor (index.js ou app.js)
app.set('trust proxy', true); // Para funcionar corretamente atrás de proxy/nginx
EOF

# 2. Criar arquivo .env corrigido para produção
echo "⚙️ Criando configuração .env corrigida..."
cat > /tmp/.env.production << 'EOF'
# ===========================================
# CONFIGURAÇÃO SERVER PARA PRODUÇÃO
# ===========================================
NODE_ENV=production
PORT=5001

# JWT Configuration
JWT_SECRET=minha-chave-secreta-muito-longa-e-segura-para-producao-secure-key-2024
JWT_EXPIRES_IN=24h

# CORS Configuration
CORS_ORIGIN=https://iaeon.site

# Database Configuration (PostgreSQL para produção)
DATABASE_URL=postgresql://iaeon_user:sua_senha_aqui@localhost:5432/iaeon_db

# Deriv API Configuration
DERIV_APP_ID=82349
DERIV_OAUTH_CLIENT_ID=82349
DERIV_OAUTH_CLIENT_SECRET=your_oauth_client_secret_here
DERIV_OAUTH_REDIRECT_URL=https://iaeon.site/auth/deriv/callback
DERIV_API_URL=https://ws.binaryws.com/websockets/v3
DERIV_OAUTH_URL=https://oauth.deriv.com/oauth2/authorize

# Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Admin Default
ADMIN_EMAIL=admin@iaeon.site
ADMIN_PASSWORD=admin123456

# Trust Proxy
TRUST_PROXY=true
EOF

# 3. Script para aplicar as correções no servidor
echo "🚀 Criando script de deploy das correções..."
cat > /tmp/apply-fixes.sh << 'EOF'
#!/bin/bash
echo "Aplicando correções no servidor..."

# Backup do .env atual
cp /root/eon/server/.env /root/eon/server/.env.backup

# Aplicar novo .env
cp /tmp/.env.production /root/eon/server/.env

# Corrigir index.js para adicionar trust proxy
sed -i '/app\.use(cors/a app.set("trust proxy", true);' /root/eon/server/index.js

# Reiniciar o servidor
pm2 restart iaeon-server

echo "✅ Correções aplicadas com sucesso!"
EOF

chmod +x /tmp/apply-fixes.sh

echo "✅ Scripts de correção criados!"
echo "📋 Para aplicar as correções:"
echo "1. Copie os arquivos para o servidor:"
echo "   scp /tmp/.env.production root@31.97.28.231:/tmp/"
echo "   scp /tmp/apply-fixes.sh root@31.97.28.231:/tmp/"
echo "2. Execute no servidor:"
echo "   bash /tmp/apply-fixes.sh"