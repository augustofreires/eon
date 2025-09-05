const express = require('express');
const router = express.Router();
const { query } = require('../database/connection');
const auth = require('../middleware/auth');

// Função para calcular Stop Win e Stop Loss baseado na configuração
const calculateStopLevels = (saldoAtual, config) => {
  const stopWin = saldoAtual * (1 + config.percentual_meta / 100);
  const stopLoss = saldoAtual * (1 - config.percentual_perda / 100);
  return { stopWin: stopWin.toFixed(2), stopLoss: stopLoss.toFixed(2) };
};

// Função para gerar projeção de dias (como na imagem)
const generateProjection = (config, dias = 20) => {
  const projection = [];
  let saldoAtual = parseFloat(config.deposito_inicial);
  let resultadoAcumulado = 0;
  
  for (let dia = 1; dia <= dias; dia++) {
    const { stopWin, stopLoss } = calculateStopLevels(saldoAtual, config);
    const deposito = dia === 1 ? config.deposito_inicial : 0;
    const resultado = saldoAtual * (config.percentual_meta / 100);
    const saldoFinal = saldoAtual + resultado;
    
    resultadoAcumulado += resultado;
    
    projection.push({
      dia,
      stopWin: parseFloat(stopWin),
      stopLoss: parseFloat(stopLoss),
      deposito: parseFloat(deposito),
      saldoInicial: saldoAtual,
      saldoFinal: saldoFinal,
      resultado: resultado,
      resultadoPercentual: config.percentual_meta,
      resultadoAcumulado: resultadoAcumulado
    });
    
    saldoAtual = saldoFinal; // Para o próximo dia
  }
  
  return projection;
};

// GET /api/bank-management/config - Obter configuração atual
router.get('/config', auth, async (req, res) => {
  try {
    const configResult = await query(
      'SELECT * FROM bank_management_config WHERE user_id = $1 AND ativo = true',
      [req.user.id]
    );
    const config = configResult.rows[0];
    
    if (!config) {
      // Criar configuração padrão se não existir
      const defaultConfig = {
        user_id: req.user.id,
        meta_diaria: 5.00,
        max_perda_diaria: 9.00,
        deposito_inicial: 100.00,
        percentual_meta: 5.00,
        percentual_perda: 9.00
      };
      
      await query(
        `INSERT INTO bank_management_config 
         (user_id, meta_diaria, max_perda_diaria, deposito_inicial, percentual_meta, percentual_perda) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [defaultConfig.user_id, defaultConfig.meta_diaria, defaultConfig.max_perda_diaria, 
         defaultConfig.deposito_inicial, defaultConfig.percentual_meta, defaultConfig.percentual_perda]
      );
      
      return res.json({ config: defaultConfig });
    }
    
    res.json({ config });
  } catch (error) {
    console.error('Erro ao obter configuração de banca:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/bank-management/config - Atualizar configuração
router.post('/config', auth, async (req, res) => {
  try {
    const { meta_diaria, max_perda_diaria, deposito_inicial, percentual_meta, percentual_perda } = req.body;
    
    // Validações
    if (percentual_meta <= 0 || percentual_meta > 50) {
      return res.status(400).json({ error: 'Percentual de meta deve ser entre 0.1% e 50%' });
    }
    
    if (percentual_perda <= 0 || percentual_perda > 50) {
      return res.status(400).json({ error: 'Percentual de perda deve ser entre 0.1% e 50%' });
    }
    
    if (deposito_inicial <= 0) {
      return res.status(400).json({ error: 'Depósito inicial deve ser maior que zero' });
    }
    
    // Verificar se já existe configuração
    const existingConfigResult = await query(
      'SELECT id FROM bank_management_config WHERE user_id = $1 AND ativo = true',
      [req.user.id]
    );
    const existingConfig = existingConfigResult.rows[0];
    
    if (existingConfig) {
      await query(
        `UPDATE bank_management_config 
         SET meta_diaria = $1, max_perda_diaria = $2, deposito_inicial = $3, 
             percentual_meta = $4, percentual_perda = $5, updated_at = CURRENT_TIMESTAMP 
         WHERE user_id = $6 AND ativo = true`,
        [meta_diaria, max_perda_diaria, deposito_inicial, percentual_meta, percentual_perda, req.user.id]
      );
    } else {
      await query(
        `INSERT INTO bank_management_config 
         (user_id, meta_diaria, max_perda_diaria, deposito_inicial, percentual_meta, percentual_perda) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.user.id, meta_diaria, max_perda_diaria, deposito_inicial, percentual_meta, percentual_perda]
      );
    }
    
    res.json({ success: true, message: 'Configuração atualizada com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar configuração de banca:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/bank-management/projection - Obter projeção de dias
router.get('/projection', auth, async (req, res) => {
  try {
    const dias = parseInt(req.query.dias) || 20;
    
    const configResult = await query(
      'SELECT * FROM bank_management_config WHERE user_id = $1 AND ativo = true',
      [req.user.id]
    );
    const config = configResult.rows[0];
    
    if (!config) {
      return res.status(404).json({ error: 'Configuração não encontrada' });
    }
    
    const projection = generateProjection(config, dias);
    
    res.json({ 
      config,
      projection,
      meta: {
        totalDias: dias,
        metaDiaria: config.meta_diaria,
        maxPerdaDiaria: config.max_perda_diaria,
        depositoInicial: config.deposito_inicial
      }
    });
  } catch (error) {
    console.error('Erro ao gerar projeção de banca:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/bank-management/records - Obter registros de operações
router.get('/records', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    
    const recordsResult = await query(
      `SELECT * FROM bank_management_records 
       WHERE user_id = $1 
       ORDER BY dia DESC 
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );
    const records = recordsResult.rows;
    
    const totalResult = await query(
      'SELECT COUNT(*) as count FROM bank_management_records WHERE user_id = $1',
      [req.user.id]
    );
    const total = totalResult.rows[0];
    
    res.json({ 
      records, 
      pagination: {
        page,
        limit,
        total: parseInt(total.count),
        pages: Math.ceil(parseInt(total.count) / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao obter registros de banca:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/bank-management/record - Adicionar registro de operação
router.post('/record', auth, async (req, res) => {
  try {
    const { dia, data_operacao, saldo_final, resultado, objetivo_alcancado, observacoes } = req.body;
    
    // Validações
    if (!dia || !data_operacao || saldo_final === undefined || resultado === undefined) {
      return res.status(400).json({ error: 'Campos obrigatórios: dia, data_operacao, saldo_final, resultado' });
    }
    
    const configResult = await query(
      'SELECT * FROM bank_management_config WHERE user_id = $1 AND ativo = true',
      [req.user.id]
    );
    const config = configResult.rows[0];
    
    if (!config) {
      return res.status(404).json({ error: 'Configuração não encontrada' });
    }
    
    // Calcular saldo inicial (do dia anterior ou depósito inicial)
    let saldoInicial = config.deposito_inicial;
    if (dia > 1) {
      const diaAnteriorResult = await query(
        'SELECT saldo_final FROM bank_management_records WHERE user_id = $1 AND dia = $2',
        [req.user.id, dia - 1]
      );
      const diaAnterior = diaAnteriorResult.rows[0];
      saldoInicial = diaAnterior ? diaAnterior.saldo_final : config.deposito_inicial;
    }
    
    // Calcular stop levels
    const { stopWin, stopLoss } = calculateStopLevels(saldoInicial, config);
    
    // Calcular resultado acumulado
    const registrosAnterioresResult = await query(
      'SELECT resultado FROM bank_management_records WHERE user_id = $1 AND dia < $2',
      [req.user.id, dia]
    );
    const registrosAnteriores = registrosAnterioresResult.rows;
    
    const resultadoAcumulado = registrosAnteriores.reduce((acc, record) => acc + parseFloat(record.resultado), 0) + parseFloat(resultado);
    
    const resultadoPercentual = saldoInicial > 0 ? (parseFloat(resultado) / parseFloat(saldoInicial)) * 100 : 0;
    const deposito = dia === 1 ? config.deposito_inicial : 0;
    
    await query(
      `INSERT INTO bank_management_records 
       (user_id, dia, data_operacao, stop_win, stop_loss, deposito, saldo_inicial, 
        saldo_final, resultado, resultado_percentual, resultado_acumulado, objetivo_alcancado, observacoes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [req.user.id, dia, data_operacao, stopWin, stopLoss, deposito, saldoInicial, 
       saldo_final, resultado, resultadoPercentual, resultadoAcumulado, objetivo_alcancado || 'PENDING', observacoes]
    );
    
    res.json({ success: true, message: 'Registro adicionado com sucesso' });
  } catch (error) {
    console.error('Erro ao adicionar registro de banca:', error);
    if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
      res.status(400).json({ error: 'Já existe um registro para este dia ou data' });
    } else {
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
});

// PUT /api/bank-management/record/:id - Atualizar registro
router.put('/record/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { saldo_final, resultado, objetivo_alcancado, observacoes } = req.body;
    
    // Verificar se o registro pertence ao usuário
    const recordResult = await query(
      'SELECT * FROM bank_management_records WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    const record = recordResult.rows[0];
    
    if (!record) {
      return res.status(404).json({ error: 'Registro não encontrado' });
    }
    
    const resultadoPercentual = record.saldo_inicial > 0 ? (parseFloat(resultado) / parseFloat(record.saldo_inicial)) * 100 : 0;
    
    await query(
      `UPDATE bank_management_records 
       SET saldo_final = $1, resultado = $2, resultado_percentual = $3, 
           objetivo_alcancado = $4, observacoes = $5, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $6 AND user_id = $7`,
      [saldo_final, resultado, resultadoPercentual, objetivo_alcancado, observacoes, id, req.user.id]
    );
    
    // Recalcular resultado acumulado para registros posteriores
    const registrosPosterioresResult = await query(
      'SELECT id, resultado FROM bank_management_records WHERE user_id = $1 AND dia > $2 ORDER BY dia',
      [req.user.id, record.dia]
    );
    const registrosPosteriores = registrosPosterioresResult.rows;
    
    let acumuladoAtual = parseFloat(resultado);
    const registrosAnterioresResult = await query(
      'SELECT resultado FROM bank_management_records WHERE user_id = $1 AND dia < $2',
      [req.user.id, record.dia]
    );
    const registrosAnteriores = registrosAnterioresResult.rows;
    acumuladoAtual += registrosAnteriores.reduce((acc, rec) => acc + parseFloat(rec.resultado), 0);
    
    // Atualizar resultado acumulado do registro atual
    await query(
      'UPDATE bank_management_records SET resultado_acumulado = $1 WHERE id = $2',
      [acumuladoAtual, id]
    );
    
    res.json({ success: true, message: 'Registro atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar registro de banca:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/bank-management/record/:id - Deletar registro
router.delete('/record/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      'DELETE FROM bank_management_records WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Registro não encontrado' });
    }
    
    res.json({ success: true, message: 'Registro removido com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar registro de banca:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/bank-management/statistics - Obter estatísticas
router.get('/statistics', auth, async (req, res) => {
  try {
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_dias,
        SUM(CASE WHEN objetivo_alcancado = 'WIN' THEN 1 ELSE 0 END) as dias_positivos,
        SUM(CASE WHEN objetivo_alcancado = 'LOSS' THEN 1 ELSE 0 END) as dias_negativos,
        SUM(resultado) as resultado_total,
        AVG(resultado_percentual) as media_percentual,
        MAX(resultado_acumulado) as melhor_resultado,
        MIN(resultado_acumulado) as pior_resultado
      FROM bank_management_records 
      WHERE user_id = $1
    `, [req.user.id]);
    const stats = statsResult.rows[0];
    
    const configResult = await query(
      'SELECT * FROM bank_management_config WHERE user_id = $1 AND ativo = true',
      [req.user.id]
    );
    const config = configResult.rows[0];
    
    res.json({ 
      statistics: stats,
      config: config,
      performance: {
        win_rate: parseInt(stats.total_dias) > 0 ? (parseInt(stats.dias_positivos) / parseInt(stats.total_dias) * 100).toFixed(2) : 0,
        loss_rate: parseInt(stats.total_dias) > 0 ? (parseInt(stats.dias_negativos) / parseInt(stats.total_dias) * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas de banca:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;