#!/usr/bin/env node

// Script para debugar o endpoint account-info na VPS
// Usage: node debug-account-info-api.js [user_id]

const { Pool } = require('pg');
const WebSocket = require('ws');

// Configuração do banco (ajustar conforme VPS)
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'eon_pro',
  password: 'postgres',
  port: 5432,
});

async function debugAccountInfo(userId = 1) {
  console.log('🔍 DEBUGGING ACCOUNT INFO API');
  console.log('=' .repeat(50));

  try {
    // 1. Buscar dados do usuário no banco
    console.log('1️⃣ Buscando dados do usuário no banco...');
    const result = await pool.query(`
      SELECT deriv_connected, deriv_account_id, deriv_access_token,
             deriv_email, deriv_currency, deriv_is_virtual, deriv_fullname,
             deriv_accounts_tokens
      FROM users
      WHERE id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      console.log('❌ Usuário não encontrado!');
      return;
    }

    const user = result.rows[0];
    console.log('✅ Usuário encontrado:', {
      deriv_connected: user.deriv_connected,
      deriv_account_id: user.deriv_account_id,
      deriv_email: user.deriv_email,
      deriv_currency: user.deriv_currency,
      deriv_is_virtual: user.deriv_is_virtual,
      has_access_token: !!user.deriv_access_token,
      token_length: user.deriv_access_token?.length || 0,
      has_accounts_tokens: !!user.deriv_accounts_tokens,
      accounts_tokens_raw: user.deriv_accounts_tokens
    });

    // 2. Analisar tokens das contas
    console.log('\n2️⃣ Analisando tokens das contas...');
    let availableAccounts = [];
    try {
      if (user.deriv_accounts_tokens) {
        availableAccounts = JSON.parse(user.deriv_accounts_tokens);
        console.log('✅ PARSED available accounts:', availableAccounts.length, 'contas');
        availableAccounts.forEach((acc, idx) => {
          console.log(`   ${idx + 1}. ${acc.loginid} (${acc.is_virtual ? 'Virtual' : 'Real'}) - ${acc.currency}`);
        });
      } else {
        console.log('❌ deriv_accounts_tokens é NULL/undefined');
      }
    } catch (parseError) {
      console.log('❌ Erro ao fazer parse das contas:', parseError);
      console.log('📄 Raw data:', user.deriv_accounts_tokens);
    }

    // 3. Testar WebSocket Deriv API
    console.log('\n3️⃣ Testando WebSocket Deriv API...');
    const connected = !!(user.deriv_connected && (user.deriv_connected === true || user.deriv_connected === 1));

    if (!connected || !user.deriv_access_token) {
      console.log('❌ Conta Deriv não conectada ou sem token');
      return;
    }

    try {
      const wsPromise = new Promise((resolve, reject) => {
        const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=82349');
        let responseCount = 0;
        let accountData = {};

        ws.on('open', () => {
          console.log('🔌 Conectado ao WebSocket Deriv');

          // Autorizar com token
          ws.send(JSON.stringify({
            authorize: user.deriv_access_token,
            req_id: 1
          }));
        });

        ws.on('message', (data) => {
          try {
            const response = JSON.parse(data);
            console.log('📨 Resposta Deriv:', { req_id: response.req_id, msg_type: response.msg_type });

            if (response.req_id === 1 && response.authorize) {
              console.log('✅ Autorização bem-sucedida');
              accountData.account_info = response.authorize;
              ws.send(JSON.stringify({
                balance: 1,
                account: user.deriv_account_id,
                req_id: 2
              }));

            } else if (response.req_id === 2 && response.balance) {
              console.log('✅ Saldo recebido');
              accountData.balance_info = response.balance;
              responseCount++;

              if (responseCount >= 1) {
                ws.close();
                resolve(accountData);
              }
            } else if (response.error) {
              console.error('❌ Erro na API Deriv:', response.error);
              ws.close();
              reject(new Error(response.error.message));
            }
          } catch (parseError) {
            console.error('❌ Erro ao fazer parse da resposta:', parseError);
          }
        });

        ws.on('error', (error) => {
          console.error('❌ Erro no WebSocket:', error);
          reject(error);
        });

        // Timeout após 10 segundos
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
            reject(new Error('Timeout na conexão Deriv'));
          }
        }, 10000);
      });

      const derivData = await wsPromise;
      console.log('✅ Dados Deriv obtidos:', {
        account_id: user.deriv_account_id,
        balance: derivData.balance_info?.balance,
        currency: derivData.balance_info?.currency,
        is_virtual: derivData.account_info?.is_virtual
      });

      // 4. Montar resposta final
      console.log('\n4️⃣ Resposta final que seria enviada para o frontend:');
      const finalResponse = {
        success: true,
        account: {
          id: user.deriv_account_id,
          balance: derivData.balance_info?.balance || 0,
          currency: derivData.balance_info?.currency || user.deriv_currency || 'USD',
          is_virtual: derivData.account_info?.is_virtual || user.deriv_is_virtual,
          fullname: derivData.account_info?.fullname || user.deriv_fullname,
          email: derivData.account_info?.email || user.deriv_email,
        },
        available_accounts: availableAccounts.map(acc => ({
          loginid: acc.loginid,
          currency: acc.currency,
          is_virtual: acc.is_virtual
        })),
        transactions: [],
        profit_loss: {
          today: 0,
          total: 0
        }
      };

      console.log(JSON.stringify(finalResponse, null, 2));

      console.log('\n' + '='.repeat(50));
      console.log('🎯 DIAGNÓSTICO:');

      if (availableAccounts.length === 0) {
        console.log('❌ PROBLEMA: deriv_accounts_tokens está vazio');
        console.log('   💡 SOLUÇÃO: Reconectar conta Deriv para capturar todas as contas');
      } else if (availableAccounts.length === 1) {
        console.log('⚠️  ATENÇÃO: Usuário tem apenas 1 conta');
        console.log('   📝 INFO: Isso pode ser normal se o usuário tem só conta virtual OU só real');
      } else {
        console.log('✅ TUDO OK: Múltiplas contas encontradas');
        console.log('   📝 INFO: O seletor deveria mostrar todas as contas');
      }

    } catch (apiError) {
      console.error('❌ Erro ao conectar com API Deriv:', apiError);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  } finally {
    await pool.end();
  }
}

// Executar
const userId = process.argv[2] || 1;
debugAccountInfo(parseInt(userId));