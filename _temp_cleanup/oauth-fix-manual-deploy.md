# 🚀 Deploy Manual da Correção OAuth

## 1️⃣ TRANSFERIR ARQUIVOS CORRIGIDOS

Você precisa transferir estes arquivos para a VPS:

### **Arquivos Alterados:**
```bash
# Do seu computador para a VPS:
client/src/contexts/AuthContext.tsx      → /var/www/iaeon/client/src/contexts/
client/src/components/DerivAccountPanel.tsx → /var/www/iaeon/client/src/components/
client/src/pages/OperationsPage.tsx     → /var/www/iaeon/client/src/pages/
server/database/setup.js                → /var/www/iaeon/server/database/
```

## 2️⃣ CONECTAR NA VPS E EXECUTAR

```bash
# 1. Conectar na VPS
ssh root@www.afiliagreen.com.br

# 2. Ir para o diretório
cd /var/www/iaeon

# 3. Fazer backup
mkdir -p /tmp/backup-oauth-fix-$(date +%Y%m%d-%H%M%S)
cp client/src/contexts/AuthContext.tsx /tmp/backup-oauth-fix-*/
cp client/src/components/DerivAccountPanel.tsx /tmp/backup-oauth-fix-*/
cp client/src/pages/OperationsPage.tsx /tmp/backup-oauth-fix-*/

# 4. Build do cliente
cd client
rm -rf build/
npm run build

# 5. Restart serviços
cd /var/www/iaeon
pm2 restart all
pm2 status
```

## 3️⃣ TESTAR

1. **URL**: https://iaeon.site/operations
2. **Login**: cliente@iaeon.com / 123456
3. **Ação**: Clicar em "Conectar Deriv"

### **✅ RESULTADO ESPERADO:**
- ✅ **Apenas 1 notificação**: "Conta Deriv conectada: CR6656944 (USD)"
- ✅ **3 contas no dropdown**: CR6656944, CR7346451, VRTC9858183
- ✅ **Bots carregam**: Lista aparece normalmente
- ✅ **Sem spam**: Não aparecem 20+ notificações

---

## 🛠️ ALTERNATIVA: Script Automático

Transfira também o arquivo `oauth-fix-commands-vps.sh` para a VPS e execute:

```bash
chmod +x oauth-fix-commands-vps.sh
./oauth-fix-commands-vps.sh
```

---

**Status**: 🔧 Aguardando deploy manual na VPS
**Próximo passo**: Execute os comandos acima na VPS