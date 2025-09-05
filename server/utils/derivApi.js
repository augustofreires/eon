const WebSocket = require('ws');

class DerivAPI {
  constructor() {
    this.ws = null;
    this.appId = process.env.DERIV_APP_ID;
    this.baseUrl = process.env.DERIV_API_URL || 'wss://ws.derivws.com/websockets/v3';
    this.pendingRequests = new Map();
    this.subscriptions = new Map();
  }

  // Conectar ao WebSocket da Deriv
  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`${this.baseUrl}?app_id=${this.appId}`);

      this.ws.on('open', () => {
        console.log('Conectado ao WebSocket da Deriv');
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const response = JSON.parse(data);
          this.handleResponse(response);
        } catch (error) {
          console.error('Erro ao processar mensagem da Deriv:', error);
        }
      });

      this.ws.on('error', (error) => {
        console.error('Erro no WebSocket da Deriv:', error);
        reject(error);
      });

      this.ws.on('close', () => {
        console.log('Conexão WebSocket da Deriv fechada');
      });
    });
  }

  // Enviar requisição e aguardar resposta
  sendRequest(request) {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket não está conectado'));
        return;
      }

      const reqId = request.req_id || Date.now();
      request.req_id = reqId;

      // Armazenar callback para quando a resposta chegar
      this.pendingRequests.set(reqId, { resolve, reject });

      // Enviar requisição
      this.ws.send(JSON.stringify(request));

      // Timeout de 30 segundos
      setTimeout(() => {
        if (this.pendingRequests.has(reqId)) {
          this.pendingRequests.delete(reqId);
          reject(new Error('Timeout na requisição da Deriv'));
        }
      }, 30000);
    });
  }

  // Processar resposta recebida
  handleResponse(response) {
    const reqId = response.req_id;
    const pendingRequest = this.pendingRequests.get(reqId);

    if (pendingRequest) {
      this.pendingRequests.delete(reqId);

      if (response.error) {
        pendingRequest.reject(new Error(response.error.message));
      } else {
        pendingRequest.resolve(response);
      }
    }

    // Processar assinaturas (subscriptions)
    if (response.subscription) {
      const subscriptionId = response.subscription.id;
      const callback = this.subscriptions.get(subscriptionId);
      if (callback) {
        callback(response);
      }
    }
  }

  // Autorizar usuário
  async authorize(token) {
    const request = {
      authorize: token,
      req_id: Date.now()
    };

    return this.sendRequest(request);
  }

  // Obter saldo da conta
  async getBalance(account = 'current', subscribe = 0) {
    const request = {
      balance: 1,
      account: account,
      subscribe: subscribe,
      req_id: Date.now()
    };

    return this.sendRequest(request);
  }

  // Fazer proposta de compra
  async getProposal(params) {
    const request = {
      proposal: 1,
      amount: params.amount,
      basis: params.basis || 'stake',
      contract_type: params.contract_type,
      currency: params.currency,
      duration: params.duration,
      duration_unit: params.duration_unit,
      symbol: params.symbol,
      req_id: Date.now()
    };

    return this.sendRequest(request);
  }

  // Comprar contrato
  async buyContract(proposalId, price) {
    const request = {
      buy: 1,
      price: price,
      proposal_id: proposalId,
      req_id: Date.now()
    };

    return this.sendRequest(request);
  }

  // Vender contrato
  async sellContract(contractId, price) {
    const request = {
      sell: contractId,
      price: price,
      req_id: Date.now()
    };

    return this.sendRequest(request);
  }

  // Obter informações do contrato
  async getContractInfo(contractId, subscribe = 0) {
    const request = {
      proposal_open_contract: 1,
      contract_id: contractId,
      subscribe: subscribe,
      req_id: Date.now()
    };

    return this.sendRequest(request);
  }

  // Obter histórico de transações
  async getTransactionHistory(params = {}) {
    const request = {
      transaction: 1,
      action_type: params.action_type || 'all',
      date_from: params.date_from,
      date_to: params.date_to,
      limit: params.limit || 1000,
      offset: params.offset || 0,
      subscribe: params.subscribe || 0,
      req_id: Date.now()
    };

    return this.sendRequest(request);
  }

  // Obter detalhes de markup do app
  async getAppMarkupDetails(params = {}) {
    const request = {
      app_markup_details: 1,
      app_id: params.app_id || this.appId,
      client_loginid: params.client_loginid,
      date_from: params.date_from,
      date_to: params.date_to,
      description: params.description || 1,
      limit: params.limit || 1000,
      offset: params.offset || 0,
      sort: params.sort || 'DESC',
      req_id: Date.now()
    };

    return this.sendRequest(request);
  }

  // Obter histórico de contratos
  async getContractHistory(params = {}) {
    const request = {
      history: 1,
      action_type: params.action_type || 'all',
      date_from: params.date_from,
      date_to: params.date_to,
      limit: params.limit || 1000,
      offset: params.offset || 0,
      req_id: Date.now()
    };

    return this.sendRequest(request);
  }

  // Obter ticks em tempo real
  async getTicks(symbol, subscribe = 1) {
    const request = {
      ticks: symbol,
      subscribe: subscribe,
      req_id: Date.now()
    };

    return this.sendRequest(request);
  }

  // Cancelar assinatura
  async forget(subscriptionId) {
    const request = {
      forget: subscriptionId,
      req_id: Date.now()
    };

    return this.sendRequest(request);
  }

  // Cancelar todas as assinaturas
  async forgetAll() {
    const request = {
      forget_all: 'all',
      req_id: Date.now()
    };

    return this.sendRequest(request);
  }

  // Adicionar callback para assinatura
  addSubscriptionCallback(subscriptionId, callback) {
    this.subscriptions.set(subscriptionId, callback);
  }

  // Remover callback de assinatura
  removeSubscriptionCallback(subscriptionId) {
    this.subscriptions.delete(subscriptionId);
  }

  // Obter lista de contas do usuário
  async getAccountList() {
    const request = {
      account_list: 1,
      req_id: Date.now()
    };

    return this.sendRequest(request);
  }

  // Obter informações da aplicação
  async getApplicationInfo() {
    const request = {
      app: 1,
      req_id: Date.now()
    };

    return this.sendRequest(request);
  }

  // Obter lista de símbolos disponíveis
  async getSymbols(markets = 'all') {
    const request = {
      trading_times: markets,
      req_id: Date.now()
    };

    return this.sendRequest(request);
  }

  // Obter informações de um símbolo específico
  async getSymbolInfo(symbol) {
    const request = {
      trading_times: symbol,
      req_id: Date.now()
    };

    return this.sendRequest(request);
  }

  // Obter configurações da conta
  async getAccountSettings() {
    const request = {
      get_settings: 1,
      req_id: Date.now()
    };

    return this.sendRequest(request);
  }

  // Obter limites da conta
  async getAccountLimits() {
    const request = {
      get_limits: 1,
      req_id: Date.now()
    };

    return this.sendRequest(request);
  }

  // Obter estatísticas da conta
  async getAccountStatistics() {
    const request = {
      get_self_exclusion: 1,
      req_id: Date.now()
    };

    return this.sendRequest(request);
  }

  // Obter informações de pagamento
  async getPaymentMethods() {
    const request = {
      payment_methods: 1,
      req_id: Date.now()
    };

    return this.sendRequest(request);
  }

  // Obter histórico de depósitos/saques
  async getCashierHistory(params = {}) {
    const request = {
      cashier: 1,
      action_type: params.action_type || 'all',
      date_from: params.date_from,
      date_to: params.date_to,
      limit: params.limit || 1000,
      offset: params.offset || 0,
      req_id: Date.now()
    };

    return this.sendRequest(request);
  }

  // Obter informações de um contrato específico
  async getContractDetails(contractId) {
    const request = {
      proposal_open_contract: 1,
      contract_id: contractId,
      subscribe: 0,
      req_id: Date.now()
    };

    return this.sendRequest(request);
  }

  // Obter estatísticas de trading
  async getTradingStatistics(params = {}) {
    const request = {
      statement: 1,
      action_type: params.action_type || 'all',
      date_from: params.date_from,
      date_to: params.date_to,
      limit: params.limit || 1000,
      offset: params.offset || 0,
      req_id: Date.now()
    };

    return this.sendRequest(request);
  }

  // Obter informações de mercado
  async getMarketInfo(symbol) {
    const request = {
      trading_times: symbol,
      req_id: Date.now()
    };

    return this.sendRequest(request);
  }

  // Obter configurações de trading
  async getTradingSettings() {
    const request = {
      trading_settings: 1,
      req_id: Date.now()
    };

    return this.sendRequest(request);
  }

  // Gerenciar API tokens
  async manageApiToken(params = {}) {
    const request = {
      api_token: 1,
      req_id: Date.now()
    };

    // Adicionar parâmetros opcionais
    if (params.new_token) {
      request.new_token = params.new_token;
    }
    if (params.new_token_scopes) {
      request.new_token_scopes = params.new_token_scopes;
    }
    if (params.delete_token) {
      request.delete_token = params.delete_token;
    }
    if (params.valid_for_current_ip_only !== undefined) {
      request.valid_for_current_ip_only = params.valid_for_current_ip_only;
    }
    if (params.loginid) {
      request.loginid = params.loginid;
    }

    return this.sendRequest(request);
  }

  // Criar novo token de API
  async createApiToken(tokenName, scopes = ['read', 'trade'], validForCurrentIpOnly = 0) {
    return this.manageApiToken({
      new_token: tokenName,
      new_token_scopes: scopes,
      valid_for_current_ip_only: validForCurrentIpOnly
    });
  }

  // Deletar token de API
  async deleteApiToken(token) {
    return this.manageApiToken({
      delete_token: token
    });
  }

  // Listar todos os tokens
  async listApiTokens() {
    return this.manageApiToken();
  }

  // Fechar conexão
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.pendingRequests.clear();
    this.subscriptions.clear();
  }
}

module.exports = DerivAPI; 