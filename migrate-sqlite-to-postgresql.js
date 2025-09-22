#!/usr/bin/env node

/**
 * Migration script from SQLite to PostgreSQL for Deriv Trading Platform
 * This script migrates all data from SQLite database to PostgreSQL
 */

const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// SQLite database path
const SQLITE_DB_PATH = path.join(__dirname, 'database.sqlite');

const migrateData = async () => {
  console.log('🔄 Iniciando migração SQLite → PostgreSQL...');

  try {
    // Test PostgreSQL connection
    await pool.query('SELECT NOW()');
    console.log('✅ Conexão PostgreSQL estabelecida');

    // Open SQLite database
    const db = new sqlite3.Database(SQLITE_DB_PATH);
    console.log('✅ Conexão SQLite estabelecida');

    // Migrate users
    console.log('📊 Migrando usuários...');
    const users = await new Promise((resolve, reject) => {
      db.all(`SELECT * FROM users`, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    for (const user of users) {
      try {
        await pool.query(`
          INSERT INTO users (
            email, password_hash, name, role, status,
            deriv_token, deriv_account_id, deriv_connected,
            deriv_access_token, created_at, updated_at,
            referral_id, commission_earned, profile_picture
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (email) DO UPDATE SET
            password_hash = EXCLUDED.password_hash,
            name = EXCLUDED.name,
            role = EXCLUDED.role,
            status = EXCLUDED.status,
            deriv_token = EXCLUDED.deriv_token,
            deriv_account_id = EXCLUDED.deriv_account_id,
            deriv_connected = EXCLUDED.deriv_connected,
            deriv_access_token = EXCLUDED.deriv_access_token,
            updated_at = EXCLUDED.updated_at,
            referral_id = EXCLUDED.referral_id,
            commission_earned = EXCLUDED.commission_earned,
            profile_picture = EXCLUDED.profile_picture
        `, [
          user.email, user.password_hash, user.name, user.role, user.status,
          user.deriv_token, user.deriv_account_id, user.deriv_connected || false,
          user.deriv_access_token, user.created_at, user.updated_at,
          user.referral_id, user.commission_earned || 0, user.profile_picture
        ]);
        console.log(`   ✓ Usuário migrado: ${user.email}`);
      } catch (error) {
        console.error(`   ❌ Erro ao migrar usuário ${user.email}:`, error.message);
      }
    }

    // Migrate bots
    console.log('🤖 Migrando bots...');
    const bots = await new Promise((resolve, reject) => {
      db.all(`SELECT * FROM bots`, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    for (const bot of bots) {
      try {
        await pool.query(`
          INSERT INTO bots (
            name, description, xml_content, xml_filename,
            image_url, created_by, is_active, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT DO NOTHING
        `, [
          bot.name, bot.description, bot.xml_content, bot.xml_filename,
          bot.image_url, bot.created_by, bot.is_active !== false,
          bot.created_at, bot.updated_at
        ]);
        console.log(`   ✓ Bot migrado: ${bot.name}`);
      } catch (error) {
        console.error(`   ❌ Erro ao migrar bot ${bot.name}:`, error.message);
      }
    }

    // Migrate deriv_config
    console.log('⚙️ Migrando configurações Deriv...');
    const derivConfigs = await new Promise((resolve, reject) => {
      db.all(`SELECT * FROM deriv_config`, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    for (const config of derivConfigs) {
      try {
        await pool.query(`
          INSERT INTO deriv_config (
            affiliate_enabled, affiliate_token, affiliate_link,
            commission_rate, tracking_enabled, custom_landing_page, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT DO NOTHING
        `, [
          config.affiliate_enabled || false, config.affiliate_token, config.affiliate_link,
          config.commission_rate || 0.5, config.tracking_enabled !== false,
          config.custom_landing_page, config.created_at
        ]);
        console.log(`   ✓ Configuração Deriv migrada`);
      } catch (error) {
        console.error(`   ❌ Erro ao migrar configuração Deriv:`, error.message);
      }
    }

    // Migrate other tables if they exist
    const tables = ['user_bot_permissions', 'operations', 'courses', 'operation_history'];

    for (const tableName of tables) {
      try {
        console.log(`📋 Migrando ${tableName}...`);
        const rows = await new Promise((resolve, reject) => {
          db.all(`SELECT * FROM ${tableName}`, (err, rows) => {
            if (err) {
              if (err.message.includes('no such table')) {
                resolve([]);
              } else {
                reject(err);
              }
            } else {
              resolve(rows);
            }
          });
        });

        if (rows.length === 0) {
          console.log(`   ⚠️ Tabela ${tableName} vazia ou não existe`);
          continue;
        }

        for (const row of rows) {
          try {
            const columns = Object.keys(row).join(', ');
            const placeholders = Object.keys(row).map((_, i) => `$${i + 1}`).join(', ');
            const values = Object.values(row);

            await pool.query(`
              INSERT INTO ${tableName} (${columns})
              VALUES (${placeholders})
              ON CONFLICT DO NOTHING
            `, values);
          } catch (error) {
            console.error(`   ❌ Erro ao migrar linha da tabela ${tableName}:`, error.message);
          }
        }
        console.log(`   ✓ ${rows.length} registros migrados de ${tableName}`);
      } catch (error) {
        console.error(`   ❌ Erro ao migrar tabela ${tableName}:`, error.message);
      }
    }

    // Close SQLite connection
    db.close();
    console.log('✅ Migração concluída com sucesso!');

  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

if (require.main === module) {
  migrateData()
    .then(() => {
      console.log('🎉 Migração SQLite → PostgreSQL concluída!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Falha na migração:', error);
      process.exit(1);
    });
}

module.exports = { migrateData };