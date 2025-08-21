# 🎯 Configuração do Sistema de Afiliado Deriv

## 📋 Como Funciona o Sistema de Comissões

O sistema de afiliado da plataforma funciona da seguinte forma:

### 🔄 **Fluxo de Rastreamento**
1. **Cliente faz login** na plataforma
2. **Conecta sua conta Deriv** via OAuth
3. **Inicia uma operação** com um bot
4. **Sistema automaticamente** rastreia a operação com seu ID de afiliado
5. **Comissão é calculada** e registrada no banco de dados
6. **Relatórios detalhados** são gerados no painel admin

### 💰 **Cálculo de Comissões**
- **Base**: Valor de entrada da operação
- **Taxa**: Configurável (padrão: 5%)
- **Fórmula**: `Comissão = Valor Entrada × Taxa de Comissão`

## 🛠️ **Como Configurar**

### **1. Obter Credenciais da Deriv**

#### **Passo 1: Registrar Aplicação**
1. Acesse [Deriv Developer Portal](https://developers.deriv.com/)
2. Faça login com sua conta Deriv
3. Vá em "My Apps" → "Register App"
4. Preencha os dados da aplicação:
   - **App Name**: Deriv Bots Platform
   - **App Description**: Plataforma de bots de trading
   - **Redirect URL**: `https://seudominio.com/oauth-callback`
   - **Scopes**: `read`, `trade`, `payments`

#### **Passo 2: Obter App ID**
- Após registrar, você receberá um **App ID**
- Exemplo: `12345`

#### **Passo 3: Obter ID de Afiliado**
1. Acesse [Deriv Affiliate Program](https://deriv.com/partners/)
2. Faça login e registre-se como afiliado
3. Obtenha seu **Affiliate ID**
- Exemplo: `67890`

### **2. Configurar na Plataforma**

#### **Acesso ao Painel Admin**
1. Faça login como admin: `admin@derivbots.com` / `admin123456`
2. Vá em **"Afiliado"** no menu lateral
3. Preencha as configurações:

```
ID do App Deriv: 12345
ID do Afiliado: 67890
Taxa de Comissão: 0.05 (5%)
Habilitar Rastreamento: ✅
```

#### **Testar Conexão**
1. Clique em **"Testar Conexão"**
2. Verifique se a conexão está funcionando
3. Salve as configurações

## 📊 **Monitoramento de Comissões**

### **Relatórios Disponíveis**
- **Dashboard**: Visão geral das comissões
- **Relatório Detalhado**: Por usuário, período, valor
- **Histórico**: Todas as operações rastreadas
- **Exportação**: Dados em CSV/Excel

### **Métricas Importantes**
- **Total de Operações**: Quantidade de trades rastreados
- **Valor Total**: Soma de todas as entradas
- **Comissões Geradas**: Valor total de comissões
- **Taxa de Conversão**: % de usuários que operam

## 🔧 **Configuração Técnica**

### **Variáveis de Ambiente**
```env
DERIV_APP_ID=seu_app_id_aqui
DERIV_AFFILIATE_ID=seu_affiliate_id_aqui
COMMISSION_RATE=0.05
AFFILIATE_ENABLED=true
```

### **APIs Utilizadas**
- **OAuth 2.0**: Autenticação de usuários
- **WebSocket API**: Operações em tempo real
- **Affiliate API**: Rastreamento de comissões

### **Banco de Dados**
```sql
-- Tabela de rastreamento
CREATE TABLE affiliate_tracking (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  operation_id INTEGER REFERENCES operations(id),
  amount DECIMAL(15,2),
  commission DECIMAL(15,2),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de configurações
CREATE TABLE system_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🎯 **Estratégias de Monetização**

### **1. Taxa Fixa por Operação**
- **Vantagem**: Previsível e simples
- **Exemplo**: 5% de cada entrada
- **Ideal para**: Plataformas com volume alto

### **2. Taxa Variável por Volume**
- **Vantagem**: Incentiva operações maiores
- **Exemplo**: 3% até $100, 5% acima de $100
- **Ideal para**: Plataformas premium

### **3. Taxa por Resultado**
- **Vantagem**: Alinhado com sucesso do cliente
- **Exemplo**: 10% dos lucros
- **Ideal para**: Bots com alta performance

## 📈 **Otimização de Receitas**

### **Boas Práticas**
1. **Teste diferentes taxas** para encontrar o equilíbrio
2. **Monitore a conversão** de usuários
3. **Ofereça incentivos** para operações maiores
4. **Mantenha transparência** com os usuários
5. **Analise relatórios** regularmente

### **Métricas a Acompanhar**
- **CTR (Click Through Rate)**: % de usuários que operam
- **ARPU (Average Revenue Per User)**: Receita média por usuário
- **LTV (Lifetime Value)**: Valor total por usuário
- **Churn Rate**: Taxa de abandono

## 🔒 **Segurança e Compliance**

### **Proteções Implementadas**
- **Validação de tokens**: Verificação de autenticidade
- **Rate limiting**: Prevenção de abusos
- **Logs detalhados**: Auditoria completa
- **Backup automático**: Proteção de dados

### **Compliance**
- **GDPR**: Proteção de dados pessoais
- **LGPD**: Lei Geral de Proteção de Dados
- **Transparência**: Informações claras sobre comissões
- **Consentimento**: Usuários devem aceitar os termos

## 🚀 **Deploy em Produção**

### **Checklist de Configuração**
- [ ] Credenciais Deriv configuradas
- [ ] SSL/HTTPS ativo
- [ ] Banco de dados otimizado
- [ ] Monitoramento configurado
- [ ] Backup automático ativo
- [ ] Logs estruturados
- [ ] Rate limiting configurado

### **Monitoramento**
```bash
# Verificar status da aplicação
pm2 status

# Verificar logs
pm2 logs deriv-bots-server

# Verificar banco de dados
psql -d deriv_bots_db -c "SELECT COUNT(*) FROM affiliate_tracking;"
```

## 📞 **Suporte e Troubleshooting**

### **Problemas Comuns**

#### **1. Conexão Deriv Falha**
```bash
# Verificar credenciais
curl "https://ws.binaryws.com/websockets/v3?app_id=SEU_APP_ID&authorize=test"
```

#### **2. Comissões Não Registradas**
- Verificar se o rastreamento está habilitado
- Confirmar se o ID de afiliado está correto
- Verificar logs de operações

#### **3. Performance Lenta**
- Otimizar consultas do banco
- Implementar cache Redis
- Monitorar uso de recursos

### **Contatos de Suporte**
- **Deriv Developer Support**: developers@deriv.com
- **Documentação**: https://developers.deriv.com/
- **Comunidade**: https://community.deriv.com/

## 📋 **Checklist Final**

### **Antes do Lançamento**
- [ ] Credenciais Deriv testadas
- [ ] Sistema de comissões funcionando
- [ ] Relatórios gerando corretamente
- [ ] Interface admin configurada
- [ ] Backup configurado
- [ ] Monitoramento ativo
- [ ] Documentação atualizada

### **Após o Lançamento**
- [ ] Monitorar primeiras operações
- [ ] Verificar comissões registradas
- [ ] Analisar métricas de conversão
- [ ] Ajustar taxas se necessário
- [ ] Coletar feedback dos usuários
- [ ] Otimizar baseado nos dados

---

**🎉 Com essas configurações, você estará pronto para receber comissões da Deriv através da sua plataforma!** 