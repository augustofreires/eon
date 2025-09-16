#!/usr/bin/env node

// Script para testar a busca de múltiplas contas Deriv

const https = require('https');

// Configurações
const API_URL = 'https://iaeon.site/api/auth/deriv/fetch-all-accounts';
const TOKEN = process.argv[2]; // Token JWT do usuário

if (!TOKEN) {
  console.log('❌ Usage: node test-fetch-accounts.js <JWT_TOKEN>');
  console.log('');
  console.log('Para obter o token:');
  console.log('1. Acesse https://iaeon.site');
  console.log('2. Faça login');
  console.log('3. Abra DevTools > Application > LocalStorage');
  console.log('4. Copie o valor de "token"');
  process.exit(1);
}

console.log('🔍 Testando busca de múltiplas contas Deriv...');
console.log('🎯 API:', API_URL);
console.log('🔑 Token:', TOKEN.substring(0, 20) + '...');

const postData = JSON.stringify({});

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(API_URL, options, (res) => {
  console.log(`📡 Status: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('');
      console.log('✅ Resposta da API:');
      console.log(JSON.stringify(response, null, 2));

      if (response.success && response.accounts) {
        console.log('');
        console.log('📊 Resumo das Contas:');
        response.accounts.forEach((account, index) => {
          console.log(`   ${index + 1}. ${account.loginid} (${account.is_virtual ? 'Virtual' : 'Real'}) - ${account.currency}`);
        });
        console.log('');
        console.log(`🎉 Total: ${response.accounts.length} conta(s) encontrada(s)!`);
      }
    } catch (error) {
      console.error('❌ Erro ao fazer parse da resposta:', error);
      console.log('📄 Resposta bruta:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Erro na requisição:', error);
});

req.write(postData);
req.end();