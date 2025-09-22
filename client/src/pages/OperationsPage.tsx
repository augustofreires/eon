import React, { useState, useEffect, useRef, useCallback } from 'react';
// Debug timestamp: 20250919164854
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Grid,
  Divider,
  InputAdornment,
  Menu,
  MenuItem,
  // Alert,
  // Select,
  // FormControl,
  // InputLabel
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Pause,
  SmartToy,
  AccountBalance,
  Person,
  Warning,
  Settings,
  Close,
  TrendingUp,
  TrendingDown,
  AttachMoney,
  // Speed,
  Refresh,
  // NotificationsActive,
  // Info,
  ExpandMore
  // AccountBalanceWallet,
  // ShowChart
} from '@mui/icons-material';
import DerivTradingChart from '../components/DerivTradingChart';
import CompactOperationsPanel from '../components/CompactOperationsPanel';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import useDerivOperations from '../hooks/useDerivOperations';

interface Bot {
  id: number;
  name: string;
  description: string;
  xml_content: string;
  created_at: string;
  image_url?: string;
}

// ChartData interface moved to DerivTradingChart component

// Market symbols and interfaces moved to DerivTradingChart component

const OperationsPage: React.FC = () => {
  const { t } = useLanguage();
  const { user, updateUser, availableAccounts, currentAccount, fetchAccounts, switchAccount } = useAuth();
  const {
    isConnected: derivWSConnected,
    currentPrice: livePrice,
    subscribeTicks,
    botStatus,
    operationLogs,
    tradingStats,
    startBot,
    stopBot,
    pauseBot,
    resumeBot,
    formatCurrency,
    formatProfit
  } = useDerivOperations();
  // Use connected state from auth context and operations hook
  const derivConnected = Boolean(user?.deriv_connected && derivWSConnected);

  // DEBUG: Comprehensive state logging
  useEffect(() => {
    console.log('🔍 STATE DEBUG - OperationsPage account state:', {
      'user?.deriv_connected': user?.deriv_connected,
      'derivWSConnected': derivWSConnected,
      'derivConnected (computed)': derivConnected,
      'currentAccount': currentAccount ? {
        loginid: currentAccount.loginid,
        currency: currentAccount.currency,
        is_virtual: currentAccount.is_virtual
      } : 'NULL - PROBLEMA!',
      'availableAccounts count': availableAccounts?.length || 0,
      'accountData balance': accountData?.account?.balance,
      'accountData currency': accountData?.account?.currency,
      'user account id': user?.deriv_account_id,
      'user currency': user?.deriv_currency,
      'display will show': derivConnected && currentAccount ? `${currentAccount.loginid} (${currentAccount.currency})` : 'Não conectado',
      'timestamp': new Date().toISOString()
    });

    // Alert se derivConnected mas sem currentAccount
    if (derivConnected && !currentAccount && availableAccounts.length === 0) {
      console.warn('⚠️ PROBLEMA: Deriv conectado mas sem contas disponíveis!');
    }
  }, [user?.deriv_connected, derivWSConnected, derivConnected, user, currentAccount, availableAccounts]);

  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [availableBots, setAvailableBots] = useState<Bot[]>([]);
  const [loadingBots, setLoadingBots] = useState(false);
  const [accountMenuAnchor, setAccountMenuAnchor] = useState<null | HTMLElement>(null);
  const [accountData, setAccountData] = useState<any>(null);
  const [loadingAccountInfo, setLoadingAccountInfo] = useState(false);
  
  const [selectedSymbol, setSelectedSymbol] = useState('R_100');
  const [currentPrice, setCurrentPrice] = useState(livePrice || 1154.7);
  const [chartConnectionStatus, setChartConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [derivAffiliateLink, setDerivAffiliateLink] = useState('');
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [botConfig, setBotConfig] = useState({
    initial_stake: '1.00',
    max_stake: '10.00',
    profit_threshold: '50.00',
    loss_threshold: '50.00',
    martingale_multiplier: '2.1',
    max_loss_count: '3',
    should_stop_on_loss: true,
    should_stop_on_profit: true,
    restart_on_error: true
  });
  const [isInitialized, setIsInitialized] = useState(false);

  const statusCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const initializationRef = useRef<boolean>(false);
  const botsLoadedRef = useRef<boolean>(false);

  // Função simplificada de carregamento de bots
  const loadAvailableBots = useCallback(async (forceRefresh = false) => {
    try {
      setLoadingBots(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setAvailableBots([]);
        return [];
      }

      if (!forceRefresh && botsLoadedRef.current && availableBots.length > 0) {
        setLoadingBots(false);
        return availableBots;
      }

      const response = await axios.get('/api/bots', {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 10000
      });

      const botsData = Array.isArray(response.data.bots) ? response.data.bots : [];
      setAvailableBots(botsData);
      botsLoadedRef.current = true;
      return botsData;
    } catch (error: any) {
      setAvailableBots([]);
      botsLoadedRef.current = false;
      if (error.response?.status !== 401) {
        toast.error('Erro ao carregar bots disponíveis');
      }
      return [];
    } finally {
      setLoadingBots(false);
    }
  }, []);

  // Função para carregar informações da conta
  const loadAccountInfo = useCallback(async () => {
    if (!derivConnected) return;

    try {
      setLoadingAccountInfo(true);
      const response = await axios.get('/api/auth/deriv/account-info');
      setAccountData(response.data);

      if (response.data.warning) {
        toast.error(response.data.warning);
      }
    } catch (error: any) {
      console.error('Erro ao carregar informações da conta:', error);
      toast.error('Erro ao carregar informações da conta Deriv');
    } finally {
      setLoadingAccountInfo(false);
    }
  }, [derivConnected]);

  const loadDerivConfig = useCallback(async () => {
    try {
      const response = await axios.get('/api/auth/deriv-affiliate-link');
      setDerivAffiliateLink(response.data.affiliate_link);
    } catch (error) {
      console.error('Erro ao carregar link Deriv:', error);
    }
  }, []);

  // Função para processar callback OAuth diretamente na URL
  const processOAuthCallback = useCallback(async (token: string, accountId: string, state: string | null) => {
    try {
      console.log('🔄 Processando OAuth callback direto da URL...');

      // Verificar se já foi processado recentemente (evitar duplicatas)
      const lastProcessed = localStorage.getItem('oauth_last_processed');
      const currentTime = Date.now();
      if (lastProcessed && (currentTime - parseInt(lastProcessed)) < 5000) { // 5 segundos
        console.log('⏭️ OAuth já foi processado recentemente, pulando...');
        return;
      }

      // Marcar como processado
      localStorage.setItem('oauth_last_processed', currentTime.toString());

      // Verificar state se disponível
      if (state) {
        console.log('🔍 Validando state parameter...');
      }

      // Enviar tokens para o backend processar
      const response = await axios.post('/api/auth/deriv/process-callback', {
        token1: token,
        acct1: accountId,
        state: state
      });

      if (response.data.success) {
        console.log('✅ OAuth processado com sucesso:', response.data);

        // Salvar no localStorage
        localStorage.setItem('deriv_connected', 'true');
        localStorage.setItem('deriv_account_data', JSON.stringify({
          account_id: response.data.account_id,
          deriv_email: response.data.deriv_email,
          deriv_currency: response.data.deriv_currency,
          deriv_is_virtual: response.data.is_virtual,
          deriv_fullname: response.data.deriv_fullname
        }));

        // Atualizar contexto de usuário
        if (user && updateUser) {
          const updatedUser = {
            ...user,
            deriv_connected: true,
            deriv_account_id: response.data.account_id,
            deriv_email: response.data.deriv_email,
            deriv_currency: response.data.deriv_currency,
            deriv_is_virtual: response.data.is_virtual,
            deriv_fullname: response.data.deriv_fullname
          };

          console.log('✅ OAuth: Atualizando contexto de usuário:', {
            before: user,
            after: updatedUser,
            deriv_connected_changed: user.deriv_connected !== updatedUser.deriv_connected
          });

          updateUser(updatedUser);
        }

        // NOTIFICATION CONTROL: Only show notification once per OAuth session
        const notificationKey = `deriv_connected_${response.data.account_id}`;
        const lastNotification = sessionStorage.getItem(notificationKey);
        const oauthProcessed = sessionStorage.getItem('oauth_callback_processed');

        if (!lastNotification && !oauthProcessed) {
          toast.success(`Conta Deriv conectada: ${response.data.account_id} (${response.data.deriv_currency})`);
          sessionStorage.setItem(notificationKey, currentTime.toString());
          console.log('✅ Notificação de conexão exibida');
        } else {
          console.log('🔇 Notificação já exibida ou OAuth já processado, pulando...');
        }

        // Carregar bots e configurações após conexão bem-sucedida
        console.log('ℹ️ OAuth processado, carregando bots e configurações...');

        // Forçar reconexão do WebSocket após OAuth
        setTimeout(async () => {
          try {
            console.log('🔄 OAuth: Iniciando processo de reconexão pós-OAuth...');

            // 1. Aguardar que o contexto seja atualizado
            await Promise.all([
              loadDerivConfig(),
              loadAvailableBots(),
              fetchAccounts('oauth-callback') // Force account fetch
            ]);

            console.log('✅ OAuth: Bots e configurações carregados');

            // 2. Force trigger useDerivOperations WebSocket connection
            // This will be handled by the useEffect in useDerivOperations that watches user.deriv_connected
            console.log('🔄 OAuth: WebSocket será reconectado automaticamente via useDerivOperations');

          } catch (error) {
            console.error('❌ OAuth: Erro ao carregar configurações:', error);
          }
        }, 1500); // Increased timeout to ensure context update
      } else {
        throw new Error(response.data.error || 'Erro ao processar OAuth');
      }

    } catch (error: any) {
      console.error('❌ Erro ao processar OAuth callback:', error);
      // Limpar marcação de processamento em caso de erro
      localStorage.removeItem('oauth_last_processed');
      throw error;
    }
  }, [user, updateUser]);

  // Force state refresh function
  const forceStateRefresh = useCallback(async () => {
    console.log('🔄 FORCE REFRESH: Iniciando refresh completo do estado...');
    try {
      // 1. Check deriv connection status
      const connected = await checkDerivConnection(false);

      if (connected) {
        // 2. Always fetch accounts to ensure they're loaded
        console.log('🔄 FORCE REFRESH: Buscando contas...');
        await fetchAccounts('force-refresh');

        // 3. Load account info
        console.log('🔄 FORCE REFRESH: Carregando informações da conta...');
        await loadAccountInfo();

        // 4. Give a moment for state to update
        setTimeout(() => {
          console.log('🔄 FORCE REFRESH: Estado final após refresh:', {
            currentAccount: currentAccount?.loginid || 'NULL',
            availableAccounts: availableAccounts.length,
            accountData: accountData ? 'LOADED' : 'NULL'
          });
        }, 1000);
      }

      console.log('✅ FORCE REFRESH: Estado atualizado completamente');
    } catch (error) {
      console.error('❌ FORCE REFRESH: Erro durante refresh:', error);
    }
  }, [fetchAccounts, loadAccountInfo, currentAccount, availableAccounts, accountData]);

  const checkDerivConnection = async (silent = false) => {
    try {
      if (!silent) {
        console.log('🔍 Verificando status da conexão Deriv...');
      }
      const response = await axios.get('/api/auth/deriv/status');
      const isConnected = response.data.connected;

      // Persistir estado no localStorage
      if (isConnected) {
        localStorage.setItem('deriv_connected', 'true');
        localStorage.setItem('deriv_account_data', JSON.stringify({
          account_id: response.data.account_id,
          deriv_email: response.data.deriv_email,
          deriv_currency: response.data.deriv_currency,
          deriv_is_virtual: response.data.is_virtual,
          deriv_fullname: response.data.deriv_fullname
        }));
      } else {
        localStorage.removeItem('deriv_connected');
        localStorage.removeItem('deriv_account_data');
      }

      // derivConnected is now computed from user.deriv_connected and isConnected
      if (!silent) {
        console.log('✅ Status Deriv verificado:', {
          connected: isConnected,
          account_id: response.data.account_id,
          success: response.data.success,
          raw_deriv_connected: response.data.deriv_connected,
          response: response.data
        });
        console.log('🔍 Análise detalhada da conexão:', {
          'response.data.connected': response.data.connected,
          'typeof connected': typeof response.data.connected,
          'Boolean(connected)': Boolean(response.data.connected),
          'isConnected final': isConnected
        });
      }
      return isConnected;
    } catch (error: any) {
      if (!silent) {
        console.error('❌ Erro ao verificar status Deriv:', error.response?.data || error.message);
      }
      // Limpar localStorage em caso de erro
      localStorage.removeItem('deriv_connected');
      localStorage.removeItem('deriv_account_data');
      return false;
    }
  };

  const handleStartOperation = async () => {
    if (!selectedBot) {
      toast.error('Selecione um bot antes de iniciar a operação');
      return;
    }

    if (!derivConnected) {
      toast.error('Conecte sua conta Deriv antes de iniciar operações');
      return;
    }

    await startBot(selectedBot.id, botConfig);
  };

  const handleStopOperation = async () => {
    await stopBot();
  };

  const handlePauseOperation = async () => {
    await pauseBot();
  };

  const handleResumeOperation = async () => {
    await resumeBot();
  };

  const handleSaveConfig = () => {
    setConfigModalOpen(false);
    toast.success('Configurações salvas!');
  };

  const handleAccountMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAccountMenuAnchor(event.currentTarget);
  };

  const handleAccountMenuClose = () => {
    setAccountMenuAnchor(null);
  };

  const handleSwitchAccount = async (account: any) => {
    try {
      setLoadingAccountInfo(true);
      handleAccountMenuClose();
      await switchAccount(account, true);
      setTimeout(() => {
        loadAccountInfo();
      }, 1500);
    } catch (error: any) {
      console.error('Erro ao trocar conta:', error);
      toast.error('Erro ao trocar conta Deriv');
    } finally {
      setLoadingAccountInfo(false);
    }
  };

  const formatBalance = (balance: number, currency: string) => {
    return `$ ${balance.toFixed(2)} ${currency}`;
  };

  const formatProfitLoss = (amount: number) => {
    const sign = amount >= 0 ? '+' : '';
    return `${sign}$ ${amount.toFixed(2)}`;
  };

  const handleConnectDeriv = async () => {
    try {
      console.log('🔗 Iniciando processo de conexão OAuth com Deriv...');
      
      // Obter URL de autorização do backend
      console.log('🔄 Solicitando URL de autorização...');
      const response = await axios.get('/api/auth/deriv/authorize');
      const { auth_url } = response.data;
      console.log('✅ URL de autorização obtida:', auth_url);
      
      // Redirecionar para OAuth na mesma aba (como o concorrente EonPro)
      console.log('🌐 Redirecionando para OAuth da Deriv...');
      toast.loading('Redirecionando para login da Deriv...', { duration: 2000 });
      
      // Usar window.location em vez de popup
      window.location.href = auth_url;
      
    } catch (error: any) {
      console.error('❌ Erro ao obter URL de autorização:', error);
      toast.error(error.response?.data?.error || 'Erro ao iniciar conexão com a Deriv');
    }
  };


  // useEffect principal simplificado
  useEffect(() => {
    if (initializationRef.current) return;

    initializationRef.current = true;

    const initializeOperationsPage = async () => {
      try {
        // Verificar OAuth primeiro
        const urlParams = new URLSearchParams(window.location.search);
        const oauthAccounts = [];

        for (let i = 1; i <= 3; i++) {
          const token = urlParams.get(`token${i}`);
          const account = urlParams.get(`acct${i}`);
          const currency = urlParams.get(`cur${i}`);

          if (token && account) {
            oauthAccounts.push({ token, account, currency: currency || 'USD', index: i });
          }
        }

        if (oauthAccounts.length > 0 && !sessionStorage.getItem('oauth_callback_processed')) {
          try {
            const primaryAccount = oauthAccounts.find(acc => !acc.account.startsWith('VR')) || oauthAccounts[0];
            await processOAuthCallback(primaryAccount.token, primaryAccount.account, urlParams.get('state'));

            sessionStorage.setItem('oauth_callback_processed', 'true');
            window.history.replaceState({}, document.title, '/operations');
          } catch (oauthError) {
            console.error('OAuth erro:', oauthError);
            toast.error('Erro ao processar autorização');
          }
        }

        // Estado será automaticamente sincronizado via user.deriv_connected e isConnected

        // Carregar configurações iniciais
        await Promise.all([
          loadDerivConfig(),
          checkDerivConnection(false)
        ]);

        setIsInitialized(true);
      } catch (error) {
        console.error('Erro na inicialização:', error);
      }
    };

    initializeOperationsPage();

    // Verificação de status periódica
    if (!statusCheckIntervalRef.current) {
      statusCheckIntervalRef.current = setInterval(() => {
        checkDerivConnection(true);
      }, 60000);
    }

    return () => {
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
        statusCheckIntervalRef.current = null;
      }
      initializationRef.current = false;
    };
  }, []);

  // derivConnected is now computed automatically

  // Carregar bots quando Deriv conectar
  useEffect(() => {
    if (derivConnected && isInitialized && !botsLoadedRef.current) {
      const timeoutId = setTimeout(() => {
        loadAvailableBots(false);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [derivConnected, isInitialized]);

  // Carregar informações da conta quando conectar
  useEffect(() => {
    if (derivConnected && isInitialized) {
      loadAccountInfo();
      // Buscar contas se não há contas carregadas
      if (availableAccounts.length === 0) {
        fetchAccounts('operations-page-effect');
      }
    }
  }, [derivConnected, isInitialized, loadAccountInfo, fetchAccounts, availableAccounts.length]);

  // Atualizar preço atual quando há dados do WebSocket
  useEffect(() => {
    if (livePrice > 0) {
      setCurrentPrice(livePrice);
    }
  }, [livePrice]);

  // Subscrever aos ticks quando símbolo muda
  useEffect(() => {
    if (derivWSConnected && selectedSymbol) {
      subscribeTicks(selectedSymbol);
    }
  }, [derivWSConnected, selectedSymbol, subscribeTicks]);

  // Atualizar status de conexão do gráfico
  useEffect(() => {
    if (derivConnected) {
      setChartConnectionStatus('connected');
    } else {
      setChartConnectionStatus('disconnected');
    }
  }, [derivConnected]);

  return (
    <Box sx={{
      p: { xs: 1, md: 2 },
      minHeight: '100vh',
      background: 'linear-gradient(135deg, rgba(10, 25, 41, 0.95) 0%, rgba(15, 35, 55, 0.9) 100%)'
    }}>
      {/* Header de status */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 2,
        pb: 1,
        borderBottom: '1px solid rgba(0, 212, 170, 0.2)'
      }}>
        <Typography variant="h4" sx={{
          color: '#ffffff',
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #00d4aa 0%, #00b89c 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          EON PRO
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: derivConnected ? '#4caf50' : '#f44336'
            }} />
            <Typography variant="caption" sx={{
              color: derivConnected ? '#4caf50' : '#f44336',
              fontWeight: 600,
              fontSize: '0.75rem'
            }}>
              DERIV {derivConnected ? 'ONLINE' : 'OFFLINE'}
            </Typography>
            {/* Debug refresh button - v2 */}
            <IconButton
              onClick={forceStateRefresh}
              sx={{ p: 0.5, color: '#888', fontSize: '0.7rem' }}
              title="Force refresh state (debug v2)"
            >
              <Refresh sx={{ fontSize: '0.8rem' }} />
            </IconButton>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: chartConnectionStatus === 'connected' ? '#00d4aa' : chartConnectionStatus === 'connecting' ? '#ff9800' : '#f44336'
            }} />
            <Typography variant="caption" sx={{
              color: chartConnectionStatus === 'connected' ? '#00d4aa' : chartConnectionStatus === 'connecting' ? '#ff9800' : '#f44336',
              fontWeight: 600,
              fontSize: '0.75rem'
            }}>
              CHART {chartConnectionStatus === 'connected' ? 'ON' : chartConnectionStatus === 'connecting' ? 'CONNECTING' : 'OFF'}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Layout Principal - 2 Seções */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', lg: 'row' },
        gap: 2,
        height: { xs: 'auto', lg: 'calc(100vh - 120px)' },
        pb: { xs: 2, lg: 0 },
        position: 'relative'
      }}>

        {/* SEÇÃO 1: GRÁFICO - 65% */}
        <Box sx={{
          width: { xs: '100%', lg: '65%' },
          height: { xs: '400px', lg: '100%' },
          position: 'relative',
          zIndex: 0
        }}>
          <DerivTradingChart
            symbol={selectedSymbol}
            onSymbolChange={setSelectedSymbol}
            height={{ xs: 400, lg: '100%' }}
            showControls={true}
            theme="dark"
            onPriceUpdate={(price) => {
              setCurrentPrice(price);
              // Atualizar hook de operações se necessário
            }}
          />
        </Box>

        {/* SEÇÃO 2: OPERAÇÕES - 35% */}
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          width: { xs: '100%', lg: '35%' },
          height: { xs: 'auto', lg: '100%' },
          overflow: { xs: 'visible', lg: 'auto' }
        }}>

          {/* Painel de Conta */}
          <Card sx={{
            borderRadius: '16px',
            background: 'rgba(25, 45, 65, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 212, 170, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            flexShrink: 0,
            position: { xs: 'relative', lg: 'static' },
            zIndex: { xs: 1, lg: 'auto' }
          }}>
            <CardContent sx={{ p: 2 }}>
              <Grid container spacing={2} alignItems="center">
                {/* Account Info */}
                <Grid item xs={12} lg={8}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <AccountBalance sx={{ color: '#00d4aa', fontSize: '2rem' }} />
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                          {derivConnected ? (currentAccount?.is_virtual ? 'Conta Virtual' : 'Conta Real') : 'Não Conectado'}
                        </Typography>
                        {derivConnected && currentAccount && (
                          <>
                            <Chip
                              label={currentAccount.loginid}
                              size="small"
                              sx={{
                                bgcolor: 'rgba(0, 212, 170, 0.2)',
                                color: '#00d4aa',
                                fontSize: '0.7rem',
                                height: '18px',
                                cursor: 'pointer'
                              }}
                              onClick={handleAccountMenuOpen}
                            />
                            <IconButton
                              onClick={handleAccountMenuOpen}
                              sx={{ p: 0, color: '#b0b0b0' }}
                            >
                              <ExpandMore sx={{ fontSize: '1rem' }} />
                            </IconButton>
                          </>
                        )}
                      </Box>
                      <Typography variant="h5" sx={{ color: '#ffffff', fontWeight: 'bold' }}>
                        {derivConnected && currentAccount
                          ? (accountData?.account?.balance !== undefined
                              ? formatBalance(accountData.account.balance, currentAccount.currency)
                              : `Carregando... (${currentAccount.currency})`
                            )
                          : '$0,00 USD'
                        }
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* Profit/Loss */}
                <Grid item xs={12} lg={4}>
                  <Box sx={{ textAlign: { xs: 'left', lg: 'right' } }}>
                    <Typography variant="caption" sx={{ color: '#b0b0b0', display: 'block' }}>
                      P&L Hoje
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: { xs: 'flex-start', lg: 'flex-end' } }}>
                      {(accountData?.profit_loss?.today || botStatus.profitLoss || 0) >= 0 ? (
                        <TrendingUp sx={{ color: '#4caf50', fontSize: '1.2rem' }} />
                      ) : (
                        <TrendingDown sx={{ color: '#f44336', fontSize: '1.2rem' }} />
                      )}
                      <Typography variant="h6" sx={{
                        color: (accountData?.profit_loss?.today || botStatus.profitLoss || 0) >= 0 ? '#4caf50' : '#f44336',
                        fontWeight: 'bold'
                      }}>
                        {accountData?.profit_loss
                          ? formatProfitLoss(accountData.profit_loss.today || 0)
                          : formatProfitLoss(botStatus.profitLoss || 0)
                        }
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>

              {/* Performance Stats */}
              <Divider sx={{ my: 2, borderColor: 'rgba(0, 212, 170, 0.2)' }} />
              <Box sx={{
                display: 'flex',
                justifyContent: 'space-around',
                gap: 2
              }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#4caf50', display: 'block' }}>Vitórias</Typography>
                  <Chip
                    label={tradingStats.winningTrades || 0}
                    size="small"
                    sx={{
                      bgcolor: '#4caf50',
                      color: 'white',
                      minWidth: '30px',
                      fontWeight: 'bold'
                    }}
                  />
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#f44336', display: 'block' }}>Perdas</Typography>
                  <Chip
                    label={tradingStats.losingTrades || 0}
                    size="small"
                    sx={{
                      bgcolor: '#f44336',
                      color: 'white',
                      minWidth: '30px',
                      fontWeight: 'bold'
                    }}
                  />
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#ff9800', display: 'block' }}>Total</Typography>
                  <Chip
                    label={tradingStats.totalTrades || 0}
                    size="small"
                    sx={{
                      bgcolor: '#ff9800',
                      color: 'white',
                      minWidth: '30px',
                      fontWeight: 'bold'
                    }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Painel Compacto de Operações */}
          <CompactOperationsPanel
            derivConnected={derivConnected}
            onConnectDeriv={handleConnectDeriv}
            selectedBot={selectedBot}
            availableBots={availableBots}
            onBotSelect={setSelectedBot}
            botStatus={botStatus}
            onStartOperation={handleStartOperation}
            onStopOperation={handleStopOperation}
            onPauseOperation={handlePauseOperation}
            onResumeOperation={handleResumeOperation}
            onOpenConfig={() => setConfigModalOpen(true)}
            operationLogs={operationLogs}
            loadingBots={loadingBots}
          />
        </Box>
      </Box>

      {/* Menu de Contas */}
      <Menu
        anchorEl={accountMenuAnchor}
        open={Boolean(accountMenuAnchor)}
        onClose={handleAccountMenuClose}
        PaperProps={{
          sx: {
            bgcolor: 'rgba(25, 45, 65, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 212, 170, 0.2)',
            borderRadius: 2,
            minWidth: '250px'
          }
        }}
      >
        {availableAccounts && availableAccounts.length > 0 ? (
          availableAccounts.map((account) => (
            <MenuItem
              key={account.loginid}
              onClick={() => account.loginid !== currentAccount?.loginid ? handleSwitchAccount(account) : handleAccountMenuClose()}
              sx={{
                color: '#ffffff',
                bgcolor: account.loginid === currentAccount?.loginid ? 'rgba(0, 212, 170, 0.15)' : 'transparent',
                '&:hover': {
                  bgcolor: 'rgba(0, 212, 170, 0.1)'
                }
              }}
            >
              <Box>
                <Typography variant="body1" sx={{
                  color: account.loginid === currentAccount?.loginid ? '#00d4aa' : '#ffffff',
                  fontWeight: account.loginid === currentAccount?.loginid ? 600 : 400
                }}>
                  {account.loginid} {account.loginid === currentAccount?.loginid ? '(Atual)' : ''}
                </Typography>
                <Typography variant="caption" sx={{ color: '#b0b0b0' }}>
                  {account.is_virtual ? 'Virtual' : 'Real'} • {account.currency}
                </Typography>
              </Box>
            </MenuItem>
          ))
        ) : (
          <MenuItem onClick={handleAccountMenuClose} sx={{ color: '#ffffff' }}>
            <Box>
              <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                Nenhuma conta disponível
              </Typography>
            </Box>
          </MenuItem>
        )}
      </Menu>

      {/* Modal de Configuração do Bot */}
      <Dialog
        open={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'rgba(25, 45, 65, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 212, 170, 0.2)',
            borderRadius: 3
          }
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(0, 212, 170, 0.2)',
          color: '#ffffff',
          p: 3
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Settings sx={{ color: '#00d4aa' }} />
            <Typography variant="h6">
              Configurações do Bot
            </Typography>
          </Box>
          <IconButton
            onClick={() => setConfigModalOpen(false)}
            sx={{ color: '#b0b0b0' }}
          >
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3, color: '#ffffff' }}>
          <Grid container spacing={3}>
            
            {/* Parâmetros de Entrada */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                Parâmetros de Entrada
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Valor Inicial da Entrada"
                    type="number"
                    inputProps={{ step: "0.01", min: "0.35" }}
                    value={botConfig.initial_stake}
                    onChange={(e) => setBotConfig({...botConfig, initial_stake: e.target.value})}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><AttachMoney /></InputAdornment>
                    }}
                    helperText="Mínimo: $0.35"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Valor Máximo da Entrada"
                    type="number"
                    inputProps={{ step: "0.01" }}
                    value={botConfig.max_stake}
                    onChange={(e) => setBotConfig({...botConfig, max_stake: e.target.value})}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><AttachMoney /></InputAdornment>
                    }}
                    helperText="Limite para Martingale"
                  />
                </Grid>
              </Grid>
            </Grid>

            {/* Martingale */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                Configuração de Martingale
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Multiplicador Martingale"
                    type="number"
                    inputProps={{ step: "0.1", min: "1.1" }}
                    value={botConfig.martingale_multiplier}
                    onChange={(e) => setBotConfig({...botConfig, martingale_multiplier: e.target.value})}
                    helperText="Ex: 2.1 = dobra + 10%"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Máx. Perdas Consecutivas"
                    type="number"
                    inputProps={{ min: "1", max: "10" }}
                    value={botConfig.max_loss_count}
                    onChange={(e) => setBotConfig({...botConfig, max_loss_count: e.target.value})}
                    helperText="Máx: 10 perdas seguidas"
                  />
                </Grid>
              </Grid>
            </Grid>

            {/* Stop Loss e Take Profit */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                Stop Loss e Take Profit
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={botConfig.should_stop_on_loss}
                        onChange={(e) => setBotConfig({...botConfig, should_stop_on_loss: e.target.checked})}
                      />
                    }
                    label="Ativar Stop Loss"
                  />
                </Grid>
                
                {botConfig.should_stop_on_loss && (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Valor Máximo de Perda (USD)"
                      type="number"
                      inputProps={{ step: "0.01" }}
                      value={botConfig.loss_threshold}
                      onChange={(e) => setBotConfig({...botConfig, loss_threshold: e.target.value})}
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><TrendingDown sx={{ color: '#f44336' }} /></InputAdornment>
                      }}
                    />
                  </Grid>
                )}
                
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={botConfig.should_stop_on_profit}
                        onChange={(e) => setBotConfig({...botConfig, should_stop_on_profit: e.target.checked})}
                      />
                    }
                    label="Ativar Take Profit"
                  />
                </Grid>
                
                {botConfig.should_stop_on_profit && (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Meta de Lucro (USD)"
                      type="number"
                      inputProps={{ step: "0.01" }}
                      value={botConfig.profit_threshold}
                      onChange={(e) => setBotConfig({...botConfig, profit_threshold: e.target.value})}
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><TrendingUp sx={{ color: '#4caf50' }} /></InputAdornment>
                      }}
                    />
                  </Grid>
                )}
              </Grid>
            </Grid>

            {/* Outras Configurações */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                Outras Configurações
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch 
                    checked={botConfig.restart_on_error}
                    onChange={(e) => setBotConfig({...botConfig, restart_on_error: e.target.checked})}
                  />
                }
                label="Reiniciar Automaticamente em Caso de Erro"
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(0, 212, 170, 0.2)', gap: 2 }}>
          <Button
            onClick={() => setConfigModalOpen(false)}
            variant="outlined"
            sx={{
              borderColor: 'rgba(255, 255, 255, 0.3)',
              color: '#ffffff',
              '&:hover': {
                borderColor: 'rgba(255, 255, 255, 0.5)',
                bgcolor: 'rgba(255, 255, 255, 0.05)'
              }
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSaveConfig}
            variant="contained"
            startIcon={<Settings />}
            sx={{
              background: 'linear-gradient(135deg, #00d4aa 0%, #00b89c 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #00b89c 0%, #009688 100%)'
              }
            }}
          >
            Salvar Configurações
          </Button>
        </DialogActions>
      </Dialog>

      {/* CSS para animações */}
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }

          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .fade-in {
            animation: fadeIn 0.5s ease-out;
          }
        `}
      </style>
    </Box>
  );
};

export default OperationsPage;