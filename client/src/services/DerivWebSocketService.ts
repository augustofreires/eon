/**
 * Serviço WebSocket para conexão em tempo real com a API da Deriv
 * Implementa padrão singleton para gerenciar uma única conexão WebSocket
 * Suporta múltiplas subscrições e reconexão automática
 */

export interface DerivTickData {
  symbol: string;
  price: number;
  timestamp: number;
  time: string;
  pip_size: number;
}

export interface DerivAccountData {
  balance: number;
  currency: string;
  loginid: string;
  is_virtual: boolean;
}

export interface DerivTransaction {
  contract_id: number;
  transaction_type: string;
  amount: number;
  balance_after: number;
  timestamp: number;
}

export interface DerivProposal {
  id: string;
  symbol: string;
  contract_type: string;
  payout: number;
  ask_price: number;
  spot: number;
}

export interface DerivContractUpdate {
  contract_id: number;
  status: 'open' | 'won' | 'lost';
  profit?: number;
  payout?: number;
}

interface WebSocketEventHandlers {
  onTick?: (data: DerivTickData) => void;
  onBalance?: (data: DerivAccountData) => void;
  onTransaction?: (data: DerivTransaction) => void;
  onProposal?: (data: DerivProposal) => void;
  onContract?: (data: DerivContractUpdate) => void;
  onConnection?: (connected: boolean) => void;
  onError?: (error: any) => void;
}

class DerivWebSocketService {
  private static instance: DerivWebSocketService;
  private ws: WebSocket | null = null;
  private appId: string = '82349'; // App ID da EON
  private isConnected: boolean = false;
  private isConnecting: boolean = false;
  private subscribers: Map<string, WebSocketEventHandlers> = new Map();
  private activeSubscriptions: Set<string> = new Set();
  private subscriptionPromises: Map<string, Promise<any>> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 3000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private authToken: string | null = null;
  private currentAccount: string | null = null;
  private connectionState: {
    wasConnected: boolean;
    lastConnectedTime: number;
    shouldAutoReconnect: boolean;
  } = {
    wasConnected: false,
    lastConnectedTime: 0,
    shouldAutoReconnect: true
  };

  private constructor() {}

  public static getInstance(): DerivWebSocketService {
    if (!DerivWebSocketService.instance) {
      DerivWebSocketService.instance = new DerivWebSocketService();
    }
    return DerivWebSocketService.instance;
  }

  /**
   * Conecta ao WebSocket da Deriv
   */
  public async connect(): Promise<boolean> {
    if (this.isConnected) {
      console.log('✅ WebSocket já conectado');
      return true;
    }

    if (this.isConnecting) {
      console.log('⏳ WebSocket já está conectando...');
      return false;
    }

    return new Promise((resolve, reject) => {
      try {
        this.isConnecting = true;
        console.log('🌐 Conectando ao WebSocket da Deriv...');

        this.ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${this.appId}`);

        this.ws.onopen = () => {
          console.log('✅ WebSocket conectado com sucesso');
          this.isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.connectionState.wasConnected = true;
          this.connectionState.lastConnectedTime = Date.now();
          this.saveConnectionState();
          this.startHeartbeat();
          this.notifySubscribers('onConnection', true);
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = (event) => {
          console.log('🔌 WebSocket desconectado:', event.code, event.reason);
          this.handleDisconnection();

          if (event.code !== 1000) { // Não foi fechamento intencional
            this.attemptReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ Erro no WebSocket:', error);
          this.isConnecting = false;
          this.notifySubscribers('onError', error);
          reject(error);
        };

        // Timeout para conexão
        setTimeout(() => {
          if (!this.isConnected) {
            this.isConnecting = false;
            reject(new Error('Timeout na conexão WebSocket'));
          }
        }, 10000);

      } catch (error) {
        this.isConnecting = false;
        console.error('❌ Erro ao conectar WebSocket:', error);
        reject(error);
      }
    });
  }

  /**
   * Desconecta do WebSocket
   */
  public disconnect(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Desconexão intencional');
      this.ws = null;
    }

    this.handleDisconnection();
  }

  /**
   * OFFICIAL DERIV PATTERN: Force WebSocket reconnection for account switch
   */
  public async forceReconnection(): Promise<boolean> {
    console.log('🔄 DERIV PATTERN: Forcing WebSocket reconnection...');

    // Disconnect current connection
    if (this.ws) {
      this.ws.close(1000, 'Account switch reconnection');
    }

    // Reset all state
    this.handleDisconnection();

    // Wait a brief moment for cleanup
    await new Promise(resolve => setTimeout(resolve, 100));

    // Reconnect
    return await this.connect();
  }

  /**
   * Autoriza com token da Deriv
   */
  public async authorize(token: string, cleanSubscriptions: boolean = false): Promise<boolean> {
    if (!this.isConnected || !this.ws) {
      console.error('❌ WebSocket não conectado para autorização');
      return false;
    }

    // OFFICIAL DERIV PATTERN: Forget all existing subscriptions if switching accounts
    if (cleanSubscriptions) {
      console.log('🧹 DERIV PATTERN: Forgetting existing subscriptions for account switch...');
      await this.forgetAllSubscriptions();
    }

    return new Promise((resolve) => {
      const request = {
        authorize: token,
        req_id: this.generateRequestId('auth')
      };

      const handler = (data: any) => {
        if (data.req_id === request.req_id) {
          console.log('🔍 CRITICAL DEBUG: Authorization response received:', {
            hasError: !!data.error,
            hasAuthorize: !!data.authorize,
            rawResponse: data
          });

          if (data.error) {
            console.error('❌ CRITICAL: Authorization error:', data.error);
            resolve(false);
          } else if (data.authorize) {
            console.log('🔍 CRITICAL DEBUG: Authorization successful!', {
              loginid: data.authorize.loginid,
              oldToken: this.authToken?.substring(0, 10) + '...',
              newToken: token?.substring(0, 10) + '...',
              oldAccount: this.currentAccount,
              newAccount: data.authorize.loginid,
              tokenChanged: this.authToken !== token
            });

            // CRITICAL: Update token and account
            const oldToken = this.authToken;
            const oldAccount = this.currentAccount;

            this.authToken = token;
            this.currentAccount = data.authorize.loginid;

            console.log('✅ CRITICAL DEBUG: Token and account updated!', {
              from: oldAccount,
              to: this.currentAccount,
              tokenUpdate: oldToken !== this.authToken ? 'CHANGED' : 'SAME',
              newTokenSubstring: this.authToken?.substring(0, 10) + '...'
            });

            // OFFICIAL DERIV PATTERN: Subscribe to balance updates with 'account: all'
            this.subscribeToBalanceUpdatesOfficial();

            resolve(true);
          } else {
            console.error('❌ CRITICAL: Authorization response has no authorize data!', data);
            resolve(false);
          }
        }
      };

      this.subscribers.set('auth_temp', { onConnection: handler });
      this.send(request);

      // Timeout para autorização
      setTimeout(() => {
        this.subscribers.delete('auth_temp');
        resolve(false);
      }, 10000);
    });
  }

  /**
   * Subscreve para dados de tick de um símbolo
   */
  public subscribeTicks(symbol: string, subscriberId: string, onTick: (data: DerivTickData) => void): void {
    if (!this.isConnected || !this.ws) {
      console.error('❌ WebSocket não conectado para subscrição de ticks');
      return;
    }

    // Registrar subscriber
    this.subscribers.set(subscriberId, { onTick });

    // Se já está subscrito a este símbolo, não enviar novamente
    if (this.activeSubscriptions.has(`ticks_${symbol}`)) {
      console.log(`ℹ️ Já subscrito aos ticks de ${symbol}`);
      return;
    }

    const request = {
      ticks: symbol,
      subscribe: 1,
      req_id: this.generateRequestId(`ticks_${symbol}`)
    };

    this.send(request);
    this.activeSubscriptions.add(`ticks_${symbol}`);
    console.log(`📡 Subscrito aos ticks de ${symbol}`);
  }

  /**
   * Subscreve para atualizações de saldo
   */
  public subscribeBalance(subscriberId: string, onBalance: (data: DerivAccountData) => void): void {
    if (!this.isConnected || !this.ws || !this.authToken) {
      console.error('❌ WebSocket não conectado ou não autorizado para subscrição de saldo');
      return;
    }

    // Registrar subscriber
    this.subscribers.set(subscriberId, { onBalance });

    const request = {
      balance: 1,
      subscribe: 1,
      req_id: this.generateRequestId('balance')
    };

    this.send(request);
    console.log('💰 Subscrito às atualizações de saldo');
  }

  /**
   * Subscreve para transações
   */
  public subscribeTransactions(subscriberId: string, onTransaction: (data: DerivTransaction) => void): void {
    if (!this.isConnected || !this.ws || !this.authToken) {
      console.error('❌ WebSocket não conectado ou não autorizado para subscrição de transações');
      return;
    }

    this.subscribers.set(subscriberId, { onTransaction });

    const request = {
      transaction: 1,
      subscribe: 1,
      req_id: this.generateRequestId('transaction')
    };

    this.send(request);
    console.log('💳 Subscrito às transações');
  }

  /**
   * Obtém saldo atual da conta
   */
  public async getBalance(): Promise<DerivAccountData | null> {
    console.log('🔍 CRITICAL DEBUG: getBalance() called with token:', {
      connected: this.isConnected,
      hasWs: !!this.ws,
      hasToken: !!this.authToken,
      tokenSubstring: this.authToken ? this.authToken.substring(0, 10) + '...' : 'null'
    });

    if (!this.isConnected || !this.ws || !this.authToken) {
      console.error('❌ CRITICAL: WebSocket not ready for getBalance!', {
        connected: this.isConnected,
        hasWs: !!this.ws,
        hasToken: !!this.authToken
      });
      return null;
    }

    return new Promise((resolve) => {
      const requestId = this.generateRequestId('balance_once');
      const request = {
        balance: 1,
        req_id: requestId
      };

      console.log('🔍 CRITICAL DEBUG: Sending balance request...', {
        requestId,
        request,
        currentToken: this.authToken?.substring(0, 10) + '...'
      });

      const handler = (data: any) => {
        if (data.req_id === requestId) {
          console.log('🔍 CRITICAL DEBUG: Balance response received:', {
            reqId: data.req_id,
            hasError: !!data.error,
            hasBalance: !!data.balance,
            rawResponse: data
          });

          if (data.error) {
            console.error('❌ CRITICAL: Balance request error:', data.error);
            resolve(null);
          } else if (data.balance) {
            const balanceData = {
              balance: data.balance.balance,
              currency: data.balance.currency,
              loginid: data.balance.loginid,
              is_virtual: data.balance.loginid?.startsWith('VRT') || false
            };

            console.log('🔍 CRITICAL DEBUG: Balance data parsed:', {
              loginid: balanceData.loginid,
              balance: balanceData.balance,
              currency: balanceData.currency,
              is_virtual: balanceData.is_virtual,
              currentAuthToken: this.authToken?.substring(0, 10) + '...'
            });

            resolve(balanceData);
          } else {
            console.error('❌ CRITICAL: Balance response has no balance data!', data);
            resolve(null);
          }
        }
      };

      this.subscribers.set('balance_temp', { onBalance: handler });
      this.send(request);

      setTimeout(() => {
        console.log('⏰ CRITICAL DEBUG: Balance request timeout after 10s');
        this.subscribers.delete('balance_temp');
        resolve(null);
      }, 10000);
    });
  }

  /**
   * Obtém lista de todas as contas disponíveis
   */
  public async getAccountList(): Promise<DerivAccountData[]> {
    if (!this.isConnected || !this.ws || !this.authToken) {
      console.error('❌ WebSocket não conectado ou não autorizado');
      return [];
    }

    return new Promise((resolve) => {
      const requestId = this.generateRequestId('account_list');
      const request = {
        account_list: 1,
        req_id: requestId
      };

      const handler = (data: any) => {
        if (data.req_id === requestId) {
          if (data.error) {
            console.error('❌ Erro ao obter lista de contas:', data.error);
            resolve([]);
          } else if (data.account_list) {
            const accounts = data.account_list.map((account: any) => ({
              balance: account.balance,
              currency: account.currency,
              loginid: account.loginid,
              is_virtual: account.loginid?.startsWith('VRT') || false
            }));
            console.log('📋 Lista de contas obtida:', accounts);
            resolve(accounts);
          }
        }
      };

      this.subscribers.set('account_list_temp', { onBalance: handler });
      this.send(request);

      setTimeout(() => {
        this.subscribers.delete('account_list_temp');
        resolve([]);
      }, 10000);
    });
  }

  /**
   * Obtém proposta para um contrato
   */
  public async getProposal(params: {
    amount: number;
    basis: 'stake' | 'payout';
    contract_type: 'CALL' | 'PUT';
    currency: string;
    duration: number;
    duration_unit: 't' | 's' | 'm' | 'h' | 'd';
    symbol: string;
  }): Promise<DerivProposal | null> {
    if (!this.isConnected || !this.ws) {
      console.error('❌ WebSocket não conectado');
      return null;
    }

    return new Promise((resolve) => {
      const requestId = this.generateRequestId('proposal');
      const request = {
        proposal: 1,
        ...params,
        req_id: requestId
      };

      const handler = (data: any) => {
        if (data.req_id === requestId) {
          if (data.error) {
            console.error('❌ Erro na proposta:', data.error);
            resolve(null);
          } else if (data.proposal) {
            resolve({
              id: data.proposal.id,
              symbol: params.symbol,
              contract_type: params.contract_type,
              payout: data.proposal.payout,
              ask_price: data.proposal.ask_price,
              spot: data.proposal.spot
            });
          }
        }
      };

      this.subscribers.set('proposal_temp', { onProposal: handler });
      this.send(request);

      setTimeout(() => {
        this.subscribers.delete('proposal_temp');
        resolve(null);
      }, 10000);
    });
  }

  /**
   * Compra um contrato
   */
  public async buyContract(proposalId: string, price: number): Promise<any> {
    if (!this.isConnected || !this.ws || !this.authToken) {
      console.error('❌ WebSocket não conectado ou não autorizado');
      return null;
    }

    return new Promise((resolve) => {
      const requestId = this.generateRequestId('buy');
      const request = {
        buy: proposalId,
        price: price,
        req_id: requestId
      };

      const handler = (data: any) => {
        if (data.req_id === requestId) {
          if (data.error) {
            console.error('❌ Erro na compra:', data.error);
            resolve({ error: data.error });
          } else if (data.buy) {
            console.log('✅ Contrato comprado com sucesso:', data.buy.contract_id);
            resolve({ success: true, buy: data.buy });
          }
        }
      };

      this.subscribers.set('buy_temp', { onContract: handler });
      this.send(request);

      setTimeout(() => {
        this.subscribers.delete('buy_temp');
        resolve({ error: { message: 'Timeout na compra' } });
      }, 15000);
    });
  }

  /**
   * Remove um subscriber
   */
  public unsubscribe(subscriberId: string): void {
    this.subscribers.delete(subscriberId);
  }

  /**
   * Verifica se está conectado
   */
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Obtém conta atual
   */
  public getCurrentAccount(): string | null {
    return this.currentAccount;
  }

  // Métodos privados

  private handleMessage(message: string): void {
    try {
      const data = JSON.parse(message);

      // Handle tick data
      if (data.tick) {
        const tickData: DerivTickData = {
          symbol: data.tick.symbol,
          price: data.tick.quote,
          timestamp: data.tick.epoch * 1000,
          time: new Date(data.tick.epoch * 1000).toLocaleTimeString('pt-BR'),
          pip_size: data.tick.pip_size || 4
        };
        this.notifySubscribers('onTick', tickData);
      }

      // Handle balance updates
      if (data.balance) {
        const balanceData: DerivAccountData = {
          balance: data.balance.balance,
          currency: data.balance.currency,
          loginid: data.balance.loginid,
          is_virtual: data.balance.loginid?.startsWith('VRT') || false
        };
        this.notifySubscribers('onBalance', balanceData);
      }

      // Handle transactions
      if (data.transaction) {
        const transactionData: DerivTransaction = {
          contract_id: data.transaction.contract_id,
          transaction_type: data.transaction.transaction_type,
          amount: data.transaction.amount,
          balance_after: data.transaction.balance_after,
          timestamp: data.transaction.transaction_time * 1000
        };
        this.notifySubscribers('onTransaction', transactionData);
      }

      // Handle proposal
      if (data.proposal) {
        this.notifySubscribers('onProposal', data);
      }

      // Handle buy response
      if (data.buy) {
        this.notifySubscribers('onContract', data);
      }

      // Handle authorization
      if (data.authorize) {
        this.notifySubscribers('onConnection', data);
      }

      // Handle errors
      if (data.error) {
        console.error('❌ Erro WebSocket:', data.error);
        this.notifySubscribers('onError', data.error);
      }

    } catch (error) {
      console.error('❌ Erro ao processar mensagem WebSocket:', error);
    }
  }

  private notifySubscribers(event: keyof WebSocketEventHandlers, data: any): void {
    this.subscribers.forEach((handlers) => {
      if (handlers[event]) {
        try {
          handlers[event]!(data);
        } catch (error) {
          console.error('❌ Erro no handler do subscriber:', error);
        }
      }
    });
  }

  private handleDisconnection(): void {
    this.isConnected = false;
    this.isConnecting = false;
    this.activeSubscriptions.clear();
    this.authToken = null;
    this.currentAccount = null;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.saveConnectionState();
    this.notifySubscribers('onConnection', false);
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Máximo de tentativas de reconexão atingido');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Tentativa de reconexão ${this.reconnectAttempts}/${this.maxReconnectAttempts} em ${this.reconnectDelay}ms...`);

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error('❌ Erro na reconexão:', error);
      });
    }, this.reconnectDelay);

    // Aumentar delay para próxima tentativa
    this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30000);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.ws) {
        this.send({ ping: 1 });
      }
    }, 30000); // Ping a cada 30 segundos
  }

  private send(message: any): void {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private generateRequestId(prefix: string): number {
    // Deriv API exige req_id como integer, não string
    return Date.now() + Math.floor(Math.random() * 1000);
  }

  private saveConnectionState(): void {
    try {
      localStorage.setItem('deriv_ws_state', JSON.stringify(this.connectionState));
    } catch (error) {
      console.error('❌ Erro ao salvar estado da conexão:', error);
    }
  }

  /**
   * OFFICIAL DERIV PATTERN: Forget all existing subscriptions before account switch
   * Based on official Deriv bot implementation
   */
  private async forgetAllSubscriptions(): Promise<void> {
    console.log('🔄 DERIV PATTERN: Forgetting all active subscriptions...');

    // Get all subscription promises and send forget requests
    const forgetPromises = Array.from(this.subscriptionPromises.entries()).map(async ([key, subscriptionPromise]) => {
      try {
        const subscription = await subscriptionPromise;
        if (subscription?.subscription?.id) {
          console.log(`🚫 Forgetting subscription: ${key} (ID: ${subscription.subscription.id})`);
          this.send({ forget: subscription.subscription.id });
        }
      } catch (error) {
        console.warn(`⚠️ Failed to forget subscription ${key}:`, error);
      }
    });

    await Promise.allSettled(forgetPromises);

    // Clear all subscription tracking
    this.activeSubscriptions.clear();
    this.subscriptionPromises.clear();

    // Remove temporary subscribers
    const tempSubscribers = Array.from(this.subscribers.keys()).filter(key =>
      key.includes('_temp') || key === 'main' || key === 'balance_updates'
    );

    tempSubscribers.forEach(key => {
      this.subscribers.delete(key);
    });

    console.log('✅ DERIV PATTERN: All subscriptions forgotten');
  }

  /**
   * Legacy cleanup method - kept for backward compatibility
   */
  private cleanupSubscriptions(): void {
    console.log('🧹 Limpando subscrições ativas:', Array.from(this.activeSubscriptions));

    // Clear all active subscriptions
    this.activeSubscriptions.clear();

    // Remove temporary subscribers
    const tempSubscribers = Array.from(this.subscribers.keys()).filter(key =>
      key.includes('_temp') || key === 'main'
    );

    tempSubscribers.forEach(key => {
      this.subscribers.delete(key);
    });

    console.log('✅ Subscrições limpas');
  }

  /**
   * OFFICIAL DERIV PATTERN: Subscribe to balance updates with 'account: all'
   * This is the exact pattern used in the official Deriv bot
   */
  private subscribeToBalanceUpdatesOfficial(): void {
    console.log('💰 DERIV PATTERN: Subscribing to balance updates with account: all...');

    const request = {
      balance: 1,
      subscribe: 1,
      account: 'all',  // CRITICAL: Use 'all' to get balance for all accounts
      req_id: this.generateRequestId('balance_official')
    };

    // Create subscription promise for tracking
    const subscriptionPromise = new Promise((resolve) => {
      const tempHandler = (data: any) => {
        if (data.req_id === request.req_id && data.subscription) {
          resolve({ subscription: data.subscription });
          this.subscribers.delete('balance_temp_tracker');
        }
      };
      this.subscribers.set('balance_temp_tracker', { onConnection: tempHandler });
    });

    // Store the subscription promise for later cleanup
    this.subscriptionPromises.set('balance_official', subscriptionPromise);

    // Register handler for balance updates
    this.subscribers.set('balance_updates', {
      onConnection: (data: any) => {
        if (data.balance) {
          console.log('💰 DERIV PATTERN: Balance update received:', {
            balance: data.balance.balance,
            currency: data.balance.currency,
            loginid: data.balance.loginid,
            subscription_id: data.subscription?.id
          });

          // Store subscription ID for later cleanup
          if (data.subscription?.id) {
            this.activeSubscriptions.add(data.subscription.id);
          }

          // Notify all subscribers about balance update
          this.notifySubscribers('onBalance', {
            balance: data.balance.balance,
            currency: data.balance.currency,
            loginid: data.balance.loginid || this.currentAccount,
            is_virtual: data.balance.loginid?.startsWith('VRT') || false
          });
        }
      }
    });

    this.send(request);
    console.log('✅ DERIV PATTERN: Balance subscription with account:all sent');
  }

  /**
   * Legacy method - kept for backward compatibility
   */
  private subscribeToBalanceUpdates(): void {
    this.subscribeToBalanceUpdatesOfficial();
  }

  /**
   * OFFICIAL DERIV PATTERN: Account switch method
   * Implements the exact flow from official Deriv bot with /get-token endpoint
   */
  public async switchAccount(accountId: string): Promise<boolean> {
    console.log('🔄 DERIV OFFICIAL: Starting complete account switch...', { accountId });

    try {
      // Step 1: Cancel all existing subscriptions (CRITICAL)
      console.log('🔄 DERIV OFFICIAL: Step 1 - Forgetting all subscriptions...');
      await this.forgetAllSubscriptions();

      // Step 2: Force WebSocket reconnection for clean state
      console.log('🔄 DERIV OFFICIAL: Step 2 - Force reconnection...');
      const reconnected = await this.forceReconnection();
      if (!reconnected) {
        console.error('❌ DERIV OFFICIAL: Failed to reconnect WebSocket for account switch');
        return false;
      }

      // Step 3: CRITICAL FIX - Get new account token from /get-token endpoint
      console.log('🔄 DERIV OFFICIAL: Step 3 - Getting new account token from /get-token...');
      let newToken: string;
      try {
        // Import axios dynamically to avoid circular dependencies
        const axios = (await import('axios')).default;
        const tokenResponse = await axios.get('/api/auth/deriv/get-token');

        if (!tokenResponse.data.success || !tokenResponse.data.token) {
          throw new Error('Failed to get token from /get-token endpoint');
        }

        newToken = tokenResponse.data.token;
        console.log('✅ DERIV OFFICIAL: New token obtained from /get-token:', {
          tokenSubstring: newToken.substring(0, 10) + '...',
          expectedAccount: accountId
        });
      } catch (tokenError) {
        console.error('❌ DERIV OFFICIAL: Failed to get new token from /get-token:', tokenError);
        return false;
      }

      // Step 4: Re-authorize with new account token
      console.log('🔄 DERIV OFFICIAL: Step 4 - Authorizing with new token...');
      const authorized = await this.authorize(newToken, false); // Clean already done
      if (!authorized) {
        console.error('❌ DERIV OFFICIAL: Failed to authorize with new account token');
        return false;
      }

      // Step 5: CRITICAL - Refresh account data and re-subscribe (DERIV PATTERN)
      console.log('🔄 DERIV OFFICIAL: Step 5 - Refreshing account data and balance...');
      const accountData = await this.refreshAccountData();
      if (!accountData) {
        console.error('❌ DERIV OFFICIAL: Failed to refresh account data after switch');
        return false;
      }

      // Step 6: Validate account switch success
      if (accountData.loginid !== accountId) {
        console.error('❌ DERIV OFFICIAL: Account mismatch after switch:', {
          expected: accountId,
          actual: accountData.loginid
        });
        return false;
      }

      console.log('✅ DERIV OFFICIAL: Account switch completed successfully with balance refresh:', {
        accountId: accountData.loginid,
        balance: accountData.balance,
        currency: accountData.currency,
        is_virtual: accountData.is_virtual
      });

      return true;

    } catch (error) {
      console.error('❌ DERIV OFFICIAL: Account switch failed:', error);
      return false;
    }
  }

  /**
   * Força nova subscrição de saldo após troca de conta (PADRÃO OFICIAL DERIV)
   */
  public async refreshAccountData(): Promise<DerivAccountData | null> {
    if (!this.isConnected || !this.ws || !this.authToken) {
      console.error('❌ WebSocket não conectado para refresh de dados');
      return null;
    }

    console.log('🔄 DERIV OFFICIAL: Refreshing account data for current account...');

    try {
      // STEP 1: Cancel any existing balance subscriptions (CRITICAL)
      console.log('🔄 DERIV OFFICIAL: Canceling existing balance subscriptions...');
      await this.forgetAllSubscriptions();

      // STEP 2: Get fresh balance immediately (DERIV PATTERN)
      console.log('💰 DERIV OFFICIAL: Getting fresh balance for new account...');
      const balance = await this.getBalance();
      if (!balance) {
        console.error('❌ DERIV OFFICIAL: Failed to get updated balance');
        return null;
      }

      console.log('✅ DERIV OFFICIAL: Fresh balance obtained:', {
        loginid: balance.loginid,
        balance: balance.balance,
        currency: balance.currency,
        is_virtual: balance.is_virtual
      });

      // STEP 3: Re-subscribe to balance updates for the new account (CRITICAL)
      console.log('🔄 DERIV OFFICIAL: Re-subscribing to balance updates for new account...');
      this.subscribeBalance('main', (data) => {
        console.log('💰 DERIV OFFICIAL: New balance update received for account:', {
          loginid: data.loginid,
          balance: data.balance,
          currency: data.currency
        });
        this.notifySubscribers('onBalance', data);
      });

      // STEP 4: Notify all subscribers about the new account data
      console.log('📢 DERIV OFFICIAL: Notifying subscribers about account data refresh...');
      this.notifySubscribers('onBalance', balance);

      return balance;

    } catch (error) {
      console.error('❌ DERIV OFFICIAL: Account data refresh failed:', error);
      return null;
    }
  }

  private loadConnectionState(): void {
    try {
      const saved = localStorage.getItem('deriv_ws_state');
      if (saved) {
        const state = JSON.parse(saved);
        this.connectionState = {
          ...this.connectionState,
          ...state
        };
      }
    } catch (error) {
      console.error('❌ Erro ao carregar estado da conexão:', error);
    }
  }

  /**
   * Verifica se deve tentar reconexão automática baseado no estado anterior
   */
  public shouldAutoReconnect(): boolean {
    this.loadConnectionState();
    const timeSinceLastConnection = Date.now() - this.connectionState.lastConnectedTime;
    const wasRecentlyConnected = timeSinceLastConnection < 5 * 60 * 1000; // 5 minutos

    return this.connectionState.wasConnected &&
           this.connectionState.shouldAutoReconnect &&
           wasRecentlyConnected;
  }

  /**
   * Define se deve tentar reconexão automática
   */
  public setAutoReconnect(enabled: boolean): void {
    this.connectionState.shouldAutoReconnect = enabled;
    this.saveConnectionState();
  }
}

export default DerivWebSocketService;