import { useState, useEffect, useCallback, useRef } from 'react';
import DerivWebSocketService, {
  DerivTickData,
  DerivAccountData,
  DerivTransaction,
  DerivProposal
} from '../services/DerivWebSocketService';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import api from '../services/api';

export interface OperationLog {
  id: string;
  timestamp: number;
  type: 'info' | 'success' | 'error' | 'trade';
  message: string;
  data?: any;
}

export interface TradingStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalProfit: number;
  winRate: number;
  currentStreak: number;
  maxStreak: number;
}

export interface BotStatus {
  isRunning: boolean;
  isPaused: boolean;
  currentBalance: number;
  initialBalance: number;
  profitLoss: number;
  lastTradeTime: number | null;
  operationId: string | null;
}

interface UseDerivOperationsReturn {
  // Connection status
  isConnected: boolean;
  isConnecting: boolean;

  // Account data
  accountData: DerivAccountData | null;
  tickData: DerivTickData[];
  currentPrice: number;

  // Bot operations
  botStatus: BotStatus;
  operationLogs: OperationLog[];
  tradingStats: TradingStats;

  // Actions
  connect: () => Promise<boolean>;
  disconnect: () => void;
  startBot: (botId: number, config: any) => Promise<boolean>;
  stopBot: () => Promise<boolean>;
  pauseBot: () => Promise<boolean>;
  resumeBot: () => Promise<boolean>;
  clearLogs: () => void;
  subscribeTicks: (symbol: string) => void;
  switchAccount: (accountId: string, token: string) => Promise<boolean>;

  // Utils
  formatCurrency: (amount: number, currency?: string) => string;
  formatProfit: (amount: number) => string;
}

const useDerivOperations = (): UseDerivOperationsReturn => {
  const { user, currentAccount } = useAuth();
  const derivWS = useRef(DerivWebSocketService.getInstance());

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Account data
  const [accountData, setAccountData] = useState<DerivAccountData | null>(null);
  const [tickData, setTickData] = useState<DerivTickData[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);

  // Bot operation state
  const [botStatus, setBotStatus] = useState<BotStatus>({
    isRunning: false,
    isPaused: false,
    currentBalance: 0,
    initialBalance: 0,
    profitLoss: 0,
    lastTradeTime: null,
    operationId: null
  });

  // Logs and stats
  const [operationLogs, setOperationLogs] = useState<OperationLog[]>([]);
  const [tradingStats, setTradingStats] = useState<TradingStats>({
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    totalProfit: 0,
    winRate: 0,
    currentStreak: 0,
    maxStreak: 0
  });

  // Subscriptions management
  const subscribersRef = useRef<Set<string>>(new Set());

  /**
   * Adiciona log de operação
   */
  const addLog = useCallback((type: OperationLog['type'], message: string, data?: any) => {
    const newLog: OperationLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type,
      message,
      data
    };

    setOperationLogs(prev => [newLog, ...prev].slice(0, 100)); // Manter apenas 100 logs
  }, []);

  /**
   * Conecta ao WebSocket da Deriv - CORRIGIDO
   */
  const connect = useCallback(async (): Promise<boolean> => {
    if (isConnected) {
      console.log('✅ Já conectado ao WebSocket');
      return true;
    }

    if (isConnecting) {
      console.log('⏳ Já está conectando...');
      return false;
    }

    try {
      setIsConnecting(true);
      addLog('info', 'Conectando ao WebSocket da Deriv...');

      const connected = await derivWS.current.connect();

      if (!connected) {
        addLog('error', 'Falha ao conectar ao WebSocket da Deriv');
        setIsConnecting(false);
        return false;
      }

      setIsConnected(true);
      addLog('success', 'Conectado ao WebSocket da Deriv com sucesso');

      // CORREÇÃO CRÍTICA: Autorizar se tiver token
      if (user?.deriv_connected && currentAccount) {
        try {
          addLog('info', 'Obtendo token de autorização...');

          const response = await api.get('/api/auth/deriv/get-token');
          console.log('🔍 Token response:', {
            success: response.data.success,
            hasToken: !!response.data.token,
            accountId: response.data.account_id
          });

          if (!response.data.success || !response.data.token) {
            throw new Error('Token não disponível ou inválido');
          }

          addLog('info', 'Token obtido, autorizando WebSocket...');
          const authorized = await derivWS.current.authorize(response.data.token);

          if (!authorized) {
            throw new Error('Falha na autorização do WebSocket');
          }

          addLog('success', `Autorizado na conta: ${currentAccount.loginid}`);

          // Subscrever para atualizações de saldo
          derivWS.current.subscribeBalance('main', (data) => {
            console.log('📊 Atualização de saldo recebida:', data);
            setAccountData(data);
            setBotStatus(prev => ({
              ...prev,
              currentBalance: data.balance
            }));
            addLog('info', `Saldo atualizado: ${data.balance} ${data.currency}`);
          });

          // Subscrever para transações
          derivWS.current.subscribeTransactions('main', (data) => {
            addLog('trade', `Transação: ${data.transaction_type} - ${data.amount} USD`, data);
            setTradingStats(prev => ({
              ...prev,
              totalTrades: prev.totalTrades + 1
            }));
          });

          // CORREÇÃO CRÍTICA: Obter saldo inicial com retry mais robusto
          addLog('info', 'Obtendo saldo inicial...');
          let retryCount = 0;
          const maxRetries = 5;

          const getInitialBalance = async (): Promise<boolean> => {
            try {
              const balance = await derivWS.current.getBalance();

              if (!balance) {
                throw new Error('Resposta de saldo vazia');
              }

              console.log('✅ Saldo inicial obtido:', balance);
              setAccountData(balance);
              setBotStatus(prev => ({
                ...prev,
                currentBalance: balance.balance,
                initialBalance: prev.initialBalance || balance.balance
              }));
              addLog('success', `💰 Saldo carregado: ${balance.balance} ${balance.currency}`);
              toast.success(`Conta conectada! Saldo: ${balance.balance} ${balance.currency}`);
              return true;

            } catch (balanceError: any) {
              retryCount++;
              console.error(`❌ Tentativa ${retryCount}/${maxRetries} falhou:`, balanceError);

              if (retryCount < maxRetries) {
                const delay = 1000 * retryCount; // Backoff progressivo
                addLog('info', `Tentando obter saldo novamente em ${delay/1000}s (${retryCount}/${maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return getInitialBalance();
              } else {
                addLog('error', 'Falha ao obter saldo após todas as tentativas');
                toast.error('Não foi possível obter o saldo. Tente reconectar.');
                return false;
              }
            }
          };

          await getInitialBalance();

        } catch (authError: any) {
          console.error('❌ Erro crítico na autorização:', authError);
          const errorMessage = authError.response?.data?.error || authError.message || 'Erro na autorização';
          addLog('error', `Erro ao autorizar conta Deriv: ${errorMessage}`);
          toast.error(`Erro na autorização: ${errorMessage}`);
          setIsConnecting(false);
          return false;
        }
      }

      setIsConnecting(false);
      return true;

    } catch (error: any) {
      console.error('❌ Erro ao conectar:', error);
      addLog('error', `Erro de conexão: ${error.message}`);
      toast.error(`Erro de conexão: ${error.message}`);
      setIsConnecting(false);
      return false;
    }
  }, [isConnected, isConnecting, user, currentAccount, addLog]);

  /**
   * Desconecta do WebSocket
   */
  const disconnect = useCallback(() => {
    derivWS.current.disconnect();
    setIsConnected(false);
    setAccountData(null);
    setTickData([]);
    setCurrentPrice(0);

    // Limpar subscribers
    subscribersRef.current.forEach(id => {
      derivWS.current.unsubscribe(id);
    });
    subscribersRef.current.clear();

    addLog('info', 'Desconectado do WebSocket da Deriv');
  }, [addLog]);

  /**
   * Subscreve para ticks de um símbolo
   */
  const subscribeTicks = useCallback((symbol: string) => {
    if (!isConnected) {
      addLog('error', 'WebSocket não conectado para subscrição de ticks');
      return;
    }

    const subscriberId = `ticks_${symbol}`;

    // Limpar subscrição anterior se existir
    if (subscribersRef.current.has(subscriberId)) {
      derivWS.current.unsubscribe(subscriberId);
    }

    derivWS.current.subscribeTicks(symbol, subscriberId, (data) => {
      setCurrentPrice(data.price);
      setTickData(prev => {
        const newData = [...prev, data].slice(-50); // Manter apenas 50 ticks
        return newData;
      });
    });

    subscribersRef.current.add(subscriberId);
    addLog('info', `Subscrito aos ticks de ${symbol}`);
  }, [isConnected, addLog]);

  /**
   * Inicia operação do bot
   */
  const startBot = useCallback(async (botId: number, config: any): Promise<boolean> => {
    if (!isConnected || !accountData) {
      addLog('error', 'WebSocket não conectado ou conta não autorizada');
      toast.error('Conecte-se à Deriv antes de iniciar operações');
      return false;
    }

    if (botStatus.isRunning) {
      addLog('error', 'Bot já está em execução');
      toast.error('Bot já está em execução');
      return false;
    }

    try {
      addLog('info', `Iniciando bot ID: ${botId}...`);

      // Chamar API para iniciar operação
      const response = await api.post('/api/operations/start', {
        botId,
        config
      });

      if (response.data.success) {
        setBotStatus(prev => ({
          ...prev,
          isRunning: true,
          isPaused: false,
          operationId: response.data.operation.id,
          initialBalance: accountData.balance
        }));

        addLog('success', 'Bot iniciado com sucesso', response.data.operation);
        toast.success('Bot iniciado com sucesso!');
        return true;
      } else {
        throw new Error(response.data.error || 'Erro desconhecido');
      }
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || 'Erro ao iniciar bot';
      addLog('error', `Erro ao iniciar bot: ${message}`);
      toast.error(message);
      return false;
    }
  }, [isConnected, accountData, botStatus.isRunning, addLog]);

  /**
   * Para operação do bot
   */
  const stopBot = useCallback(async (): Promise<boolean> => {
    if (!botStatus.isRunning) {
      addLog('error', 'Nenhum bot em execução');
      return false;
    }

    try {
      addLog('info', 'Parando bot...');

      const response = await api.post('/api/operations/stop');

      if (response.data.success) {
        setBotStatus(prev => ({
          ...prev,
          isRunning: false,
          isPaused: false,
          operationId: null
        }));

        addLog('success', 'Bot parado com sucesso');
        toast.success('Bot parado com sucesso!');
        return true;
      } else {
        throw new Error(response.data.error || 'Erro desconhecido');
      }
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || 'Erro ao parar bot';
      addLog('error', `Erro ao parar bot: ${message}`);
      toast.error(message);
      return false;
    }
  }, [botStatus.isRunning, addLog]);

  /**
   * Pausa operação do bot
   */
  const pauseBot = useCallback(async (): Promise<boolean> => {
    if (!botStatus.isRunning || botStatus.isPaused) {
      addLog('error', 'Bot não está em execução ou já está pausado');
      return false;
    }

    try {
      addLog('info', 'Pausando bot...');

      setBotStatus(prev => ({
        ...prev,
        isPaused: true
      }));

      addLog('success', 'Bot pausado');
      toast.success('Bot pausado');
      return true;
    } catch (error: any) {
      addLog('error', `Erro ao pausar bot: ${error.message}`);
      return false;
    }
  }, [botStatus.isRunning, botStatus.isPaused, addLog]);

  /**
   * Retoma operação do bot
   */
  const resumeBot = useCallback(async (): Promise<boolean> => {
    if (!botStatus.isRunning || !botStatus.isPaused) {
      addLog('error', 'Bot não está pausado');
      return false;
    }

    try {
      addLog('info', 'Retomando bot...');

      setBotStatus(prev => ({
        ...prev,
        isPaused: false
      }));

      addLog('success', 'Bot retomado');
      toast.success('Bot retomado');
      return true;
    } catch (error: any) {
      addLog('error', `Erro ao retomar bot: ${error.message}`);
      return false;
    }
  }, [botStatus.isRunning, botStatus.isPaused, addLog]);

  /**
   * Limpa logs de operação
   */
  const clearLogs = useCallback(() => {
    setOperationLogs([]);
    addLog('info', 'Logs limpos');
  }, [addLog]);

  /**
   * Troca conta da Deriv com atualização completa do WebSocket
   * FIXED: Now uses the improved WebSocket switchAccount method that calls /get-token
   */
  const switchAccount = useCallback(async (newAccountId: string): Promise<boolean> => {
    if (!isConnected) {
      addLog('error', 'WebSocket não conectado para troca de conta');
      return false;
    }

    try {
      addLog('info', `Trocando para conta: ${newAccountId}`);

      // Use the improved WebSocket switchAccount method that handles /get-token internally
      const success = await derivWS.current.switchAccount(newAccountId);
      if (!success) {
        throw new Error('Falha na troca de conta no WebSocket');
      }

      // Get the updated account data
      const refreshedData = await derivWS.current.getBalance();
      if (!refreshedData) {
        throw new Error('Falha ao obter dados da nova conta após troca');
      }

      // Update local state
      setAccountData(refreshedData);
      setBotStatus(prev => ({
        ...prev,
        currentBalance: refreshedData.balance,
        initialBalance: refreshedData.balance // Reset initial balance for new account
      }));

      addLog('success', `Conta trocada com sucesso: ${newAccountId} - ${refreshedData.balance} ${refreshedData.currency}`);
      return true;

    } catch (error: any) {
      const message = error.message || 'Erro na troca de conta';
      addLog('error', `Erro ao trocar conta: ${message}`);
      return false;
    }
  }, [isConnected, addLog]);

  /**
   * Formata valor monetário
   */
  const formatCurrency = useCallback((amount: number, currency: string = 'USD'): string => {
    return `$ ${amount.toFixed(2)} ${currency}`;
  }, []);

  /**
   * Formata lucro/prejuízo
   */
  const formatProfit = useCallback((amount: number): string => {
    const sign = amount >= 0 ? '+' : '';
    const color = amount >= 0 ? '🟢' : '🔴';
    return `${color} ${sign}$ ${amount.toFixed(2)}`;
  }, []);

  // Calcular profit/loss quando o saldo muda
  useEffect(() => {
    if (accountData && botStatus.initialBalance > 0) {
      const profitLoss = accountData.balance - botStatus.initialBalance;
      setBotStatus(prev => ({
        ...prev,
        profitLoss
      }));
    }
  }, [accountData, botStatus.initialBalance]);

  // Setup event handlers no WebSocket
  useEffect(() => {
    const ws = derivWS.current;

    const handleConnection = (connected: boolean) => {
      setIsConnected(connected);
      if (!connected) {
        addLog('error', 'Conexão WebSocket perdida');
      }
    };

    const handleError = (error: any) => {
      addLog('error', `Erro WebSocket: ${error.message || 'Erro desconhecido'}`);
    };

    // Note: These would need to be implemented in the WebSocket service
    // ws.on('connection', handleConnection);
    // ws.on('error', handleError);

    return () => {
      // Cleanup if needed
    };
  }, [addLog]);

  // Simplificado: Reconectar quando a conta muda no AuthContext
  useEffect(() => {
    const reconnectForAccountChange = async () => {
      if (isConnected && currentAccount && user?.deriv_connected) {
        console.log('🔄 useDerivOperations: Conta mudou, reautorizando...', currentAccount.loginid);
        addLog('info', `Trocando para conta: ${currentAccount.loginid}`);

        try {
          // Usar WebSocket switchAccount que busca token via /get-token
          const success = await derivWS.current.switchAccount(currentAccount.loginid);

          if (success) {
            console.log('✅ useDerivOperations: WebSocket account switch successful');
            addLog('success', `Reautorizado na conta: ${currentAccount.loginid}`);

            // Buscar saldo atualizado
            const refreshedBalance = await derivWS.current.getBalance();
            if (refreshedBalance) {
              console.log('✅ useDerivOperations: Balance updated:', {
                loginid: refreshedBalance.loginid,
                balance: refreshedBalance.balance,
                currency: refreshedBalance.currency
              });

              setAccountData(refreshedBalance);
              setBotStatus(prev => ({
                ...prev,
                currentBalance: refreshedBalance.balance,
                initialBalance: prev.initialBalance || refreshedBalance.balance
              }));
              addLog('success', `Saldo atualizado: ${refreshedBalance.balance} ${refreshedBalance.currency}`);
            }
          } else {
            addLog('error', 'Falha na troca de conta via WebSocket');
          }
        } catch (error: any) {
          console.error('❌ useDerivOperations: Erro na troca de conta:', error);
          addLog('error', `Erro ao trocar conta: ${error.message}`);
        }
      }
    };

    reconnectForAccountChange();
  }, [currentAccount?.loginid, isConnected, user?.deriv_connected, addLog]);

  // Auto-conectar quando há dados de conta - CORRIGIDO
  useEffect(() => {
    const shouldAutoConnect = user?.deriv_connected && currentAccount && !isConnected && !isConnecting;

    console.log('🔍 useDerivOperations: Auto-connect check:', {
      'user?.deriv_connected': user?.deriv_connected,
      'currentAccount': currentAccount?.loginid || null,
      'isConnected': isConnected,
      'isConnecting': isConnecting,
      'shouldAutoConnect': shouldAutoConnect
    });

    if (shouldAutoConnect) {
      console.log('🔄 useDerivOperations: Iniciando auto-conexão...');

      // Adicionar delay para garantir que o estado do AuthContext está estável
      const timer = setTimeout(() => {
        connect().then(success => {
          console.log(success ? '✅ useDerivOperations: Auto-conexão bem-sucedida' : '❌ useDerivOperations: Auto-conexão falhou');

          if (!success) {
            // Retry uma vez se falhar
            console.log('🔄 useDerivOperations: Tentando reconectar...');
            setTimeout(() => {
              connect().catch(err => console.error('❌ Retry failed:', err));
            }, 2000);
          }
        }).catch(err => {
          console.error('❌ useDerivOperations: Erro na auto-conexão:', err);
        });
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [user?.deriv_connected, currentAccount, isConnected, isConnecting]);


  return {
    // Connection status
    isConnected,
    isConnecting,

    // Account data
    accountData,
    tickData,
    currentPrice,

    // Bot operations
    botStatus,
    operationLogs,
    tradingStats,

    // Actions
    connect,
    disconnect,
    startBot,
    stopBot,
    pauseBot,
    resumeBot,
    clearLogs,
    subscribeTicks,
    switchAccount,

    // Utils
    formatCurrency,
    formatProfit
  };
};

export default useDerivOperations;