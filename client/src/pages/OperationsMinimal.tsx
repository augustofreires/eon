import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Alert, CircularProgress, Button } from '@mui/material';
import { Link as LinkIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import DerivAccountPanel from '../components/DerivAccountPanel';
import axios from 'axios';
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
      setConnecting(true);

      // Obter URL de autorização
      const response = await axios.get('/api/auth/deriv/authorize');
      const { auth_url } = response.data;

      // Abrir popup para autorização
      const popup = window.open(
        auth_url,
        'deriv-oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        toast.error('Popup bloqueado! Permita popups para este site.');
        return;
      }

      // AuthContext agora gerencia as mensagens OAuth
      const handleMessage = async (event: MessageEvent) => {
        // AuthContext já processa todas as mensagens OAuth
        // Só fechar o popup se necessário
        if (event.data?.type?.includes('deriv-oauth')) {
          popup.close();
        }
      };

      window.addEventListener('message', handleMessage);

      // Limpar listener quando popup fechar
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          window.removeEventListener('message', handleMessage);
          clearInterval(checkClosed);
          setConnecting(false);
        }
      }, 1000);

    } catch (error: any) {
      const message = error.response?.data?.error || 'Erro ao iniciar conexão';
      toast.error(message);
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
                background: 'linear-gradient(135deg, #ff4500 0%, #ff6347 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #ff6347 0%, #ff4500 100%)',
                },
                fontSize: '1.1rem',
                fontWeight: 600,
              }}
            >
              {connecting ? 'Conectando...' : 'Conectar com Deriv'}
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