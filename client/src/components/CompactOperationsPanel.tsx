import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Select,
  FormControl,
  Chip,
  Divider,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Person,
  SmartToy,
  PlayArrow,
  Stop,
  Pause,
  Settings,
  Assessment,
  ExpandMore,
  TrendingUp,
  TrendingDown
} from '@mui/icons-material';

interface CompactOperationsPanelProps {
  derivConnected: boolean;
  onConnectDeriv: () => void;
  selectedBot: any;
  availableBots: any[];
  onBotSelect: (bot: any) => void;
  botStatus: any;
  onStartOperation: () => void;
  onStopOperation: () => void;
  onPauseOperation: () => void;
  onResumeOperation: () => void;
  onOpenConfig: () => void;
  operationLogs: any[];
  loadingBots: boolean;
}

const CompactOperationsPanel: React.FC<CompactOperationsPanelProps> = ({
  derivConnected,
  onConnectDeriv,
  selectedBot,
  availableBots,
  onBotSelect,
  botStatus,
  onStartOperation,
  onStopOperation,
  onPauseOperation,
  onResumeOperation,
  onOpenConfig,
  operationLogs,
  loadingBots
}) => {
  const [botMenuAnchor, setBotMenuAnchor] = useState<null | HTMLElement>(null);
  const [showLogs, setShowLogs] = useState(false);

  const handleBotMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setBotMenuAnchor(event.currentTarget);
  };

  const handleBotMenuClose = () => {
    setBotMenuAnchor(null);
  };

  const handleBotSelection = (bot: any) => {
    onBotSelect(bot);
    handleBotMenuClose();
  };

  return (
    <Card sx={{
      borderRadius: '16px',
      background: 'rgba(25, 45, 65, 0.95)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(0, 212, 170, 0.2)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <CardContent sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>

        {/* Título do Painel */}
        <Typography variant="h6" sx={{
          color: '#ffffff',
          mb: 2,
          fontWeight: 600,
          textAlign: 'center'
        }}>
          Operações
        </Typography>

        {/* Estado 1: Deriv Desconectado */}
        {!derivConnected && (
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            textAlign: 'center',
            py: 3
          }}>
            <Person sx={{ fontSize: 48, color: '#ffc107', mb: 2 }} />
            <Typography variant="h6" sx={{ color: '#ffffff', mb: 1, fontWeight: 600 }}>
              Conecte sua conta Deriv
            </Typography>
            <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 3 }}>
              Faça login para acessar os bots
            </Typography>
            <Button
              variant="contained"
              startIcon={<Person />}
              onClick={onConnectDeriv}
              sx={{
                background: 'linear-gradient(135deg, #00d4aa 0%, #00b89c 100%)',
                px: 4,
                py: 1.5,
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1rem'
              }}
            >
              Conectar Deriv
            </Button>
          </Box>
        )}

        {/* Estado 2: Deriv Conectado */}
        {derivConnected && (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

            {/* Seleção de Bot com Ícones */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ color: '#b0b0b0', mb: 1 }}>
                Selecionar Bot
              </Typography>

              <Button
                fullWidth
                variant="outlined"
                onClick={handleBotMenuOpen}
                endIcon={<ExpandMore />}
                sx={{
                  borderColor: 'rgba(0, 212, 170, 0.4)',
                  color: selectedBot ? '#00d4aa' : '#b0b0b0',
                  py: 1.5,
                  borderRadius: '8px',
                  textTransform: 'none',
                  justifyContent: 'space-between',
                  '&:hover': {
                    borderColor: 'rgba(0, 212, 170, 0.6)',
                    bgcolor: 'rgba(0, 212, 170, 0.1)'
                  }
                }}
                startIcon={<SmartToy />}
              >
                {selectedBot ? selectedBot.name : 'Escolher Bot'}
              </Button>

              {/* Menu de Seleção de Bots */}
              <Menu
                anchorEl={botMenuAnchor}
                open={Boolean(botMenuAnchor)}
                onClose={handleBotMenuClose}
                PaperProps={{
                  sx: {
                    bgcolor: 'rgba(25, 45, 65, 0.95)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(0, 212, 170, 0.2)',
                    borderRadius: 2,
                    minWidth: '250px',
                    maxHeight: '300px'
                  }
                }}
              >
                {availableBots.map((bot) => (
                  <MenuItem
                    key={bot.id}
                    onClick={() => handleBotSelection(bot)}
                    sx={{
                      color: '#ffffff',
                      '&:hover': {
                        bgcolor: 'rgba(0, 212, 170, 0.1)'
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <SmartToy sx={{ color: '#00d4aa', fontSize: '1.2rem' }} />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {bot.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#b0b0b0' }}>
                          {bot.description}
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Menu>
            </Box>

            {/* Controles do Bot (só aparece se bot selecionado) */}
            {selectedBot && (
              <Box sx={{ mb: 3 }}>
                {/* Status do Bot */}
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 1,
                  mb: 2,
                  p: 1.5,
                  bgcolor: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: 2,
                  border: `1px solid ${
                    botStatus.isRunning
                      ? (botStatus.isPaused ? '#ff9800' : '#4caf50')
                      : '#f44336'
                  }`
                }}>
                  <Box sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: botStatus.isRunning
                      ? (botStatus.isPaused ? '#ff9800' : '#4caf50')
                      : '#f44336'
                  }} />
                  <Typography variant="body2" sx={{
                    color: botStatus.isRunning
                      ? (botStatus.isPaused ? '#ff9800' : '#4caf50')
                      : '#f44336',
                    fontWeight: 600
                  }}>
                    {botStatus.isRunning
                      ? (botStatus.isPaused ? 'PAUSADO' : 'EXECUTANDO')
                      : 'PARADO'
                    }
                  </Typography>
                </Box>

                {/* Botões de Controle em Linha */}
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  {!botStatus.isRunning ? (
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<PlayArrow />}
                      onClick={onStartOperation}
                      sx={{
                        background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                        py: 1,
                        borderRadius: '8px',
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '0.9rem'
                      }}
                    >
                      Iniciar
                    </Button>
                  ) : (
                    <>
                      {botStatus.isPaused ? (
                        <Button
                          variant="contained"
                          fullWidth
                          startIcon={<PlayArrow />}
                          onClick={onResumeOperation}
                          sx={{
                            background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                            py: 1,
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '0.9rem'
                          }}
                        >
                          Retomar
                        </Button>
                      ) : (
                        <Button
                          variant="contained"
                          fullWidth
                          startIcon={<Pause />}
                          onClick={onPauseOperation}
                          sx={{
                            background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                            py: 1,
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '0.9rem'
                          }}
                        >
                          Pausar
                        </Button>
                      )}

                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={<Stop />}
                        onClick={onStopOperation}
                        sx={{
                          background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
                          py: 1,
                          borderRadius: '8px',
                          textTransform: 'none',
                          fontWeight: 600,
                          fontSize: '0.9rem'
                        }}
                      >
                        Parar
                      </Button>
                    </>
                  )}
                </Box>

                {/* Botões de Ação Rápida */}
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <IconButton
                    onClick={onOpenConfig}
                    sx={{
                      bgcolor: 'rgba(0, 212, 170, 0.1)',
                      border: '1px solid rgba(0, 212, 170, 0.3)',
                      color: '#00d4aa',
                      '&:hover': {
                        bgcolor: 'rgba(0, 212, 170, 0.2)'
                      }
                    }}
                  >
                    <Settings />
                  </IconButton>
                  <IconButton
                    onClick={() => setShowLogs(!showLogs)}
                    sx={{
                      bgcolor: showLogs ? 'rgba(0, 212, 170, 0.2)' : 'rgba(0, 212, 170, 0.1)',
                      border: '1px solid rgba(0, 212, 170, 0.3)',
                      color: '#00d4aa',
                      flex: 1,
                      '&:hover': {
                        bgcolor: 'rgba(0, 212, 170, 0.2)'
                      }
                    }}
                  >
                    <Assessment />
                    <Typography variant="caption" sx={{ ml: 1 }}>
                      {showLogs ? 'Ocultar' : 'Logs'}
                    </Typography>
                  </IconButton>
                </Box>
              </Box>
            )}

            {/* Logs de Operações (área dos resultados em tempo real) */}
            {selectedBot && showLogs && (
              <Box sx={{
                flex: 1,
                minHeight: '250px',
                maxHeight: '400px',
                border: '1px solid rgba(0, 212, 170, 0.2)',
                borderRadius: 2,
                bgcolor: 'rgba(0, 0, 0, 0.2)',
                p: 1,
                display: 'flex',
                flexDirection: 'column'
              }}>
                <Typography variant="caption" sx={{
                  color: '#00d4aa',
                  fontWeight: 600,
                  display: 'block',
                  mb: 1,
                  textAlign: 'center',
                  flexShrink: 0
                }}>
                  Resultados em Tempo Real
                </Typography>

                <Box sx={{
                  flex: 1,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5,
                  '&::-webkit-scrollbar': {
                    width: '6px'
                  },
                  '&::-webkit-scrollbar-track': {
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '3px'
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: 'rgba(0, 212, 170, 0.5)',
                    borderRadius: '3px'
                  },
                  '&::-webkit-scrollbar-thumb:hover': {
                    background: 'rgba(0, 212, 170, 0.7)'
                  }
                }}>
                  {operationLogs.length > 0 ? (
                    operationLogs.slice(0, 20).map((log, index) => (
                      <Box key={index} sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        p: 1.5,
                        bgcolor: log.type === 'success' ? 'rgba(76, 175, 80, 0.1)' :
                                 log.type === 'error' ? 'rgba(244, 67, 54, 0.1)' :
                                 'rgba(0, 0, 0, 0.3)',
                        borderRadius: 1,
                        border: `1px solid ${
                          log.type === 'success' ? 'rgba(76, 175, 80, 0.3)' :
                          log.type === 'error' ? 'rgba(244, 67, 54, 0.3)' :
                          'rgba(255, 255, 255, 0.1)'
                        }`,
                        flexShrink: 0
                      }}>
                        {/* Linha superior: Símbolo, horário e valor */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="caption" sx={{
                            color: '#ffffff',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}>
                            {log.symbol || 'TRADE'} • {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                          </Typography>
                          {log.data?.amount && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography variant="caption" sx={{
                                color: log.data.amount > 0 ? '#4caf50' : '#f44336',
                                fontWeight: 'bold',
                                fontSize: '0.8rem'
                              }}>
                                {log.data.amount > 0 ? '+' : ''}${Math.abs(log.data.amount).toFixed(2)}
                              </Typography>
                              {log.data.amount > 0 ? (
                                <TrendingUp sx={{ fontSize: '0.8rem', color: '#4caf50' }} />
                              ) : (
                                <TrendingDown sx={{ fontSize: '0.8rem', color: '#f44336' }} />
                              )}
                            </Box>
                          )}
                        </Box>

                        {/* Linha inferior: Mensagem completa */}
                        <Typography variant="caption" sx={{
                          color: '#b0b0b0',
                          fontSize: '0.7rem',
                          wordWrap: 'break-word',
                          whiteSpace: 'normal',
                          lineHeight: 1.3
                        }}>
                          {log.message}
                        </Typography>
                      </Box>
                    ))
                  ) : (
                    <Box sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      color: 'rgba(255, 255, 255, 0.5)'
                    }}>
                      <SmartToy sx={{ fontSize: 32, color: 'rgba(255, 255, 255, 0.3)', mb: 1 }} />
                      <Typography variant="caption">
                        Aguardando operações...
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default CompactOperationsPanel;