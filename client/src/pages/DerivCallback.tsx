import React, { useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';

const DerivCallback: React.FC = () => {
  useEffect(() => {
    console.log('🔍 DERIV CALLBACK: Processando callback OAuth...');
    console.log('🔍 URL completa:', window.location.href);
    console.log('🔍 Search params:', window.location.search);
    console.log('🔍 Hash fragment:', window.location.hash);
    console.log('🔍 Opener available:', !!window.opener);
    console.log('🔍 Opener closed:', window.opener?.closed);
    console.log('🔍 Is popup:', window.opener && !window.opener.closed);
    console.log('🔍 Current path:', window.location.pathname);

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
      // CORREÇÃO: Detectar se estamos em popup ou página normal
      const isPopup = window.opener && !window.opener.closed;
      const isOperationsPage = window.location.pathname === '/operations' || window.location.pathname === '/operations/oauth';

      if (isPopup) {
        // MODO POPUP: Enviar dados via postMessage
        const callbackData = {
          type: 'deriv-oauth-callback',
          accounts: accounts,
          tokens: tokens,
          allParams: Object.fromEntries(allParams),
          primaryToken: accounts[0]?.token,
          primaryAccount: accounts[0]?.loginid
        };

        console.log('✅ DERIV CALLBACK POPUP: Enviando dados para janela pai:', {
          ...callbackData,
          tokens: Object.keys(tokens),
          primaryToken: callbackData.primaryToken?.substring(0, 10) + '...'
        });

        // Usar origem específica para segurança
        const targetOrigin = window.location.origin;
        window.opener.postMessage(callbackData, targetOrigin);

        console.log('✅ DERIV CALLBACK POPUP: Mensagem enviada para origem:', targetOrigin);

        // Fechar popup
        setTimeout(() => {
          try {
            window.close();
          } catch (error) {
            console.error('❌ Erro ao fechar popup:', error);
          }
        }, 500);

      } else if (isOperationsPage) {
        // MODO PÁGINA NORMAL: Processar OAuth diretamente na página
        console.log('✅ DERIV CALLBACK PÁGINA: Processando OAuth na página operations...');

        // ✅ CORREÇÃO: Usar nova rota que salva TODAS as contas na tabela deriv_accounts
        const token = localStorage.getItem('token');

        if (!token) {
          console.error('❌ Token de autenticação não encontrado');
          window.location.href = '/login';
          return;
        }

        fetch('/api/auth/deriv/save-all-accounts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            accounts: accounts  // ✅ Array completo com TODAS as contas OAuth
          }),
        })
        .then(response => response.json())
        .then(data => {
          console.log('✅ Todas as contas OAuth salvas no backend:', data);

          if (data.success) {
            console.log(`✅ ${data.saved_count} contas salvas com sucesso!`);

            // Mostrar notificação de sucesso
            const accountsText = data.accounts.map((acc: any) =>
              `${acc.loginid} (${acc.is_virtual ? 'Virtual' : 'Real'})`
            ).join(', ');

            console.log(`📊 Contas salvas: ${accountsText}`);

            // Redirecionar para operations após 1 segundo
            setTimeout(() => {
              window.location.href = '/operations';
            }, 1000);
          } else {
            console.error('❌ Erro no backend:', data.error);
            alert(`Erro ao salvar contas: ${data.error}`);
          }
        })
        .catch(error => {
          console.error('❌ Erro ao processar OAuth:', error);
          alert('Erro ao processar autenticação. Verifique o console.');
        });

      } else {
        console.error('❌ DERIV CALLBACK: Contexto não reconhecido (nem popup nem operations)');
      }
    } else {
      // ERRO: Nenhuma conta ou token encontrado
      console.error('❌ DERIV CALLBACK: Nenhuma conta/token encontrada');
      console.error('❌ URL completa:', window.location.href);
      console.error('❌ Todos os parâmetros:', Object.fromEntries(allParams));

      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({
          type: 'deriv-oauth-error',
          error: 'Nenhuma conta ou token OAuth encontrado',
          debug: {
            url: window.location.href,
            search: window.location.search,
            hash: window.location.hash,
            allParams: Object.fromEntries(allParams)
          }
        }, window.location.origin);
      }

      // Fechar janela após erro também
      setTimeout(() => {
        try {
          window.close();
        } catch (error) {
          console.error('❌ DERIV CALLBACK: Erro ao fechar janela após erro:', error);
          window.location.replace('about:blank');
        }
      }, 3000); // Tempo suficiente para debug
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