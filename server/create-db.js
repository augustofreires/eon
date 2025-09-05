const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
console.log('🔧 Criando banco em:', dbPath);

// Remover banco se existir
const fs = require('fs');
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao criar banco:', err);
    return;
  }
  console.log('✅ Banco SQLite criado!');
});

// Criar tabelas
db.serialize(async () => {
  console.log('📋 Criando tabelas...');
  
  // Tabela users
  db.run(`CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'client',
    status TEXT DEFAULT 'active',
    deriv_token TEXT,
    deriv_account_id TEXT,
    deriv_connected INTEGER DEFAULT 0,
    deriv_access_token TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Erro ao criar tabela users:', err);
    } else {
      console.log('✅ Tabela users criada');
    }
  });

  // Tabela bots
  db.run(`CREATE TABLE bots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    xml_content TEXT NOT NULL,
    xml_filename TEXT NOT NULL,
    created_by INTEGER,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Erro ao criar tabela bots:', err);
    } else {
      console.log('✅ Tabela bots criada');
    }
  });

  // Tabela operations
  db.run(`CREATE TABLE operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    bot_id INTEGER,
    status TEXT DEFAULT 'stopped',
    entry_amount REAL DEFAULT 0,
    martingale INTEGER DEFAULT 0,
    max_gain REAL,
    max_loss REAL,
    deriv_contract_id TEXT,
    error_message TEXT,
    config TEXT,
    balance REAL DEFAULT 0,
    profit_loss REAL DEFAULT 0,
    total_trades INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    losing_trades INTEGER DEFAULT 0,
    started_at DATETIME,
    stopped_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Erro ao criar tabela operations:', err);
    } else {
      console.log('✅ Tabela operations criada');
    }
  });

  // Tabela courses
  db.run(`CREATE TABLE courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    module TEXT,
    youtube_url TEXT NOT NULL,
    duration INTEGER,
    order_index INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Erro ao criar tabela courses:', err);
    } else {
      console.log('✅ Tabela courses criada');
    }
  });

  // Inserir admin
  setTimeout(async () => {
    const adminPassword = await bcrypt.hash('admin123456', 12);
    db.run(`INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)`,
      ['admin@derivbots.com', adminPassword, 'Administrador', 'admin'], 
      function(err) {
        if (err) {
          console.error('Erro ao inserir admin:', err);
        } else {
          console.log('👤 Admin criado - ID:', this.lastID);
        }
      }
    );

    // Inserir cliente
    const clientPassword = await bcrypt.hash('cliente123', 12);
    db.run(`INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)`,
      ['cliente@test.com', clientPassword, 'Cliente Teste', 'client'], 
      function(err) {
        if (err) {
          console.error('Erro ao inserir cliente:', err);
        } else {
          console.log('👤 Cliente criado - ID:', this.lastID);
        }
      }
    );

    // Inserir bots de exemplo
    db.run(`INSERT INTO bots (name, description, xml_content, xml_filename, created_by) VALUES (?, ?, ?, ?, ?)`,
      ['Bot Martingale', 'Bot com estratégia martingale', '<xml><strategy>martingale</strategy></xml>', 'martingale.xml', 1], 
      function(err) {
        if (err) {
          console.error('Erro ao inserir bot:', err);
        } else {
          console.log('🤖 Bot criado - ID:', this.lastID);
        }
      }
    );

    // Inserir cursos
    const courses = [
      ['Introdução aos Bots', 'Conceitos básicos', 'Básico', 'https://youtube.com/watch?v=demo1', 1200, 1],
      ['Estratégias Avançadas', 'Configuração de estratégias', 'Intermediário', 'https://youtube.com/watch?v=demo2', 1800, 2]
    ];

    courses.forEach(course => {
      db.run(`INSERT INTO courses (title, description, module, youtube_url, duration, order_index) VALUES (?, ?, ?, ?, ?, ?)`,
        course, function(err) {
          if (err) {
            console.error('Erro ao inserir curso:', err);
          } else {
            console.log('📚 Curso criado - ID:', this.lastID);
          }
        }
      );
    });

    console.log('🎉 Banco de dados configurado com sucesso!');
    console.log('📧 Admin: admin@derivbots.com / admin123456');
    console.log('📧 Cliente: cliente@test.com / cliente123');
    
    setTimeout(() => {
      db.close((err) => {
        if (err) {
          console.error('Erro ao fechar banco:', err);
        }
        process.exit(0);
      });
    }, 1000);

  }, 1000);
});