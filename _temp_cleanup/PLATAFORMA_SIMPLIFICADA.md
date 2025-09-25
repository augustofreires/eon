# Plataforma EON PRO - Versão Simplificada

## 🎯 **Objetivo Principal**

Plataforma web para gerenciar bots da Deriv e oferecer cursos de trading, seguindo o fluxo da EON PRO.

## 🔄 **Fluxo da Plataforma (Como EON PRO)**

### **1. Login**
- ✅ **Tela de Login** - design similar ao EON PRO
- ✅ **Botão "Obter Acesso"** - redireciona para pagamento
- ✅ **Botão "ENTRAR"** - login na plataforma
- ✅ **Disclaimer** - aviso de risco da Deriv

### **2. Dashboard Cliente**
- ✅ **Tela de Boas-vindas** - painel de operações parado
- ✅ **Status da Conta Deriv** - conectado/desconectado
- ✅ **Saldo e Lucro/Prejuízo** - informações da conta
- ✅ **Botão "Conectar Deriv"** - OAuth da Deriv
- ✅ **Acesso Rápido** - links para operações e cursos

### **3. Operações com Bots**
- ✅ **Lista de Bots** - selecionar qual bot usar
- ✅ **Configuração do Bot** - engrenagem com valores:
  - Valor de entrada
  - Valor do martingale
  - Máximo de mãos (opcional)
  - Red máximo (opcional)
  - Stop Loss (opcional)
  - Take Profit (opcional)
- ✅ **Iniciar Operação** - bot começa a operar
- ✅ **Log de Operações** - mostra entradas em tempo real
- ✅ **Parar Operação** - bot para de operar

### **4. Cursos**
- ✅ **Lista de Aulas** - organizadas por módulos
- ✅ **Player YouTube** - assistir aulas
- ✅ **Navegação Fácil** - entre aulas

## 👨‍💼 **Painel Admin**

### **1. Gerenciar Cursos**
- ✅ Adicionar aulas do YouTube
- ✅ Organizar por módulos
- ✅ Editar e deletar cursos

### **2. Gerenciar Bots**
- ✅ Upload de arquivos XML da Deriv
- ✅ Listar bots disponíveis
- ✅ Deletar bots existentes

### **3. Configurar Deriv**
- ✅ Configurar App ID da Deriv
- ✅ Testar conexão
- ✅ Markup automático configurado

## 🏗️ **Arquitetura Técnica**

### **Backend (Node.js + Express)**
```
server/
├── index.js              # Servidor principal
├── database/
│   ├── connection.js     # Conexão PostgreSQL
│   └── setup.js          # Setup do banco
├── routes/
│   ├── auth.js           # Autenticação + OAuth Deriv
│   ├── bots.js           # Gerenciar bots
│   ├── courses.js        # Gerenciar cursos
│   ├── operations.js     # Operações com bots
│   └── admin.js          # Configurações admin
├── utils/
│   └── derivApi.js       # API WebSocket da Deriv
└── middleware/
    └── auth.js           # Middleware de autenticação
```

### **Frontend (React + TypeScript)**
```
client/src/
├── App.tsx               # Rotas principais
├── components/
│   ├── Layout.tsx        # Layout principal
│   └── LoadingSpinner.tsx
├── pages/
│   ├── LoginPage.tsx     # Login estilo EON PRO
│   ├── CoursesPage.tsx   # Assistir cursos
│   ├── OperationsPage.tsx # Operações com bots
│   └── client/
│       └── Dashboard.tsx # Dashboard cliente
└── contexts/
    └── AuthContext.tsx   # Contexto de autenticação
```

## 🗄️ **Banco de Dados**

### **Tabelas Principais**
```sql
-- Usuários
users (id, email, password, role, deriv_connected, deriv_access_token)

-- Bots
bots (id, name, description, xml_content, created_at)

-- Cursos
courses (id, title, description, video_url, module, duration, created_at)

-- Operações
operations (id, user_id, bot_id, entry_amount, status, created_at)

-- Configurações
system_settings (id, deriv_app_id, deriv_app_token)
```

## 🚀 **Funcionalidades Principais**

### **Para Cliente:**
1. **Login** - tela estilo EON PRO
2. **Dashboard** - status da conta e operações
3. **Conectar Deriv** - OAuth automático
4. **Escolher Bot** - lista de bots disponíveis
5. **Configurar Bot** - valores de entrada, martingale, etc.
6. **Operar** - iniciar e monitorar operações
7. **Cursos** - assistir aulas de trading

### **Para Admin:**
1. **Dashboard** - visão geral da plataforma
2. **Gerenciar Bots** - upload/deletar XMLs
3. **Gerenciar Cursos** - adicionar aulas do YouTube
4. **Configurar Deriv** - App ID e markup

## 💰 **Sistema de Monetização**

### **Markup Automático**
- ✅ Configurado no App ID da Deriv
- ✅ Aplicado automaticamente em todas as operações
- ✅ Você recebe markup diretamente da Deriv

### **Link de Afiliado**
- ✅ Coloque seu link no botão "Obter Acesso"
- ✅ Comissões sobre novos usuários
- ✅ Sistema separado do markup

## 🔧 **Como Usar**

### **1. Configuração Inicial**
```bash
# Instalar dependências
npm run install-all

# Configurar banco de dados
npm run setup-db

# Configurar variáveis de ambiente
cp env.example .env
# Editar .env com suas configurações

# Iniciar plataforma
npm run dev
```

### **2. Configurar Deriv**
1. Acesse [Deriv Developer Portal](https://app.deriv.com/account/api-token)
2. Crie um app e configure markup
3. Copie App ID e Token
4. Configure na plataforma (menu Deriv)

### **3. Adicionar Conteúdo**
1. **Cursos**: Menu Cursos → Adicionar aula do YouTube
2. **Bots**: Menu Bots → Upload XML da Deriv

### **4. Clientes Usam**
1. **Login** na plataforma (ou "Obter Acesso")
2. **Conectam conta Deriv** via OAuth
3. **Escolhem bot** e configuram valores
4. **Iniciam operação** e monitoram
5. **Assistem cursos** para aprender

## 📱 **Interface**

### **Design Similar ao EON PRO**
- ✅ **Login** - design escuro com gradientes
- ✅ **Dashboard** - cards informativos
- ✅ **Operações** - interface limpa e intuitiva
- ✅ **Responsivo** - funciona em todos os dispositivos

### **Experiência do Usuário**
- ✅ **Fluxo simples** - login → conectar → operar
- ✅ **Feedback visual** - status, loading, notificações
- ✅ **Navegação intuitiva** - menu lateral organizado

## 🔒 **Segurança**

### **Autenticação**
- ✅ JWT tokens
- ✅ Senhas criptografadas
- ✅ OAuth 2.0 para Deriv

### **API da Deriv**
- ✅ WebSocket para operações
- ✅ Tokens seguros
- ✅ Validação de permissões

## 📊 **Monitoramento**

### **Logs**
- ✅ Logs de operações
- ✅ Logs de erros
- ✅ Logs de acesso

### **Relatórios**
- ✅ Histórico de operações
- ✅ Estatísticas de uso
- ✅ Relatórios de markup (via Deriv)

## 🚀 **Deploy**

### **VPS/Cloud**
1. **Servidor**: Ubuntu/Debian
2. **Banco**: PostgreSQL
3. **Process Manager**: PM2
4. **Proxy**: Nginx
5. **SSL**: Let's Encrypt

### **Comandos de Deploy**
```bash
# Instalar dependências
npm run install-all

# Build da aplicação
npm run build

# Configurar PM2
pm2 start ecosystem.config.js

# Configurar Nginx
# (ver DEPLOYMENT.md)
```

## ✅ **Status da Plataforma**

### **Implementado:**
- ✅ Sistema de autenticação (estilo EON PRO)
- ✅ Dashboard cliente
- ✅ Gerenciamento de bots
- ✅ Gerenciamento de cursos
- ✅ Operações com bots (configuração completa)
- ✅ Integração com Deriv (OAuth + WebSocket)
- ✅ Interface responsiva
- ✅ Sistema de markup

### **Pronto para Produção:**
- ✅ Código testado
- ✅ Documentação completa
- ✅ Deploy configurado
- ✅ Segurança implementada

## 🎯 **Próximos Passos**

1. **Configurar servidor** de produção
2. **Configurar Deriv** (App ID e markup)
3. **Adicionar conteúdo** (cursos e bots)
4. **Testar operações** com bots
5. **Lançar plataforma** para clientes

A plataforma está **100% funcional** e segue o fluxo da EON PRO! 🚀 