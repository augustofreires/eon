import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  AccountBalance,
  TrendingUp,
  TrendingDown,
  PlayArrow,
  Stop,
  SmartToy,
  Person,
  Warning,
  CheckCircle,
  Error,
  Timer,
  Settings
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';

interface User {
  id: number;
  email: string;
  deriv_connected: boolean;
  deriv_account_id?: string;
}

interface AccountInfo {
  balance: number;
  currency: string;
  profit_loss: number;
  operations_count: number;
}

const ClientDashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [operationRunning, setOperationRunning] = useState(false);
  const [operationLog, setOperationLog] = useState<any[]>([]);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }

      // Carregar informações da conta Deriv
      try {
        const response = await axios.get('/api/operations/account-info');
        setAccountInfo(response.data);
      } catch (error) {
        console.log('Conta Deriv não conectada');
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectDeriv = () => {
    const derivOAuthUrl = `https://oauth.deriv.com/oauth2/authorize?app_id=${process.env.REACT_APP_DERIV_APP_ID}&l=PT&redirect_uri=${window.location.origin}/auth/callback`;
    window.location.href = derivOAuthUrl;
  };

  const handleStartOperation = () => {
    // Redirecionar para página de operações
    window.location.href = '/operations';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          Bem-vindo, {user?.email?.split('@')[0]}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Plataforma de Trading Inteligente
        </Typography>
      </Box>

      {/* Status da Conexão Deriv */}
      {!user?.deriv_connected && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body1" gutterBottom>
            Para começar a operar, você precisa conectar sua conta Deriv.
          </Typography>
          <Button
            variant="contained"
            startIcon={<Person />}
            onClick={handleConnectDeriv}
            sx={{ mt: 1 }}
          >
            Conectar Conta Deriv
          </Button>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Informações da Conta */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <AccountBalance sx={{ mr: 1, verticalAlign: 'middle' }} />
                Conta Deriv
              </Typography>

              {user?.deriv_connected ? (
                <Box>
                  <Typography variant="h4" color="primary" gutterBottom>
                    ${accountInfo?.balance?.toFixed(2) || '0.00'} USD
                  </Typography>
                  
                  <Box display="flex" alignItems="center" mb={2}>
                    <Typography variant="body2" sx={{ mr: 1 }}>
                      Lucro/Prejuízo:
                    </Typography>
                    <Chip
                      icon={accountInfo?.profit_loss && accountInfo.profit_loss > 0 ? <TrendingUp /> : <TrendingDown />}
                      label={`$${accountInfo?.profit_loss?.toFixed(2) || '0.00'}`}
                      color={accountInfo?.profit_loss && accountInfo.profit_loss > 0 ? 'success' : 'error'}
                      size="small"
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary">
                    Operações: {accountInfo?.operations_count || 0}
                  </Typography>

                  <Chip
                    label="Conectado"
                    color="success"
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Box>
              ) : (
                <Box textAlign="center" py={2}>
                  <Warning sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    Conta não conectada
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<Person />}
                    onClick={handleConnectDeriv}
                  >
                    Conectar
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Status da Operação */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <SmartToy sx={{ mr: 1, verticalAlign: 'middle' }} />
                Status da Operação
              </Typography>

              <Box textAlign="center" py={2}>
                <Chip
                  icon={operationRunning ? <PlayArrow /> : <Stop />}
                  label={operationRunning ? 'Operando' : 'Parado'}
                  color={operationRunning ? 'success' : 'default'}
                  sx={{ mb: 2 }}
                />

                {user?.deriv_connected ? (
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<PlayArrow />}
                    onClick={handleStartOperation}
                    disabled={operationRunning}
                  >
                    {operationRunning ? 'Operando...' : 'Iniciar Operação'}
                  </Button>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Conecte sua conta Deriv para operar
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Acesso Rápido */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Acesso Rápido
              </Typography>

              <List dense>
                <ListItem button onClick={() => window.location.href = '/operations'}>
                  <ListItemIcon>
                    <SmartToy />
                  </ListItemIcon>
                  <ListItemText primary="Operações com Bots" />
                </ListItem>

                <ListItem button onClick={() => window.location.href = '/courses'}>
                  <ListItemIcon>
                    <Settings />
                  </ListItemIcon>
                  <ListItemText primary="Cursos de Trading" />
                </ListItem>

                <ListItem button onClick={() => window.location.href = '/profile'}>
                  <ListItemIcon>
                    <Person />
                  </ListItemIcon>
                  <ListItemText primary="Meu Perfil" />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Log de Operações Recentes */}
        {operationLog.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Operações Recentes
                </Typography>

                <List dense>
                  {operationLog.slice(0, 5).map((log, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        {log.status === 'win' ? (
                          <CheckCircle color="success" />
                        ) : (
                          <Error color="error" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={`${log.time} - ${log.type} ${log.value}`}
                        secondary={`${log.result}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Disclaimer */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, backgroundColor: 'grey.100' }}>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              <strong>Aviso de Risco:</strong> O trading envolve riscos significativos. 
              Você pode perder parte ou todo o seu capital investido. 
              Nunca invista mais do que pode perder.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ClientDashboard; 