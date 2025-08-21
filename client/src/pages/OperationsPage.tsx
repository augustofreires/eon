import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  SmartToy,
  AccountBalance,
  TrendingUp,
  TrendingDown,
  Settings,
  Person,
  Warning,
  CheckCircle,
  Error,
  Timer
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Bot {
  id: number;
  name: string;
  description: string;
  xml_content: string;
  created_at: string;
}

interface Operation {
  id: number;
  bot_id: number;
  status: string;
  entry_amount: number;
  created_at: string;
}

interface BotConfig {
  entry_amount: number;
  martingale: number;
  max_hands?: number;
  max_red?: number;
  stop_loss?: number;
  take_profit?: number;
}

const OperationsPage: React.FC = () => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(false);
  const [derivConnected, setDerivConnected] = useState(false);
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [botConfig, setBotConfig] = useState<BotConfig>({
    entry_amount: 0.35,
    martingale: 1.5
  });
  const [operationRunning, setOperationRunning] = useState(false);
  const [operationLog, setOperationLog] = useState<any[]>([]);

  useEffect(() => {
    loadBots();
    loadOperations();
    checkDerivConnection();
  }, []);

  const checkDerivConnection = async () => {
    try {
      const response = await axios.get('/api/operations/account-info');
      setDerivConnected(true);
    } catch (error) {
      setDerivConnected(false);
    }
  };

  const loadBots = async () => {
    try {
      const response = await axios.get('/api/bots');
      setBots(response.data.bots);
    } catch (error) {
      console.error('Erro ao carregar bots:', error);
      toast.error('Erro ao carregar bots disponíveis');
    }
  };

  const loadOperations = async () => {
    try {
      const response = await axios.get('/api/operations/history');
      setOperations(response.data.operations);
    } catch (error) {
      console.error('Erro ao carregar operações:', error);
    }
  };

  const handleConnectDeriv = () => {
    // Redirecionar para OAuth da Deriv
    const derivOAuthUrl = `https://oauth.deriv.com/oauth2/authorize?app_id=${process.env.REACT_APP_DERIV_APP_ID}&l=PT&redirect_uri=${window.location.origin}/auth/callback`;
    window.location.href = derivOAuthUrl;
  };

  const handleBotSelect = (bot: Bot) => {
    setSelectedBot(bot);
    setConfigDialogOpen(true);
  };

  const handleStartOperation = async () => {
    if (!selectedBot) return;

    setOperationRunning(true);
    setConfigDialogOpen(false);
    
    try {
      const response = await axios.post('/api/operations/start', {
        bot_id: selectedBot.id,
        entry_amount: botConfig.entry_amount,
        martingale: botConfig.martingale,
        max_hands: botConfig.max_hands,
        max_red: botConfig.max_red,
        stop_loss: botConfig.stop_loss,
        take_profit: botConfig.take_profit
      });

      toast.success('Operação iniciada com sucesso!');
      
      // Simular log de operações
      setOperationLog([
        { time: '15:11:06', type: 'IMPA', value: '897.34', result: '+2.19', status: 'win' },
        { time: '15:10:58', type: 'IMPA', value: '897.76', result: '+0.87', status: 'win' },
        { time: '15:10:50', type: 'IMPA', value: '897.74', result: '+0.35', status: 'win' }
      ]);

      loadOperations();
    } catch (error: any) {
      console.error('Erro ao iniciar operação:', error);
      toast.error(error.response?.data?.error || 'Erro ao iniciar operação');
      setOperationRunning(false);
    }
  };

  const handleStopOperation = async () => {
    try {
      await axios.post(`/api/operations/${operations[0]?.id}/stop`);
      toast.success('Operação parada com sucesso!');
      setOperationRunning(false);
      setOperationLog([]);
      loadOperations();
    } catch (error: any) {
      console.error('Erro ao parar operação:', error);
      toast.error(error.response?.data?.error || 'Erro ao parar operação');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'success';
      case 'stopped': return 'error';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Painel de Operações
      </Typography>

      {/* Status da Conexão Deriv */}
      {!derivConnected && (
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
        {/* Seleção de Bots */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <SmartToy sx={{ mr: 1, verticalAlign: 'middle' }} />
                Bots Disponíveis
              </Typography>

              {bots.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={4}>
                  Nenhum bot disponível
                </Typography>
              ) : (
                <Box>
                  {bots.map((bot) => (
                    <Paper
                      key={bot.id}
                      elevation={1}
                      sx={{
                        p: 2,
                        mb: 2,
                        cursor: 'pointer',
                        border: selectedBot?.id === bot.id ? 2 : 1,
                        borderColor: selectedBot?.id === bot.id ? 'primary.main' : 'divider',
                        '&:hover': {
                          backgroundColor: 'action.hover'
                        }
                      }}
                      onClick={() => handleBotSelect(bot)}
                    >
                      <Box display="flex" alignItems="center" mb={1}>
                        <SmartToy sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="body1" fontWeight="medium">
                          {bot.name}
                        </Typography>
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" mb={1}>
                        {bot.description}
                      </Typography>
                      
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Chip
                          label="Disponível"
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                        <IconButton size="small">
                          <Settings />
                        </IconButton>
                      </Box>
                    </Paper>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Status da Operação */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <AccountBalance sx={{ mr: 1, verticalAlign: 'middle' }} />
                Status da Operação
              </Typography>

              {!derivConnected ? (
                <Box textAlign="center" py={4}>
                  <Warning sx={{ fontSize: 64, color: 'warning.main', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Conecte sua conta Deriv para começar
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Person />}
                    onClick={handleConnectDeriv}
                  >
                    Conectar Deriv
                  </Button>
                </Box>
              ) : !selectedBot ? (
                <Box textAlign="center" py={4}>
                  <SmartToy sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Selecione um bot para começar
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Escolha um bot da lista ao lado
                  </Typography>
                </Box>
              ) : (
                <Box>
                  {/* Bot Selecionado */}
                  <Paper sx={{ p: 2, mb: 2, backgroundColor: 'primary.light' }}>
                    <Typography variant="h6" color="white">
                      {selectedBot.name}
                    </Typography>
                    <Typography variant="body2" color="white">
                      {selectedBot.description}
                    </Typography>
                  </Paper>

                  {/* Status da Operação */}
                  <Box display="flex" alignItems="center" mb={2}>
                    <Typography variant="body1" sx={{ mr: 2 }}>
                      Status:
                    </Typography>
                    <Chip
                      icon={operationRunning ? <PlayArrow /> : <Stop />}
                      label={operationRunning ? 'Operando' : 'Parado'}
                      color={operationRunning ? 'success' : 'default'}
                    />
                  </Box>

                  {/* Controles */}
                  <Box display="flex" gap={2} mb={3}>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={operationRunning ? <CircularProgress size={20} /> : <PlayArrow />}
                      onClick={handleStartOperation}
                      disabled={operationRunning}
                    >
                      {operationRunning ? 'Operando...' : 'Iniciar Operação'}
                    </Button>
                    
                    {operationRunning && (
                      <Button
                        variant="contained"
                        color="error"
                        startIcon={<Stop />}
                        onClick={handleStopOperation}
                      >
                        Parar Operação
                      </Button>
                    )}
                  </Box>

                  {/* Log de Operações */}
                  {operationLog.length > 0 && (
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        Log de Operações
                      </Typography>
                      <List dense>
                        {operationLog.map((log, index) => (
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
                    </Box>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog de Configuração do Bot */}
      <Dialog open={configDialogOpen} onClose={() => setConfigDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Configurar {selectedBot?.name}
        </DialogTitle>
        <DialogContent>
          <Box py={2}>
            <TextField
              fullWidth
              label="Valor de Entrada ($)"
              type="number"
              value={botConfig.entry_amount}
              onChange={(e) => setBotConfig(prev => ({ ...prev, entry_amount: parseFloat(e.target.value) || 0 }))}
              margin="normal"
              inputProps={{ min: 0.01, step: 0.01 }}
            />

            <TextField
              fullWidth
              label="Valor do Martingale"
              type="number"
              value={botConfig.martingale}
              onChange={(e) => setBotConfig(prev => ({ ...prev, martingale: parseFloat(e.target.value) || 0 }))}
              margin="normal"
              inputProps={{ min: 1, step: 0.1 }}
            />

            <TextField
              fullWidth
              label="Máximo de Mãos (opcional)"
              type="number"
              value={botConfig.max_hands || ''}
              onChange={(e) => setBotConfig(prev => ({ ...prev, max_hands: parseInt(e.target.value) || undefined }))}
              margin="normal"
              inputProps={{ min: 1 }}
            />

            <TextField
              fullWidth
              label="Red Máximo (opcional)"
              type="number"
              value={botConfig.max_red || ''}
              onChange={(e) => setBotConfig(prev => ({ ...prev, max_red: parseInt(e.target.value) || undefined }))}
              margin="normal"
              inputProps={{ min: 1 }}
            />

            <TextField
              fullWidth
              label="Stop Loss (opcional)"
              type="number"
              value={botConfig.stop_loss || ''}
              onChange={(e) => setBotConfig(prev => ({ ...prev, stop_loss: parseFloat(e.target.value) || undefined }))}
              margin="normal"
              inputProps={{ min: 0 }}
            />

            <TextField
              fullWidth
              label="Take Profit (opcional)"
              type="number"
              value={botConfig.take_profit || ''}
              onChange={(e) => setBotConfig(prev => ({ ...prev, take_profit: parseFloat(e.target.value) || undefined }))}
              margin="normal"
              inputProps={{ min: 0 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialogOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleStartOperation}
            variant="contained"
            disabled={!botConfig.entry_amount || !botConfig.martingale}
          >
            Iniciar Operação
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OperationsPage; 