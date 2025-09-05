const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const createBankManagementTables = async () => {
  try {
    console.log('🔧 Criando tabelas de gestão de banca...');

    // Tabela de Configurações de Gerenciamento de Banca
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bank_management_config (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        meta_diaria DECIMAL(10,2) DEFAULT 5.00,
        max_perda_diaria DECIMAL(10,2) DEFAULT 9.00,
        deposito_inicial DECIMAL(10,2) DEFAULT 100.00,
        percentual_meta DECIMAL(5,2) DEFAULT 5.00,
        percentual_perda DECIMAL(5,2) DEFAULT 9.00,
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Tabela de Registros Diários de Banca
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bank_management_records (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        dia INTEGER NOT NULL,
        data_operacao DATE NOT NULL,
        stop_win DECIMAL(10,2) NOT NULL,
        stop_loss DECIMAL(10,2) NOT NULL,
        deposito DECIMAL(10,2) DEFAULT 0.00,
        saldo_inicial DECIMAL(10,2) NOT NULL,
        saldo_final DECIMAL(10,2) NOT NULL,
        resultado DECIMAL(10,2) NOT NULL,
        resultado_percentual DECIMAL(5,2) NOT NULL,
        resultado_acumulado DECIMAL(10,2) NOT NULL,
        objetivo_alcancado VARCHAR(20) DEFAULT 'PENDING',
        observacoes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, dia),
        UNIQUE(user_id, data_operacao)
      )
    `);

    // Tabela de Histórico de Alterações de Configuração
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bank_config_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        config_anterior JSONB,
        config_nova JSONB,
        motivo VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Índices para melhor performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bank_records_user_dia ON bank_management_records(user_id, dia)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bank_records_user_data ON bank_management_records(user_id, data_operacao)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bank_config_user ON bank_management_config(user_id)
    `);

    // Inserir configuração padrão para administrador (ID 1) se existir
    const adminExists = await pool.query('SELECT id FROM users WHERE id = 1');
    if (adminExists.rows.length > 0) {
      await pool.query(`
        INSERT INTO bank_management_config (user_id, meta_diaria, max_perda_diaria, deposito_inicial)
        VALUES (1, 5.00, 9.00, 100.00)
        ON CONFLICT (user_id) DO NOTHING
      `);
    }

    console.log('✅ Tabelas de gestão de banca criadas com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao criar tabelas de gestão de banca:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

if (require.main === module) {
  createBankManagementTables()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { createBankManagementTables };