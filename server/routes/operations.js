const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../database/connection');
const { authenticateToken, requireClient, requireBotAccess } = require('../middleware/auth');
const DerivAPI = require('../utils/derivApi');
const { getSocketIO } = require('../socketManager');

const router = express.Router();

// Iniciar operação do bot
router.post('/start', authenticateToken, async (req, res) => {
  try {
    const { botId, config } = req.body;
    const { initial_stake, max_stake, profit_threshold, loss_threshold } = config || {};
    
    console.log('🚀 Starting bot operation:', {
      botId,
      userId: req.user.id,
      config
    });
    const userId = req.user.id;

    // Validar dados
    if (!botId || !initial_stake) {
      console.error('❌ Dados inválidos:', { botId, initial_stake });
      return res.status(400).json({ error: 'Bot ID e valor inicial são obrigatórios' });
    }

    // Buscar bot
    console.log('🔍 Buscando bot com ID:', botId);
    const botResult = await query('SELECT * FROM bots WHERE id = $1', [botId]);
    if (botResult.rows.length === 0) {
      console.error('❌ Bot não encontrado:', botId);
      return res.status(404).json({ error: 'Bot não encontrado' });
    }
    
    console.log('✅ Bot encontrado:', botResult.rows[0].name);

    const bot = botResult.rows[0];

    // Buscar usuário
    const userResult = await query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const user = userResult.rows[0];

    // Verificar conexão Deriv de forma mais robusta
    const isDerivConnected = !!(user.deriv_connected && (user.deriv_connected === true || user.deriv_connected === 1));
    const hasDerivToken = !!user.deriv_access_token;
    
    console.log('🔍 Verificando conexão Deriv:', {
      deriv_connected: user.deriv_connected,
      isDerivConnected,
      hasDerivToken,
      account_id: user.deriv_account_id
    });

    if (!isDerivConnected || !hasDerivToken) {
      console.error('❌ Conta Deriv não conectada:', {
        isDerivConnected,
        hasDerivToken
      });
      return res.status(400).json({ error: 'Conta Deriv não conectada. Conecte sua conta na seção de Operações.' });
    }

    // Criar operação
    console.log('💾 Criando registro de operação no banco...');
    const operationResult = await query(`
      INSERT INTO operations (user_id, bot_id, entry_amount, martingale, max_gain, max_loss, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, 'running', CURRENT_TIMESTAMP)
      RETURNING *
    `, [userId, botId, initial_stake, config?.martingale_multiplier > 1, profit_threshold, loss_threshold]);

    const operation = operationResult.rows[0];

    // Executar operação com Deriv API
    try {
      const derivApi = new DerivAPI();
      await derivApi.connect();

      // Autorizar usuário
      const authResponse = await derivApi.authorize(user.deriv_access_token);
      if (authResponse.error) {
        throw new Error('Falha na autorização: ' + authResponse.error.message);
      }

      // Obter saldo da conta
      const balanceResponse = await derivApi.getBalance();
      if (balanceResponse.error) {
        throw new Error('Erro ao obter saldo: ' + balanceResponse.error.message);
      }

      const balance = balanceResponse.balance.balance;
      const currency = balanceResponse.balance.currency;

      // Verificar se tem saldo suficiente
      if (balance < parseFloat(initial_stake)) {
        throw new Error('Saldo insuficiente para esta operação');
      }

      // Fazer proposta de compra (exemplo para Rise/Fall)
      const proposalResponse = await derivApi.getProposal({
        amount: parseFloat(initial_stake),
        basis: "stake",
        contract_type: "CALL", // ou "PUT" para Fall
        currency: currency,
        duration: 5,
        duration_unit: "t",
        symbol: "R_100"
      });

      if (proposalResponse.error) {
        throw new Error('Erro na proposta: ' + proposalResponse.error.message);
      }

      // Comprar o contrato
      const buyResponse = await derivApi.buyContract(
        proposalResponse.proposal.id,
        parseFloat(initial_stake)
      );

      if (buyResponse.error) {
        throw new Error('Erro na compra: ' + buyResponse.error.message);
      }

      // Atualizar operação com dados da Deriv
      await query(`
        UPDATE operations 
        SET deriv_contract_id = $1, status = 'running', updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [buyResponse.buy.contract_id, operation.id]);

      // Fechar conexão WebSocket
      derivApi.disconnect();

      // Enviar notificação via Socket.io
      const io = getSocketIO();
      if (io) {
        io.to(`user_${userId}`).emit('operation_update', {
          operation_id: operation.id,
          status: 'running',
          contract_id: buyResponse.buy.contract_id,
          balance: buyResponse.buy.balance_after
        });
      }

      res.json({
        success: true,
        message: 'Operação iniciada com sucesso',
        operation: {
          id: operation.id,
          status: 'running',
          contract_id: buyResponse.buy.contract_id,
          balance: buyResponse.buy.balance_after
        }
      });

    } catch (derivError) {
      console.error('Erro na Deriv API:', derivError);
      
      // Atualizar operação como falha
      await query(`
        UPDATE operations 
        SET status = 'failed', error_message = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [derivError.message, operation.id]);

      res.status(500).json({ error: 'Erro ao executar operação na Deriv: ' + derivError.message });
    }

  } catch (error) {
    console.error('Erro ao iniciar operação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter histórico de operações do usuário
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { limit = 50, offset = 0, status } = req.query;
    const userId = req.user.id;

    let queryText = `
      SELECT o.*, b.name as bot_name, b.description as bot_description
      FROM operations o
      JOIN bots b ON o.bot_id = b.id
      WHERE o.user_id = $1
    `;
    
    const queryParams = [userId];
    let paramIndex = 2;

    if (status) {
      queryText += ` AND o.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    queryText += ` ORDER BY o.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    const result = await query(queryText, queryParams);

    res.json({
      success: true,
      operations: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter detalhes de uma operação específica
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await query(`
      SELECT o.*, b.name as bot_name, b.description as bot_description
      FROM operations o
      JOIN bots b ON o.bot_id = b.id
      WHERE o.id = $1 AND o.user_id = $2
    `, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Operação não encontrada' });
    }

    const operation = result.rows[0];

    // Se a operação tem contract_id, buscar informações atualizadas da Deriv
    if (operation.deriv_contract_id) {
      try {
        const derivApi = new DerivAPI();
        await derivApi.connect();

        // Autorizar usuário
        const userResult = await query('SELECT deriv_access_token FROM users WHERE id = $1', [userId]);
        if (userResult.rows[0]?.deriv_access_token) {
          await derivApi.authorize(userResult.rows[0].deriv_access_token);

          // Obter informações do contrato
          const contractInfo = await derivApi.getContractInfo(operation.deriv_contract_id);
          
          operation.deriv_contract_info = contractInfo.proposal_open_contract;
        }

        derivApi.disconnect();
      } catch (derivError) {
        console.error('Erro ao buscar informações da Deriv:', derivError);
        // Não falhar se não conseguir buscar da Deriv
      }
    }

    res.json({
      success: true,
      operation: operation
    });

  } catch (error) {
    console.error('Erro ao buscar operação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Parar operação ativa do usuário (sem ID específico)
router.post('/stop', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log('🛑 Tentando parar operação ativa para usuário:', userId);

    // Buscar operação ativa do usuário
    const operationResult = await query(`
      SELECT o.*, u.deriv_access_token 
      FROM operations o
      JOIN users u ON o.user_id = u.id
      WHERE o.user_id = $1 AND o.status = 'running'
      ORDER BY o.created_at DESC
      LIMIT 1
    `, [userId]);

    if (operationResult.rows.length === 0) {
      console.log('❌ Nenhuma operação ativa encontrada para usuário:', userId);
      return res.status(404).json({ error: 'Nenhuma operação ativa encontrada' });
    }

    const operation = operationResult.rows[0];
    console.log('✅ Operação ativa encontrada:', operation.id);

    // Se tem contract_id, tentar vender na Deriv
    if (operation.deriv_contract_id && operation.deriv_access_token) {
      try {
        console.log('📞 Tentando vender contrato na Deriv:', operation.deriv_contract_id);
        const derivApi = new DerivAPI();
        await derivApi.connect();
        await derivApi.authorize(operation.deriv_access_token);

        // Vender o contrato
        const sellResponse = await derivApi.sellContract(operation.deriv_contract_id, 0);
        
        derivApi.disconnect();
        console.log('✅ Contrato vendido com sucesso na Deriv');

        // Atualizar operação
        await query(`
          UPDATE operations 
          SET status = 'stopped', updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [operation.id]);

        res.json({
          success: true,
          message: 'Operação parada com sucesso',
          operation_id: operation.id,
          sell_info: sellResponse.sell
        });

      } catch (derivError) {
        console.error('❌ Erro ao vender contrato na Deriv:', derivError);
        
        // Mesmo com erro na Deriv, marcar como parada localmente
        await query(`
          UPDATE operations 
          SET status = 'stopped', error_message = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [derivError.message, operation.id]);
        
        res.json({
          success: true,
          message: 'Operação parada localmente (erro na Deriv: ' + derivError.message + ')',
          operation_id: operation.id
        });
      }
    } else {
      console.log('⚠️ Operação sem contract_id, parando apenas localmente');
      // Apenas atualizar status se não tem contract_id
      await query(`
        UPDATE operations 
        SET status = 'stopped', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [operation.id]);

      res.json({
        success: true,
        message: 'Operação parada com sucesso',
        operation_id: operation.id
      });
    }

  } catch (error) {
    console.error('❌ Erro ao parar operação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Parar operação específica por ID
router.post('/:id/stop', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verificar se a operação existe e pertence ao usuário
    const operationResult = await query(`
      SELECT o.*, u.deriv_access_token 
      FROM operations o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = $1 AND o.user_id = $2 AND o.status = 'running'
    `, [id, userId]);

    if (operationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Operação não encontrada ou não está rodando' });
    }

    const operation = operationResult.rows[0];

    // Se tem contract_id, tentar vender na Deriv
    if (operation.deriv_contract_id && operation.deriv_access_token) {
      try {
        const derivApi = new DerivAPI();
        await derivApi.connect();
        await derivApi.authorize(operation.deriv_access_token);

        // Vender o contrato
        const sellResponse = await derivApi.sellContract(operation.deriv_contract_id, 0);
        
        derivApi.disconnect();

        // Atualizar operação
        await query(`
          UPDATE operations 
          SET status = 'stopped', updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [id]);

        res.json({
          success: true,
          message: 'Operação parada com sucesso',
          sell_info: sellResponse.sell
        });

      } catch (derivError) {
        console.error('Erro ao vender contrato:', derivError);
        res.status(500).json({ error: 'Erro ao parar operação na Deriv' });
      }
    } else {
      // Apenas atualizar status se não tem contract_id
      await query(`
        UPDATE operations 
        SET status = 'stopped', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [id]);

      res.json({
        success: true,
        message: 'Operação parada com sucesso'
      });
    }

  } catch (error) {
    console.error('Erro ao parar operação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Pausar operação
router.post('/pause', authenticateToken, requireClient, [
  body('operation_id').isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { operation_id } = req.body;

    // Verificar se a operação pertence ao usuário
    const operationResult = await query(`
      SELECT id, status FROM operations 
      WHERE id = $1 AND user_id = $2
    `, [operation_id, req.user.id]);

    if (operationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Operação não encontrada' });
    }

    const operation = operationResult.rows[0];

    if (operation.status !== 'running') {
      return res.status(400).json({ error: 'Operação não está rodando' });
    }

    // Pausar operação na Deriv (simulação)
    try {
      // Aqui você implementaria a lógica real de pausa na Deriv
      
      // Registrar histórico
      await query(`
        INSERT INTO operation_history (operation_id, action, details)
        VALUES ($1, $2, $3)
      `, [operation_id, 'paused', JSON.stringify({ timestamp: new Date() })]);

      // Atualizar status da operação
      await query(`
        UPDATE operations 
        SET status = 'paused', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [operation_id]);

      res.json({
        message: 'Operação pausada com sucesso',
        operation_id: operation_id,
        status: 'paused'
      });

    } catch (derivError) {
      console.error('Erro ao pausar operação na Deriv:', derivError);
      res.status(500).json({ error: 'Erro ao pausar operação' });
    }

  } catch (error) {
    console.error('Erro ao pausar operação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Retomar operação
router.post('/resume', authenticateToken, requireClient, [
  body('operation_id').isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { operation_id } = req.body;

    // Verificar se a operação pertence ao usuário
    const operationResult = await query(`
      SELECT id, status FROM operations 
      WHERE id = $1 AND user_id = $2
    `, [operation_id, req.user.id]);

    if (operationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Operação não encontrada' });
    }

    const operation = operationResult.rows[0];

    if (operation.status !== 'paused') {
      return res.status(400).json({ error: 'Operação não está pausada' });
    }

    // Retomar operação na Deriv (simulação)
    try {
      // Aqui você implementaria a lógica real de retomada na Deriv
      
      // Registrar histórico
      await query(`
        INSERT INTO operation_history (operation_id, action, details)
        VALUES ($1, $2, $3)
      `, [operation_id, 'resumed', JSON.stringify({ timestamp: new Date() })]);

      // Atualizar status da operação
      await query(`
        UPDATE operations 
        SET status = 'running', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [operation_id]);

      res.json({
        message: 'Operação retomada com sucesso',
        operation_id: operation_id,
        status: 'running'
      });

    } catch (derivError) {
      console.error('Erro ao retomar operação na Deriv:', derivError);
      res.status(500).json({ error: 'Erro ao retomar operação' });
    }

  } catch (error) {
    console.error('Erro ao retomar operação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter status da operação em tempo real
router.get('/status/:operation_id', authenticateToken, requireClient, async (req, res) => {
  try {
    const { operation_id } = req.params;

    // Verificar se a operação pertence ao usuário
    const operationResult = await query(`
      SELECT o.*, b.name as bot_name, u.deriv_token
      FROM operations o
      INNER JOIN bots b ON o.bot_id = b.id
      INNER JOIN users u ON o.user_id = u.id
      WHERE o.id = $1 AND o.user_id = $2
    `, [operation_id, req.user.id]);

    if (operationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Operação não encontrada' });
    }

    const operation = operationResult.rows[0];

    // Buscar saldo atual da conta Deriv
    let currentBalance = operation.balance;
    let accountInfo = null;

    if (operation.deriv_token && operation.status === 'running') {
      try {
        // Aqui você implementaria a busca real do saldo na Deriv
        // Por enquanto, vamos simular
        accountInfo = {
          balance: currentBalance,
          currency: 'USD',
          last_update: new Date().toISOString()
        };
      } catch (derivError) {
        console.error('Erro ao buscar saldo Deriv:', derivError);
        // Continuar com o saldo do banco
      }
    }

    res.json({
      operation: {
        id: operation.id,
        bot_name: operation.bot_name,
        status: operation.status,
        config: operation.config,
        balance: accountInfo ? accountInfo.balance : currentBalance,
        profit_loss: operation.profit_loss,
        total_trades: operation.total_trades,
        winning_trades: operation.winning_trades,
        losing_trades: operation.losing_trades,
        started_at: operation.started_at,
        stopped_at: operation.stopped_at,
        updated_at: operation.updated_at
      },
      account_info: accountInfo
    });

  } catch (error) {
    console.error('Erro ao buscar status da operação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar operações do usuário
router.get('/my-operations', authenticateToken, requireClient, async (req, res) => {
  try {
    const result = await query(`
      SELECT o.*, b.name as bot_name
      FROM operations o
      INNER JOIN bots b ON o.bot_id = b.id
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC
    `, [req.user.id]);

    res.json({
      operations: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Erro ao listar operações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Histórico de uma operação
router.get('/:operation_id/history', authenticateToken, requireClient, async (req, res) => {
  try {
    const { operation_id } = req.params;

    // Verificar se a operação pertence ao usuário
    const operationExists = await query(`
      SELECT id FROM operations WHERE id = $1 AND user_id = $2
    `, [operation_id, req.user.id]);

    if (operationExists.rows.length === 0) {
      return res.status(404).json({ error: 'Operação não encontrada' });
    }

    const historyResult = await query(`
      SELECT * FROM operation_history
      WHERE operation_id = $1
      ORDER BY timestamp DESC
    `, [operation_id]);

    res.json({
      history: historyResult.rows,
      total: historyResult.rows.length
    });

  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter informações da conta do usuário
router.get('/account-info', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Buscar usuário
    const userResult = await query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const user = userResult.rows[0];

    if (!user.deriv_connected && user.deriv_connected !== true && user.deriv_connected !== 1) {
      return res.status(400).json({ error: 'Conta Deriv não conectada' });
    }

    // Conectar com Deriv API
    const derivApi = new DerivAPI();
    await derivApi.connect();

    try {
      // Autorizar usuário
      await derivApi.authorize(user.deriv_access_token);

      // Obter lista de contas
      const accountListResponse = await derivApi.getAccountList();
      
      // Obter saldo da conta atual
      const balanceResponse = await derivApi.getBalance();
      
      // Obter configurações da conta
      const settingsResponse = await derivApi.getAccountSettings();
      
      // Obter limites da conta
      const limitsResponse = await derivApi.getAccountLimits();

      derivApi.disconnect();

      res.json({
        success: true,
        account_info: {
          accounts: accountListResponse.account_list,
          current_balance: balanceResponse.balance,
          settings: settingsResponse.get_settings,
          limits: limitsResponse.get_limits
        }
      });

    } catch (derivError) {
      derivApi.disconnect();
      throw derivError;
    }

  } catch (error) {
    console.error('Erro ao obter informações da conta:', error);
    res.status(500).json({ error: 'Erro ao obter informações da conta' });
  }
});

// Obter símbolos disponíveis
router.get('/symbols', authenticateToken, async (req, res) => {
  try {
    const { markets = 'all' } = req.query;

    const derivApi = new DerivAPI();
    await derivApi.connect();

    try {
      const symbolsResponse = await derivApi.getSymbols(markets);
      
      derivApi.disconnect();

      res.json({
        success: true,
        symbols: symbolsResponse.trading_times
      });

    } catch (derivError) {
      derivApi.disconnect();
      throw derivError;
    }

  } catch (error) {
    console.error('Erro ao obter símbolos:', error);
    res.status(500).json({ error: 'Erro ao obter símbolos' });
  }
});

// Obter estatísticas de trading
router.get('/trading-stats', authenticateToken, async (req, res) => {
  try {
    const { date_from, date_to, limit = 100 } = req.query;
    const userId = req.user.id;

    // Buscar usuário
    const userResult = await query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const user = userResult.rows[0];

    if (!user.deriv_connected && user.deriv_connected !== true && user.deriv_connected !== 1) {
      return res.status(400).json({ error: 'Conta Deriv não conectada' });
    }

    const derivApi = new DerivAPI();
    await derivApi.connect();

    try {
      // Autorizar usuário
      await derivApi.authorize(user.deriv_access_token);

      // Obter estatísticas de trading
      const statsResponse = await derivApi.getTradingStatistics({
        date_from,
        date_to,
        limit: parseInt(limit)
      });

      derivApi.disconnect();

      res.json({
        success: true,
        trading_stats: statsResponse.statement
      });

    } catch (derivError) {
      derivApi.disconnect();
      throw derivError;
    }

  } catch (error) {
    console.error('Erro ao obter estatísticas de trading:', error);
    res.status(500).json({ error: 'Erro ao obter estatísticas de trading' });
  }
});

module.exports = router; 