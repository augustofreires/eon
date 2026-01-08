import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Alert, CircularProgress, Button } from '@mui/material';
import { Link as LinkIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import DerivAccountPanel from '../components/DerivAccountPanel';
import api from '../services/api';
import toast from 'react-hot-toast';

const OperationsMinimal: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    console.log('🎯 OperationsMinimal mounted');
    console.log('User:', user);

    // AuthContext agora gerencia todo o fluxo OAuth
    setLoading(false);
  }, [user]);


  const connectToDeriv = async () => {
    try {
      console.log('🚀 OAuth: Starting Deriv connection process...');
      setConnecting(true);

      // Show loading toast for immediate feedback
      const loadingToastId = toast.loading('🔄 Iniciando conexão com Deriv...');

      try {
        // Obter URL de autorização com debugging detalhado
        console.log('📡 OAuth: Calling /api/auth/deriv/authorize...');
        const response = await api.get('/api/auth/deriv/authorize');

        console.log('✅ OAuth: Authorization URL received:', {
          success: response.data.success,
          hasAuthUrl: !!response.data.auth_url,
          expiresIn: response.data.expires_in
        });

        const { auth_url } = response.data;

        if (!auth_url) {
          throw new Error('URL de autorização não recebida do servidor');
        }

        toast.success('✅ URL OAuth obtida! Abrindo popup...', { id: loadingToastId });

        // Abrir popup para autorização com debugging
        console.log('🪟 OAuth: Opening popup window with URL:', auth_url.substring(0, 100) + '...');

        const popup = window.open(
          auth_url,
          'deriv-oauth',
          'width=600,height=700,scrollbars=yes,resizable=yes,menubar=no,toolbar=no,status=no'
        );

        if (!popup) {
          console.error('❌ OAuth: Popup was blocked by browser');
          toast.error('❌ Popup bloqueado! Permita popups para este site e tente novamente.', { id: loadingToastId });
          setConnecting(false);
          return;
        }

        console.log('✅ OAuth: Popup window opened successfully');
        toast.success('🪟 Popup aberto! Complete a autorização na nova janela.', { id: loadingToastId });

        // Enhanced message handling with debugging
        const handleMessage = async (event: MessageEvent) => {
          console.log('📨 OAuth: Message received from popup:', {
            origin: event.origin,
            type: event.data?.type,
            hasData: !!event.data
          });

          // Verify origin for security
          if (event.origin !== window.location.origin) {
            console.warn('⚠️ OAuth: Ignoring message from untrusted origin:', event.origin);
            return;
          }

          // AuthContext já processa todas as mensagens OAuth
          if (event.data?.type?.includes('deriv-oauth')) {
            console.log('✅ OAuth: Valid OAuth message received, closing popup...');
            popup.close();
            setConnecting(false);
            toast.dismiss(loadingToastId);
          }
        };

        window.addEventListener('message', handleMessage);

        // Enhanced popup monitoring with timeout
        let checkCount = 0;
        const maxChecks = 300; // 5 minutes maximum (300 * 1000ms)

        const checkClosed = setInterval(() => {
          checkCount++;

          if (popup.closed) {
            console.log(`✅ OAuth: Popup closed after ${checkCount} checks`);
            window.removeEventListener('message', handleMessage);
            clearInterval(checkClosed);
            setConnecting(false);
            toast.dismiss(loadingToastId);

            // If popup was closed without completing OAuth, show info message
            if (checkCount < 10) {
              toast('ℹ️ Popup fechado. Se não completou a autorização, tente novamente.');
            }
          } else if (checkCount >= maxChecks) {
            console.warn('⏰ OAuth: Popup check timeout reached, stopping monitoring');
            window.removeEventListener('message', handleMessage);
            clearInterval(checkClosed);
            setConnecting(false);
            toast.error('⏰ Tempo limite de autorização excedido. Tente novamente.', { id: loadingToastId });

            try {
              popup.close();
            } catch (e) {
              console.warn('⚠️ OAuth: Could not close popup:', e);
            }
          }
        }, 1000);

        // Additional popup focus handling
        try {
          popup.focus();
          console.log('✅ OAuth: Popup focused successfully');
        } catch (e) {
          console.warn('⚠️ OAuth: Could not focus popup:', e);
        }

      } catch (networkError: any) {
        console.error('❌ OAuth: Network error during authorization request:', networkError);
        const message = networkError?.response?.data?.error || networkError?.message || 'Erro de rede ao solicitar autorização';
        toast.error(`❌ Erro de rede: ${message}`, { id: loadingToastId });
        setConnecting(false);
      }

    } catch (error: any) {
      console.error('❌ OAuth: General error in connectToDeriv:', error);
      const message = error.response?.data?.error || error.message || 'Erro ao iniciar conexão';
      toast.error(`❌ Erro: ${message}`);
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // CORREÇÃO: Verificar deriv_connected ao invés de deriv_access_token
  if (!user || !user.deriv_connected) {
    return (
      <Box sx={{
        p: 3,
        minHeight: '100vh',
        background: 'linear-gradient(135deg, rgba(10, 25, 41, 0.95) 0%, rgba(15, 35, 55, 0.9) 100%)'
      }}>
        <Typography variant="h4" sx={{ color: '#ffffff', mb: 3, textAlign: 'center' }}>
          🎯 Conectar Conta Deriv
        </Typography>

        <Card sx={{
          maxWidth: 500,
          mx: 'auto',
          borderRadius: '12px',
          background: 'rgba(25, 45, 65, 0.8)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 212, 170, 0.1)'
        }}>
          <CardContent sx={{ p: 4 }}>
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body1" sx={{ mb: 1, fontWeight: 600 }}>
                Conexão com Deriv necessária
              </Typography>
              <Typography variant="body2">
                Para usar o sistema de troca de contas e visualizar saldos, você precisa conectar sua conta Deriv primeiro.
              </Typography>
            </Alert>

            <Button
              variant="contained"
              fullWidth
              size="large"
              startIcon={connecting ? <CircularProgress size={20} color="inherit" /> : <LinkIcon />}
              onClick={connectToDeriv}
              disabled={connecting}
              sx={{
                py: 2,
                background: connecting
                  ? 'linear-gradient(135deg, #666 0%, #888 100%)'
                  : 'linear-gradient(135deg, #ff4500 0%, #ff6347 100%)',
                '&:hover': connecting
                  ? {}
                  : { background: 'linear-gradient(135deg, #ff6347 0%, #ff4500 100%)' },
                '&:disabled': {
                  color: '#ffffff',
                  opacity: 0.8
                },
                fontSize: '1.1rem',
                fontWeight: 600,
                cursor: connecting ? 'wait' : 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              {connecting ? 'Carregando...' : 'CONECTAR COM DERIV'}
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{
      p: 3,
      minHeight: '100vh',
      background: 'linear-gradient(135deg, rgba(10, 25, 41, 0.95) 0%, rgba(15, 35, 55, 0.9) 100%)'
    }}>
      {/* Header */}
      <Typography variant="h4" sx={{ color: '#ffffff', mb: 3, textAlign: 'center' }}>
        🎯 OAuth + Account Switching Test
      </Typography>

      {/* Status Card */}
      <Card sx={{
        mb: 3,
        borderRadius: '12px',
        background: 'rgba(25, 45, 65, 0.8)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(0, 212, 170, 0.1)'
      }}>
        <CardContent>
          <Typography variant="h6" sx={{ color: '#00d4aa', mb: 2 }}>
            📊 Status da Conexão
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2" sx={{ color: '#ffffff' }}>
              ✅ <strong>Usuário:</strong> {user.name || user.email}
            </Typography>
            <Typography variant="body2" sx={{ color: '#ffffff' }}>
              ✅ <strong>Account ID:</strong> {user.deriv_account_id || 'N/A'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#ffffff' }}>
              ✅ <strong>Token:</strong> {user.deriv_access_token ? `${user.deriv_access_token.substring(0, 10)}...` : 'N/A'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#ffffff' }}>
              ✅ <strong>Currency:</strong> {user.deriv_currency || 'N/A'}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Account Panel - FOCO PRINCIPAL */}
      <Card sx={{
        borderRadius: '12px',
        background: 'rgba(25, 45, 65, 0.8)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(0, 212, 170, 0.1)'
      }}>
        <CardContent>
          <Typography variant="h6" sx={{ color: '#00d4aa', mb: 3, textAlign: 'center' }}>
            🔄 Account Switching Test
          </Typography>

          {/* Este é o componente crítico que precisa funcionar */}
          <DerivAccountPanel isConnected={!!user?.deriv_connected} />
        </CardContent>
      </Card>

      {/* Debug Info */}
      <Card sx={{
        mt: 3,
        borderRadius: '12px',
        background: 'rgba(45, 25, 25, 0.8)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 100, 100, 0.1)'
      }}>
        <CardContent>
          <Typography variant="h6" sx={{ color: '#ff6464', mb: 2 }}>
            🔍 Debug Info
          </Typography>
          <pre style={{
            color: '#ffffff',
            fontSize: '12px',
            overflow: 'auto',
            maxHeight: '200px'
          }}>
            {JSON.stringify({
              hasUser: !!user,
              hasToken: !!user?.deriv_access_token,
              accountId: user?.deriv_account_id,
              currency: user?.deriv_currency,
              isVirtual: user?.deriv_is_virtual,
              tokenLength: user?.deriv_access_token?.length
            }, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </Box>
  );
};

export default OperationsMinimal;