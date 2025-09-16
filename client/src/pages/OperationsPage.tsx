import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  FormControl,
  Select,
  MenuItem,
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
  InputAdornment
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  SmartToy,
  AccountBalance,
  Person,
  Warning,
  Settings,
  Close,
  TrendingUp,
  TrendingDown,
  AttachMoney,
  Speed
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import DerivAccountPanel from '../components/DerivAccountPanel';

interface Bot {
  id: number;
  name: string;
  description: string;
  xml_content: string;
  created_at: string;
  image_url?: string;
}

interface ChartData {
  time: string;
  price: number;
  timestamp: number;
}

const OperationsPage: React.FC = () => {
  const { t } = useLanguage();
  const { user, updateUser, availableAccounts, currentAccount, fetchAccounts, switchAccount } = useAuth();
  const [derivConnected, setDerivConnected] = useState(false);
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [availableBots, setAvailableBots] = useState<Bot[]>([]);
  
  // Garantir que availableBots seja sempre um array
  React.useEffect(() => {
    if (!Array.isArray(availableBots)) {
      console.warn('⚠️ availableBots não é um array, corrigindo...', availableBots);
      setAvailableBots([]);
    }
  }, [availableBots]);
  const [operationRunning, setOperationRunning] = useState(false);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState('R_100');
  const [isConnectingWs, setIsConnectingWs] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(1154.7);
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
  
  const wsRef = useRef<WebSocket | null>(null);
  const statusCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const initializationRef = useRef<boolean>(false); // CORREÇÃO: Controle de inicialização

  const loadAvailableBots = useCallback(async () => {
    try {
      const response = await axios.get('/api/bots');
      // Garantir que sempre seja um array
      const botsData = Array.isArray(response.data) ? response.data : [];
      setAvailableBots(botsData);
      console.log('Bots carregados:', botsData);
    } catch (error) {
      console.error('Erro ao carregar bots:', error);
      // Em caso de erro, definir como array vazio
      setAvailableBots([]);
    }
  }, []);

  const loadDerivConfig = useCallback(async () => {
    try {
      const response = await axios.get('/api/auth/deriv-affiliate-link');
      setDerivAffiliateLink(response.data.affiliate_link);
      console.log('Link Deriv carregado:', response.data.affiliate_link);
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
        setDerivConnected(true);

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
          updateUser({
            ...user,
            deriv_connected: true,
            deriv_account_id: response.data.account_id,
            deriv_email: response.data.deriv_email,
            deriv_currency: response.data.deriv_currency,
            deriv_is_virtual: response.data.is_virtual,
            deriv_fullname: response.data.deriv_fullname
          });
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

        // FETCH ACCOUNTS: Load all available accounts after successful connection
        try {
          console.log('🔄 Buscando contas disponíveis após conexão OAuth...');
          await fetchAccounts('oauth-callback');
          console.log('✅ Contas carregadas com sucesso após OAuth');
        } catch (fetchError) {
          console.error('⚠️ Erro ao buscar contas após OAuth:', fetchError);
        }
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

      setDerivConnected(isConnected);
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
      setDerivConnected(false);
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
    
    try {
      console.log('🚀 Iniciando operação com bot:', selectedBot.name);
      setOperationRunning(true);
      
      // Enviar configurações do bot para o backend
      const response = await axios.post('/api/operations/start', {
        botId: selectedBot.id,
        config: botConfig
      });
      
      toast.success('Operação iniciada com sucesso!');
      console.log('✅ Operação iniciada:', response.data);
      
    } catch (error: any) {
      console.error('Erro ao iniciar operação:', error);
      toast.error(error.response?.data?.error || 'Erro ao iniciar operação');
      setOperationRunning(false);
    }
  };

  const handleStopOperation = async () => {
    try {
      await axios.post('/api/operations/stop');
      setOperationRunning(false);
      toast.success('Operação parada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao parar operação:', error);
      toast.error(error.response?.data?.error || 'Erro ao parar operação');
    }
  };

  const handleSaveConfig = () => {
    setConfigModalOpen(false);
    toast.success('Configurações salvas!');
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

  // CORREÇÃO: WebSocket com cleanup adequado
  const connectToDerivWS = useCallback(async () => {
    // Prevenir múltiplas conexões
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('⏭️ WebSocket já conectado, pulando...');
      return;
    }

    // Limpar conexão anterior se existir
    if (wsRef.current) {
      console.log('🧹 Fechando conexão WebSocket anterior...');
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnectingWs(true);
    console.log('🌐 Iniciando conexão WebSocket...');

    try {
      const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=82349');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ Conectado ao WebSocket da Deriv');
        setWsConnection(ws);
        setIsConnectingWs(false);

        const request = {
          ticks: selectedSymbol,
          subscribe: 1,
          req_id: Date.now()
        };

        ws.send(JSON.stringify(request));
        console.log('📡 Solicitação enviada para:', selectedSymbol);
      };

      ws.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data);

          if (response.tick) {
            const tickData = {
              time: new Date(response.tick.epoch * 1000).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              }),
              price: response.tick.quote,
              timestamp: response.tick.epoch * 1000
            };

            setCurrentPrice(tickData.price);

            setChartData(prev => {
              const newData = [...prev, tickData].slice(-50);
              return newData;
            });
          }

          if (response.error) {
            console.error('❌ Erro no WebSocket:', response.error.message);
          }
        } catch (error) {
          console.error('❌ Erro ao processar dados:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ Erro no WebSocket:', error);
        setIsConnectingWs(false);
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket fechado:', event.code, event.reason);
        setWsConnection(null);
        setIsConnectingWs(false);

        // Só reconectar se não foi fechamento intencional
        if (event.code !== 1000 && wsRef.current === ws) {
          setTimeout(() => {
            console.log('🔄 Tentando reconectar...');
            connectToDerivWS();
          }, 5000);
        }
      };

    } catch (error) {
      console.error('❌ Erro ao conectar WebSocket:', error);
      setIsConnectingWs(false);
    }
  }, [selectedSymbol]);

  // CORREÇÃO: useEffect principal otimizado
  useEffect(() => {
    // Prevenir múltiplas inicializações
    if (initializationRef.current) {
      console.log('⏭️ Inicialização já em andamento, pulando...');
      return;
    }

    initializationRef.current = true;
    console.log('🚀 OperationsPage: Inicializando...', new Date().toISOString());

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
          console.log(`🎉 OAuth: ${oauthAccounts.length} contas detectadas`);

          try {
            const primaryAccount = oauthAccounts.find(acc => !acc.account.startsWith('VR')) || oauthAccounts[0];
            await processOAuthCallback(primaryAccount.token, primaryAccount.account, urlParams.get('state'));

            sessionStorage.setItem('oauth_callback_processed', 'true');
            window.history.replaceState({}, document.title, '/operations');
          } catch (oauthError) {
            console.error('❌ OAuth erro:', oauthError);
            toast.error('Erro ao processar autorização');
          }
        }

        // Restaurar estado local
        const savedDerivConnected = localStorage.getItem('deriv_connected');
        if (savedDerivConnected === 'true') {
          setDerivConnected(true);
        }

        // Carregar dados iniciais
        console.log('🔄 Carregando dados iniciais...');
        await Promise.all([
          loadAvailableBots(),
          loadDerivConfig(),
          checkDerivConnection(false)
        ]);

        // Conectar WebSocket
        await connectToDerivWS();

        setIsInitialized(true);
        console.log('✅ Inicialização concluída');

      } catch (error) {
        console.error('❌ Erro na inicialização:', error);
      }
    };

    initializeOperationsPage();

    // CORREÇÃO: Verificação de status controlada
    if (!statusCheckIntervalRef.current) {
      statusCheckIntervalRef.current = setInterval(() => {
        checkDerivConnection(true);
      }, 60000);
    }

    return () => {
      console.log('🧹 Cleanup OperationsPage...');

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
        statusCheckIntervalRef.current = null;
      }

      initializationRef.current = false;
    };
  }, []); // CORREÇÃO: Array de dependências vazio para executar apenas uma vez

  // Sincronizar com mudanças no contexto de autenticação
  useEffect(() => {
    if (user?.deriv_connected && !derivConnected) {
      console.log('🔄 Sincronizando estado Deriv com contexto de autenticação...');
      setDerivConnected(true);
    } else if (!user?.deriv_connected && derivConnected) {
      console.log('🔄 Desconectando Deriv conforme contexto de autenticação...');
      setDerivConnected(false);
    }
  }, [user?.deriv_connected, derivConnected]);

  // REMOVED: Duplicate OAuth processing useEffect that was causing notification spam
  // OAuth processing is now handled only once in the main initialization useEffect

  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setChartData([]);
      
      const request = {
        ticks: selectedSymbol,
        subscribe: 1,
        req_id: Date.now()
      };
      
      wsRef.current.send(JSON.stringify(request));
      console.log('Mudando para símbolo:', selectedSymbol);
    }
  }, [selectedSymbol]);

  return (
    <Box sx={{ 
      p: { xs: 0.25, md: 3 },
      minHeight: '100vh',
      background: 'linear-gradient(135deg, rgba(10, 25, 41, 0.95) 0%, rgba(15, 35, 55, 0.9) 100%)'
    }}>
      {/* Header de teste */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center',
        alignItems: 'center',
        mb: 2,
        pb: 1,
        borderBottom: '1px solid rgba(0, 212, 170, 0.2)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ 
            width: 6, 
            height: 6, 
            borderRadius: '50%',
            backgroundColor: derivConnected ? '#4caf50' : '#f44336'
          }} />
          <Typography variant="caption" sx={{ 
            color: derivConnected ? '#4caf50' : '#f44336',
            fontWeight: 500,
            fontSize: '0.7rem'
          }}>
            {derivConnected ? 'ONLINE' : 'OFFLINE'}
          </Typography>
        </Box>
      </Box>

      {/* Layout principal */}
      <Box sx={{ 
        display: { xs: 'flex', md: 'grid' },
        flexDirection: { xs: 'column', md: 'row' },
        gridTemplateColumns: { md: '1fr 350px' },
        gap: { xs: 0.25, md: 3 },
        height: { xs: 'auto', md: 'calc(100vh - 180px)' }
      }}>
        
        {/* Área principal - Gráfico */}
        <Box sx={{ 
          order: { xs: 1, md: 1 },
          flex: { xs: 1, md: 'none' },
          minHeight: { xs: '400px', md: 'auto' },
          height: { xs: '60vh', md: 'auto' }
        }}>
          <Card sx={{
            borderRadius: { xs: '0px', md: '12px' },
            background: 'rgba(25, 45, 65, 0.8)',
            backdropFilter: 'blur(20px)',
            border: { xs: 'none', md: '1px solid rgba(0, 212, 170, 0.1)' },
            height: '100%'
          }}>
            <CardContent sx={{ p: { xs: 0, md: 2 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
              
              {/* Header do gráfico */}
              <Box sx={{ 
                display: { xs: 'none', md: 'flex' }, 
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
                pb: 2,
                borderBottom: '1px solid rgba(0, 212, 170, 0.2)'
              }}>
                <Typography variant="h6" sx={{ 
                  color: '#ffffff', 
                  fontWeight: 600
                }}>
                  {selectedBot ? selectedBot.name : 'Gráfico em Tempo Real'}
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ color: '#00d4aa' }}>
                      {selectedSymbol}
                    </Typography>
                    {wsConnection && (
                      <Chip size="small" label="LIVE" color="success" />
                    )}
                  </Box>
                  
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <Select
                      value={selectedSymbol}
                      onChange={(e) => setSelectedSymbol(e.target.value)}
                      sx={{
                        color: '#ffffff',
                        fontSize: '0.875rem',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(0, 212, 170, 0.5)'
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#00d4aa'
                        }
                      }}
                    >
                      <MenuItem value="R_100">Vol 100</MenuItem>
                      <MenuItem value="R_75">Vol 75</MenuItem>
                      <MenuItem value="R_50">Vol 50</MenuItem>
                      <MenuItem value="R_25">Vol 25</MenuItem>
                      <MenuItem value="R_10">Vol 10</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>

              {/* Header mobile compacto */}
              <Box sx={{ 
                display: { xs: 'flex', md: 'none' },
                justifyContent: 'space-between',
                alignItems: 'center',
                p: { xs: '4px', md: 1 },
                borderBottom: '1px solid rgba(0, 212, 170, 0.2)',
                background: 'rgba(0, 0, 0, 0.3)',
                mb: { xs: '2px', md: 1 }
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ color: '#00d4aa', fontSize: '0.75rem' }}>
                    {selectedSymbol}
                  </Typography>
                  {wsConnection && (
                    <Chip size="small" label="LIVE" color="success" sx={{ fontSize: '0.6rem', height: '16px' }} />
                  )}
                </Box>
                
                <FormControl size="small" sx={{ minWidth: 80 }}>
                  <Select
                    value={selectedSymbol}
                    onChange={(e) => setSelectedSymbol(e.target.value)}
                    sx={{
                      color: '#ffffff',
                      fontSize: '0.7rem',
                      height: '24px',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(0, 212, 170, 0.5)'
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#00d4aa'
                      },
                      '& .MuiSelect-select': {
                        padding: '2px 8px'
                      }
                    }}
                  >
                    <MenuItem value="R_100" sx={{ fontSize: '0.7rem' }}>Vol 100</MenuItem>
                    <MenuItem value="R_75" sx={{ fontSize: '0.7rem' }}>Vol 75</MenuItem>
                    <MenuItem value="R_50" sx={{ fontSize: '0.7rem' }}>Vol 50</MenuItem>
                    <MenuItem value="R_25" sx={{ fontSize: '0.7rem' }}>Vol 25</MenuItem>
                    <MenuItem value="R_10" sx={{ fontSize: '0.7rem' }}>Vol 10</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Status da conexão */}
              {isConnectingWs && (
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1, 
                  mb: { xs: '2px', md: 1 },
                  p: { xs: '4px', md: 1 },
                  background: 'rgba(0, 212, 170, 0.1)',
                  borderRadius: '6px'
                }}>
                  <CircularProgress size={16} sx={{ color: '#00d4aa' }} />
                  <Typography variant="caption" sx={{ color: '#00d4aa' }}>
                    Conectando aos dados em tempo real...
                  </Typography>
                </Box>
              )}

              {/* Área do gráfico */}
              <Box sx={{ 
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: { xs: 0, md: '8px' },
                height: { xs: '300px', md: '400px' },
                width: '100%',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {chartData.length > 0 ? (
                  <ResponsiveContainer 
                    width="100%" 
                    height={window.innerWidth < 600 ? 300 : 400}
                  >
                    <LineChart 
                      data={chartData}
                      margin={window.innerWidth < 600 ? { top: 8, right: 55, left: 2, bottom: 8 } : { top: 5, right: 50, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                      <XAxis 
                        dataKey="time" 
                        tick={{ fontSize: 10, fill: 'rgba(255, 255, 255, 0.7)' }}
                        axisLine={{ stroke: 'rgba(255, 255, 255, 0.3)' }}
                        tickLine={{ stroke: 'rgba(255, 255, 255, 0.3)' }}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        domain={['dataMin - 0.1', 'dataMax + 0.1']}
                        tick={{ fontSize: 9, fill: 'rgba(255, 255, 255, 0.7)' }}
                        axisLine={{ stroke: 'rgba(255, 255, 255, 0.3)' }}
                        tickLine={{ stroke: 'rgba(255, 255, 255, 0.3)' }}
                        tickFormatter={(value) => value.toFixed(3)}
                        tickCount={8}
                        width={window.innerWidth < 600 ? 50 : 58}
                        orientation="left"
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'rgba(25, 45, 65, 0.95)',
                          border: '1px solid rgba(0, 212, 170, 0.3)',
                          borderRadius: '6px',
                          color: '#ffffff',
                          fontSize: '12px',
                          padding: '8px 10px'
                        }}
                        formatter={(value: any) => [value.toFixed(3), 'Preço']}
                        labelFormatter={(label: any) => `${label}`}
                        labelStyle={{ color: '#00d4aa', fontSize: '11px', fontWeight: 'bold' }}
                      />
                      <ReferenceLine 
                        y={currentPrice} 
                        stroke="#00d4aa" 
                        strokeDasharray="5 5" 
                        strokeWidth={2}
                        label={{ 
                          value: currentPrice.toFixed(3), 
                          position: 'right', 
                          fill: '#00d4aa',
                          fontSize: 10,
                          fontWeight: 'bold',
                          offset: 3
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="price" 
                        stroke="#00d4aa" 
                        strokeWidth={2} 
                        dot={false}
                        activeDot={{ 
                          r: 4, 
                          fill: '#00d4aa',
                          stroke: '#ffffff',
                          strokeWidth: 2
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    gap: 2
                  }}>
                    <CircularProgress sx={{ color: '#00d4aa' }} />
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      {wsConnection ? 'Aguardando dados do mercado...' : 'Conectando...'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      Símbolo: {selectedSymbol}
                    </Typography>
                  </Box>
                )}
              </Box>
              
            </CardContent>
          </Card>
        </Box>

        {/* Painel lateral direito */}
        <Box sx={{ 
          order: { xs: 2, md: 2 },
          width: { xs: '100%', md: '350px' }
        }}>
          <Card sx={{
            borderRadius: '12px',
            background: 'rgba(15, 25, 35, 0.9)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 212, 170, 0.2)',
            height: '100%'
          }}>
            <CardContent sx={{ p: 0, height: '100%' }}>
              

              {!derivConnected ? (
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Status de Conexão */}
                  <Box sx={{ 
                    textAlign: 'center', 
                    p: 2, 
                    border: '1px solid rgba(255, 193, 7, 0.3)',
                    borderRadius: '8px',
                    background: 'rgba(255, 193, 7, 0.05)'
                  }}>
                    <Warning sx={{ fontSize: 24, color: '#ffc107', mb: 1 }} />
                    <Typography variant="body2" sx={{ color: '#ffffff', mb: 2 }}>
                      Conecte sua conta Deriv
                    </Typography>
                    
                    <Button
                      variant="contained"
                      startIcon={<Person />}
                      fullWidth
                      onClick={handleConnectDeriv}
                      sx={{
                        background: 'linear-gradient(135deg, #00d4aa 0%, #00b89c 100%)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #00b89c 0%, #00d4aa 100%)'
                        },
                        mb: 1
                      }}
                    >
                      Conectar Conta
                    </Button>

                    <Button
                      variant="outlined"
                      fullWidth
                      sx={{
                        borderColor: 'rgba(0, 212, 170, 0.5)',
                        color: '#00d4aa',
                        fontSize: '0.875rem',
                        '&:hover': {
                          borderColor: '#00d4aa',
                          background: 'rgba(0, 212, 170, 0.1)'
                        }
                      }}
                      href={derivAffiliateLink || 'https://deriv.com'}
                      target="_blank"
                    >
                      Criar Conta na Deriv
                    </Button>
                  </Box>

                  {/* Instruções */}
                  <Box sx={{
                    p: 2,
                    borderRadius: '6px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.4 }}>
                      1. Crie ou faça login na sua conta Deriv{<br />}
                      2. Conecte sua conta para acessar os bots{<br />}
                      3. Configure e inicie suas operações
                    </Typography>
                  </Box>
                </Box>
              ) : !selectedBot ? (
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Painel da Conta Deriv Compacto */}
                  <DerivAccountPanel 
                    isConnected={derivConnected}
                    onRefresh={() => {
                      checkDerivConnection(false);
                      loadAvailableBots();
                    }}
                    compact={true}
                  />

                  {/* Header de seleção de bot */}
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    pb: 1,
                    borderBottom: '1px solid rgba(0, 212, 170, 0.2)'
                  }}>
                    <SmartToy sx={{ color: '#00d4aa', fontSize: 20 }} />
                    <Typography variant="subtitle1" sx={{ color: '#ffffff', fontWeight: 500 }}>
                      Selecionar Bot
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', ml: 'auto' }}>
                      {Array.isArray(availableBots) ? availableBots.length : 0} disponíveis
                    </Typography>
                  </Box>

                  {/* Lista de bots */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: '300px', overflowY: 'auto' }}>
                    {(() => {
                      console.log('🔍 DEBUG availableBots:', { 
                        type: typeof availableBots, 
                        isArray: Array.isArray(availableBots), 
                        value: availableBots,
                        length: availableBots?.length 
                      });
                      
                      if (!Array.isArray(availableBots)) {
                        console.error('❌ ERRO: availableBots não é array!', availableBots);
                        return null;
                      }
                      
                      return availableBots.map((bot) => (
                      <Box
                        key={bot.id}
                        onClick={() => setSelectedBot(bot)}
                        sx={{
                          p: 2,
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          background: 'rgba(0, 0, 0, 0.2)',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          '&:hover': {
                            borderColor: 'rgba(0, 212, 170, 0.5)',
                            background: 'rgba(0, 212, 170, 0.05)',
                            transform: 'translateY(-1px)'
                          }
                        }}
                      >
                        <Typography variant="subtitle2" sx={{ color: '#ffffff', fontWeight: 500, mb: 0.5 }}>
                          {bot.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.3 }}>
                          {bot.description}
                        </Typography>
                      </Box>
                    ));
                    })()}
                  </Box>

                  {(!Array.isArray(availableBots) || availableBots.length === 0) && (
                    <Box sx={{ textAlign: 'center', p: 3, color: 'rgba(255, 255, 255, 0.5)' }}>
                      <SmartToy sx={{ fontSize: 32, mb: 1, opacity: 0.5 }} />
                      <Typography variant="body2">
                        Nenhum bot disponível
                      </Typography>
                    </Box>
                  )}
                </Box>
              ) : (
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Bot selecionado header */}
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    pb: 1,
                    borderBottom: '1px solid rgba(0, 212, 170, 0.2)'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SmartToy sx={{ color: '#00d4aa', fontSize: 20 }} />
                      <Typography variant="subtitle1" sx={{ color: '#ffffff', fontWeight: 500 }}>
                        {selectedBot.name}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      onClick={() => setSelectedBot(null)}
                      sx={{ color: 'rgba(255, 255, 255, 0.7)', minWidth: 'auto', p: 0.5 }}
                    >
                      Trocar
                    </Button>
                  </Box>

                  {/* Descrição */}
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.4 }}>
                    {selectedBot.description}
                  </Typography>

                  {/* Configurações do bot */}
                  <Box sx={{
                    p: 2,
                    border: '1px solid rgba(0, 212, 170, 0.2)',
                    borderRadius: '8px',
                    background: 'rgba(0, 212, 170, 0.05)'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ color: '#ffffff' }}>
                        Configurações
                      </Typography>
                      <Settings 
                        sx={{ color: '#00d4aa', fontSize: 18, cursor: 'pointer' }} 
                        onClick={() => setConfigModalOpen(true)}
                      />
                    </Box>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      Clique na engrenagem para configurar parâmetros de entrada
                    </Typography>
                  </Box>

                  {/* Controles de operação */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Button
                      variant="contained"
                      startIcon={operationRunning ? <CircularProgress size={16} /> : <PlayArrow />}
                      disabled={operationRunning || !derivConnected || !selectedBot}
                      onClick={handleStartOperation}
                      fullWidth
                      sx={{
                        background: (!derivConnected || !selectedBot) ? 'linear-gradient(135deg, #666 0%, #555 100%)' : 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                        '&:hover': {
                          background: (!derivConnected || !selectedBot) ? 'linear-gradient(135deg, #555 0%, #666 100%)' : 'linear-gradient(135deg, #388e3c 0%, #4caf50 100%)'
                        },
                        py: 1.5
                      }}
                    >
                      {operationRunning ? 'Operando...' : (!derivConnected ? 'Conecte sua conta Deriv' : !selectedBot ? 'Selecione um bot' : 'Iniciar Operação')}
                    </Button>

                    {operationRunning && (
                      <Button
                        variant="outlined"
                        startIcon={<Stop />}
                        onClick={handleStopOperation}
                        fullWidth
                        sx={{
                          borderColor: '#f44336',
                          color: '#f44336',
                          '&:hover': {
                            borderColor: '#f44336',
                            background: 'rgba(244, 67, 54, 0.1)'
                          }
                        }}
                      >
                        Parar Operação
                      </Button>
                    )}
                  </Box>
                </Box>
              )}
              
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Modal de Configuração do Bot */}
      <Dialog 
        open={configModalOpen} 
        onClose={() => setConfigModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(0, 212, 170, 0.2)'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Settings sx={{ color: '#00d4aa' }} />
            <Typography variant="h6">
              Configurações do Bot
            </Typography>
          </Box>
          <Button 
            onClick={() => setConfigModalOpen(false)}
            sx={{ minWidth: 'auto', p: 0.5 }}
          >
            <Close />
          </Button>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
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

        <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(0, 212, 170, 0.2)' }}>
          <Button 
            onClick={() => setConfigModalOpen(false)}
            variant="outlined"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSaveConfig}
            variant="contained"
            startIcon={<Settings />}
          >
            Salvar Configurações
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OperationsPage;