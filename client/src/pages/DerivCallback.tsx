import React, { useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';

const DerivCallback: React.FC = () => {
  useEffect(() => {
    console.log('🔍 DERIV CALLBACK: Processando callback OAuth...');
    console.log('🔍 URL completa:', window.location.href);
    console.log('🔍 Search params:', window.location.search);
    console.log('🔍 Hash fragment:', window.location.hash);

    // CORREÇÃO CRÍTICA: OAuth da Deriv retorna tokens tanto em query params quanto em hash fragment
    // Vamos verificar ambos os locais
    const parseUrlParams = () => {
      const accounts: any[] = [];
      const tokens: { [key: string]: string } = {};

      // ESTRATÉGIA 1: Verificar query parameters (padrão atual)
      const urlParams = new URLSearchParams(window.location.search);

      // ESTRATÉGIA 2: Verificar hash fragment (padrão OAuth 2.0 implicit flow)
      const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));

      console.log('🔍 Query params found:', Array.from(urlParams.entries()));
      console.log('🔍 Hash params found:', Array.from(hashParams.entries()));

      // Combinar ambos os sources
      const allParams = new Map();
      urlParams.forEach((value, key) => allParams.set(key, value));
      hashParams.forEach((value, key) => allParams.set(key, value));

      console.log('🔍 All combined params:', Array.from(allParams.entries()));

      // Extrair múltiplas contas (acct1, acct2, acct3...) e seus tokens correspondentes
      for (let i = 1; i <= 10; i++) { // Suportar até 10 contas
        const acct = allParams.get(`acct${i}`);
        const token = allParams.get(`token${i}`);
        const cur = allParams.get(`cur${i}`);

        if (acct && token) {
          accounts.push({
            loginid: acct,
            currency: cur || 'USD',
            is_virtual: acct.startsWith('VRT'), // VRT = virtual, CR = real
            token: token
          });
          tokens[acct] = token;
          console.log(`✅ Conta ${i} encontrada:`, { loginid: acct, currency: cur, token: token.substring(0, 10) + '...' });
        }
      }

      // Verificar também tokens diretos (access_token, etc.)
      const accessToken = allParams.get('access_token') || allParams.get('token');
      if (accessToken && !accounts.length) {
        // Se temos access_token mas não temos contas específicas, criar uma entrada genérica
        console.log('🔍 Access token found but no specific accounts:', accessToken.substring(0, 10) + '...');
        accounts.push({
          loginid: 'UNKNOWN',
          currency: 'USD',
          is_virtual: false,
          token: accessToken
        });
        tokens['access_token'] = accessToken;
      }

      return { accounts, tokens, allParams };
    };

    const { accounts, tokens, allParams } = parseUrlParams();

    console.log('🔍 DERIV CALLBACK: Resultado final:', {
      accountsCount: accounts.length,
      accounts: accounts.map(acc => ({ ...acc, token: acc.token?.substring(0, 10) + '...' })),
      tokensCount: Object.keys(tokens).length
    });

    if (accounts.length > 0) {
      // CORREÇÃO: Enviar todos os dados capturados
      const callbackData = {
        type: 'deriv-oauth-callback',
        accounts: accounts,
        tokens: tokens,
        allParams: Object.fromEntries(allParams),
        primaryToken: accounts[0]?.token,
        primaryAccount: accounts[0]?.loginid
      };

      console.log('✅ DERIV CALLBACK: Enviando dados para janela pai:', {
        ...callbackData,
        tokens: Object.keys(tokens),
        primaryToken: callbackData.primaryToken?.substring(0, 10) + '...'
      });

      window.opener?.postMessage(callbackData, '*');

      // CORREÇÃO: Aumentar delay e mostrar confirmação visual
      setTimeout(() => {
        console.log('🔄 DERIV CALLBACK: Tentando fechar janela...');
        try {
          window.close();
        } catch (error) {
          console.error('❌ DERIV CALLBACK: Erro ao fechar janela:', error);
        }
      }, 1000); // Aumentar delay
    } else {
      // ERRO: Nenhuma conta ou token encontrado
      console.error('❌ DERIV CALLBACK: Nenhuma conta/token encontrada');
      console.error('❌ URL completa:', window.location.href);
      console.error('❌ Todos os parâmetros:', Object.fromEntries(allParams));

      window.opener?.postMessage({
        type: 'deriv-oauth-error',
        error: 'Nenhuma conta ou token OAuth encontrado',
        debug: {
          url: window.location.href,
          search: window.location.search,
          hash: window.location.hash,
          allParams: Object.fromEntries(allParams)
        }
      }, '*');

      setTimeout(() => {
        window.close();
      }, 5000); // Mais tempo para debug
    }
  }, []);

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      gap={2}
      sx={{ p: 3 }}
    >
      <CircularProgress />
      <Typography variant="h6">
        Processando autorização da Corretora...
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Esta janela será fechada automaticamente.
      </Typography>

      {/* DEBUG INFO */}
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center', fontSize: '0.8rem' }}>
        Debug: Verificando parâmetros OAuth na URL...
      </Typography>

      {window.location.search && (
        <Typography variant="body2" color="info.main" sx={{ fontSize: '0.7rem', wordBreak: 'break-all' }}>
          Query: {window.location.search}
        </Typography>
      )}

      {window.location.hash && (
        <Typography variant="body2" color="warning.main" sx={{ fontSize: '0.7rem', wordBreak: 'break-all' }}>
          Hash: {window.location.hash}
        </Typography>
      )}
    </Box>
  );
};

export default DerivCallback;