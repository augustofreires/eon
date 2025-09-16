#!/usr/bin/env node

/**
 * Script de teste para funcionalidade de switch de contas Deriv
 *
 * Este script testa o fluxo correto de troca entre contas Virtual/Real
 * usando a API corrigida.
 */

const axios = require('axios');

const API_BASE = process.env.API_URL || 'http://localhost:5000';

async function testSwitchAccount() {
  console.log('🧪 Iniciando teste de switch de contas Deriv\n');

  try {
    // Simular requisição de switch para virtual
    console.log('1. Testando switch para conta Virtual...');

    const switchToVirtualResponse = await axios.post(`${API_BASE}/api/auth/deriv/switch-account`,
      {
        is_virtual: true
      },
      {
        headers: {
          'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE',
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Resposta para Virtual:', {
      success: switchToVirtualResponse.data.success,
      account_id: switchToVirtualResponse.data.accountInfo?.account?.id,
      is_virtual: switchToVirtualResponse.data.accountInfo?.account?.is_virtual
    });

    // Aguardar um pouco
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simular requisição de switch para real
    console.log('\n2. Testando switch para conta Real...');

    const switchToRealResponse = await axios.post(`${API_BASE}/api/auth/deriv/switch-account`,
      {
        is_virtual: false
      },
      {
        headers: {
          'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE',
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Resposta para Real:', {
      success: switchToRealResponse.data.success,
      account_id: switchToRealResponse.data.accountInfo?.account?.id,
      is_virtual: switchToRealResponse.data.accountInfo?.account?.is_virtual
    });

    console.log('\n🎉 Teste concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro no teste:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });

    if (error.response?.status === 401) {
      console.log('\n💡 Dica: Atualize o token JWT no script antes de executar');
    }
  }
}

async function testStatus() {
  console.log('\n🔍 Testando endpoint de status...');

  try {
    const statusResponse = await axios.get(`${API_BASE}/api/auth/deriv/status`, {
      headers: {
        'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE'
      }
    });

    console.log('✅ Status:', {
      connected: statusResponse.data.connected,
      current_account: statusResponse.data.account_id,
      available_accounts: statusResponse.data.available_accounts?.length || 0
    });

  } catch (error) {
    console.error('❌ Erro no status:', error.response?.data || error.message);
  }
}

// Executar testes
async function runTests() {
  await testStatus();
  await testSwitchAccount();
}

if (require.main === module) {
  runTests();
}

module.exports = { testSwitchAccount, testStatus };