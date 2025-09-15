#!/usr/bin/env node

/**
 * SCRIPT DE DEBUG PARA OAUTH CALLBACK DERIV
 *
 * Este script simula o processamento do OAuth callback da Deriv
 * para ajudar a entender o formato dos parâmetros recebidos.
 *
 * USO:
 * 1. Copie a URL completa do callback OAuth da Deriv
 * 2. Execute: node debug-oauth-callback.js "URL_COMPLETA_DO_CALLBACK"
 *
 * EXEMPLO:
 * node debug-oauth-callback.js "https://iaeon.site/operations?acct1=CR123&token1=a1-xyz&cur1=USD&acct2=VR456&token2=a1-abc&cur2=USD"
 */

const url = require('url');

function debugOAuthCallback(callbackUrl) {
  console.log('🔍 DEBUGGING OAUTH CALLBACK DA DERIV\n');
  console.log('URL recebida:', callbackUrl);
  console.log('=' + '='.repeat(80));

  try {
    const parsed = url.parse(callbackUrl, true);
    const query = parsed.query;

    console.log('\n📋 TODOS OS PARÂMETROS RECEBIDOS:');
    console.log(JSON.stringify(query, null, 2));

    console.log('\n🔍 CHAVES DOS PARÂMETROS:');
    console.log(Object.keys(query));

    console.log('\n🏦 ANÁLISE DE CONTAS MÚLTIPLAS:');
    console.log('=' + '='.repeat(50));

    const accounts = [];

    // Procurar múltiplas contas (formato acct1, token1, cur1, acct2, token2, cur2, etc.)
    for (let i = 1; i <= 10; i++) {
      const tokenKey = `token${i}`;
      const acctKey = `acct${i}`;
      const curKey = `cur${i}`;
      const currKey = `curr${i}`;

      console.log(`\n🔎 Verificando conta ${i}:`);
      console.log(`  ${tokenKey}: ${query[tokenKey] ? 'ENCONTRADO' : 'NÃO ENCONTRADO'} ${query[tokenKey] ? `(${query[tokenKey].substring(0, 10)}...)` : ''}`);
      console.log(`  ${acctKey}: ${query[acctKey] ? 'ENCONTRADO' : 'NÃO ENCONTRADO'} ${query[acctKey] ? `(${query[acctKey]})` : ''}`);
      console.log(`  ${curKey}: ${query[curKey] ? 'ENCONTRADO' : 'NÃO ENCONTRADO'} ${query[curKey] ? `(${query[curKey]})` : ''}`);
      console.log(`  ${currKey}: ${query[currKey] ? 'ENCONTRADO' : 'NÃO ENCONTRADO'} ${query[currKey] ? `(${query[currKey]})` : ''}`);

      if (query[tokenKey] && query[acctKey]) {
        const currency = query[currKey] || query[curKey] || 'USD';
        const accountData = {
          token: query[tokenKey],
          loginid: query[acctKey],
          currency: currency.toUpperCase(),
          is_virtual: query[acctKey].toLowerCase().startsWith('vr') ||
                     query[acctKey].toLowerCase().startsWith('vrtc')
        };

        accounts.push(accountData);
        console.log(`  ✅ CONTA ${i} VÁLIDA ENCONTRADA`);
      } else {
        console.log(`  ❌ Conta ${i} incompleta`);
        if (i > 2) break; // Para de procurar após 2 contas vazias consecutivas
      }
    }

    console.log('\n📊 RESUMO FINAL:');
    console.log('=' + '='.repeat(50));
    console.log(`Total de contas encontradas: ${accounts.length}`);

    if (accounts.length > 0) {
      accounts.forEach((acc, idx) => {
        console.log(`\n📋 Conta ${idx + 1}:`);
        console.log(`  Login ID: ${acc.loginid}`);
        console.log(`  Tipo: ${acc.is_virtual ? 'VIRTUAL' : 'REAL'}`);
        console.log(`  Moeda: ${acc.currency}`);
        console.log(`  Token: ${acc.token.substring(0, 20)}...`);
      });

      console.log('\n✅ MÚLTIPLAS CONTAS DETECTADAS!');
      console.log('💡 Seu código deve conseguir capturar essas contas.');
    } else {
      console.log('\n❌ NENHUMA CONTA ENCONTRADA!');
      console.log('💡 Verifique se a URL do callback está correta.');
    }

    // Verificar outros formatos possíveis
    console.log('\n🔍 VERIFICANDO OUTROS FORMATOS:');
    console.log('=' + '='.repeat(50));

    if (query.access_token) {
      console.log(`✅ access_token encontrado: ${query.access_token.substring(0, 20)}...`);
    }

    if (query.account_id) {
      console.log(`✅ account_id encontrado: ${query.account_id}`);
    }

    if (query.state) {
      console.log(`✅ state encontrado: ${query.state.substring(0, 20)}...`);
    }

    if (query.error) {
      console.log(`❌ ERRO encontrado: ${query.error}`);
      if (query.error_description) {
        console.log(`❌ Descrição do erro: ${query.error_description}`);
      }
    }

  } catch (error) {
    console.error('❌ Erro ao processar URL:', error.message);
  }

  console.log('\n' + '='.repeat(80));
  console.log('🎯 PRÓXIMOS PASSOS PARA TESTAR:');
  console.log('1. Execute o OAuth da Deriv no seu app');
  console.log('2. Copie a URL completa que é chamada no callback');
  console.log('3. Execute este script com essa URL');
  console.log('4. Compare os resultados com o que seu código está capturando');
  console.log('=' + '='.repeat(80));
}

// Executar se chamado diretamente
if (require.main === module) {
  const callbackUrl = process.argv[2];

  if (!callbackUrl) {
    console.log('❌ ERRO: URL do callback não fornecida');
    console.log('\n📖 USO:');
    console.log('node debug-oauth-callback.js "URL_COMPLETA_DO_CALLBACK"');
    console.log('\n📝 EXEMPLO:');
    console.log('node debug-oauth-callback.js "https://iaeon.site/operations?acct1=CR123&token1=a1-xyz&cur1=USD&acct2=VR456&token2=a1-abc&cur2=USD&state=jwt_token_here"');
    process.exit(1);
  }

  debugOAuthCallback(callbackUrl);
}

module.exports = { debugOAuthCallback };