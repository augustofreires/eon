const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Wrapper para promisificar as operações do SQLite
const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    // Converter placeholders PostgreSQL ($1, $2) para SQLite (?, ?)
    let sqliteQuery = sql.replace(/\$(\d+)/g, '?');
    
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      db.all(sqliteQuery, params, (err, rows) => {
        if (err) reject(err);
        else resolve({ rows });
      });
    } else {
      db.run(sqliteQuery, params, function(err) {
        if (err) reject(err);
        else resolve({ 
          rowCount: this.changes,
          insertId: this.lastID,
          rows: [{ id: this.lastID }]
        });
      });
    }
  });
};

// Inicializar banco se não existir
const fs = require('fs');
if (!fs.existsSync(dbPath)) {
  console.log('🔧 Criando banco de dados SQLite...');
  require('./setup-sqlite');
}

module.exports = { query, db };