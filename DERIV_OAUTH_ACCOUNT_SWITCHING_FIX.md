# 🔧 Correção Completa: OAuth + Account Switching da Deriv

## 📚 Repositórios Oficiais de Referência

### 1. **champion-trading-automation** (⭐ PRINCIPAL)
```
https://github.com/deriv-com/champion-trading-automation
```
**Contém:**
- ✅ OAuth completo com múltiplas contas
- ✅ Account switching real/virtual
- ✅ AuthStore para gerenciar tokens
- ✅ WebSocket authorization pattern

### 2. **auth-client**
```
https://github.com/deriv-com/auth-client
```
**Contém:**
- ✅ OAuth2 client library oficial
- ✅ Token management
- ✅ Logout e session handling

### 3. **deriv-api**
```
https://github.com/deriv-com/deriv-api
```
**Contém:**
- ✅ WebSocket API docs
- ✅ Authorize endpoint examples
- ✅ Account list handling

---

## ❌ Problemas Identificados na Sua Plataforma

### **Problema 1: Backend não salva TODOS os tokens OAuth**

**Arquivo:** `server/routes/auth.js`

**Situação Atual:**
```javascript
// OAuth retorna múltiplos tokens:
// acct1=CR123&token1=xxx&acct2=VRT456&token2=yyy&acct3=CR789&token3=zzz

// Mas o backend só salva a primeira conta no banco de dados
```

**Problema:**
- Você recebe 3 contas (1 virtual + 2 reais)
- Mas só salva a primeira no `users` table
- As outras 2 contas são PERDIDAS

**Solução:**
Criar tabela `deriv_accounts` para armazenar TODAS as contas:

```sql
CREATE TABLE deriv_accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  loginid VARCHAR(100) NOT NULL,
  token TEXT NOT NULL,
  currency VARCHAR(10),
  is_virtual BOOLEAN DEFAULT FALSE,
  email VARCHAR(255),
  fullname VARCHAR(255),
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### **Problema 2: Account Switching não chama `authorize` no WebSocket**

**Arquivo:** `client/src/contexts/AuthContext.tsx` (linha ~150+)

**Situação Atual:**
```typescript
const switchAccount = async (account: DerivAccount) => {
  // ❌ Só atualiza o estado local
  setCurrentAccount(account);
  updateUser({ deriv_account_id: account.loginid });

  // ❌ MAS NÃO RE-AUTORIZA NO WEBSOCKET!
}
```

**O que DEVERIA fazer (baseado em deriv-api):**
```typescript
const switchAccount = async (account: DerivAccount) => {
  // 1. Re-autorizar via WebSocket com o token da nova conta
  const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=YOUR_APP_ID');

  ws.onopen = () => {
    ws.send(JSON.stringify({
      authorize: account.token  // ✅ Token da NOVA conta
    }));
  };

  ws.onmessage = (event) => {
    const response = JSON.parse(event.data);

    if (response.authorize) {
      // 2. Atualizar estado com dados da nova conta autorizada
      setCurrentAccount({
        loginid: response.authorize.loginid,
        balance: response.authorize.balance,
        currency: response.authorize.currency,
        is_virtual: response.authorize.is_virtual
      });

      // 3. Buscar saldo atualizado
      ws.send(JSON.stringify({ balance: 1 }));
    }
  };
}
```

---

### **Problema 3: DerivAccountPanel não mostra contas reais**

**Arquivo:** `client/src/components/DerivAccountPanel.tsx`

**Situação Atual:**
```typescript
useEffect(() => {
  if (isConnected) {
    loadAccountInfo();

    // ❌ Busca contas via API REST
    if (availableAccounts.length === 0) {
      fetchAccounts('account-panel');
    }
  }
}, [isConnected]);
```

**Problemas:**
1. `loadAccountInfo()` tenta conectar WebSocket toda vez
2. `fetchAccounts()` pode não retornar nada se backend não tem as contas
3. Não usa os tokens OAuth salvos

**Solução:**
Buscar contas direto do WebSocket `account_list`:

```typescript
const loadAllAccounts = async () => {
  const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=YOUR_APP_ID');

  ws.onopen = () => {
    // 1. Autorizar com token do usuário atual
    ws.send(JSON.stringify({
      authorize: user.deriv_access_token
    }));
  };

  ws.onmessage = (event) => {
    const response = JSON.parse(event.data);

    if (response.authorize) {
      // 2. Buscar lista de TODAS as contas
      ws.send(JSON.stringify({
        account_list: 1
      }));
    }

    if (response.account_list) {
      // 3. Retorna array com TODAS as contas (real + virtual)
      const accounts = response.account_list.map(acc => ({
        loginid: acc.loginid,
        currency: acc.currency,
        is_virtual: acc.is_virtual,
        balance: acc.balance
      }));

      setAvailableAccounts(accounts);
    }
  };
};
```

---

## ✅ Solução Completa: Implementação por Etapas

### **ETAPA 1: Criar Tabela de Múltiplas Contas (Backend)**

**Arquivo:** `server/database/migrations/add_deriv_accounts_table.js` (criar)

```javascript
const { query } = require('../connection');

async function up() {
  await query(`
    CREATE TABLE IF NOT EXISTS deriv_accounts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      loginid VARCHAR(100) NOT NULL,
      token TEXT NOT NULL,
      currency VARCHAR(10),
      is_virtual BOOLEAN DEFAULT FALSE,
      email VARCHAR(255),
      fullname VARCHAR(255),
      country VARCHAR(50),
      is_active BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, loginid)
    );

    CREATE INDEX idx_deriv_accounts_user_id ON deriv_accounts(user_id);
    CREATE INDEX idx_deriv_accounts_active ON deriv_accounts(user_id, is_active);
  `);

  console.log('✅ Tabela deriv_accounts criada com sucesso!');
}

module.exports = { up };
```

**Executar:**
```bash
cd server
node -e "require('./database/migrations/add_deriv_accounts_table').up()"
```

---

### **ETAPA 2: Salvar TODOS os Tokens OAuth (Backend)**

**Arquivo:** `server/routes/auth.js` - Adicionar rota

```javascript
// Nova rota: Processar callback OAuth e salvar TODAS as contas
router.post('/deriv/save-all-accounts', authenticateToken, async (req, res) => {
  try {
    const { accounts } = req.body; // Array de contas do OAuth
    const userId = req.user.id;

    console.log(`💾 Salvando ${accounts.length} contas para usuário ${userId}`);

    // 1. Desativar todas as contas antigas
    await query(
      'UPDATE deriv_accounts SET is_active = FALSE WHERE user_id = $1',
      [userId]
    );

    // 2. Salvar cada conta no banco
    for (const account of accounts) {
      await query(`
        INSERT INTO deriv_accounts (user_id, loginid, token, currency, is_virtual, email, fullname, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (user_id, loginid)
        DO UPDATE SET
          token = $3,
          currency = $4,
          is_virtual = $5,
          email = $6,
          fullname = $7,
          is_active = $8
      `, [
        userId,
        account.loginid,
        account.token,
        account.currency,
        account.is_virtual,
        account.email || '',
        account.fullname || '',
        true // Todas ficam ativas inicialmente
      ]);
    }

    // 3. Atualizar usuário principal com primeira conta
    const primaryAccount = accounts[0];
    await query(`
      UPDATE users
      SET deriv_connected = TRUE,
          deriv_account_id = $1,
          deriv_access_token = $2,
          deriv_currency = $3,
          deriv_is_virtual = $4
      WHERE id = $5
    `, [
      primaryAccount.loginid,
      primaryAccount.token,
      primaryAccount.currency,
      primaryAccount.is_virtual,
      userId
    ]);

    console.log(`✅ ${accounts.length} contas salvas com sucesso!`);

    res.json({
      success: true,
      message: `${accounts.length} contas conectadas`,
      accounts: accounts.map(a => ({
        loginid: a.loginid,
        currency: a.currency,
        is_virtual: a.is_virtual
      }))
    });

  } catch (error) {
    console.error('❌ Erro ao salvar contas:', error);
    res.status(500).json({ error: 'Erro ao salvar contas Deriv' });
  }
});

// Nova rota: Buscar TODAS as contas salvas
router.get('/deriv/all-accounts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      'SELECT loginid, currency, is_virtual, email, fullname, is_active FROM deriv_accounts WHERE user_id = $1 ORDER BY is_active DESC, created_at ASC',
      [userId]
    );

    res.json({
      success: true,
      accounts: result.rows
    });

  } catch (error) {
    console.error('❌ Erro ao buscar contas:', error);
    res.status(500).json({ error: 'Erro ao buscar contas' });
  }
});

// Nova rota: Trocar conta ativa
router.post('/deriv/switch-account', authenticateToken, async (req, res) => {
  try {
    const { loginid } = req.body;
    const userId = req.user.id;

    console.log(`🔄 Trocando para conta ${loginid}...`);

    // 1. Buscar token da nova conta
    const accountResult = await query(
      'SELECT token, currency, is_virtual FROM deriv_accounts WHERE user_id = $1 AND loginid = $2',
      [userId, loginid]
    );

    if (accountResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conta não encontrada' });
    }

    const newAccount = accountResult.rows[0];

    // 2. Atualizar conta ativa
    await query('UPDATE deriv_accounts SET is_active = FALSE WHERE user_id = $1', [userId]);
    await query('UPDATE deriv_accounts SET is_active = TRUE WHERE user_id = $1 AND loginid = $2', [userId, loginid]);

    // 3. Atualizar usuário principal
    await query(`
      UPDATE users
      SET deriv_account_id = $1,
          deriv_access_token = $2,
          deriv_currency = $3,
          deriv_is_virtual = $4
      WHERE id = $5
    `, [loginid, newAccount.token, newAccount.currency, newAccount.is_virtual, userId]);

    console.log(`✅ Conta trocada para ${loginid}`);

    res.json({
      success: true,
      message: 'Conta trocada com sucesso',
      account: {
        loginid,
        currency: newAccount.currency,
        is_virtual: newAccount.is_virtual,
        token: newAccount.token
      }
    });

  } catch (error) {
    console.error('❌ Erro ao trocar conta:', error);
    res.status(500).json({ error: 'Erro ao trocar conta' });
  }
});
```

---

### **ETAPA 3: Atualizar Callback OAuth (Frontend)**

**Arquivo:** `client/src/pages/DerivCallback.tsx` - Modificar seção de processamento

```typescript
// Substituir a seção que processa OAuth (linha ~117-147)

} else if (isOperationsPage) {
  // MODO PÁGINA NORMAL: Processar OAuth diretamente na página
  console.log('✅ DERIV CALLBACK PÁGINA: Processando OAuth na página operations...');

  // ✅ CORREÇÃO: Enviar TODAS as contas para o backend
  fetch('/api/auth/deriv/save-all-accounts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({
      accounts: accounts  // ✅ Array completo de contas
    }),
  })
  .then(response => response.json())
  .then(data => {
    console.log('✅ Todas as contas OAuth salvas no backend:', data);
    if (data.success) {
      // Redirecionar para operations sem parâmetros OAuth
      toast.success(`${data.accounts.length} contas conectadas com sucesso!`);

      // Aguardar 1s para garantir que o backend salvou
      setTimeout(() => {
        window.location.href = '/operations';
      }, 1000);
    } else {
      console.error('❌ Erro no backend:', data.error);
      toast.error(data.error || 'Erro ao salvar contas');
    }
  })
  .catch(error => {
    console.error('❌ Erro ao processar OAuth:', error);
    toast.error('Erro ao processar autenticação');
  });
}
```

---

### **ETAPA 4: Corrigir AuthContext para Account Switching**

**Arquivo:** `client/src/contexts/AuthContext.tsx` - Modificar `switchAccount`

```typescript
// Encontrar a função switchAccount e substituir completamente

const switchAccount = useCallback(async (account: DerivAccount, manual: boolean = false) => {
  if (switchAccountRunning.current) {
    console.log('⏭️ AuthContext: switchAccount já está executando');
    return;
  }

  try {
    switchAccountRunning.current = true;
    console.log(`🔄 AuthContext: Trocando para conta ${account.loginid}...`);

    // 1. Chamar backend para trocar conta (atualiza DB e retorna token)
    const response = await api.post('/api/auth/deriv/switch-account', {
      loginid: account.loginid
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Erro ao trocar conta');
    }

    const newAccountData = response.data.account;
    console.log('✅ Backend retornou nova conta:', newAccountData);

    // 2. Atualizar estado local imediatamente
    setCurrentAccount(account);
    updateUser({
      deriv_account_id: newAccountData.loginid,
      deriv_access_token: newAccountData.token,
      deriv_currency: newAccountData.currency,
      deriv_is_virtual: newAccountData.is_virtual
    });

    // 3. Re-autorizar WebSocket com novo token (CRÍTICO!)
    const wsService = (await import('../services/DerivWebSocketService')).default.getInstance();

    if (wsService.getConnectionStatus()) {
      console.log('🔌 Re-autorizando WebSocket com novo token...');
      await wsService.authorize(newAccountData.token);
    } else {
      console.log('🔌 WebSocket desconectado, conectando com novo token...');
      await wsService.connect(newAccountData.token);
    }

    if (manual) {
      toast.success(`Conta trocada para ${account.loginid} (${account.is_virtual ? 'Virtual' : 'Real'})`);
    }

    console.log('✅ Switch de conta concluído com sucesso!');

  } catch (error: any) {
    console.error('❌ AuthContext: Erro ao trocar conta:', error);
    toast.error(error.message || 'Erro ao trocar conta');
  } finally {
    switchAccountRunning.current = false;
  }
}, [updateUser]);
```

---

### **ETAPA 5: Atualizar DerivWebSocketService**

**Arquivo:** `client/src/services/DerivWebSocketService.ts` - Adicionar método `authorize`

```typescript
class DerivWebSocketService {
  // ... código existente ...

  /**
   * Re-autorizar WebSocket com novo token (para account switching)
   */
  public async authorize(token: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket não conectado'));
        return;
      }

      const reqId = ++this.requestId;
      console.log(`🔐 DerivWS: Autorizando com novo token (req_id: ${reqId})...`);

      // Criar timeout para autorização
      const timeout = setTimeout(() => {
        reject(new Error('Timeout na autorização'));
      }, 10000);

      // Handler temporário para resposta de autorização
      const authHandler = (event: MessageEvent) => {
        try {
          const response = JSON.parse(event.data);

          if (response.req_id === reqId) {
            clearTimeout(timeout);
            this.ws?.removeEventListener('message', authHandler);

            if (response.error) {
              console.error('❌ Erro na autorização:', response.error);
              reject(new Error(response.error.message));
              return;
            }

            if (response.authorize) {
              console.log('✅ WebSocket re-autorizado:', {
                loginid: response.authorize.loginid,
                currency: response.authorize.currency,
                is_virtual: response.authorize.is_virtual
              });

              // Atualizar accountData
              this.accountData = {
                loginid: response.authorize.loginid,
                currency: response.authorize.currency,
                balance: response.authorize.balance || 0,
                is_virtual: response.authorize.is_virtual
              };

              resolve(true);
            }
          }
        } catch (error) {
          clearTimeout(timeout);
          this.ws?.removeEventListener('message', authHandler);
          reject(error);
        }
      };

      this.ws.addEventListener('message', authHandler);

      // Enviar requisição de autorização
      this.send({
        authorize: token,
        req_id: reqId
      });
    });
  }

  // ... resto do código ...
}
```

---

### **ETAPA 6: Atualizar DerivAccountPanel**

**Arquivo:** `client/src/components/DerivAccountPanel.tsx` - Atualizar `useEffect` inicial

```typescript
// Substituir useEffect que busca contas (linha ~150-164)

useEffect(() => {
  if (isConnected && user) {
    console.log('🔄 DerivAccountPanel: Usuário conectado, carregando dados...');

    // 1. Carregar informações da conta atual
    loadAccountInfo();

    // 2. Buscar TODAS as contas salvas no backend (uma única vez)
    if (availableAccounts.length === 0) {
      console.log('📥 DerivAccountPanel: Buscando todas as contas do backend...');

      api.get('/api/auth/deriv/all-accounts')
        .then(response => {
          if (response.data.success && response.data.accounts.length > 0) {
            console.log(`✅ ${response.data.accounts.length} contas carregadas do backend`);

            // ✅ CORREÇÃO: Chamar fetchAccounts do AuthContext para atualizar estado global
            // Mas passar as contas como parâmetro para evitar nova requisição
            setAvailableAccountsLocal(response.data.accounts);

            // Notificar usuário
            toast.success(`${response.data.accounts.length} contas Deriv disponíveis`);
          }
        })
        .catch(error => {
          console.error('❌ Erro ao buscar contas:', error);
        });
    } else {
      console.log(`ℹ️ ${availableAccounts.length} contas já carregadas no contexto`);
    }
  }
}, [isConnected, user?.id]); // Executar apenas quando conectar ou trocar usuário
```

---

## 📖 **Como Estudar os Repos Oficiais**

### **champion-trading-automation**
```bash
git clone https://github.com/deriv-com/champion-trading-automation.git
cd champion-trading-automation

# Arquivos importantes:
# - src/contexts/AuthContext.tsx (OAuth + token management)
# - src/stores/AuthStore.ts (Gerenciamento de múltiplas contas)
# - src/services/websocket.ts (WebSocket authorize pattern)
```

**Buscar por:**
- `localStorage.setItem('app_auth')` - Como salvam tokens
- `authorize:` - Como re-autorizam WebSocket
- `account_list` - Como listam contas

---

## 🎯 **Resumo das Correções**

| Problema | Solução | Arquivo |
|----------|---------|---------|
| Backend salva só 1 conta | Criar tabela `deriv_accounts` | `server/database/migrations/*.js` |
| OAuth perde tokens | Salvar TODAS as contas no callback | `server/routes/auth.js` |
| Account switch não funciona | Re-autorizar WebSocket com novo token | `client/src/contexts/AuthContext.tsx` |
| Painel não mostra contas | Buscar do backend via `/all-accounts` | `client/src/components/DerivAccountPanel.tsx` |
| WebSocket não re-autoriza | Adicionar método `authorize()` | `client/src/services/DerivWebSocketService.ts` |

---

## ⚡ **Ordem de Implementação Recomendada**

1. ✅ **ETAPA 1** - Criar tabela `deriv_accounts`
2. ✅ **ETAPA 2** - Adicionar rotas backend
3. ✅ **ETAPA 3** - Atualizar callback OAuth
4. ✅ **ETAPA 4** - Corrigir `switchAccount` no AuthContext
5. ✅ **ETAPA 5** - Adicionar `authorize()` no WebSocketService
6. ✅ **ETAPA 6** - Atualizar DerivAccountPanel

---

## 🧪 **Como Testar**

```bash
# 1. Fazer logout
# 2. Fazer login novamente
# 3. Clicar em "Conectar com Deriv"
# 4. Autorizar no popup
# 5. Voltar para /operations
# 6. Verificar console:
#    ✅ "X contas salvas com sucesso!"
# 7. Clicar no dropdown de contas
# 8. Trocar entre contas real/virtual
# 9. Verificar que saldo atualiza
```

---

## 📞 **Suporte Deriv**

- 📚 Docs: https://developers.deriv.com
- 💬 Community: https://community.deriv.com
- 📧 Email: api-support@deriv.com

---

**✅ Com essas correções, sua plataforma terá o mesmo comportamento dos projetos oficiais da Deriv!**
