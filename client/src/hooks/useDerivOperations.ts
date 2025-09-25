import { useState, useEffect, useCallback, useRef } from 'react';
import DerivWebSocketService, {
  DerivTickData,
  DerivAccountData,
  DerivTransaction,
  DerivProposal
} from '../services/DerivWebSocketService';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';

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
   * Conecta ao WebSocket da Deriv
   */
  const connect = useCallback(async (): Promise<boolean> => {
    if (isConnected || isConnecting) {
      return isConnected;
    }

    try {
      setIsConnecting(true);
      addLog('info', 'Conectando ao WebSocket da Deriv...');

      const connected = await derivWS.current.connect();

      if (connected) {
        setIsConnected(true);
        addLog('success', 'Conectado ao WebSocket da Deriv com sucesso');

        // Autorizar se tiver token
        if (user?.deriv_connected && currentAccount) {
          try {
            const response = await axios.get('/api/auth/deriv/get-token');
            if (response.data.success && response.data.token) {
              const authorized = await derivWS.current.authorize(response.data.token);
              if (authorized) {
                addLog('success', `Autorizado na conta: ${currentAccount.loginid}`);

                // Subscrever para atualizações de saldo
                derivWS.current.subscribeBalance('main', (data) => {
                  setAccountData(data);
                  setBotStatus(prev => ({
                    ...prev,
                    currentBalance: data.balance
                  }));
                });

                // Subscrever para transações
                derivWS.current.subscribeTransactions('main', (data) => {
                  addLog('trade', `Transação: ${data.transaction_type} - ${data.amount} ${accountData?.currency || 'USD'}`, data);

                  setTradingStats(prev => ({
                    ...prev,
                    totalTrades: prev.totalTrades + 1
                  }));
                });

                // Obter saldo inicial
                const balance = await derivWS.current.getBalance();
                if (balance) {
                  setAccountData(balance);
                  setBotStatus(prev => ({
                    ...prev,
                    currentBalance: balance.balance,
                    initialBalance: prev.initialBalance || balance.balance
                  }));
                }
              }
            }
          } catch (authError) {
            console.error('Erro na autorização:', authError);
            addLog('error', 'Erro ao autorizar conta Deriv');
          }
        }

        return true;
      } else {
        addLog('error', 'Falha ao conectar ao WebSocket da Deriv');
        return false;
      }
    } catch (error: any) {
      console.error('Erro ao conectar:', error);
      addLog('error', `Erro de conexão: ${error.message}`);
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [isConnected, isConnecting, user, currentAccount, addLog, accountData?.currency]);

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
      const response = await axios.post('/api/operations/start', {
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

      const response = await axios.post('/api/operations/stop');

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

  // Listen for account switch events from AuthContext
  useEffect(() => {
    const handleAccountSwitch = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { accountId, useOfficialPattern } = customEvent.detail;
      console.log('🎯 useDerivOperations: Received account switch event:', {
        accountId,
        useOfficialPattern
      });

      if (accountId) {
        if (useOfficialPattern) {
          // Use the new official Deriv pattern with CRITICAL DEBUGGING
          console.log('🔍 CRITICAL DEBUG: Starting official account switch...', {
            fromAccount: accountData?.loginid || 'N/A',
            toAccount: accountId,
            currentBalance: accountData?.balance || 'N/A'
          });

          derivWS.current.switchAccount(accountId).then(success => {
            console.log('✅ DERIV PATTERN: WebSocket account switch result:', success);

            if (success) {
              // CRITICAL: Add delay and extensive validation
              console.log('🔍 CRITICAL DEBUG: Account switch successful, waiting before balance check...');

              setTimeout(() => {
                console.log('🔍 CRITICAL DEBUG: Getting balance after critical delay...');
                derivWS.current.getBalance().then(balance => {
                  console.log('🔍 CRITICAL DEBUG: Balance received:', {
                    loginid: balance?.loginid,
                    balance: balance?.balance,
                    currency: balance?.currency,
                    expected_account: accountId,
                    account_match: balance?.loginid === accountId,
                    balance_different: balance?.balance !== accountData?.balance,
                    old_balance: accountData?.balance
                  });

                  if (!balance) {
                    console.error('❌ CRITICAL: No balance returned after delay!');
                    addLog('error', 'CRITICAL: No balance returned after account switch!');
                    return;
                  }

                  if (balance.loginid !== accountId) {
                    console.error('❌ CRITICAL: ACCOUNT MISMATCH!', {
                      expected: accountId,
                      received: balance.loginid,
                      message: 'WebSocket returning balance from wrong account!'
                    });

                    addLog('error', `CRITICAL: Account mismatch! Expected ${accountId}, got ${balance.loginid}`);

                    // Try one more time with longer delay
                    setTimeout(() => {
                      console.log('🔄 CRITICAL DEBUG: Final retry after extended delay...');
                      derivWS.current.getBalance().then(retryBalance => {
                        console.log('🔍 CRITICAL DEBUG: Final retry result:', retryBalance);
                        if (retryBalance && retryBalance.loginid === accountId) {
                          console.log('✅ CRITICAL: Balance correct after final retry!');
                          setAccountData(retryBalance);
                          setBotStatus(prev => ({
                            ...prev,
                            currentBalance: retryBalance.balance,
                            initialBalance: retryBalance.balance
                          }));
                          addLog('success', `✅ FIXED: Account switch successful after retry - ${retryBalance.balance} ${retryBalance.currency}`);
                        } else {
                          console.error('❌ CRITICAL: Balance STILL wrong after final retry!');
                          addLog('error', 'CRITICAL: Balance remains incorrect even after retry!');
                        }
                      });
                    }, 5000); // Extended delay
                  } else {
                    console.log('✅ CRITICAL: Balance account matches - SUCCESS!');
                    setAccountData(balance);
                    setBotStatus(prev => ({
                      ...prev,
                      currentBalance: balance.balance,
                      initialBalance: balance.balance
                    }));
                    addLog('success', `✅ Account switched successfully to ${accountId} - ${balance.balance} ${balance.currency}`);
                  }
                });
              }, 3000); // Critical delay increased
            } else {
              console.error('❌ CRITICAL: Account switch failed at WebSocket level!');
              addLog('error', 'CRITICAL: WebSocket account switch failed!');
            }
          });
        } else {
          // Legacy pattern - updated to not require token parameter
          switchAccount(accountId).then(success => {
            console.log('🔄 useDerivOperations: Legacy WebSocket account switch result:', success);
          });
        }
      }
    };

    window.addEventListener('deriv-account-switched', handleAccountSwitch);

    return () => {
      window.removeEventListener('deriv-account-switched', handleAccountSwitch);
    };
  }, [isConnected, switchAccount]);

  // Auto-conectar quando há dados de conta ou após refresh da página
  useEffect(() => {
    const shouldAutoConnect = user?.deriv_connected && currentAccount && !isConnected && !isConnecting;
    const shouldReconnectAfterRefresh = derivWS.current.shouldAutoReconnect() && !isConnected && !isConnecting;

    console.log('🔍 useDerivOperations: Auto-connect check:', {
      'user?.deriv_connected': user?.deriv_connected,
      'currentAccount': currentAccount?.loginid || null,
      'isConnected': isConnected,
      'isConnecting': isConnecting,
      'shouldAutoConnect': shouldAutoConnect,
      'shouldReconnectAfterRefresh': shouldReconnectAfterRefresh
    });

    if (shouldAutoConnect || shouldReconnectAfterRefresh) {
      console.log('🔄 useDerivOperations: Iniciando auto-conexão...', {
        reason: shouldAutoConnect ? 'dados-conta' : 'refresh-page'
      });
      connect().then(success => {
        console.log(success ? '✅ useDerivOperations: Auto-conexão bem-sucedida' : '❌ useDerivOperations: Auto-conexão falhou');
      });
    }
  }, [user?.deriv_connected, currentAccount, isConnected, isConnecting, connect]);

  // Reconectar e reautorizar quando a conta muda
  useEffect(() => {
    const reconnectForAccountChange = async () => {
      if (isConnected && currentAccount && user?.deriv_connected) {
        console.log('🔄 useDerivOperations: Conta mudou, reautorizando...', currentAccount.loginid);
        addLog('info', `Trocando para conta: ${currentAccount.loginid}`);

        try {
          // Use the improved WebSocket switchAccount method for account change
          console.log('🔄 useDerivOperations: Using WebSocket switchAccount for currentAccount change...');
          const success = await derivWS.current.switchAccount(currentAccount.loginid);

          if (success) {
            console.log('✅ useDerivOperations: WebSocket account switch successful for currentAccount change');
            addLog('success', `Reautorizado na conta: ${currentAccount.loginid}`);

            // Get updated balance after switch
            const refreshedBalance = await derivWS.current.getBalance();
            if (refreshedBalance) {
              console.log('✅ useDerivOperations: Balance successfully updated for new account:', {
                loginid: refreshedBalance.loginid,
                balance: refreshedBalance.balance,
                currency: refreshedBalance.currency,
                is_virtual: refreshedBalance.is_virtual
              });

              // Update account data state immediately
              setAccountData(refreshedBalance);
              addLog('success', `Saldo atualizado: ${refreshedBalance.balance} ${refreshedBalance.currency}`);
              setBotStatus(prev => ({
                ...prev,
                currentBalance: refreshedBalance.balance,
                initialBalance: prev.initialBalance || refreshedBalance.balance
              }));
            } else {
              addLog('error', 'Falha ao obter saldo da nova conta');
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