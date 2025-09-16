# 🔧 Diagnóstico e Correção do Seletor de Contas Deriv

## 📋 Análise da Implementação Atual

**IMPORTANTE**: O seletor de contas **JÁ ESTÁ IMPLEMENTADO** e funcionando corretamente no código. O problema está nos dados, não na lógica do frontend.

### ✅ O que está funcionando:

1. **Backend (`server/routes/auth.js`)**:
   - ✅ Endpoint `/api/auth/deriv/account-info` retorna `available_accounts`
   - ✅ Endpoint `/api/auth/deriv/switch-account` funciona
   - ✅ Parse do campo `deriv_accounts_tokens` implementado

2. **Frontend (`DerivAccountPanel.tsx`)**:
   - ✅ Interface `available_accounts` definida (linhas 51-56)
   - ✅ Menu de contas implementado (linhas 247-308, 419-479)
   - ✅ Renderização dinâmica das contas (linhas 259-281)
   - ✅ Função `handleSwitchAccount` funcionando (linha 107)

## 🔍 Possíveis Causas do Problema

### 1. **Campo `deriv_accounts_tokens` está vazio/nulo**
```sql
-- Verificar no banco
SELECT deriv_account_id, deriv_accounts_tokens FROM users WHERE deriv_connected = true;
```

**Causa**: Durante o OAuth, apenas uma conta foi capturada ao invés de todas.

### 2. **Usuário tem apenas uma conta na Deriv**
- Usuário pode ter apenas conta virtual OU apenas conta real
- Isso é normal e esperado para alguns usuários

### 3. **Erro no parsing JSON do `deriv_accounts_tokens`**
```javascript
// Backend atual (linha 1177):
availableAccounts = JSON.parse(user.deriv_accounts_tokens);
```

## 🛠️ Soluções Propostas

### 📊 **ETAPA 1: Diagnóstico na VPS**

Execute os scripts criados:

```bash
# 1. Debug do endpoint account-info
./deploy-debug-account-selector.sh

# 2. Verificação do banco de dados
psql -U postgres -d eon_pro -f check-deriv-accounts-db.sql
```

### 🔧 **ETAPA 2: Correções Baseadas no Diagnóstico**

#### Se `deriv_accounts_tokens` está vazio:

**Solução A: Forçar re-OAuth para capturar todas as contas**

```javascript
// Adicionar ao processo OAuth (server/routes/auth.js)
// Durante o processamento do callback, buscar TODAS as contas

// No endpoint process-callback, após autorizar:
ws.send(JSON.stringify({
  get_account_status: 1,
  req_id: 3
}));

// Capturar resposta e salvar TODAS as contas disponíveis
```

#### Se usuário tem apenas uma conta:

**Solução B: Melhorar UX para usuários com uma conta**

```typescript
// Em DerivAccountPanel.tsx, linhas 258-307
{accountInfo?.available_accounts && accountInfo.available_accounts.length > 1 ? (
  // Mostrar seletor de múltiplas contas
  accountInfo.available_accounts.map(...)
) : (
  // Mostrar informação de conta única
  <MenuItem disabled sx={{ color: '#B0B0B0' }}>
    <Box>
      <Typography variant="body2">
        Apenas uma conta disponível
      </Typography>
      <Typography variant="caption">
        {accountInfo?.account.is_virtual ? 'Virtual' : 'Real'} • {accountInfo?.account.currency}
      </Typography>
    </Box>
  </MenuItem>
)}
```

### 🎯 **ETAPA 3: Implementar Melhorias Robustas**

#### Melhoria 1: Fallback para uma conta

```typescript
// Em DerivAccountPanel.tsx, após linha 282
) : (
  // Fallback melhorado para uma conta
  <MenuItem disabled sx={{ color: '#B0B0B0' }}>
    <Box>
      <Typography variant="body2" sx={{ color: '#ffffff' }}>
        {accountInfo?.account.id} (Única conta)
      </Typography>
      <Typography variant="caption" sx={{ color: '#B0B0B0' }}>
        {accountInfo?.account.is_virtual ? 'Virtual' : 'Real'} • {accountInfo?.account.currency}
      </Typography>
    </Box>
  </MenuItem>
)}
```

#### Melhoria 2: Debug logging no frontend

```typescript
// Adicionar após linha 75 em DerivAccountPanel.tsx
console.log('🔍 AccountInfo DEBUG:', {
  hasAccountInfo: !!accountInfo,
  availableAccounts: accountInfo?.available_accounts,
  accountsCount: accountInfo?.available_accounts?.length || 0,
  currentAccount: accountInfo?.account
});
```

#### Melhoria 3: Validação robusta no backend

```javascript
// Em server/routes/auth.js, linha 1202, melhorar:
available_accounts: Array.isArray(availableAccounts) && availableAccounts.length > 0
  ? availableAccounts.map(acc => ({
      loginid: acc.loginid,
      currency: acc.currency,
      is_virtual: acc.is_virtual
    }))
  : [{
      loginid: user.deriv_account_id,
      currency: user.deriv_currency || 'USD',
      is_virtual: user.deriv_is_virtual
    }]
```

## 🚀 Plano de Execução

1. **Execute o diagnóstico**: Use os scripts criados para identificar a causa exata
2. **Identifique o cenário**:
   - Dados vazios → Reconectar OAuth
   - Uma conta → Melhorar UX
   - Múltiplas contas → Verificar logs do frontend
3. **Aplique a correção apropriada**: Baseado no diagnóstico
4. **Teste**: Verifique se o seletor mostra as contas corretas

## 📝 Arquivos Criados para Debug

1. `debug-account-info-api.js` - Script Node.js para testar o endpoint
2. `check-deriv-accounts-db.sql` - Queries SQL para verificar dados do banco
3. `deploy-debug-account-selector.sh` - Script de deployment automático

## 💡 Conclusão

O seletor de contas **JÁ ESTÁ IMPLEMENTADO CORRETAMENTE**. O problema está nos dados sendo retornados pelo backend, não na lógica do frontend. Execute o diagnóstico para identificar a causa específica e aplicar a correção apropriada.