#!/bin/bash

# Script para aplicar as correções OAuth diretamente na VPS
echo "🔧 Aplicando correções OAuth..."

# 1. Fazer backup
echo "💾 Fazendo backup..."
cp ./client/src/contexts/AuthContext.tsx /tmp/AuthContext.tsx.backup-$(date +%Y%m%d-%H%M%S)
cp ./client/src/components/DerivAccountPanel.tsx /tmp/DerivAccountPanel.tsx.backup-$(date +%Y%m%d-%H%M%S)
cp ./client/src/pages/OperationsPage.tsx /tmp/OperationsPage.tsx.backup-$(date +%Y%m%d-%H%M%S)

# 2. Aplicar correção no AuthContext.tsx
echo "🔧 Corrigindo AuthContext.tsx..."

# Adicionar parâmetro manual na interface
sed -i 's/switchAccount: (account: DerivAccount) => Promise<void>;/switchAccount: (account: DerivAccount, manual?: boolean) => Promise<void>;/' ./client/src/contexts/AuthContext.tsx

# Adicionar parâmetro manual na função
sed -i 's/const switchAccount = async (account: DerivAccount) => {/const switchAccount = async (account: DerivAccount, manual: boolean = false) => {/' ./client/src/contexts/AuthContext.tsx

# Modificar o toast para só aparecer quando manual
sed -i '/toast\.success(`Conta alterada para:/c\        if (manual) {\n          toast.success(`Conta alterada para: ${account.loginid} (${account.currency}) - ${account.is_virtual ? '\''Virtual'\'' : '\''Real'\''}`);' ./client/src/contexts/AuthContext.tsx

# 3. Aplicar correção no DerivAccountPanel.tsx
echo "🔧 Corrigindo DerivAccountPanel.tsx..."
sed -i 's/await switchAccount(account);/await switchAccount(account, true);/' ./client/src/components/DerivAccountPanel.tsx

# 4. Aplicar correção no OperationsPage.tsx
echo "🔧 Corrigindo OperationsPage.tsx..."
sed -i '/await fetchAccounts.*oauth-callback/c\        console.log("ℹ️ OAuth processado, contas serão carregadas automaticamente pelo AuthContext");' ./client/src/pages/OperationsPage.tsx

echo "✅ Correções aplicadas!"

# 5. Build do cliente
echo "🏗️ Fazendo build..."
cd client
npm run build

# 6. Restart PM2
echo "🔄 Reiniciando PM2..."
cd /root/eon
pm2 restart all

echo "🎉 Deploy concluído!"
echo "🧪 Teste: https://iaeon.site/operations"