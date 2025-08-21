const express = require('express');
const { query } = require('../database/connection');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const DerivAPI = require('../utils/derivApi');

const router = express.Router();

// Dashboard do admin
router.get('/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Estatísticas gerais
    const stats = await query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE role = 'client') as total_clients,
        (SELECT COUNT(*) FROM bots WHERE is_active = true) as total_bots,
        (SELECT COUNT(*) FROM operations WHERE status = 'running') as active_operations,
        (SELECT COUNT(*) FROM courses WHERE is_active = true) as total_courses
    `);

    // Operações recentes
    const recentOperations = await query(`
      SELECT o.*, u.name as user_name, b.name as bot_name
      FROM operations o
      INNER JOIN users u ON o.user_id = u.id
      INNER JOIN bots b ON o.bot_id = b.id
      ORDER BY o.created_at DESC
      LIMIT 10
    `);

    // Usuários recentes
    const recentUsers = await query(`
      SELECT id, name, email, role, status, created_at
      FROM users
      WHERE role = 'client'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    // Bots mais utilizados
    const popularBots = await query(`
      SELECT b.name, COUNT(o.id) as usage_count
      FROM bots b
      LEFT JOIN operations o ON b.id = o.bot_id
      WHERE b.is_active = true
      GROUP BY b.id, b.name
      ORDER BY usage_count DESC
      LIMIT 5
    `);

    res.json({
      stats: stats.rows[0],
      recent_operations: recentOperations.rows,
      recent_users: recentUsers.rows,
      popular_bots: popularBots.rows
    });

  } catch (error) {
    console.error('Erro ao buscar dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Configurações de markup Deriv
router.get('/markup-settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Buscar configurações de markup
    const result = await query(`
      SELECT * FROM system_settings 
      WHERE key IN ('deriv_app_id', 'markup_rate', 'markup_enabled')
    `);

    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });

    res.json({
      settings: {
        deriv_app_id: settings.deriv_app_id || '',
        markup_rate: settings.markup_rate || '0.02',
        markup_enabled: settings.markup_enabled === 'true'
      }
    });

  } catch (error) {
    console.error('Erro ao buscar configurações de afiliado:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar configurações de afiliado
router.put('/affiliate-settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { deriv_app_id, deriv_affiliate_id, commission_rate, affiliate_enabled } = req.body;

    // Validar dados
    if (!deriv_app_id || !deriv_affiliate_id) {
      return res.status(400).json({ error: 'ID do App e ID do Afiliado são obrigatórios' });
    }

    if (commission_rate < 0 || commission_rate > 1) {
      return res.status(400).json({ error: 'Taxa de comissão deve estar entre 0 e 1' });
    }

    // Atualizar ou inserir configurações
    const settings = [
      { key: 'deriv_app_id', value: deriv_app_id },
      { key: 'deriv_affiliate_id', value: deriv_affiliate_id },
      { key: 'commission_rate', value: commission_rate.toString() },
      { key: 'affiliate_enabled', value: affiliate_enabled.toString() }
    ];

    for (const setting of settings) {
      await query(`
        INSERT INTO system_settings (key, value, updated_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (key) 
        DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP
      `, [setting.key, setting.value]);
    }

    res.json({
      message: 'Configurações de afiliado atualizadas com sucesso',
      settings: {
        deriv_app_id,
        deriv_affiliate_id,
        commission_rate,
        affiliate_enabled
      }
    });

  } catch (error) {
    console.error('Erro ao atualizar configurações de afiliado:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Testar conexão com Deriv
router.post('/test-deriv-connection', requireAdmin, async (req, res) => {
  try {
    const { app_id } = req.body;
    
    if (!app_id) {
      return res.status(400).json({ error: 'App ID é obrigatório' });
    }

    // Testar conexão com a Deriv API
    const axios = require('axios');
    const response = await axios.get('https://api.deriv.com/api/v3/application', {
      params: { app_id }
    });

    res.json({ 
      success: true, 
      message: 'Conexão com Deriv estabelecida com sucesso',
      app_info: response.data
    });
  } catch (error) {
    console.error('Erro ao testar conexão Deriv:', error);
    res.status(500).json({ error: 'Erro ao conectar com Deriv' });
  }
});

// Estatísticas de operações
router.get('/operations/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await query(`
      SELECT 
        COUNT(*) as total_operations,
        COUNT(CASE WHEN status = 'running' THEN 1 END) as running_operations,
        COUNT(CASE WHEN status = 'stopped' THEN 1 END) as stopped_operations,
        COUNT(CASE WHEN status = 'paused' THEN 1 END) as paused_operations,
        COUNT(CASE WHEN status = 'error' THEN 1 END) as error_operations,
        SUM(CASE WHEN profit_loss > 0 THEN profit_loss ELSE 0 END) as total_profit,
        SUM(CASE WHEN profit_loss < 0 THEN ABS(profit_loss) ELSE 0 END) as total_loss,
        AVG(profit_loss) as avg_profit_loss
      FROM operations
    `);

    // Operações por período
    const operationsByPeriod = await query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        SUM(profit_loss) as total_profit_loss
      FROM operations
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    res.json({
      stats: stats.rows[0],
      operations_by_period: operationsByPeriod.rows
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas de operações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Estatísticas de bots
router.get('/bots/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await query(`
      SELECT 
        COUNT(*) as total_bots,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_bots,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_bots
      FROM bots
    `);

    // Bots com mais operações
    const botsUsage = await query(`
      SELECT 
        b.name,
        COUNT(o.id) as operations_count,
        AVG(o.profit_loss) as avg_profit_loss,
        SUM(CASE WHEN o.status = 'running' THEN 1 ELSE 0 END) as active_operations
      FROM bots b
      LEFT JOIN operations o ON b.id = o.bot_id
      GROUP BY b.id, b.name
      ORDER BY operations_count DESC
    `);

    res.json({
      stats: stats.rows[0],
      bots_usage: botsUsage.rows
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas de bots:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Relatório de afiliados/markup
router.get('/affiliate/report', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let dateFilter = '';
    let params = [];

    if (start_date && end_date) {
      dateFilter = 'WHERE at.created_at BETWEEN $1 AND $2';
      params = [start_date, end_date];
    }

    const report = await query(`
      SELECT 
        u.name as user_name,
        u.email,
        COUNT(at.id) as total_operations,
        SUM(at.amount) as total_amount,
        SUM(at.commission) as total_commission,
        AVG(at.commission) as avg_commission
      FROM affiliate_tracking at
      INNER JOIN users u ON at.user_id = u.id
      ${dateFilter}
      GROUP BY u.id, u.name, u.email
      ORDER BY total_commission DESC
    `, params);

    const summary = await query(`
      SELECT 
        COUNT(*) as total_tracking,
        SUM(amount) as total_amount,
        SUM(commission) as total_commission,
        AVG(commission) as avg_commission
      FROM affiliate_tracking at
      ${dateFilter}
    `, params);

    res.json({
      report: report.rows,
      summary: summary.rows[0]
    });

  } catch (error) {
    console.error('Erro ao buscar relatório de afiliados:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Relatório de markup
router.get('/markup-report', requireAdmin, async (req, res) => {
  try {
    const { date_from, date_to, client_loginid, limit = 100, offset = 0 } = req.query;

    // Validar datas
    if (!date_from || !date_to) {
      return res.status(400).json({ 
        error: 'Datas de início e fim são obrigatórias (YYYY-MM-DD HH:MM:SS)' 
      });
    }

    // Buscar configurações do app
    const settingsResult = await query('SELECT deriv_app_id FROM system_settings WHERE id = 1');
    if (!settingsResult.rows[0]?.deriv_app_id) {
      return res.status(400).json({ error: 'App ID da Deriv não configurado' });
    }

    const appId = settingsResult.rows[0].deriv_app_id;

    // Aqui você faria a chamada para a API da Deriv
    // Por enquanto, vou simular a resposta
    const mockMarkupData = {
      app_markup_details: {
        transactions: [
          {
            transaction_id: "123456789",
            app_id: appId,
            client_loginid: client_loginid || "CR12345",
            amount: 10.00,
            markup: 0.50,
            currency: "USD",
            transaction_time: date_from,
            description: "Rise/Fall contract"
          }
        ],
        total_count: 1
      }
    };

    res.json({
      success: true,
      data: mockMarkupData,
      summary: {
        total_transactions: mockMarkupData.app_markup_details.total_count,
        total_markup: 0.50,
        period: `${date_from} to ${date_to}`
      }
    });

  } catch (error) {
    console.error('Erro ao gerar relatório de markup:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Configurações do sistema
router.get('/settings', requireAdmin, async (req, res) => {
  try {
    const result = await query('SELECT * FROM system_settings WHERE id = 1');
    res.json(result.rows[0] || {});
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar configurações do sistema
router.put('/settings', requireAdmin, async (req, res) => {
  try {
    const { deriv_app_id, deriv_app_token } = req.body;

    await query(`
      UPDATE system_settings 
      SET deriv_app_id = $1, deriv_app_token = $2, updated_at = NOW()
      WHERE id = 1
    `, [deriv_app_id, deriv_app_token]);

    res.json({ success: true, message: 'Configurações atualizadas com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Logs do sistema
router.get('/logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 100, level } = req.query;

    // Aqui você implementaria a busca de logs do sistema
    // Por enquanto, retornamos logs simulados
    const logs = [
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Sistema iniciado com sucesso',
        user: 'system'
      },
      {
        timestamp: new Date(Date.now() - 60000).toISOString(),
        level: 'info',
        message: 'Novo usuário registrado',
        user: 'admin'
      }
    ];

    res.json({
      logs: logs.slice(0, parseInt(limit)),
      total: logs.length
    });

  } catch (error) {
    console.error('Erro ao buscar logs:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Backup do sistema
router.post('/backup', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Aqui você implementaria a lógica de backup
    // Por enquanto, retornamos uma resposta simulada
    
    const backupInfo = {
      filename: `backup-${Date.now()}.sql`,
      size: '2.5MB',
      created_at: new Date().toISOString(),
      status: 'completed'
    };

    res.json({
      message: 'Backup criado com sucesso',
      backup: backupInfo
    });

  } catch (error) {
    console.error('Erro ao criar backup:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Manutenção do sistema
router.post('/maintenance', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { enabled, message } = req.body;

    // Aqui você implementaria a lógica de modo de manutenção
    // Por enquanto, retornamos uma resposta simulada

    res.json({
      message: `Modo de manutenção ${enabled ? 'ativado' : 'desativado'}`,
      maintenance_mode: enabled,
      maintenance_message: message
    });

  } catch (error) {
    console.error('Erro ao alterar modo de manutenção:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Gerenciar API tokens
router.get('/api-tokens', requireAdmin, async (req, res) => {
  try {
    // Buscar usuário admin
    const userResult = await query('SELECT deriv_access_token FROM users WHERE id = $1', [req.user.id]);
    if (!userResult.rows[0]?.deriv_access_token) {
      return res.status(400).json({ error: 'Token da Deriv não configurado' });
    }

    const derivApi = new DerivAPI();
    await derivApi.connect();

    try {
      // Autorizar usuário
      await derivApi.authorize(userResult.rows[0].deriv_access_token);

      // Listar tokens
      const tokensResponse = await derivApi.listApiTokens();
      
      derivApi.disconnect();

      res.json({
        success: true,
        tokens: tokensResponse.api_token.tokens || []
      });

    } catch (derivError) {
      derivApi.disconnect();
      throw derivError;
    }

  } catch (error) {
    console.error('Erro ao listar tokens:', error);
    res.status(500).json({ error: 'Erro ao listar tokens da API' });
  }
});

// Criar novo token de API
router.post('/api-tokens', requireAdmin, async (req, res) => {
  try {
    const { token_name, scopes = ['read', 'trade'], valid_for_current_ip_only = 0 } = req.body;

    if (!token_name) {
      return res.status(400).json({ error: 'Nome do token é obrigatório' });
    }

    // Validar scopes
    const validScopes = ['admin', 'read', 'trade', 'payments', 'trading_information'];
    const invalidScopes = scopes.filter(scope => !validScopes.includes(scope));
    if (invalidScopes.length > 0) {
      return res.status(400).json({ 
        error: `Scopes inválidos: ${invalidScopes.join(', ')}. Scopes válidos: ${validScopes.join(', ')}` 
      });
    }

    // Buscar usuário admin
    const userResult = await query('SELECT deriv_access_token FROM users WHERE id = $1', [req.user.id]);
    if (!userResult.rows[0]?.deriv_access_token) {
      return res.status(400).json({ error: 'Token da Deriv não configurado' });
    }

    const derivApi = new DerivAPI();
    await derivApi.connect();

    try {
      // Autorizar usuário
      await derivApi.authorize(userResult.rows[0].deriv_access_token);

      // Criar token
      const createResponse = await derivApi.createApiToken(
        token_name, 
        scopes, 
        valid_for_current_ip_only
      );
      
      derivApi.disconnect();

      res.json({
        success: true,
        message: 'Token criado com sucesso',
        token: createResponse.api_token
      });

    } catch (derivError) {
      derivApi.disconnect();
      throw derivError;
    }

  } catch (error) {
    console.error('Erro ao criar token:', error);
    res.status(500).json({ error: 'Erro ao criar token da API' });
  }
});

// Deletar token de API
router.delete('/api-tokens/:token', requireAdmin, async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ error: 'Token é obrigatório' });
    }

    // Buscar usuário admin
    const userResult = await query('SELECT deriv_access_token FROM users WHERE id = $1', [req.user.id]);
    if (!userResult.rows[0]?.deriv_access_token) {
      return res.status(400).json({ error: 'Token da Deriv não configurado' });
    }

    const derivApi = new DerivAPI();
    await derivApi.connect();

    try {
      // Autorizar usuário
      await derivApi.authorize(userResult.rows[0].deriv_access_token);

      // Deletar token
      const deleteResponse = await derivApi.deleteApiToken(token);
      
      derivApi.disconnect();

      res.json({
        success: true,
        message: 'Token deletado com sucesso',
        result: deleteResponse.api_token
      });

    } catch (derivError) {
      derivApi.disconnect();
      throw derivError;
    }

  } catch (error) {
    console.error('Erro ao deletar token:', error);
    res.status(500).json({ error: 'Erro ao deletar token da API' });
  }
});

module.exports = router; 