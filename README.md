# 🚀 EON PRO - Plataforma de Trading Inteligente

Uma plataforma completa para gerenciar bots da Deriv e oferecer cursos de trading, seguindo o fluxo da EON PRO.

## 🎯 **Funcionalidades Principais**

### **👨‍💼 Admin**
- ✅ **Gerenciar Cursos** - adicionar aulas do YouTube
- ✅ **Gerenciar Bots** - upload/deletar XMLs da Deriv
- ✅ **Configurar Deriv** - App ID para markup automático
- ✅ **Dashboard** - visão geral da plataforma

### **👤 Cliente**
- ✅ **Login** - tela estilo EON PRO
- ✅ **Dashboard** - status da conta e operações
- ✅ **Conectar Deriv** - OAuth automático
- ✅ **Operações** - escolher bot e configurar valores
- ✅ **Cursos** - assistir aulas de trading

## 🔄 **Fluxo da Plataforma**

1. **Login** → Tela estilo EON PRO com "ENTRAR" e "Obter Acesso"
2. **Dashboard** → Tela de boas-vindas com status da conta Deriv
3. **Conectar Deriv** → OAuth automático
4. **Escolher Bot** → Lista de bots disponíveis
5. **Configurar Bot** → Dialog com engrenagem (entrada, martingale, etc.)
6. **Operar** → Iniciar operação e monitorar log
7. **Cursos** → Assistir aulas do YouTube

## 🏗️ **Arquitetura**

### **Backend**
- **Node.js** + Express.js
- **PostgreSQL** - banco de dados
- **Socket.io** - comunicação em tempo real
- **JWT** - autenticação
- **WebSocket** - API da Deriv

### **Frontend**
- **React** + TypeScript
- **Material-UI** - interface
- **React Router** - navegação
- **Axios** - requisições HTTP

## 💰 **Sistema de Monetização**

### **Markup Automático**
- ✅ Configurado no App ID da Deriv
- ✅ Aplicado automaticamente em todas as operações
- ✅ Você recebe markup diretamente da Deriv

### **Link de Afiliado**
- ✅ Coloque seu link no botão "Obter Acesso"
- ✅ Comissões sobre novos usuários
- ✅ Sistema separado do markup

## 🚀 **Deploy Rápido**

### **1. Instalação Local**
```bash
# Clonar projeto
git clone https://github.com/augustofreires/eon.git
cd eon

# Backend
cd server && npm install && cd ..

# Frontend  
cd client && npm install && cd ..

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas configurações

# Iniciar com Docker
docker-compose up --build -d
```

### **2. Deploy em Produção (VPS)**
```bash
# No seu VPS
git clone https://github.com/augustofreires/eon.git
cd eon

# Configurar ambiente
cp .env.example .env
nano .env

# Deploy com Docker
docker-compose up --build -d

# Configurar banco
docker-compose exec api npm run setup-db
```

### **3. Guias Detalhados**
- [Configuração Contabo VPS](./CONTABO_SETUP_GUIDE.md)
- [Status do Projeto](./STATUS.md)
- [Guia de Deploy](./DEPLOY_GUIDE.md)

## 🔧 **Configuração da Deriv**

1. Acesse [Deriv Developer Portal](https://app.deriv.com/account/api-token)
2. Crie um app e configure markup
3. Copie App ID e Token
4. Configure na plataforma (menu Deriv)

## 📱 **Interface**

- ✅ **Design Responsivo** - funciona em todos os dispositivos
- ✅ **Tema Escuro** - estilo moderno
- ✅ **Navegação Intuitiva** - menu lateral organizado
- ✅ **Feedback Visual** - notificações e loading

## 🔒 **Segurança**

- ✅ **JWT Tokens** - autenticação segura
- ✅ **OAuth 2.0** - integração Deriv
- ✅ **Validação** - dados validados
- ✅ **HTTPS** - conexão segura

## 📊 **Monitoramento**

- ✅ **Logs** - operações e erros
- ✅ **PM2** - gerenciamento de processos
- ✅ **Backup** - banco de dados
- ✅ **SSL** - certificado automático

## 🎯 **Próximos Passos**

1. **Configurar servidor** de produção
2. **Configurar Deriv** (App ID e markup)
3. **Adicionar conteúdo** (cursos e bots)
4. **Testar operações** com bots
5. **Lançar plataforma** para clientes

## 📞 **Suporte**

- **Email**: suporte@eonpro.app.br
- **Telegram**: @eonpro_support
- **Documentação**: [Guia de Deploy](GUIA_DEPLOY.md)

## 📄 **Licença**

Este projeto é privado e proprietário.

---

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

**🎉 A plataforma está 100% funcional e segue o fluxo da EON PRO!** 