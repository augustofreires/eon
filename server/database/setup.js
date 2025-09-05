const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const setupDatabase = async () => {
  try {
    console.log('🔧 Configurando banco de dados...');

    // Tabela de usuários
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'client',
        status VARCHAR(50) DEFAULT 'active',
        deriv_token VARCHAR(500),
        deriv_account_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de bots
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bots (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        xml_content TEXT NOT NULL,
        xml_filename VARCHAR(255) NOT NULL,
        created_by INTEGER REFERENCES users(id),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de permissões de usuários para bots
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_bot_permissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        bot_id INTEGER REFERENCES bots(id) ON DELETE CASCADE,
        can_access BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, bot_id)
      )
    `);

    // Tabela de operações
    await pool.query(`
      CREATE TABLE IF NOT EXISTS operations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        bot_id INTEGER REFERENCES bots(id),
        status VARCHAR(50) DEFAULT 'stopped',
        config JSONB,
        balance DECIMAL(15,2) DEFAULT 0,
        profit_loss DECIMAL(15,2) DEFAULT 0,
        total_trades INTEGER DEFAULT 0,
        winning_trades INTEGER DEFAULT 0,
        losing_trades INTEGER DEFAULT 0,
        started_at TIMESTAMP,
        stopped_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de cursos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        module VARCHAR(100),
        youtube_url VARCHAR(500) NOT NULL,
        duration INTEGER,
        order_index INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de histórico de operações
    await pool.query(`
      CREATE TABLE IF NOT EXISTS operation_history (
        id SERIAL PRIMARY KEY,
        operation_id INTEGER REFERENCES operations(id),
        action VARCHAR(50) NOT NULL,
        details JSONB,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de configurações do sistema
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        deriv_app_id VARCHAR(50),
        deriv_app_token TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de configurações de tema
    await pool.query(`
      CREATE TABLE IF NOT EXISTS theme_config (
        id SERIAL PRIMARY KEY,
        primary_color VARCHAR(50) DEFAULT '#00d4aa',
        secondary_color VARCHAR(50) DEFAULT '#00b89c',
        accent_color VARCHAR(50) DEFAULT '#4CAF50',
        background_gradient TEXT DEFAULT 'linear-gradient(135deg, rgba(15, 23, 42, 0.02) 0%, rgba(26, 31, 58, 0.02) 100%)',
        card_background TEXT DEFAULT 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)',
        text_gradient TEXT DEFAULT 'linear-gradient(135deg, #00d4aa 0%, #00b89c 100%)',
        button_gradient TEXT DEFAULT 'linear-gradient(135deg, #00d4aa 0%, #00b89c 100%)',
        hover_effects BOOLEAN DEFAULT true,
        glass_effect BOOLEAN DEFAULT true,
        border_radius INTEGER DEFAULT 20,
        shadow_intensity VARCHAR(20) DEFAULT 'medium',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de configurações do Deriv/Afiliado
    await pool.query(`
      CREATE TABLE IF NOT EXISTS deriv_config (
        id SERIAL PRIMARY KEY,
        affiliate_enabled BOOLEAN DEFAULT false,
        affiliate_token VARCHAR(255),
        commission_rate DECIMAL(5,2) DEFAULT 0.5,
        tracking_enabled BOOLEAN DEFAULT true,
        custom_landing_page VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Adicionar colunas para sistema de afiliados na tabela users (se não existirem)
    try {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS referral_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS commission_earned DECIMAL(10,2) DEFAULT 0
      `);
    } catch (error) {
      console.log('Colunas de afiliado já existem ou erro na migração:', error.message);
    }

    // Inserir configurações padrão se não existirem
    const settingsExists = await pool.query('SELECT id FROM system_settings WHERE id = 1');
    if (settingsExists.rows.length === 0) {
      await pool.query(`
        INSERT INTO system_settings (id, deriv_app_id, deriv_app_token)
        VALUES (1, '', '')
      `);
    }

    // Criar admin padrão se não existir
    const bcrypt = require('bcryptjs');
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@derivbots.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456';
    
    const adminExists = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    
    if (adminExists.rows.length === 0) {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      await pool.query(`
        INSERT INTO users (email, password_hash, name, role) 
        VALUES ($1, $2, $3, $4)
      `, [adminEmail, passwordHash, 'Administrador', 'admin']);
      
      console.log('👤 Admin padrão criado:', adminEmail);
    }

    // Inserir alguns cursos de exemplo
    const coursesExist = await pool.query('SELECT id FROM courses LIMIT 1');
    
    if (coursesExist.rows.length === 0) {
      const sampleCourses = [
        {
          title: 'Introdução aos Bots Deriv',
          description: 'Aprenda os conceitos básicos de bots de trading',
          module: 'Básico',
          youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          duration: 1200,
          order_index: 1
        },
        {
          title: 'Configuração de Estratégias',
          description: 'Como configurar estratégias personalizadas',
          module: 'Intermediário',
          youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          duration: 1800,
          order_index: 2
        },
        {
          title: 'Gestão de Risco',
          description: 'Técnicas avançadas de gestão de risco',
          module: 'Avançado',
          youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          duration: 2400,
          order_index: 3
        }
      ];

      for (const course of sampleCourses) {
        await pool.query(`
          INSERT INTO courses (title, description, module, youtube_url, duration, order_index)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [course.title, course.description, course.module, course.youtube_url, course.duration, course.order_index]);
      }
      
      console.log('📚 Cursos de exemplo criados');
    }

    console.log('✅ Banco de dados configurado com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao configurar banco de dados:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

if (require.main === module) {
  setupDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { setupDatabase }; 