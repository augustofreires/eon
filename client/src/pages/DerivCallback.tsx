import React, { useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';

const DerivCallback: React.FC = () => {
  useEffect(() => {
    // Extrair parâmetros da URL
    const urlParams = new URLSearchParams(window.location.search);
    const accounts = urlParams.get('acct1');
    const token1 = urlParams.get('token1');

    if (accounts && token1) {
      // Enviar dados para a janela pai
      const accountsArray = accounts.split(',').map(acc => ({
        loginid: acc,
        currency: 'USD', // Você pode ajustar isso conforme necessário
        is_demo: acc.startsWith('VR') // VR = demo, CR = real
      }));

      window.opener?.postMessage({
        type: 'deriv-oauth-callback',
        accounts: accountsArray,
        token1: token1
      }, window.location.origin);

      window.close();
    } else {
      // Se não há parâmetros, mostrar erro
      window.opener?.postMessage({
        type: 'deriv-oauth-error',
        error: 'Parâmetros OAuth ausentes'
      }, window.location.origin);

      setTimeout(() => {
        window.close();
      }, 3000);
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
    >
      <CircularProgress />
      <Typography variant="h6">
        Processando autorização da Corretora...
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Esta janela será fechada automaticamente.
      </Typography>
    </Box>
  );
};

export default DerivCallback;