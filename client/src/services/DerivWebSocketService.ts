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
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 3000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private authToken: string | null = null;
  private currentAccount: string | null = null;

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

        this.ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${this.appId}`);

        this.ws.onopen = () => {
          console.log('✅ WebSocket conectado com sucesso');
          this.isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;
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
   * Autoriza com token da Deriv
   */
  public async authorize(token: string): Promise<boolean> {
    if (!this.isConnected || !this.ws) {
      console.error('❌ WebSocket não conectado para autorização');
      return false;
    }

    return new Promise((resolve) => {
      const request = {
        authorize: token,
        req_id: this.generateRequestId('auth')
      };

      const handler = (data: any) => {
        if (data.req_id === request.req_id) {
          if (data.error) {
            console.error('❌ Erro na autorização:', data.error);
            resolve(false);
          } else if (data.authorize) {
            console.log('✅ Autorização realizada com sucesso');
            this.authToken = token;
            this.currentAccount = data.authorize.loginid;
            resolve(true);
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
    if (!this.isConnected || !this.ws || !this.authToken) {
      console.error('❌ WebSocket não conectado ou não autorizado');
      return null;
    }

    return new Promise((resolve) => {
      const requestId = this.generateRequestId('balance_once');
      const request = {
        balance: 1,
        req_id: requestId
      };

      const handler = (data: any) => {
        if (data.req_id === requestId) {
          if (data.error) {
            console.error('❌ Erro ao obter saldo:', data.error);
            resolve(null);
          } else if (data.balance) {
            resolve({
              balance: data.balance.balance,
              currency: data.balance.currency,
              loginid: data.balance.loginid,
              is_virtual: data.balance.loginid?.startsWith('VRT') || false
            });
          }
        }
      };

      this.subscribers.set('balance_temp', { onBalance: handler });
      this.send(request);

      setTimeout(() => {
        this.subscribers.delete('balance_temp');
        resolve(null);
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

  private generateRequestId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default DerivWebSocketService;