import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Container,
  Paper,
  Divider,
  Grid
} from '@mui/material';
import { 
  Link as LinkIcon, 
  LinkOff, 
  CheckCircle, 
  Security, 
  AccountBalance,
  TrendingUp 
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import axios from 'axios';
import toast from 'react-hot-toast';

interface DerivStatus {
  connected: boolean;
  account_id: string | null;
}

interface AffiliateConfig {
  affiliate_link: string | null;
}

const DerivConnection: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<DerivStatus>({ connected: false, account_id: null });
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [affiliateLink, setAffiliateLink] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      await checkDerivStatus();
      await loadAffiliateLink();
    };
    loadData();
  }, []);

  const loadAffiliateLink = async () => {
    try {
      const response = await axios.get('/api/auth/deriv-affiliate-link');
      setAffiliateLink(response.data.affiliate_link);
    } catch (error) {
      console.error('Erro ao carregar link de afiliado:', error);
    }
  };

  const checkDerivStatus = async () => {
    try {
      setCheckingStatus(true);
      const response = await axios.get('/api/auth/deriv/status');
      setStatus(response.data);
    } catch (error) {
      console.error('Erro ao verificar status da Corretora:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const connectToDeriv = async () => {
    try {
      setLoading(true);
      
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
        toast.error(t('deriv.popupBlocked'));
        return;
      }

      // Escutar mensagem do popup
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'deriv_oauth_success') {
          popup.close();

          try {
            toast.success(t('deriv.connectionSuccess'));
            checkDerivStatus();
          } catch (error: any) {
            const message = error.message || t('deriv.connectionError');
            toast.error(message);
          }
        }
      };

      window.addEventListener('message', handleMessage);
      
      // Limpar listener quando popup fechar
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          window.removeEventListener('message', handleMessage);
          clearInterval(checkClosed);
          setLoading(false);
        }
      }, 1000);

    } catch (error: any) {
      const message = error.response?.data?.error || t('deriv.startConnectionError');
      toast.error(message);
      setLoading(false);
    }
  };

  const disconnectFromDeriv = async () => {
    try {
      setLoading(true);
      await axios.post('/api/auth/deriv/disconnect');
      
      toast.success(t('deriv.disconnectionSuccess'));
      checkDerivStatus();
    } catch (error: any) {
      const message = error.response?.data?.error || t('deriv.disconnectionError');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const openDerivSignup = () => {
    const signupUrl = affiliateLink || 'https://app.deriv.com/signup';
    window.open(signupUrl, '_blank');
    toast.success(t('deriv.afterSignup'));
  };

  if (checkingStatus) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
        py: 4
      }}
    >
      <Container maxWidth="lg">
        {/* Header */}
        <Box textAlign="center" mb={6}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              color: '#fff',
              mb: 2,
              textShadow: '0 0 20px rgba(255, 69, 0, 0.3)'
            }}
          >
            {t('deriv.title')}
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              maxWidth: 600,
              mx: 'auto'
            }}
          >
            {t('deriv.subtitle')}
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {/* Status Card */}
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                background: 'rgba(40, 40, 40, 0.95)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 69, 0, 0.2)',
                borderRadius: 3,
                height: '100%'
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box display="flex" alignItems="center" gap={2} mb={3}>
                  <Box
                    sx={{
                      width: 50,
                      height: 50,
                      borderRadius: '50%',
                      background: status.connected 
                        ? 'linear-gradient(135deg, #4caf50, #66bb6a)'
                        : 'linear-gradient(135deg, #ff4500, #ff6347)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {status.connected ? <CheckCircle sx={{ color: '#fff' }} /> : <LinkOff sx={{ color: '#fff' }} />}
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                      {t('deriv.connectionStatus')}
                    </Typography>
                    <Chip
                      label={status.connected ? t('deriv.connected') : t('deriv.notConnected')}
                      color={status.connected ? 'success' : 'default'}
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  </Box>
                </Box>

                {status.connected ? (
                  <Alert 
                    severity="success" 
                    sx={{ 
                      mb: 3,
                      backgroundColor: 'rgba(76, 175, 80, 0.1)',
                      border: '1px solid rgba(76, 175, 80, 0.3)',
                      color: '#fff'
                    }}
                  >
                    <Typography variant="body1" fontWeight="bold" sx={{ mb: 1 }}>
                      {t('deriv.accountConnectedSuccess')}
                    </Typography>
                    <Typography variant="body2">
                      {t('deriv.account')}: {status.account_id}
                    </Typography>
                  </Alert>
                ) : (
                  <Alert 
                    severity="info"
                    sx={{ 
                      mb: 3,
                      backgroundColor: 'rgba(33, 150, 243, 0.1)',
                      border: '1px solid rgba(33, 150, 243, 0.3)',
                      color: '#fff'
                    }}
                  >
                    <Typography variant="body1">
                      {t('deriv.connectFirst')}
                    </Typography>
                  </Alert>
                )}

                <Box display="flex" flexDirection="column" gap={2} mt={3}>
                  {status.connected ? (
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={loading ? <CircularProgress size={16} /> : <LinkOff />}
                      onClick={disconnectFromDeriv}
                      disabled={loading}
                      fullWidth
                      sx={{
                        py: 1.5,
                        borderColor: '#ff5722',
                        color: '#ff5722',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 87, 34, 0.1)',
                          borderColor: '#ff7043'
                        }
                      }}
                    >
                      {loading ? t('deriv.disconnecting') : t('deriv.disconnectFromBroker')}
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="contained"
                        startIcon={loading ? <CircularProgress size={16} /> : <LinkIcon />}
                        onClick={connectToDeriv}
                        disabled={loading}
                        fullWidth
                        sx={{
                          py: 1.5,
                          background: 'linear-gradient(135deg, #ff4500 0%, #ff6347 100%)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #ff6347 0%, #ff4500 100%)',
                          },
                          fontSize: '1rem',
                          fontWeight: 600,
                        }}
                      >
                        {loading ? t('deriv.connecting') : t('deriv.connectWithBroker')}
                      </Button>
                      
                      <Button
                        variant="outlined"
                        startIcon={<AccountBalance />}
                        onClick={openDerivSignup}
                        fullWidth
                        sx={{
                          py: 1.5,
                          borderColor: '#00d4aa',
                          color: '#00d4aa',
                          '&:hover': {
                            backgroundColor: 'rgba(0, 212, 170, 0.1)',
                            borderColor: '#00b89c'
                          }
                        }}
                      >
                        {t('deriv.noAccountYet')}
                      </Button>
                    </>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Benefits */}
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                background: 'rgba(40, 40, 40, 0.95)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 69, 0, 0.2)',
                borderRadius: 3,
                height: '100%'
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600, mb: 3 }}>
                  {t('deriv.whyConnect')}
                </Typography>

                <Box display="flex" alignItems="center" gap={2} mb={3}>
                  <TrendingUp sx={{ color: '#ff4500', fontSize: 28 }} />
                  <Box>
                    <Typography variant="body1" sx={{ color: '#fff', fontWeight: 600 }}>
                      {t('deriv.automatedTrading')}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      {t('deriv.automatedTradingDesc')}
                    </Typography>
                  </Box>
                </Box>

                <Box display="flex" alignItems="center" gap={2} mb={3}>
                  <Security sx={{ color: '#ff4500', fontSize: 28 }} />
                  <Box>
                    <Typography variant="body1" sx={{ color: '#fff', fontWeight: 600 }}>
                      {t('deriv.secureConnection')}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      {t('deriv.secureConnectionDesc')}
                    </Typography>
                  </Box>
                </Box>

                <Box display="flex" alignItems="center" gap={2}>
                  <AccountBalance sx={{ color: '#ff4500', fontSize: 28 }} />
                  <Box>
                    <Typography variant="body1" sx={{ color: '#fff', fontWeight: 600 }}>
                      {t('deriv.multipleAccounts')}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      {t('deriv.multipleAccountsDesc')}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Security Notice */}
        <Paper
          sx={{
            mt: 4,
            p: 3,
            background: 'rgba(40, 40, 40, 0.8)',
            border: '1px solid rgba(255, 69, 0, 0.1)',
            borderRadius: 3
          }}
        >
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Security sx={{ color: '#ff4500' }} />
            <Typography variant="h6" sx={{ color: '#fff' }}>
              {t('deriv.securityPrivacy')}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.6 }}>
            {t('deriv.securityPoints').split('\n').map((point, index) => (
              <span key={index}>
                {point}
                {index < t('deriv.securityPoints').split('\n').length - 1 && <br/>}
              </span>
            ))}
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default DerivConnection;