const { query } = require('./connection');

async function up() {
  try {
    console.log('🔄 Criando tabela deriv_accounts...');

    // Criar tabela para armazenar múltiplas contas Deriv por usuário
    await query(`
      CREATE TABLE IF NOT EXISTS deriv_accounts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        loginid VARCHAR(100) NOT NULL,
        token TEXT NOT NULL,
        currency VARCHAR(10),
        is_virtual BOOLEAN DEFAULT FALSE,
        email VARCHAR(255),
        fullname VARCHAR(255),
        country VARCHAR(50),
        is_active BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, loginid)
      );
    `);

    console.log('✅ Tabela deriv_accounts criada com sucesso!');

    // Criar índices para performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_deriv_accounts_user_id ON deriv_accounts(user_id);
    `);
    console.log('✅ Índice idx_deriv_accounts_user_id criado!');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_deriv_accounts_active ON deriv_accounts(user_id, is_active);
    `);
    console.log('✅ Índice idx_deriv_accounts_active criado!');

    console.log('🎉 Migration concluída com sucesso!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Erro ao criar tabela:', error);
    process.exit(1);
  }
}

// Executar se for chamado diretamente
if (require.main === module) {
  up();
}

module.exports = { up };
