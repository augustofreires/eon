const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { authenticateToken: auth } = require('../middleware/auth');

// Conexão com SQLite
const dbPath = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

// Função para calcular Stop Win e Stop Loss baseado na configuração
const calculateStopLevels = (saldoAtual, config) => {
  const stopWin = saldoAtual * (1 + config.percentual_meta / 100);
  const stopLoss = saldoAtual * (1 - config.percentual_perda / 100);
  return { stopWin: parseFloat(stopWin.toFixed(2)), stopLoss: parseFloat(stopLoss.toFixed(2)) };
};

// Função para gerar projeção de dias
const generateProjection = (config, dias = 30) => {
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
      stopWin,
      stopLoss,
      deposito: parseFloat(deposito),
      saldoInicial: saldoAtual,
      saldoFinal: saldoFinal,
      resultado: resultado,
      resultadoPercentual: config.percentual_meta,
      resultadoAcumulado: resultadoAcumulado
    });
    
    saldoAtual = saldoFinal;
  }
  
  return projection;
};

// GET /api/bank-management/config - Obter configuração atual
router.get('/config', auth, (req, res) => {
  const sql = 'SELECT * FROM bank_management_config WHERE user_id = ? AND ativo = 1';
  
  db.get(sql, [req.user.id], (err, config) => {
    if (err) {
      console.error('Erro ao obter configuração de banca:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    
    if (!config) {
      // Criar configuração padrão
      const defaultConfig = {
        user_id: req.user.id,
        deposito_inicial: 100.00,
        percentual_meta: 5.00,
        percentual_perda: 9.00
      };
      
      const insertSql = `INSERT INTO bank_management_config 
                        (user_id, deposito_inicial, percentual_meta, percentual_perda) 
                        VALUES (?, ?, ?, ?)`;
      
      db.run(insertSql, [defaultConfig.user_id, defaultConfig.deposito_inicial, 
                         defaultConfig.percentual_meta, defaultConfig.percentual_perda], function(err) {
        if (err) {
          console.error('Erro ao criar configuração padrão:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        res.json({ config: { ...defaultConfig, id: this.lastID } });
      });
    } else {
      res.json({ config });
    }
  });
});

// POST /api/bank-management/config - Atualizar configuração
router.post('/config', auth, (req, res) => {
  const { deposito_inicial, percentual_meta, percentual_perda } = req.body;
  
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
  const checkSql = 'SELECT id FROM bank_management_config WHERE user_id = ? AND ativo = 1';
  
  db.get(checkSql, [req.user.id], (err, existingConfig) => {
    if (err) {
      console.error('Erro ao verificar configuração:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    
    if (existingConfig) {
      const updateSql = `UPDATE bank_management_config 
                        SET deposito_inicial = ?, percentual_meta = ?, percentual_perda = ?, 
                            updated_at = CURRENT_TIMESTAMP 
                        WHERE user_id = ? AND ativo = 1`;
      
      db.run(updateSql, [deposito_inicial, percentual_meta, percentual_perda, req.user.id], (err) => {
        if (err) {
          console.error('Erro ao atualizar configuração:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        res.json({ success: true, message: 'Configuração atualizada com sucesso' });
      });
    } else {
      const insertSql = `INSERT INTO bank_management_config 
                        (user_id, deposito_inicial, percentual_meta, percentual_perda) 
                        VALUES (?, ?, ?, ?)`;
      
      db.run(insertSql, [req.user.id, deposito_inicial, percentual_meta, percentual_perda], (err) => {
        if (err) {
          console.error('Erro ao criar configuração:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        res.json({ success: true, message: 'Configuração criada com sucesso' });
      });
    }
  });
});

// GET /api/bank-management/projection - Obter projeção
router.get('/projection', auth, (req, res) => {
  const dias = parseInt(req.query.dias) || 30;
  const sql = 'SELECT * FROM bank_management_config WHERE user_id = ? AND ativo = 1';
  
  db.get(sql, [req.user.id], (err, config) => {
    if (err) {
      console.error('Erro ao obter configuração:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    
    if (!config) {
      return res.status(404).json({ error: 'Configuração não encontrada' });
    }
    
    const projection = generateProjection(config, dias);
    
    res.json({ 
      config,
      projection,
      meta: {
        totalDias: dias,
        percentualMeta: config.percentual_meta,
        percentualPerda: config.percentual_perda,
        depositoInicial: config.deposito_inicial
      }
    });
  });
});

// GET /api/bank-management/records - Obter registros
router.get('/records', auth, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  
  const recordsSql = `SELECT * FROM bank_management_records 
                     WHERE user_id = ? 
                     ORDER BY dia ASC 
                     LIMIT ? OFFSET ?`;
  
  const countSql = 'SELECT COUNT(*) as count FROM bank_management_records WHERE user_id = ?';
  
  db.all(recordsSql, [req.user.id, limit, offset], (err, records) => {
    if (err) {
      console.error('Erro ao obter registros:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    
    db.get(countSql, [req.user.id], (err, countResult) => {
      if (err) {
        console.error('Erro ao contar registros:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
      
      res.json({ 
        records, 
        pagination: {
          page,
          limit,
          total: countResult.count,
          pages: Math.ceil(countResult.count / limit)
        }
      });
    });
  });
});

// POST /api/bank-management/record - Adicionar registro
router.post('/record', auth, (req, res) => {
  const { dia, data_operacao, saldo_final, resultado, objetivo_alcancado, observacoes } = req.body;
  
  // Validações
  if (!dia || !data_operacao || saldo_final === undefined || resultado === undefined) {
    return res.status(400).json({ error: 'Campos obrigatórios: dia, data_operacao, saldo_final, resultado' });
  }
  
  // Buscar configuração
  const configSql = 'SELECT * FROM bank_management_config WHERE user_id = ? AND ativo = 1';
  
  db.get(configSql, [req.user.id], (err, config) => {
    if (err) {
      console.error('Erro ao obter configuração:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    
    if (!config) {
      return res.status(404).json({ error: 'Configuração não encontrada' });
    }
    
    // Calcular saldo inicial
    let saldoInicial = config.deposito_inicial;
    
    if (dia > 1) {
      const prevDaySql = 'SELECT saldo_final FROM bank_management_records WHERE user_id = ? AND dia = ?';
      
      db.get(prevDaySql, [req.user.id, dia - 1], (err, prevDay) => {
        if (err) {
          console.error('Erro ao buscar dia anterior:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        if (prevDay) {
          saldoInicial = prevDay.saldo_final;
        }
        
        insertRecord();
      });
    } else {
      insertRecord();
    }
    
    function insertRecord() {
      const { stopWin, stopLoss } = calculateStopLevels(saldoInicial, config);
      const resultadoPercentual = saldoInicial > 0 ? (parseFloat(resultado) / parseFloat(saldoInicial)) * 100 : 0;
      const deposito = dia === 1 ? config.deposito_inicial : 0;
      
      // Calcular resultado acumulado
      const prevResultsSql = 'SELECT resultado FROM bank_management_records WHERE user_id = ? AND dia < ?';
      
      db.all(prevResultsSql, [req.user.id, dia], (err, prevResults) => {
        if (err) {
          console.error('Erro ao calcular acumulado:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        const resultadoAcumulado = prevResults.reduce((acc, record) => acc + parseFloat(record.resultado), 0) + parseFloat(resultado);
        
        const insertSql = `INSERT INTO bank_management_records 
                          (user_id, dia, data_operacao, stop_win, stop_loss, deposito, saldo_inicial, 
                           saldo_final, resultado, resultado_percentual, resultado_acumulado, objetivo_alcancado, observacoes)
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        db.run(insertSql, [req.user.id, dia, data_operacao, stopWin, stopLoss, deposito, saldoInicial, 
                          saldo_final, resultado, resultadoPercentual, resultadoAcumulado, objetivo_alcancado || 'PENDING', observacoes], 
               function(err) {
          if (err) {
            console.error('Erro ao inserir registro:', err);
            if (err.message.includes('UNIQUE constraint')) {
              return res.status(400).json({ error: 'Já existe um registro para este dia ou data' });
            }
            return res.status(500).json({ error: 'Erro interno do servidor' });
          }
          
          res.json({ success: true, message: 'Registro adicionado com sucesso' });
        });
      });
    }
  });
});

// GET /api/bank-management/statistics - Obter estatísticas
router.get('/statistics', auth, (req, res) => {
  const statsSql = `SELECT 
                      COUNT(*) as total_dias,
                      SUM(CASE WHEN objetivo_alcancado = 'WIN' THEN 1 ELSE 0 END) as dias_positivos,
                      SUM(CASE WHEN objetivo_alcancado = 'LOSS' THEN 1 ELSE 0 END) as dias_negativos,
                      SUM(resultado) as resultado_total,
                      AVG(resultado_percentual) as media_percentual,
                      MAX(resultado_acumulado) as melhor_resultado,
                      MIN(resultado_acumulado) as pior_resultado
                    FROM bank_management_records 
                    WHERE user_id = ?`;
  
  const configSql = 'SELECT * FROM bank_management_config WHERE user_id = ? AND ativo = 1';
  
  db.get(statsSql, [req.user.id], (err, stats) => {
    if (err) {
      console.error('Erro ao obter estatísticas:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    
    db.get(configSql, [req.user.id], (err, config) => {
      if (err) {
        console.error('Erro ao obter configuração:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
      
      const winRate = stats.total_dias > 0 ? ((stats.dias_positivos / stats.total_dias) * 100).toFixed(2) : 0;
      const lossRate = stats.total_dias > 0 ? ((stats.dias_negativos / stats.total_dias) * 100).toFixed(2) : 0;
      
      res.json({ 
        statistics: stats,
        config: config,
        performance: {
          win_rate: winRate,
          loss_rate: lossRate
        }
      });
    });
  });
});

module.exports = router;