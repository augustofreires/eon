#!/usr/bin/env node

// Script para debuggar diretamente a API Deriv e ver todas as contas

const WebSocket = require('ws');

const token = 'a1-FnvgNAqXRN2SVnyEKfuJ0TBEX3ETN'; // Token do banco
const app_id = '82349';

console.log('🔍 Debugging Deriv API para múltiplas contas...');
console.log('🎯 Token:', token.substring(0, 10) + '...');
console.log('🔗 App ID:', app_id);

const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${app_id}`);

let step = 1;

ws.on('open', () => {
  console.log('');
  console.log('✅ Conectado ao WebSocket Deriv');
  console.log('');

  console.log(`📤 STEP ${step++}: Enviando authorize...`);
  ws.send(JSON.stringify({
    authorize: token,
    req_id: 1
  }));
});

ws.on('message', (data) => {
  try {
    const response = JSON.parse(data);
    console.log(`📥 RESPONSE ${response.req_id}:`, JSON.stringify(response, null, 2));

    if (response.req_id === 1 && response.authorize) {
      console.log('');
      console.log('🔍 ANÁLISE DO AUTHORIZE:');
      console.log('   - Login ID:', response.authorize.loginid);
      console.log('   - Email:', response.authorize.email);
      console.log('   - Currency:', response.authorize.currency);
      console.log('   - Is Virtual:', response.authorize.is_virtual);
      console.log('   - Country:', response.authorize.country);

      if (response.authorize.account_list) {
        console.log('   - Account List:', response.authorize.account_list.length, 'contas');
        response.authorize.account_list.forEach((acc, idx) => {
          console.log(`     ${idx + 1}. ${acc.loginid} (${acc.is_virtual ? 'Virtual' : 'Real'}) - ${acc.currency}`);
        });
      } else {
        console.log('   - Account List: ❌ NÃO PRESENTE');
      }

      console.log('');
      console.log(`📤 STEP ${step++}: Enviando get_account_status...`);
      ws.send(JSON.stringify({
        get_account_status: 1,
        req_id: 2
      }));

    } else if (response.req_id === 2) {
      console.log('');
      console.log('🔍 ANÁLISE DO ACCOUNT_STATUS:');
      console.log('   - Response:', JSON.stringify(response, null, 2));

      console.log('');
      console.log(`📤 STEP ${step++}: Enviando account_list...`);
      ws.send(JSON.stringify({
        account_list: 1,
        req_id: 3
      }));

    } else if (response.req_id === 3) {
      console.log('');
      console.log('🔍 ANÁLISE DO ACCOUNT_LIST:');

      if (response.account_list) {
        console.log('   ✅ SUCESSO! Encontradas', response.account_list.length, 'contas:');
        response.account_list.forEach((acc, idx) => {
          console.log(`     ${idx + 1}. ${acc.loginid} (${acc.is_virtual ? 'Virtual' : 'Real'}) - ${acc.currency}`);
        });
      } else {
        console.log('   ❌ FALHA: account_list não presente na resposta');
      }

      console.log('');
      console.log('🏁 Teste concluído!');
      ws.close();

    } else if (response.error) {
      console.error('❌ ERRO DA API DERIV:', response.error);
      ws.close();
    }

  } catch (error) {
    console.error('❌ Erro ao fazer parse da resposta:', error);
    console.log('📄 Resposta bruta:', data.toString());
  }
});

ws.on('error', (error) => {
  console.error('❌ Erro no WebSocket:', error);
});

ws.on('close', (code, reason) => {
  console.log('');
  console.log('🔌 WebSocket fechado:', code, reason?.toString() || 'N/A');
  console.log('');
  console.log('📋 RESUMO DO TESTE:');
  console.log('   Se account_list retornou múltiplas contas = API funciona');
  console.log('   Se retornou apenas 1 conta = Problema no token ou configuração Deriv');
  console.log('   Se deu erro = Problema de autenticação');
});