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
  CircularProgress,
  Avatar,
  Stack,
  Divider,
  LinearProgress
} from '@mui/material';
import {
  AccountBalance,
  TrendingUp,
  TrendingDown,
  PlayArrow,
  Stop,
  SmartToy,
  Person,
  PersonAdd,
  Warning,
  CheckCircle,
  Error,
  Timer,
  Settings,
  VideoLibrary,
  EmojiEvents,
  Star,
  ShowChart,
  ContactSupport,
  AccountBalanceWallet,
  School
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';

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

interface ActionCard {
  id: number;
  title: string;
  subtitle?: string;
  image_url?: string;
  action_type: 'internal' | 'external';
  action_url: string;
  background_color: string;
  text_color: string;
  is_active: boolean;
  hide_title: boolean;
  order_index: number;
}

interface Bot {
  id: number;
  name: string;
  description: string;
  image_url?: string;
  created_at: string;
  // Dados fictícios para o ranking
  win_rate: number;
  profit_percentage: number;
  total_operations: number;
  status: 'hot' | 'trending' | 'stable';
}

const ClientDashboard: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [localUser, setLocalUser] = useState<User | null>(null);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [operationRunning, setOperationRunning] = useState(false);
  const [operationLog, setOperationLog] = useState<any[]>([]);
  const [affiliateLink, setAffiliateLink] = useState<string | null>(null);
  const [actionCards, setActionCards] = useState<ActionCard[]>([]);
  const [topBots, setTopBots] = useState<Bot[]>([]);

  useEffect(() => {
    const loadData = async () => {
      await loadUserData();
      await loadAffiliateLink();
      await loadActionCards();
      await loadTopBots();
    };
    loadData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        setLocalUser(JSON.parse(userData));
      }

      // Carregar informações da conta na Corretora (apenas se usuário estiver autenticado)
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await axios.get('/api/operations/account-info');
          setAccountInfo(response.data);
        } catch (error: any) {
          if (error.response?.status === 400) {
            console.log('Conta Deriv não conectada ainda');
          } else {
            console.error('Erro ao carregar informações da conta Deriv:', error.response?.data || error.message);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAffiliateLink = async () => {
    try {
      const response = await axios.get('/api/auth/deriv-affiliate-link');
      setAffiliateLink(response.data.affiliate_link);
    } catch (error) {
      console.error('Erro ao carregar link de afiliado:', error);
    }
  };

  const loadActionCards = async () => {
    try {
      const response = await axios.get('/api/action-cards');
      setActionCards(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar cards de ação:', error);
    }
  };

  const loadTopBots = async () => {
    try {
      const response = await axios.get('/api/bots');
      const bots = response.data.bots || [];
      
      // Adicionar dados fictícios para o ranking
      const botsWithStats = bots.map((bot: any, index: number) => ({
        ...bot,
        win_rate: 75 + Math.random() * 20, // 75-95%
        profit_percentage: 15 + Math.random() * 35, // 15-50%
        total_operations: 100 + Math.floor(Math.random() * 500),
        status: index < 2 ? 'hot' : index < 4 ? 'trending' : 'stable'
      }));
      
      // Ordenar por taxa de vitória (win rate)
      botsWithStats.sort((a: Bot, b: Bot) => b.win_rate - a.win_rate);
      
      setTopBots(botsWithStats.slice(0, 5)); // Top 5 bots
    } catch (error) {
      console.error('Erro ao carregar bots:', error);
    }
  };

  const handleConnectDeriv = async () => {
    try {
      // Obter URL de autorização do backend
      const response = await axios.get('/api/auth/deriv/authorize');
      const { auth_url } = response.data;
      
      // Abrir popup para autorização
      const popup = window.open(
        auth_url,
        'deriv-oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        toast.error('Popup bloqueado. Permita popups para conectar com a Corretora.');
        return;
      }

      // Escutar mensagem do popup
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'deriv-oauth-callback') {
          popup.close();
          
          try {
            // Enviar dados OAuth para o backend
            await axios.post('/api/auth/deriv/callback', {
              accounts: event.data.accounts,
              token1: event.data.token1
            });
            
            toast.success('Conta na Corretora conectada com sucesso!');
            // Recarregar dados do usuário
            loadUserData();
          } catch (error: any) {
            const message = error.response?.data?.error || 'Erro ao conectar com a Corretora';
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
        }
      }, 1000);

    } catch (error: any) {
      const message = error.response?.data?.error || 'Erro ao iniciar conexão com a Corretora';
      toast.error(message);
    }
  };

  const handleStartOperation = () => {
    // Redirecionar para página de operações
    window.location.href = '/operations';
  };

  const handleCreateDerivAccount = () => {
    // Usar o link de afiliado do admin ou link padrão
    const createAccountUrl = affiliateLink || 'https://app.deriv.com/signup';
    window.open(createAccountUrl, '_blank', 'noopener,noreferrer');
    toast.success('Após criar sua conta, volte aqui para conectar!');
  };

  const handleCardClick = (card: ActionCard) => {
    if (card.action_type === 'internal') {
      window.location.href = card.action_url;
    } else {
      window.open(card.action_url, '_blank', 'noopener,noreferrer');
    }
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
        <Typography variant="h4" gutterBottom className="theme-text-gradient" sx={{ 
          fontWeight: 700,
          mb: 1
        }}>
{t('dashboard.welcome')}, {user?.name || user?.email?.split('@')[0]}!
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ 
          fontSize: '1.1rem',
          fontWeight: 500 
        }}>
{t('dashboard.platform')}
        </Typography>
      </Box>

      {/* Ações Principais */}
      <Box mb={4}>
        <Typography variant="h6" gutterBottom sx={{ 
          fontWeight: 600,
          mb: 3,
          color: 'text.primary'
        }}>
          Ações Principais
        </Typography>
        <Grid container spacing={3}>
          {actionCards.map((card) => (
            <Grid item xs={6} sm={4} md={3} key={card.id}>
              <Card 
                onClick={() => handleCardClick(card)}
                sx={{
                  cursor: 'pointer',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: card.background_color,
                  color: card.text_color,
                  position: 'relative',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 12px 32px ${card.background_color}40`,
                  }
                }}
              >
                <CardContent sx={{ 
                  p: 3, 
                  textAlign: 'center', 
                  minHeight: '320px', 
                  height: '320px',
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center',
                  position: 'relative',
                  zIndex: 2
                }}>
                  {/* Background Image */}
                  {card.image_url && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundImage: `url(${card.image_url})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        zIndex: -1,
                        borderRadius: '16px'
                      }}
                    />
                  )}
                  
                  {/* Overlay for better text readability */}
                  {card.image_url && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: `linear-gradient(135deg, ${card.background_color}60 0%, ${card.background_color}40 100%)`,
                        zIndex: 0,
                        borderRadius: '16px'
                      }}
                    />
                  )}
                  
                  {!card.hide_title && (
                    <Typography variant="h6" sx={{ 
                      fontWeight: 700, 
                      fontSize: '1.1rem',
                      lineHeight: 1.3,
                      textShadow: card.image_url ? '0 2px 4px rgba(0,0,0,0.7)' : 'none',
                      position: 'relative',
                      zIndex: 1,
                      mb: card.subtitle ? 1 : 0
                    }}>
                      {card.title}
                    </Typography>
                  )}
                  {card.subtitle && !card.hide_title && (
                    <Typography variant="body2" sx={{ 
                      fontSize: '0.9rem',
                      lineHeight: 1.4,
                      textShadow: card.image_url ? '0 1px 2px rgba(0,0,0,0.7)' : 'none',
                      position: 'relative',
                      zIndex: 1,
                      opacity: 0.9
                    }}>
                      {card.subtitle}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Status da Conexão Deriv */}
      {!user?.deriv_connected && (
        <Alert severity="warning" sx={{ 
          mb: 3,
          borderRadius: '20px',
          backgroundColor: 'rgba(255, 193, 7, 0.08)',
          border: '1px solid rgba(255, 193, 7, 0.2)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(255, 193, 7, 0.1)'
        }}>
          <Typography variant="body1" gutterBottom sx={{ fontWeight: 500 }}>
{t('dashboard.connectBroker')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
{t('dashboard.alreadyAccount')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<Person />}
              onClick={handleConnectDeriv}
              sx={{
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                background: 'var(--button-gradient)',
                boxShadow: '0 4px 12px rgba(0, 212, 170, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #00b89c 0%, #009688 100%)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 16px rgba(0, 212, 170, 0.4)',
                }
              }}
            >
{t('dashboard.connectAccount')}
            </Button>
            <Button
              variant="outlined"
              startIcon={<PersonAdd />}
              onClick={handleCreateDerivAccount}
              sx={{
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                borderColor: '#4CAF50',
                color: '#4CAF50',
                '&:hover': {
                  backgroundColor: 'rgba(76, 175, 80, 0.1)',
                  borderColor: '#4CAF50',
                  transform: 'translateY(-2px)',
                }
              }}
            >
{t('dashboard.createAccount')}
            </Button>
          </Box>
        </Alert>
      )}

      {/* Ranking dos Melhores Bots */}
      <Box mb={4}>
        <Typography gutterBottom sx={{ 
          fontWeight: 600,
          mb: 3,
          color: 'text.primary',
          display: 'flex',
          alignItems: 'center',
          justifyContent: { xs: 'center', sm: 'flex-start' },
          gap: 1,
          textAlign: { xs: 'center', sm: 'left' },
          px: { xs: 2, sm: 0 },
          fontSize: { xs: '1.1rem', sm: '1.25rem' }
        }}>
          <EmojiEvents sx={{ 
            color: '#FFD700', 
            fontSize: { xs: '1.5rem', sm: '1.8rem' }
          }} />
          Ranking dos Melhores Bots de Hoje
        </Typography>

        <Card className="theme-card" sx={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          overflow: 'hidden',
          mx: { xs: 1, sm: 0 }
        }}>
          <CardContent sx={{ p: 0 }}>
            {topBots.length > 0 ? (
              <List sx={{ p: 0 }}>
                {topBots.map((bot, index) => (
                  <ListItem
                    key={bot.id}
                    sx={{
                      py: 2,
                      px: { xs: 2, sm: 3 },
                      borderBottom: index < topBots.length - 1 ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      gap: { xs: 2, sm: 0 },
                      '&:hover': {
                        backgroundColor: 'rgba(0, 212, 170, 0.05)',
                        transform: { xs: 'none', sm: 'translateX(4px)' }
                      }
                    }}
                    onClick={() => window.location.href = '/bots'}
                  >
                    {/* Mobile: Top Row with Position, Avatar, and Progress */}
                    <Box sx={{ 
                      display: { xs: 'flex', sm: 'contents' },
                      alignItems: 'center',
                      width: { xs: '100%', sm: 'auto' },
                      gap: 2
                    }}>
                      {/* Ranking Position */}
                      <Box sx={{ mr: { xs: 0, sm: 2 }, minWidth: '40px' }}>
                        {index < 3 ? (
                          <EmojiEvents 
                            sx={{ 
                              fontSize: { xs: '1.5rem', sm: '2rem' },
                              color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'
                            }} 
                          />
                        ) : (
                          <Typography sx={{ 
                            fontWeight: 'bold', 
                            color: 'text.secondary',
                            textAlign: 'center',
                            fontSize: { xs: '1.25rem', sm: '1.5rem' }
                          }}>
                            {index + 1}
                          </Typography>
                        )}
                      </Box>

                      {/* Bot Avatar */}
                      <Avatar
                        src={bot.image_url}
                        sx={{ 
                          width: { xs: 40, sm: 50 }, 
                          height: { xs: 40, sm: 50 }, 
                          mr: { xs: 0, sm: 2 },
                          border: '2px solid rgba(0, 212, 170, 0.3)',
                          background: bot.image_url ? 'transparent' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        }}
                      >
                        {!bot.image_url && <SmartToy />}
                      </Avatar>

                      {/* Progress Bar - Mobile: Show on top row */}
                      <Box sx={{ 
                        width: { xs: '100px', sm: '100px' }, 
                        ml: { xs: 'auto', sm: 2 },
                        display: { xs: 'block', sm: 'none' }
                      }}>
                        <LinearProgress
                          variant="determinate"
                          value={bot.win_rate}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 3,
                              background: `linear-gradient(90deg, 
                                ${bot.win_rate >= 80 ? '#4CAF50' : '#FFD700'} 0%, 
                                ${bot.win_rate >= 80 ? '#8BC34A' : '#FFA000'} 100%)`
                            }
                          }}
                        />
                        <Typography variant="caption" sx={{ 
                          color: 'text.secondary',
                          fontSize: '0.7rem',
                          display: 'block',
                          textAlign: 'center',
                          mt: 0.5
                        }}>
                          {bot.win_rate.toFixed(0)}%
                        </Typography>
                      </Box>
                    </Box>

                    {/* Bot Info */}
                    <ListItemText
                      primary={
                        <Stack 
                          direction={{ xs: 'column', sm: 'row' }} 
                          alignItems={{ xs: 'flex-start', sm: 'center' }} 
                          spacing={1}
                        >
                          <Typography 
                            sx={{ 
                              fontWeight: 600,
                              fontSize: { xs: '1rem', sm: '1.25rem' }
                            }}
                          >
                            {bot.name}
                          </Typography>
                          {bot.status === 'hot' && (
                            <Chip 
                              label="⭐ TOP" 
                              size="small" 
                              sx={{ 
                                background: 'linear-gradient(45deg, #FFD700, #FFA000)',
                                color: 'white',
                                fontWeight: 'bold'
                              }} 
                            />
                          )}
                          {bot.status === 'trending' && (
                            <Chip 
                              label="📈 TREND" 
                              size="small" 
                              sx={{ 
                                background: 'linear-gradient(45deg, #4CAF50, #8BC34A)',
                                color: 'white',
                                fontWeight: 'bold'
                              }} 
                            />
                          )}
                        </Stack>
                      }
                      secondary={
                        <Stack 
                          direction={{ xs: 'column', sm: 'row' }} 
                          spacing={{ xs: 1, sm: 3 }} 
                          sx={{ mt: 1 }}
                        >
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <Star sx={{ fontSize: '1rem', color: '#FFD700' }} />
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                              {bot.win_rate.toFixed(1)}% Win
                            </Typography>
                          </Box>
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <ShowChart sx={{ fontSize: '1rem', color: '#4CAF50' }} />
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                              +{bot.profit_percentage.toFixed(1)}% Lucro
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {bot.total_operations} ops
                          </Typography>
                        </Stack>
                      }
                    />

                    {/* Progress Bar - Desktop: Show on right side */}
                    <Box sx={{ 
                      width: 100, 
                      ml: 2,
                      display: { xs: 'none', sm: 'block' }
                    }}>
                      <LinearProgress
                        variant="determinate"
                        value={bot.win_rate}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 4,
                            background: `linear-gradient(90deg, 
                              ${bot.win_rate >= 80 ? '#4CAF50' : '#FFD700'} 0%, 
                              ${bot.win_rate >= 80 ? '#8BC34A' : '#FFA000'} 100%)`
                          }
                        }}
                      />
                      <Typography variant="caption" sx={{ 
                        color: 'text.secondary',
                        fontSize: '0.7rem',
                        display: 'block',
                        textAlign: 'center',
                        mt: 0.5
                      }}>
                        {bot.win_rate.toFixed(0)}%
                      </Typography>
                    </Box>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box textAlign="center" py={4}>
                <SmartToy sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Nenhum bot disponível
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Os bots aparecerão aqui conforme forem adicionados
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      <Grid container spacing={3}>



        {/* Log de Operações Recentes */}
        {operationLog.length > 0 && (
          <Grid item xs={12}>
            <Card className="theme-card" sx={{
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
              <CardContent sx={{ p: 3 }}>
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
          <Paper sx={{ 
            p: 3, 
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.08) 0%, rgba(255, 152, 0, 0.05) 100%)',
            border: '1px solid rgba(255, 193, 7, 0.2)',
            boxShadow: '0 4px 16px rgba(255, 193, 7, 0.1)'
          }}>
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{
              fontWeight: 500,
              lineHeight: 1.6,
              '& strong': {
                color: 'warning.main',
                fontWeight: 700
              }
            }}>
{t('dashboard.riskWarning')}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ClientDashboard; 