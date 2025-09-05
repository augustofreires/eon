const express = require('express');
const { query } = require('../database/connection');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const DerivAPI = require('../utils/derivApi');

const router = express.Router();

// Listar todos os usuários
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT id, email, role, status as active, 
             deriv_connected, created_at
      FROM users 
      WHERE role != 'admin'
      ORDER BY created_at DESC
    `);

    const users = result.rows.map(user => ({
      ...user,
      active: user.active === 'active'
    }));

    res.json({
      users,
      total: users.length
    });

  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo usuário
router.post('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role = 'client' } = req.body;

    // Validações
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
    }

    if (!['client', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Função deve ser client ou admin' });
    }

    // Verificar se email já existe
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Este email já está em uso' });
    }

    // Hash da senha
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar usuário
    const result = await query(`
      INSERT INTO users (name, email, password, role, status, created_at) 
      VALUES ($1, $2, $3, $4, 'active', CURRENT_TIMESTAMP) 
      RETURNING id, name, email, role, status as active, created_at
    `, [name, email, hashedPassword, role]);

    const newUser = {
      ...result.rows[0],
      active: result.rows[0].active === 'active',
      deriv_connected: false
    };

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      user: newUser
    });

  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter dados de um usuário específico
router.get('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT id, name, email, role, status as active, 
             deriv_connected, created_at
      FROM users 
      WHERE id = $1 AND role != 'admin'
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const user = {
      ...result.rows[0],
      active: result.rows[0].active === 'active'
    };

    res.json({ user });

  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Editar usuário
router.put('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, password } = req.body;

    // Validações
    if (!name || !email) {
      return res.status(400).json({ error: 'Nome e email são obrigatórios' });
    }

    if (role && !['client', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Função deve ser client ou admin' });
    }

    // Verificar se usuário existe
    const existingUser = await query('SELECT id FROM users WHERE id = $1 AND role != $2', [id, 'admin']);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verificar se email já está em uso por outro usuário
    const emailCheck = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, id]);
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Este email já está em uso por outro usuário' });
    }

    let updateQuery = 'UPDATE users SET name = $1, email = $2';
    let params = [name, email];
    let paramCount = 2;

    if (role) {
      paramCount++;
      updateQuery += `, role = $${paramCount}`;
      params.push(role);
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
      }
      
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(password, 10);
      paramCount++;
      updateQuery += `, password = $${paramCount}`;
      params.push(hashedPassword);
    }

    paramCount++;
    updateQuery += ` WHERE id = $${paramCount} RETURNING id, name, email, role, status as active, deriv_connected, created_at`;
    params.push(id);

    const result = await query(updateQuery, params);

    const updatedUser = {
      ...result.rows[0],
      active: result.rows[0].active === 'active'
    };

    res.json({
      message: 'Usuário atualizado com sucesso',
      user: updatedUser
    });

  } catch (error) {
    console.error('Erro ao editar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar usuário
router.delete('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se usuário existe e não é admin
    const existingUser = await query('SELECT id, email FROM users WHERE id = $1 AND role != $2', [id, 'admin']);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Deletar relacionamentos primeiro (se existirem)
    await query('DELETE FROM operations WHERE user_id = $1', [id]);
    await query('DELETE FROM bank_records WHERE user_id = $1', [id]);
    await query('DELETE FROM deriv_accounts WHERE user_id = $1', [id]);
    
    // Deletar usuário
    await query('DELETE FROM users WHERE id = $1', [id]);

    res.json({
      message: 'Usuário deletado com sucesso',
      email: existingUser.rows[0].email
    });

  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Alterar status do usuário
router.put('/users/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    if (typeof active !== 'boolean') {
      return res.status(400).json({ error: 'Status deve ser true ou false' });
    }

    const status = active ? 'active' : 'inactive';
    
    await query(
      'UPDATE users SET status = $1 WHERE id = $2 AND role != $3',
      [status, id, 'admin']
    );

    res.json({
      message: `Usuário ${active ? 'ativado' : 'desativado'} com sucesso`
    });

  } catch (error) {
    console.error('Erro ao alterar status do usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

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
      SET deriv_app_id = $1, deriv_app_token = $2, updated_at = CURRENT_TIMESTAMP
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

// Configurações de tema
router.get('/theme-config', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await query('SELECT * FROM theme_config ORDER BY created_at DESC LIMIT 1');
    res.json({ theme: result.rows[0] || null });
  } catch (error) {
    console.error('Erro ao buscar configuração do tema:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/theme-config', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { theme } = req.body;
    
    console.log('🎨 [SERVER] Tema recebido:', JSON.stringify(theme, null, 2));
    
    if (!theme) {
      return res.status(400).json({ error: 'Configuração do tema é obrigatória' });
    }

    const {
      primaryColor, secondaryColor, accentColor, titleColor, subtitleColor,
      menuTitleColor, backgroundGradient, cardBackground, textGradient, 
      buttonGradient, hoverEffects, glassEffect, borderRadius, shadowIntensity
    } = theme;

    // Primeiro, deletar configuração anterior (manter apenas uma)
    await query('DELETE FROM theme_config');
    
    // Inserir nova configuração
    const result = await query(`
      INSERT INTO theme_config (
        primary_color, secondary_color, accent_color, title_color, subtitle_color,
        menu_title_color, background_gradient, card_background, text_gradient, 
        button_gradient, hover_effects, glass_effect, border_radius, shadow_intensity, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP)
      RETURNING id
    `, [
      primaryColor, secondaryColor, accentColor, titleColor, subtitleColor,
      menuTitleColor, backgroundGradient, cardBackground, textGradient, 
      buttonGradient, hoverEffects, glassEffect, borderRadius, shadowIntensity
    ]);
    
    res.json({ 
      message: 'Configuração do tema salva com sucesso',
      themeId: result.rows[0].id
    });

  } catch (error) {
    console.error('Erro ao salvar configuração do tema:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint público para obter configuração atual do tema
router.get('/theme-config/current', async (req, res) => {
  try {
    const result = await query('SELECT * FROM theme_config ORDER BY created_at DESC LIMIT 1');
    res.json({ theme: result.rows[0] || null });
  } catch (error) {
    console.error('Erro ao buscar configuração do tema:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Configuração do link Deriv
router.get('/deriv-config', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await query('SELECT * FROM deriv_config ORDER BY created_at DESC LIMIT 1');
    res.json({ config: result.rows[0] || null });
  } catch (error) {
    console.error('Erro ao buscar configuração do Deriv:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/deriv-config', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { affiliate_link } = req.body;
    
    console.log('🚀 [SERVER] Link de afiliado Deriv recebido:', affiliate_link);
    
    if (!affiliate_link || !affiliate_link.trim()) {
      return res.status(400).json({ error: 'Link de afiliado é obrigatório' });
    }

    // Validar se é um URL válido
    try {
      new URL(affiliate_link);
    } catch {
      return res.status(400).json({ error: 'Link de afiliado deve ser um URL válido' });
    }

    // Primeiro, deletar configuração anterior (manter apenas uma)
    await query('DELETE FROM deriv_config');
    
    // Inserir nova configuração
    const result = await query(`
      INSERT INTO deriv_config (affiliate_link, created_at) 
      VALUES ($1, CURRENT_TIMESTAMP) 
      RETURNING id
    `, [affiliate_link.trim()]);
    
    res.json({ 
      message: 'Link de afiliado salvo com sucesso',
      affiliate_link: affiliate_link.trim()
    });

  } catch (error) {
    console.error('Erro ao salvar configuração do Deriv:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Configuração do link do botão "Obter Acesso"
router.get('/access-link-config', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await query('SELECT * FROM access_link_config ORDER BY created_at DESC LIMIT 1');
    res.json({ config: result.rows[0] || null });
  } catch (error) {
    console.error('Erro ao buscar configuração do link de acesso:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/access-link-config', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { access_link } = req.body;
    
    console.log('🔗 [SERVER] Link de acesso recebido:', access_link);
    
    if (!access_link || !access_link.trim()) {
      return res.status(400).json({ error: 'Link de acesso é obrigatório' });
    }

    // Validar se é um URL válido
    try {
      new URL(access_link);
    } catch {
      return res.status(400).json({ error: 'Link de acesso deve ser um URL válido' });
    }

    // Primeiro, deletar configuração anterior (manter apenas uma)
    await query('DELETE FROM access_link_config');
    
    // Inserir nova configuração
    const result = await query(`
      INSERT INTO access_link_config (access_link, created_at) 
      VALUES ($1, CURRENT_TIMESTAMP) 
      RETURNING id
    `, [access_link.trim()]);
    
    res.json({ 
      message: 'Link de acesso salvo com sucesso',
      access_link: access_link.trim()
    });

  } catch (error) {
    console.error('Erro ao salvar configuração do link de acesso:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint público para obter o link de acesso
router.get('/access-link-config/current', async (req, res) => {
  try {
    const result = await query('SELECT access_link FROM access_link_config ORDER BY created_at DESC LIMIT 1');
    res.json({ access_link: result.rows[0]?.access_link || null });
  } catch (error) {
    console.error('Erro ao buscar link de acesso atual:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});



const DerivMarkupAPI = require('../utils/derivMarkupAPI');

// Estatísticas de markup
router.get('/markup-stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const derivAPI = new DerivMarkupAPI();
    const stats = await derivAPI.getMarkupStats();
    res.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas de markup:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Transações de markup
router.get('/markup-transactions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const derivAPI = new DerivMarkupAPI();
    const limit = parseInt(req.query.limit) || 50;
    const transactions = await derivAPI.getMarkupTransactions(limit);
    res.json({ transactions });
  } catch (error) {
    console.error('Erro ao buscar transações de markup:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Dados mensais de markup
router.get('/markup-monthly', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { month, year } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({ error: 'Mês e ano são obrigatórios' });
    }
    
    const derivAPI = new DerivMarkupAPI();
    const monthlyData = await derivAPI.getMonthlyMarkupData(parseInt(month), parseInt(year));
    res.json(monthlyData);
  } catch (error) {
    console.error('Erro ao buscar dados mensais:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Sincronizar dados com a Deriv API
router.post('/sync-markup-data', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const derivAPI = new DerivMarkupAPI();
    const result = await derivAPI.syncMarkupData();
    res.json(result);
  } catch (error) {
    console.error('Erro ao sincronizar dados:', error);
    res.status(500).json({ error: 'Erro ao sincronizar com a Deriv API' });
  }
});

// Validar configuração do App ID
router.get('/validate-app-config', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const derivAPI = new DerivMarkupAPI();
    const validation = await derivAPI.validateAppConfiguration();
    res.json(validation);
  } catch (error) {
    console.error('Erro ao validar configuração:', error);
    res.status(500).json({ error: 'Erro ao validar configuração' });
  }
});

module.exports = router; 