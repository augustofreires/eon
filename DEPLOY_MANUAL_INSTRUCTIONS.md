# 🚀 DEPLOY MANUAL - Correção OAuth Notificações

## 📦 ARQUIVO PREPARADO

✅ **Arquivo criado**: `oauth-notifications-fix.tar.gz`
**Contém**:
- `client/src/contexts/AuthContext.tsx` (corrigido)
- `client/src/components/DerivAccountPanel.tsx` (corrigido)
- `client/src/pages/OperationsPage.tsx` (corrigido)
- `server/database/setup.js` (schema PostgreSQL)
- Documentação completa

## 🔧 COMO FAZER O DEPLOY

### 1️⃣ Transferir o arquivo
```bash
# Do seu computador local
scp oauth-notifications-fix.tar.gz root@31.97.28.231:/tmp/
```

### 2️⃣ Conectar na VPS
```bash
ssh root@31.97.28.231
# Senha: 62uDLW4RJ9ae28EPVfp5yzT##
```

### 3️⃣ Extrair e aplicar na VPS
```bash
# Na VPS
cd /var/www/iaeon

# Fazer backup
mkdir -p /tmp/backup-$(date +%Y%m%d-%H%M%S)
cp -r client/src/contexts/AuthContext.tsx /tmp/backup-*/ 2>/dev/null || true
cp -r client/src/components/DerivAccountPanel.tsx /tmp/backup-*/ 2>/dev/null || true
cp -r client/src/pages/OperationsPage.tsx /tmp/backup-*/ 2>/dev/null || true

# Extrair correções
cd /tmp
tar -xzf oauth-notifications-fix.tar.gz

# Copiar arquivos corrigidos
cp client/src/contexts/AuthContext.tsx /var/www/iaeon/client/src/contexts/
cp client/src/components/DerivAccountPanel.tsx /var/www/iaeon/client/src/components/
cp client/src/pages/OperationsPage.tsx /var/www/iaeon/client/src/pages/
cp server/database/setup.js /var/www/iaeon/server/database/

# Build e restart
cd /var/www/iaeon/client
rm -rf build/
npm run build

cd /var/www/iaeon
pm2 restart all
pm2 status
```

## 🧪 TESTE

1. **URL**: https://iaeon.site/operations
2. **Login**: cliente@iaeon.com / 123456
3. **Ação**: Clique em "Conectar Deriv"

### ✅ **RESULTADO ESPERADO**:
- ✅ **Apenas 1 notificação**: "Conta Deriv conectada: CR6656944 (USD)"
- ✅ **3 contas no dropdown**: CR6656944, CR7346451, VRTC9858183
- ✅ **Bots carregam**: Lista de bots aparece
- ✅ **Sem spam**: Não aparecem 20+ notificações

---

## 🎯 RESUMO DO QUE FOI CORRIGIDO

1. **AuthContext**: `switchAccount()` só mostra toast quando manual
2. **DerivAccountPanel**: Troca manual marca como `manual: true`
3. **OperationsPage**: Remove `fetchAccounts()` redundante pós-OAuth
4. **Schema PostgreSQL**: Colunas Deriv unificadas

**Status**: 🔧 Pronto para deploy manual