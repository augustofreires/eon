#!/usr/bin/env node
/**
 * Script para verificar dados Deriv no banco PostgreSQL
 */

const { Pool } = require('pg');
require('dotenv').config({ path: './server/.env' });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'eon_pro',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 5432,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function checkDerivData() {
  try {
    console.log('🔍 VERIFICANDO DADOS DERIV NO BANCO DE DADOS');
    console.log('===========================================\n');

    // 1. Usuários com Deriv conectado
    console.log('1️⃣ Usuários com Deriv conectado:');
    const derivUsers = await pool.query(`
      SELECT
        id,
        email,
        deriv_connected,
        deriv_account_id,
        deriv_currency,
        deriv_is_virtual,
        CASE
          WHEN deriv_access_token IS NOT NULL THEN 'SIM (' || LENGTH(deriv_access_token) || ' chars)'
          ELSE 'NAO'
        END as tem_token,
        CASE
          WHEN deriv_accounts_tokens IS NOT NULL THEN 'SIM (' || LENGTH(deriv_accounts_tokens) || ' chars)'
          ELSE 'NAO'
        END as tem_accounts_tokens
      FROM users
      WHERE deriv_connected = true
      ORDER BY id
    `);

    console.table(derivUsers.rows);

    // 2. Análise das contas tokens
    console.log('\n2️⃣ Análise dos dados de múltiplas contas:');
    const tokenAnalysis = await pool.query(`
      SELECT
        id,
        email,
        deriv_account_id,
        deriv_accounts_tokens
      FROM users
      WHERE deriv_connected = true
      AND deriv_accounts_tokens IS NOT NULL
      ORDER BY id
    `);

    tokenAnalysis.rows.forEach(row => {
      console.log(`\n👤 Usuário: ${row.email} (ID: ${row.id})`);
      console.log(`📋 Conta ativa: ${row.deriv_account_id}`);

      if (row.deriv_accounts_tokens) {
        try {
          const accounts = JSON.parse(row.deriv_accounts_tokens);
          console.log(`📊 Total de contas salvas: ${accounts.length}`);

          accounts.forEach((acc, idx) => {
            const isActive = acc.loginid === row.deriv_account_id ? '✅ ATIVA' : '⭕ DISPONÍVEL';
            console.log(`  ${idx + 1}. ${acc.loginid} (${acc.currency}) - ${acc.is_virtual ? 'Virtual' : 'Real'} ${isActive}`);
          });
        } catch (parseError) {
          console.log(`❌ Erro ao fazer parse do JSON: ${parseError.message}`);
        }
      } else {
        console.log('❌ Nenhum dado de contas salvo');
      }
    });

    // 3. Estatísticas gerais
    console.log('\n3️⃣ Estatísticas gerais:');
    const stats = await pool.query(`
      SELECT
        COUNT(*) as total_usuarios,
        COUNT(CASE WHEN deriv_connected = true THEN 1 END) as usuarios_conectados,
        COUNT(CASE WHEN deriv_accounts_tokens IS NOT NULL AND deriv_accounts_tokens != '[]' THEN 1 END) as usuarios_com_multiplas_contas
      FROM users
    `);

    console.table(stats.rows);

    // 4. Verificar usuário de teste específico
    console.log('\n4️⃣ Verificando usuário de teste (cliente@iaeon.com):');
    const testUser = await pool.query(`
      SELECT
        id,
        email,
        deriv_connected,
        deriv_account_id,
        deriv_currency,
        deriv_is_virtual,
        deriv_accounts_tokens
      FROM users
      WHERE email = 'cliente@iaeon.com'
    `);

    if (testUser.rows.length > 0) {
      const user = testUser.rows[0];
      console.log(`👤 Usuário encontrado: ${user.email}`);
      console.log(`🔗 Deriv conectado: ${user.deriv_connected}`);
      console.log(`📋 Conta ativa: ${user.deriv_account_id}`);
      console.log(`💰 Moeda: ${user.deriv_currency}`);
      console.log(`🎮 Virtual: ${user.deriv_is_virtual}`);

      if (user.deriv_accounts_tokens) {
        try {
          const accounts = JSON.parse(user.deriv_accounts_tokens);
          console.log(`📊 Contas salvas: ${accounts.length}`);
          accounts.forEach((acc, idx) => {
            console.log(`  ${idx + 1}. ${acc.loginid} (${acc.currency}) - ${acc.is_virtual ? 'Virtual' : 'Real'}`);
          });
        } catch (parseError) {
          console.log(`❌ Erro ao fazer parse: ${parseError.message}`);
        }
      }
    } else {
      console.log('❌ Usuário de teste não encontrado');
    }

  } catch (error) {
    console.error('❌ Erro ao verificar dados:', error);
  } finally {
    await pool.end();
  }
}

checkDerivData();