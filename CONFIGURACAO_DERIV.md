# Configuração da Deriv - Sistema Completo

## Como Funciona

Este sistema foi implementado para funcionar corretamente com a Deriv API:

### 1. App ID da Deriv
- O **App ID** é usado para rastrear todas as operações feitas através da plataforma
- A Deriv aplica automaticamente o markup configurado no seu app
- Não é necessário configurar % de markup na plataforma

### 2. Link de Afiliado
- Você deve colocar seu **link de afiliado** no botão de cadastro da plataforma
- Quando usuários se cadastram através desse link, você ganha comissões
- O sistema de afiliado é separado do markup

### 3. Markup Automático
- O markup é aplicado automaticamente pela Deriv em todas as operações
- É configurado diretamente no seu app na Deriv (ID: 82349)
- Não precisa de configuração adicional na plataforma

### 4. API Tokens
- **Gerenciamento programático** de tokens de API
- **Permissões granulares** (admin, read, trade, payments, trading_information)
- **Segurança** - tokens específicos para cada aplicação
- **Controle total** - criar, listar e deletar tokens

## API da Deriv - WebSocket Completa

O sistema usa a API WebSocket da Deriv para operações em tempo real:

### Endpoint WebSocket
```
wss://ws.binaryws.com/websockets/v3?app_id=SEU_APP_ID
```

### Principais Endpoints Implementados

#### 1. Autorização
```json
{
  "authorize": "TOKEN_DO_USUARIO",
  "req_id": 123456789
}
```

#### 2. Lista de Contas
```json
{
  "account_list": 1,
  "req_id": 123456789
}
```

#### 3. Obter Saldo
```json
{
  "balance": 1,
  "account": "current",
  "subscribe": 0,
  "req_id": 123456789
}
```

#### 4. Fazer Proposta
```json
{
  "proposal": 1,
  "amount": 10.00,
  "basis": "stake",
  "contract_type": "CALL",
  "currency": "USD",
  "duration": 5,
  "duration_unit": "t",
  "symbol": "R_100",
  "req_id": 123456789
}
```

#### 5. Comprar Contrato
```json
{
  "buy": 1,
  "price": 10.00,
  "proposal_id": "PROPOSAL_ID",
  "req_id": 123456789
}
```

#### 6. Vender Contrato
```json
{
  "sell": "CONTRACT_ID",
  "price": 0,
  "req_id": 123456789
}
```

#### 7. Informações do Contrato
```json
{
  "proposal_open_contract": 1,
  "contract_id": "CONTRACT_ID",
  "subscribe": 0,
  "req_id": 123456789
}
```

#### 8. Histórico de Transações
```json
{
  "transaction": 1,
  "action_type": "all",
  "date_from": "2024-01-01 00:00:00",
  "date_to": "2024-01-31 23:59:59",
  "limit": 1000,
  "offset": 0,
  "subscribe": 0,
  "req_id": 123456789
}
```

#### 9. Detalhes de Markup do App
```json
{
  "app_markup_details": 1,
  "app_id": 82349,
  "client_loginid": "CR12345",
  "date_from": "2024-01-01 00:00:00",
  "date_to": "2024-01-31 23:59:59",
  "description": 1,
  "limit": 1000,
  "offset": 0,
  "sort": "DESC",
  "req_id": 123456789
}
```

#### 10. Histórico de Contratos
```json
{
  "history": 1,
  "action_type": "all",
  "date_from": "2024-01-01 00:00:00",
  "date_to": "2024-01-31 23:59:59",
  "limit": 1000,
  "offset": 0,
  "req_id": 123456789
}
```

#### 11. Ticks em Tempo Real
```json
{
  "ticks": "R_100",
  "subscribe": 1,
  "req_id": 123456789
}
```

#### 12. Cancelar Assinatura
```json
{
  "forget": "SUBSCRIPTION_ID",
  "req_id": 123456789
}
```

#### 13. Informações da Aplicação
```json
{
  "app": 1,
  "req_id": 123456789
}
```

#### 14. Símbolos Disponíveis
```json
{
  "trading_times": "all",
  "req_id": 123456789
}
```

#### 15. Configurações da Conta
```json
{
  "get_settings": 1,
  "req_id": 123456789
}
```

#### 16. Limites da Conta
```json
{
  "get_limits": 1,
  "req_id": 123456789
}
```

#### 17. Estatísticas de Trading
```json
{
  "statement": 1,
  "action_type": "all",
  "date_from": "2024-01-01 00:00:00",
  "date_to": "2024-01-31 23:59:59",
  "limit": 1000,
  "offset": 0,
  "req_id": 123456789
}
```

#### 18. Gerenciar API Tokens
```json
{
  "api_token": 1,
  "new_token": "Nome do Token",
  "new_token_scopes": ["read", "trade"],
  "valid_for_current_ip_only": 0,
  "req_id": 123456789
}
```

## Configuração Necessária

### 1. Obter App ID da Deriv
1. Acesse [Deriv Developer Portal](https://app.deriv.com/account/api-token)
2. Vá em **Applications** → **Applications Manager**
3. Crie um novo app ou use o existente (ID: 82349)
4. Configure o markup desejado no app
5. Copie o **App ID** e **App Token**

### 2. Configurar na Plataforma
1. Faça login como admin
2. Vá em **Deriv** no menu lateral
3. Insira o **App ID** e **App Token**
4. Clique em **Testar Conexão** para verificar
5. Salve as configurações

### 3. Gerenciar API Tokens
1. Vá em **API Tokens** no menu lateral
2. Clique em **Criar Novo Token**
3. Configure nome e permissões
4. Use o token gerado para operações específicas

### 4. Link de Afiliado
1. Obtenha seu link de afiliado na Deriv
2. Coloque esse link no botão de cadastro da plataforma
3. Exemplo: `https://deriv.com/signup?sidc=SEU_TOKEN&utm_campaign=SUA_PLATAFORMA`

## Estrutura do Banco de Dados

### Tabela `system_settings`
```sql
CREATE TABLE system_settings (
  id SERIAL PRIMARY KEY,
  deriv_app_id VARCHAR(50),
  deriv_app_token TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tabela `users`
```sql
-- Campos adicionados para Deriv
deriv_access_token TEXT,
deriv_refresh_token TEXT,
deriv_account_id VARCHAR(50),
deriv_connected BOOLEAN DEFAULT FALSE
```

### Tabela `operations`
```sql
-- Campos para operações
deriv_contract_id VARCHAR(50),
entry_amount DECIMAL(15,2),
martingale BOOLEAN DEFAULT FALSE,
max_gain DECIMAL(15,2),
max_loss DECIMAL(15,2)
```

## Fluxo de Operação Completo

1. **Usuário conecta conta Deriv** via OAuth
2. **Sistema obtém lista de contas** do usuário
3. **Seleciona conta para operar** (real ou virtual)
4. **Seleciona um bot** disponível
5. **Configura parâmetros** (valor entrada, martingale, etc.)
6. **Sistema conecta WebSocket** da Deriv
7. **Autoriza usuário** com token
8. **Obtém saldo** da conta selecionada
9. **Faz proposta** de compra
10. **Compra contrato** usando proposal_id
11. **Monitora contrato** em tempo real
12. **Vende contrato** quando necessário
13. **Deriv aplica markup** automaticamente
14. **Você recebe markup** diretamente da Deriv

## Funcionalidades Implementadas

### ✅ **Operações de Trading**
- Iniciar operação com bot
- Parar operação (vender contrato)
- Monitorar status em tempo real
- Histórico de operações

### ✅ **Gestão de Contas**
- Lista de todas as contas do usuário
- Informações detalhadas de cada conta
- Configurações e limites da conta
- Seleção de conta para operar

### ✅ **Relatórios e Analytics**
- Relatório de markup por período
- Histórico de transações
- Estatísticas de trading
- Detalhes de contratos

### ✅ **Monitoramento em Tempo Real**
- WebSocket para atualizações instantâneas
- Status de contratos
- Saldo da conta
- Notificações de eventos

### ✅ **Gestão de Assinaturas**
- Cancelar assinaturas específicas
- Cancelar todas as assinaturas
- Gerenciamento de memória

### ✅ **Informações de Mercado**
- Símbolos disponíveis
- Horários de trading
- Informações de mercado
- Configurações de trading

### ✅ **Gerenciamento de API Tokens**
- Criar tokens com permissões específicas
- Listar todos os tokens existentes
- Deletar tokens não utilizados
- Controle de permissões granulares
- Segurança por IP (opcional)

## Vantagens do Sistema Completo

✅ **Operações completas** - compra, venda, monitoramento
✅ **Gestão de contas** - múltiplas contas, seleção inteligente
✅ **Relatórios detalhados** - markup, histórico, analytics
✅ **Tempo real** - WebSocket para todas as operações
✅ **Informações de mercado** - símbolos, horários, configurações
✅ **Gestão de recursos** - cancelamento de assinaturas
✅ **Segurança avançada** - tokens específicos, permissões granulares
✅ **Robustez** - tratamento de erros e timeouts
✅ **Escalabilidade** - suporte a múltiplas operações

## Monitoramento

- As operações são rastreadas pelo App ID
- Você pode ver relatórios de markup no Dashboard da Deriv
- O sistema registra todas as operações no banco de dados
- Status das operações é atualizado em tempo real via WebSocket
- Relatórios detalhados de markup por período
- Estatísticas completas de trading
- Controle total de tokens de API

## Troubleshooting

### Erro de Conexão WebSocket
- Verifique se o App ID está correto
- Confirme se o App Token é válido
- Teste a conexão no painel admin
- Verifique se a porta 443 está liberada

### Operações não funcionam
- Verifique se o usuário conectou a conta Deriv
- Confirme se o App ID está configurado
- Verifique os logs do servidor
- Teste a conexão WebSocket

### Markup não aparece
- O markup é pago pela Deriv, não pela plataforma
- Verifique seu relatório de markup no Dashboard da Deriv
- Confirme se o App ID está sendo usado nas operações
- Aguarde o processamento da Deriv (pode levar algumas horas)

### Problemas com API Tokens
- Verifique se o token tem as permissões corretas
- Confirme se o token não foi revogado
- Teste a criação de um novo token
- Verifique se o IP está liberado (se configurado)

### Problemas de Performance
- Cancelar assinaturas não utilizadas
- Limitar número de conexões simultâneas
- Implementar pool de conexões WebSocket
- Monitorar uso de memória

## Dependências

### Backend
```json
{
  "ws": "^8.14.2",
  "axios": "^1.5.0",
  "socket.io": "^4.7.2"
}
```

### Frontend
```json
{
  "socket.io-client": "^4.7.2"
}
```

## Endpoints da API

### Operações
- `POST /api/operations/start` - Iniciar operação
- `GET /api/operations/history` - Histórico de operações
- `GET /api/operations/:id` - Detalhes da operação
- `POST /api/operations/:id/stop` - Parar operação
- `GET /api/operations/account-info` - Informações da conta
- `GET /api/operations/symbols` - Símbolos disponíveis
- `GET /api/operations/trading-stats` - Estatísticas de trading

### Admin
- `GET /api/admin/markup-report` - Relatório de markup
- `GET /api/admin/settings` - Configurações
- `PUT /api/admin/settings` - Atualizar configurações
- `POST /api/admin/test-deriv-connection` - Testar conexão
- `GET /api/admin/api-tokens` - Listar tokens de API
- `POST /api/admin/api-tokens` - Criar token de API
- `DELETE /api/admin/api-tokens/:token` - Deletar token de API

## Permissões de API Tokens

### Scopes Disponíveis
- **`admin`** - Acesso administrativo completo
- **`read`** - Leitura de dados da conta
- **`trade`** - Execução de operações de trading
- **`payments`** - Acesso a informações de pagamento
- **`trading_information`** - Informações detalhadas de trading

### Recomendações de Segurança
- Use tokens com permissões mínimas necessárias
- Configure `valid_for_current_ip_only` para maior segurança
- Revogue tokens não utilizados regularmente
- Monitore o uso dos tokens
- Use nomes descritivos para facilitar identificação 