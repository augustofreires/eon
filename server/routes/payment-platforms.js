const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');

// Middleware de autenticação admin (placeholder - substituir pela implementação real)
const requireAdminAuth = (req, res, next) => {
  // Por enquanto, pular autenticação para desenvolvimento
  // Implementar autenticação real aqui
  next();
};

// Mock database - substitua pela implementação real do seu banco
let paymentPlatforms = [];
let webhookLogs = [];

// Gerar ID único
const generateId = () => Date.now();

// Gerar webhook URL única
const generateWebhookUrl = (platformId) => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5001';
  return `${baseUrl}/api/webhooks/${platformId}`;
};

// Middleware para validar se plataforma existe
const validatePlatformExists = (req, res, next) => {
  const platform = paymentPlatforms.find(p => p.id === parseInt(req.params.id));
  if (!platform) {
    return res.status(404).json({ error: 'Plataforma não encontrada' });
  }
  req.platform = platform;
  next();
};

// GET /api/admin/payment-platforms - Listar todas as plataformas
router.get('/admin/payment-platforms', requireAdminAuth, (req, res) => {
  try {
    const platforms = paymentPlatforms.map(platform => ({
      ...platform,
      // Ocultar dados sensíveis
      config: Object.fromEntries(
        Object.entries(platform.config).map(([key, value]) => [key, value ? '••••••••' : ''])
      )
    }));

    res.json(platforms);
  } catch (error) {
    console.error('Erro ao listar plataformas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/admin/payment-platforms - Criar nova plataforma
router.post('/admin/payment-platforms', [
  requireAdminAuth,
  body('name').notEmpty().withMessage('Nome é obrigatório'),
  body('config').isObject().withMessage('Configuração deve ser um objeto'),
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { name, enabled = true, secret_key, config } = req.body;

    // Verificar se já existe plataforma com mesmo nome
    if (paymentPlatforms.find(p => p.name.toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({ error: 'Já existe uma plataforma com este nome' });
    }

    const id = generateId();
    const webhook_url = generateWebhookUrl(id);

    const newPlatform = {
      id,
      name,
      enabled,
      webhook_url,
      secret_key: secret_key || null,
      config: config || {},
      status: enabled ? 'active' : 'inactive',
      last_webhook: null,
      created_at: new Date().toISOString()
    };

    paymentPlatforms.push(newPlatform);

    console.log(`✅ Nova plataforma criada: ${name} (ID: ${id})`);
    
    res.status(201).json({
      ...newPlatform,
      // Ocultar dados sensíveis na resposta
      config: Object.fromEntries(
        Object.entries(newPlatform.config).map(([key, value]) => [key, value ? '••••••••' : ''])
      )
    });
  } catch (error) {
    console.error('Erro ao criar plataforma:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/admin/payment-platforms/:id - Atualizar plataforma
router.put('/admin/payment-platforms/:id', [
  requireAdminAuth,
  validatePlatformExists,
  body('name').optional().notEmpty().withMessage('Nome não pode estar vazio'),
  body('config').optional().isObject().withMessage('Configuração deve ser um objeto'),
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { name, enabled, secret_key, config } = req.body;
    const platform = req.platform;

    // Verificar nome duplicado (exceto a própria plataforma)
    if (name && paymentPlatforms.find(p => 
      p.id !== platform.id && p.name.toLowerCase() === name.toLowerCase()
    )) {
      return res.status(400).json({ error: 'Já existe uma plataforma com este nome' });
    }

    // Atualizar campos
    if (name !== undefined) platform.name = name;
    if (enabled !== undefined) {
      platform.enabled = enabled;
      platform.status = enabled ? 'active' : 'inactive';
    }
    if (secret_key !== undefined) platform.secret_key = secret_key;
    if (config !== undefined) platform.config = { ...platform.config, ...config };

    console.log(`✅ Plataforma atualizada: ${platform.name} (ID: ${platform.id})`);

    res.json({
      ...platform,
      // Ocultar dados sensíveis na resposta
      config: Object.fromEntries(
        Object.entries(platform.config).map(([key, value]) => [key, value ? '••••••••' : ''])
      )
    });
  } catch (error) {
    console.error('Erro ao atualizar plataforma:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/admin/payment-platforms/:id - Excluir plataforma
router.delete('/admin/payment-platforms/:id', [
  requireAdminAuth,
  validatePlatformExists
], (req, res) => {
  try {
    const platform = req.platform;
    const index = paymentPlatforms.findIndex(p => p.id === platform.id);
    
    paymentPlatforms.splice(index, 1);
    
    console.log(`🗑️ Plataforma excluída: ${platform.name} (ID: ${platform.id})`);
    
    res.json({ message: 'Plataforma excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir plataforma:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/admin/payment-platforms/:id/logs - Ver logs de webhook
router.get('/admin/payment-platforms/:id/logs', [
  requireAdminAuth,
  validatePlatformExists
], (req, res) => {
  try {
    const platformLogs = webhookLogs
      .filter(log => log.platform_id === req.platform.id)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 50); // Últimos 50 logs

    res.json(platformLogs);
  } catch (error) {
    console.error('Erro ao buscar logs:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Função para validar assinatura de webhook (exemplo genérico)
const validateWebhookSignature = (payload, signature, secret) => {
  if (!secret || !signature) return true; // Se não há secret configurado, passa

  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return signature.includes(expectedSignature);
  } catch (error) {
    console.error('Erro ao validar assinatura:', error);
    return false;
  }
};

// POST /api/webhooks/:platformId - Endpoint para receber webhooks
router.post('/webhooks/:platformId', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    const platformId = parseInt(req.params.platformId);
    const platform = paymentPlatforms.find(p => p.id === platformId);

    if (!platform) {
      console.warn(`❌ Webhook recebido para plataforma inexistente: ${platformId}`);
      return res.status(404).json({ error: 'Plataforma não encontrada' });
    }

    if (!platform.enabled) {
      console.warn(`❌ Webhook recebido para plataforma desabilitada: ${platform.name}`);
      return res.status(400).json({ error: 'Plataforma desabilitada' });
    }

    const payload = req.body;
    const signature = req.headers['x-signature'] || req.headers['x-hub-signature'] || req.headers['authorization'];

    // Validar assinatura se configurada
    if (platform.secret_key && !validateWebhookSignature(payload, signature, platform.secret_key)) {
      console.warn(`❌ Assinatura inválida para webhook: ${platform.name}`);
      return res.status(401).json({ error: 'Assinatura inválida' });
    }

    let webhookData;
    try {
      webhookData = typeof payload === 'string' ? JSON.parse(payload) : payload;
    } catch (error) {
      console.error('❌ Erro ao parsear JSON do webhook:', error);
      return res.status(400).json({ error: 'Payload JSON inválido' });
    }

    // Log do webhook
    const logEntry = {
      id: generateId(),
      platform_id: platformId,
      platform_name: platform.name,
      payload: webhookData,
      headers: req.headers,
      timestamp: new Date().toISOString(),
      status: 'received'
    };

    webhookLogs.push(logEntry);

    // Atualizar último webhook da plataforma
    platform.last_webhook = new Date().toISOString();
    platform.status = 'active';

    console.log(`📦 Webhook recebido: ${platform.name} (ID: ${platformId})`);

    // Aqui você pode adicionar a lógica específica para cada plataforma
    // Por exemplo, processar o pagamento e ativar o usuário
    processWebhookPayment(platform, webhookData, logEntry);

    res.json({ success: true, message: 'Webhook processado com sucesso' });

  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Função para processar pagamento do webhook
const processWebhookPayment = async (platform, webhookData, logEntry) => {
  try {
    // Extrair dados do webhook baseado na plataforma
    let customerEmail, customerName, transactionId, status, amount;

    switch (platform.name.toLowerCase()) {
      case 'perfectpay':
        customerEmail = webhookData.customer?.email;
        customerName = webhookData.customer?.name;
        transactionId = webhookData.transaction?.id;
        status = webhookData.transaction?.status;
        amount = webhookData.transaction?.amount;
        break;

      case 'hotmart':
        customerEmail = webhookData.data?.buyer?.email;
        customerName = webhookData.data?.buyer?.name;
        transactionId = webhookData.data?.purchase?.transaction;
        status = webhookData.data?.purchase?.status;
        amount = webhookData.data?.purchase?.price?.value;
        break;

      case 'kirvano':
        customerEmail = webhookData.customer_email;
        customerName = webhookData.customer_name;
        transactionId = webhookData.transaction_id;
        status = webhookData.status;
        amount = webhookData.amount;
        break;

      case 'monetizze':
        customerEmail = webhookData.comprador?.email;
        customerName = webhookData.comprador?.nome;
        transactionId = webhookData.transacao?.codigo_transacao;
        status = webhookData.transacao?.status;
        amount = webhookData.transacao?.valor;
        break;

      default:
        console.warn(`⚠️ Plataforma não suportada para processamento: ${platform.name}`);
        return;
    }

    if (!customerEmail || !transactionId) {
      console.warn(`⚠️ Dados insuficientes no webhook: ${platform.name}`);
      logEntry.status = 'insufficient_data';
      return;
    }

    // Verificar se é um pagamento aprovado
    const approvedStatuses = ['approved', 'completed', 'paid', 'success', 'aprovado', 'completo'];
    const isApproved = approvedStatuses.some(s => 
      status?.toLowerCase().includes(s.toLowerCase())
    );

    if (!isApproved) {
      console.log(`ℹ️ Pagamento não aprovado: ${status} (${platform.name})`);
      logEntry.status = 'not_approved';
      return;
    }

    // Aqui você integraria com seu sistema de usuários
    // Por exemplo:
    // await activateUserAccess(customerEmail, customerName, transactionId, amount);

    console.log(`✅ Pagamento processado: ${customerEmail} via ${platform.name}`);
    logEntry.status = 'processed';
    logEntry.customer_email = customerEmail;
    logEntry.transaction_id = transactionId;

  } catch (error) {
    console.error('❌ Erro ao processar pagamento:', error);
    logEntry.status = 'error';
    logEntry.error = error.message;
  }
};

// Função placeholder para ativar acesso do usuário
const activateUserAccess = async (email, name, transactionId, amount) => {
  // Implementar integração com banco de dados de usuários
  console.log(`🔓 Ativando acesso para: ${email}`);
  
  // Exemplo de implementação:
  // 1. Buscar/criar usuário no banco
  // 2. Ativar acesso premium
  // 3. Enviar email de boas-vindas
  // 4. Registrar transação
};

module.exports = router;