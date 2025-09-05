const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const setupDatabase = async () => {
  console.log('🔧 Configurando banco de dados SQLite...');

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Tabela de usuários
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'client',
          status VARCHAR(50) DEFAULT 'active',
          deriv_token VARCHAR(500),
          deriv_account_id VARCHAR(100),
          deriv_connected BOOLEAN DEFAULT 0,
          deriv_access_token TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabela de bots
      db.run(`
        CREATE TABLE IF NOT EXISTS bots (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          xml_content TEXT NOT NULL,
          xml_filename VARCHAR(255) NOT NULL,
          image_url TEXT,
          created_by INTEGER,
          is_active BOOLEAN DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      // Tabela de operações
      db.run(`
        CREATE TABLE IF NOT EXISTS operations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          bot_id INTEGER,
          status VARCHAR(50) DEFAULT 'stopped',
          entry_amount DECIMAL(15,2) DEFAULT 0,
          martingale BOOLEAN DEFAULT 0,
          max_gain DECIMAL(15,2),
          max_loss DECIMAL(15,2),
          deriv_contract_id VARCHAR(100),
          error_message TEXT,
          config TEXT,
          balance DECIMAL(15,2) DEFAULT 0,
          profit_loss DECIMAL(15,2) DEFAULT 0,
          total_trades INTEGER DEFAULT 0,
          winning_trades INTEGER DEFAULT 0,
          losing_trades INTEGER DEFAULT 0,
          started_at TIMESTAMP,
          stopped_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (bot_id) REFERENCES bots(id)
        )
      `);

      // Tabela de cursos
      db.run(`
        CREATE TABLE IF NOT EXISTS courses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          module VARCHAR(100),
          youtube_url VARCHAR(500) NOT NULL,
          duration INTEGER,
          order_index INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabela de histórico de operações
      db.run(`
        CREATE TABLE IF NOT EXISTS operation_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          operation_id INTEGER,
          action VARCHAR(50) NOT NULL,
          details TEXT,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (operation_id) REFERENCES operations(id)
        )
      `);

      // Tabela de configurações do sistema
      db.run(`
        CREATE TABLE IF NOT EXISTS system_settings (
          id INTEGER PRIMARY KEY,
          deriv_app_id VARCHAR(50),
          deriv_app_token TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabela de configurações de tema
      db.run(`
        CREATE TABLE IF NOT EXISTS theme_config (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          primary_color VARCHAR(50) DEFAULT '#00d4aa',
          secondary_color VARCHAR(50) DEFAULT '#00b89c',
          accent_color VARCHAR(50) DEFAULT '#4CAF50',
          background_gradient TEXT DEFAULT 'linear-gradient(135deg, rgba(15, 23, 42, 0.02) 0%, rgba(26, 31, 58, 0.02) 100%)',
          card_background TEXT DEFAULT 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)',
          text_gradient TEXT DEFAULT 'linear-gradient(135deg, #00d4aa 0%, #00b89c 100%)',
          button_gradient TEXT DEFAULT 'linear-gradient(135deg, #00d4aa 0%, #00b89c 100%)',
          hover_effects BOOLEAN DEFAULT 1,
          glass_effect BOOLEAN DEFAULT 1,
          border_radius INTEGER DEFAULT 20,
          shadow_intensity VARCHAR(20) DEFAULT 'medium',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabela de configurações do Deriv/Afiliado
      db.run(`
        CREATE TABLE IF NOT EXISTS deriv_config (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          affiliate_enabled BOOLEAN DEFAULT 0,
          affiliate_token TEXT,
          commission_rate REAL DEFAULT 0.5,
          tracking_enabled BOOLEAN DEFAULT 1,
          custom_landing_page TEXT,
          affiliate_link TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabela de configurações do link de acesso
      db.run(`
        CREATE TABLE IF NOT EXISTS access_link_config (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          access_link TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Adicionar colunas para sistema de afiliados na tabela users (se não existirem)
      try {
        db.run(`ALTER TABLE users ADD COLUMN referral_id TEXT`);
      } catch (error) {
        // Coluna já existe
      }
      
      try {
        db.run(`ALTER TABLE users ADD COLUMN commission_earned REAL DEFAULT 0`);
      } catch (error) {
        // Coluna já existe
      }

      // Adicionar coluna image_url na tabela bots (se não existir)
      try {
        db.run(`ALTER TABLE bots ADD COLUMN image_url TEXT`);
      } catch (error) {
        // Coluna já existe
      }

      // Criar admin padrão
      const adminEmail = 'admin@derivbots.com';
      const adminPassword = 'admin123456';
      
      db.get('SELECT id FROM users WHERE email = ?', [adminEmail], async (err, row) => {
        if (!row) {
          const passwordHash = await bcrypt.hash(adminPassword, 12);
          db.run(`
            INSERT INTO users (email, password_hash, name, role) 
            VALUES (?, ?, ?, ?)
          `, [adminEmail, passwordHash, 'Administrador', 'admin'], function(err) {
            if (err) {
              console.error('Erro ao criar admin:', err);
            } else {
              console.log('👤 Admin criado - Email:', adminEmail, 'Senha:', adminPassword);
            }
          });
        }
      });

      // Criar cliente de teste
      const clientEmail = 'cliente@test.com';
      const clientPassword = 'cliente123';
      
      db.get('SELECT id FROM users WHERE email = ?', [clientEmail], async (err, row) => {
        if (!row) {
          const passwordHash = await bcrypt.hash(clientPassword, 12);
          db.run(`
            INSERT INTO users (email, password_hash, name, role) 
            VALUES (?, ?, ?, ?)
          `, [clientEmail, passwordHash, 'Cliente Teste', 'client'], function(err) {
            if (err) {
              console.error('Erro ao criar cliente:', err);
            } else {
              console.log('👤 Cliente criado - Email:', clientEmail, 'Senha:', clientPassword);
            }
          });
        }
      });

      // Inserir cursos de exemplo
      db.get('SELECT id FROM courses LIMIT 1', (err, row) => {
        if (!row) {
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

          sampleCourses.forEach(course => {
            db.run(`
              INSERT INTO courses (title, description, module, youtube_url, duration, order_index)
              VALUES (?, ?, ?, ?, ?, ?)
            `, [course.title, course.description, course.module, course.youtube_url, course.duration, course.order_index]);
          });
          
          console.log('📚 Cursos de exemplo criados');
        }
      });

      // Inserir alguns bots de exemplo
      db.get('SELECT id FROM bots LIMIT 1', (err, row) => {
        if (!row) {
          const sampleBots = [
            {
              name: 'Bot Martingale Básico',
              description: 'Bot com estratégia martingale simples',
              xml_content: '<xml><strategy>martingale</strategy></xml>',
              xml_filename: 'martingale_basic.xml'
            },
            {
              name: 'Bot Scalping',
              description: 'Bot para operações rápidas de scalping',
              xml_content: '<xml><strategy>scalping</strategy></xml>',
              xml_filename: 'scalping.xml'
            }
          ];

          sampleBots.forEach(bot => {
            db.run(`
              INSERT INTO bots (name, description, xml_content, xml_filename, created_by)
              VALUES (?, ?, ?, ?, 1)
            `, [bot.name, bot.description, bot.xml_content, bot.xml_filename]);
          });
          
          console.log('🤖 Bots de exemplo criados');
        }
      });

      console.log('✅ Banco de dados SQLite configurado com sucesso!');
      console.log('📍 Banco localizado em:', dbPath);
      resolve();
    });
  });
};

if (require.main === module) {
  setupDatabase()
    .then(() => {
      db.close();
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { setupDatabase };