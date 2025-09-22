import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  IconButton,
  Badge,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip,
  Alert,
  Paper
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  Stop,
  Refresh,
  Timeline,
  AccountBalanceWallet,
  TrendingUp,
  TrendingDown,
  Speed,
  Psychology,
  SmartToy,
  Visibility,
  Clear,
  Settings,
  SignalWifi4Bar,
  SignalWifiOff,
  Circle
} from '@mui/icons-material';
import useDerivOperations from '../hooks/useDerivOperations';
import { useAuth } from '../contexts/AuthContext';

interface AdvancedTradingPanelProps {
  selectedBot: any;
  botConfig: any;
  onConfigOpen: () => void;
}

const AdvancedTradingPanel: React.FC<AdvancedTradingPanelProps> = ({
  selectedBot,
  botConfig,
  onConfigOpen
}) => {
  const { currentAccount } = useAuth();
  const {
    isConnected,
    isConnecting,
    accountData,
    currentPrice,
    botStatus,
    operationLogs,
    tradingStats,
    connect,
    disconnect,
    startBot,
    stopBot,
    pauseBot,
    resumeBot,
    clearLogs,
    subscribeTicks,
    formatCurrency,
    formatProfit
  } = useDerivOperations();

  const [selectedSymbol, setSelectedSymbol] = useState('R_100');
  const [showLogs, setShowLogs] = useState(false);

  // Auto-conectar e subscrever ticks quando símbolo muda
  useEffect(() => {
    if (isConnected) {
      subscribeTicks(selectedSymbol);
    }
  }, [isConnected, selectedSymbol, subscribeTicks]);

  const handleStartBot = async () => {
    if (!selectedBot) {
      return;
    }

    const success = await startBot(selectedBot.id, botConfig);
    if (success) {
      subscribeTicks(selectedSymbol);
    }
  };

  const getConnectionStatusColor = () => {
    if (isConnecting) return '#ff9800';
    return isConnected ? '#4caf50' : '#f44336';
  };

  const getConnectionStatusText = () => {
    if (isConnecting) return 'CONECTANDO';
    return isConnected ? 'ONLINE' : 'OFFLINE';
  };

  const getBotStatusColor = () => {
    if (botStatus.isRunning && !botStatus.isPaused) return '#4caf50';
    if (botStatus.isPaused) return '#ff9800';
    return '#757575';
  };

  const getBotStatusText = () => {
    if (botStatus.isRunning && !botStatus.isPaused) return 'OPERANDO';
    if (botStatus.isPaused) return 'PAUSADO';
    return 'PARADO';
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header de Status */}
      <Card sx={{
        mb: 2,
        background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.1) 0%, rgba(0, 150, 200, 0.1) 100%)',
        border: '1px solid rgba(0, 212, 170, 0.3)'
      }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
              Painel de Controle
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Atualizar conexão">
                <IconButton
                  size="small"
                  onClick={isConnected ? disconnect : connect}
                  disabled={isConnecting}
                  sx={{ color: '#00d4aa' }}
                >
                  <Refresh />
                </IconButton>
              </Tooltip>
              <Tooltip title="Configurações">
                <IconButton
                  size="small"
                  onClick={onConfigOpen}
                  sx={{ color: '#00d4aa' }}
                >
                  <Settings />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Grid container spacing={2}>
            {/* Status de Conexão */}
            <Grid item xs={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {isConnected ? <SignalWifi4Bar /> : <SignalWifiOff />}
                <Box>
                  <Typography variant="caption" sx={{ color: '#b0b0b0', display: 'block' }}>
                    Conexão
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Circle sx={{
                      fontSize: 8,
                      color: getConnectionStatusColor()
                    }} />
                    <Typography variant="body2" sx={{
                      color: getConnectionStatusColor(),
                      fontWeight: 600,
                      fontSize: '0.75rem'
                    }}>
                      {getConnectionStatusText()}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>

            {/* Status do Bot */}
            <Grid item xs={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SmartToy />
                <Box>
                  <Typography variant="caption" sx={{ color: '#b0b0b0', display: 'block' }}>
                    Bot Status
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Circle sx={{
                      fontSize: 8,
                      color: getBotStatusColor()
                    }} />
                    <Typography variant="body2" sx={{
                      color: getBotStatusColor(),
                      fontWeight: 600,
                      fontSize: '0.75rem'
                    }}>
                      {getBotStatusText()}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Informações da Conta */}
      {accountData && (
        <Card sx={{ mb: 2, background: 'rgba(25, 45, 65, 0.8)' }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <AccountBalanceWallet sx={{ color: '#00d4aa' }} />
              <Typography variant="subtitle1" sx={{ color: '#ffffff', fontWeight: 600 }}>
                Conta Ativa
              </Typography>
              <Chip
                label={accountData.is_virtual ? 'DEMO' : 'REAL'}
                size="small"
                color={accountData.is_virtual ? 'info' : 'success'}
              />
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#b0b0b0' }}>
                  Saldo Atual
                </Typography>
                <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 'bold' }}>
                  {formatCurrency(accountData.balance, accountData.currency)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#b0b0b0' }}>
                  Lucro/Prejuízo
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    color: botStatus.profitLoss >= 0 ? '#4caf50' : '#f44336',
                    fontWeight: 'bold'
                  }}
                >
                  {formatProfit(botStatus.profitLoss)}
                </Typography>
              </Grid>
            </Grid>

            {currentPrice > 0 && (
              <Box sx={{ mt: 2, p: 1, background: 'rgba(0, 0, 0, 0.3)', borderRadius: 1 }}>
                <Typography variant="caption" sx={{ color: '#b0b0b0' }}>
                  Preço Atual ({selectedSymbol})
                </Typography>
                <Typography variant="body1" sx={{ color: '#00d4aa', fontWeight: 'bold' }}>
                  {currentPrice.toFixed(3)}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Estatísticas de Trading */}
      <Card sx={{ mb: 2, background: 'rgba(25, 45, 65, 0.8)' }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Timeline sx={{ color: '#00d4aa' }} />
            <Typography variant="subtitle1" sx={{ color: '#ffffff', fontWeight: 600 }}>
              Estatísticas
            </Typography>
          </Box>

          <Grid container spacing={1}>
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" sx={{ color: '#ffffff', fontWeight: 'bold' }}>
                  {tradingStats.totalTrades}
                </Typography>
                <Typography variant="caption" sx={{ color: '#b0b0b0' }}>
                  Total
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                  {tradingStats.winningTrades}
                </Typography>
                <Typography variant="caption" sx={{ color: '#b0b0b0' }}>
                  Ganhos
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" sx={{ color: '#f44336', fontWeight: 'bold' }}>
                  {tradingStats.losingTrades}
                </Typography>
                <Typography variant="caption" sx={{ color: '#b0b0b0' }}>
                  Perdas
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {tradingStats.totalTrades > 0 && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#b0b0b0' }}>
                  Taxa de Acerto
                </Typography>
                <Typography variant="caption" sx={{ color: '#00d4aa', fontWeight: 'bold' }}>
                  {tradingStats.winRate.toFixed(1)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={tradingStats.winRate}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: tradingStats.winRate >= 50 ? '#4caf50' : '#ff9800'
                  }
                }}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Controles do Bot */}
      <Card sx={{ mb: 2, background: 'rgba(25, 45, 65, 0.8)' }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Psychology sx={{ color: '#00d4aa' }} />
            <Typography variant="subtitle1" sx={{ color: '#ffffff', fontWeight: 600 }}>
              Controles
            </Typography>
          </Box>

          {selectedBot ? (
            <Box>
              <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 2 }}>
                Bot: {selectedBot.name}
              </Typography>

              <Grid container spacing={1}>
                {!botStatus.isRunning ? (
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      startIcon={<PlayArrow />}
                      fullWidth
                      onClick={handleStartBot}
                      disabled={!isConnected || !accountData}
                      sx={{
                        background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #388e3c 0%, #4caf50 100%)'
                        }
                      }}
                    >
                      Iniciar Bot
                    </Button>
                  </Grid>
                ) : (
                  <>
                    <Grid item xs={6}>
                      <Button
                        variant="outlined"
                        startIcon={botStatus.isPaused ? <PlayArrow /> : <Pause />}
                        fullWidth
                        onClick={botStatus.isPaused ? resumeBot : pauseBot}
                        sx={{
                          borderColor: '#ff9800',
                          color: '#ff9800',
                          '&:hover': {
                            borderColor: '#ff9800',
                            background: 'rgba(255, 152, 0, 0.1)'
                          }
                        }}
                      >
                        {botStatus.isPaused ? 'Retomar' : 'Pausar'}
                      </Button>
                    </Grid>
                    <Grid item xs={6}>
                      <Button
                        variant="outlined"
                        startIcon={<Stop />}
                        fullWidth
                        onClick={stopBot}
                        sx={{
                          borderColor: '#f44336',
                          color: '#f44336',
                          '&:hover': {
                            borderColor: '#f44336',
                            background: 'rgba(244, 67, 54, 0.1)'
                          }
                        }}
                      >
                        Parar
                      </Button>
                    </Grid>
                  </>
                )}
              </Grid>
            </Box>
          ) : (
            <Alert severity="info" sx={{ bgcolor: 'rgba(33, 150, 243, 0.1)' }}>
              Selecione um bot para começar
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Logs de Operação */}
      <Card sx={{ flex: 1, background: 'rgba(25, 45, 65, 0.8)', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ p: 2, pb: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Visibility sx={{ color: '#00d4aa' }} />
              <Typography variant="subtitle1" sx={{ color: '#ffffff', fontWeight: 600 }}>
                Logs de Operação
              </Typography>
              <Badge badgeContent={operationLogs.length} color="primary" />
            </Box>
            <Box>
              <Tooltip title="Limpar logs">
                <IconButton size="small" onClick={clearLogs} sx={{ color: '#b0b0b0' }}>
                  <Clear />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Paper
            sx={{
              flex: 1,
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              overflow: 'hidden'
            }}
          >
            <List sx={{
              maxHeight: '300px',
              overflow: 'auto',
              p: 0,
              '&::-webkit-scrollbar': {
                width: '6px'
              },
              '&::-webkit-scrollbar-track': {
                background: 'rgba(255, 255, 255, 0.1)'
              },
              '&::-webkit-scrollbar-thumb': {
                background: 'rgba(0, 212, 170, 0.5)',
                borderRadius: '3px'
              }
            }}>
              {operationLogs.length === 0 ? (
                <ListItem>
                  <ListItemText
                    primary="Nenhum log disponível"
                    sx={{
                      textAlign: 'center',
                      '& .MuiListItemText-primary': {
                        color: '#b0b0b0',
                        fontSize: '0.875rem'
                      }
                    }}
                  />
                </ListItem>
              ) : (
                operationLogs.map((log) => (
                  <ListItem
                    key={log.id}
                    sx={{
                      py: 0.5,
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      '&:last-child': {
                        borderBottom: 'none'
                      }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {log.type === 'success' && <TrendingUp sx={{ color: '#4caf50', fontSize: 16 }} />}
                      {log.type === 'error' && <TrendingDown sx={{ color: '#f44336', fontSize: 16 }} />}
                      {log.type === 'info' && <Circle sx={{ color: '#2196f3', fontSize: 12 }} />}
                      {log.type === 'trade' && <Speed sx={{ color: '#ff9800', fontSize: 16 }} />}
                    </ListItemIcon>
                    <ListItemText
                      primary={log.message}
                      secondary={new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                      sx={{
                        '& .MuiListItemText-primary': {
                          fontSize: '0.8rem',
                          color: '#ffffff',
                          lineHeight: 1.3
                        },
                        '& .MuiListItemText-secondary': {
                          fontSize: '0.7rem',
                          color: '#b0b0b0'
                        }
                      }}
                    />
                  </ListItem>
                ))
              )}
            </List>
          </Paper>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AdvancedTradingPanel;