import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

// Declare window.authDebug type
declare global {
  interface Window {
    authDebug?: {
      user: any;
      availableAccounts: DerivAccount[];
      currentAccount: DerivAccount | null;
      loading: boolean;
    };
  }
}

interface DerivAccount {
  loginid: string;
  currency: string;
  is_virtual: boolean;
  token?: string;
}

interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'client';
  deriv_connected?: boolean;
  deriv_account_id?: string;
  deriv_email?: string;
  deriv_currency?: string;
  deriv_is_virtual?: boolean;
  deriv_fullname?: string;
  deriv_access_token?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  availableAccounts: DerivAccount[];
  currentAccount: DerivAccount | null;
  login: (email: string, password: string, isAdmin: boolean) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  fetchAccounts: (source?: string) => Promise<void>;
  switchAccount: (account: DerivAccount, manual?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [availableAccounts, setAvailableAccounts] = useState<DerivAccount[]>([]);
  const [currentAccount, setCurrentAccount] = useState<DerivAccount | null>(null);
  const [fetchAccountsRunning, setFetchAccountsRunning] = useState(false); // CORREÇÃO: Estado para controle

  // Configurar axios
  axios.defaults.baseURL = 'https://iaeon.site';

  // Interceptor para adicionar token
  axios.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Interceptor para tratar erros
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        setUser(null);
        toast.error('Sessão expirada. Faça login novamente.');
      }
      return Promise.reject(error);
    }
  );

  // Verificar token ao carregar
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await axios.get('/api/auth/verify');
          if (response.data.valid) {
            let userData = response.data.user;

            // Verificar se há dados Deriv salvos no localStorage
            const savedDerivConnected = localStorage.getItem('deriv_connected');
            const savedAccountData = localStorage.getItem('deriv_account_data');

            if (savedDerivConnected === 'true' && savedAccountData) {
              try {
                const accountData = JSON.parse(savedAccountData);
                userData = {
                  ...userData,
                  deriv_connected: true,
                  deriv_account_id: accountData.account_id,
                  deriv_email: accountData.deriv_email,
                  deriv_currency: accountData.deriv_currency,
                  deriv_is_virtual: accountData.deriv_is_virtual,
                  deriv_fullname: accountData.deriv_fullname
                };
                console.log('🔄 AuthContext: Dados Deriv restaurados do localStorage');
              } catch (parseError) {
                console.error('❌ Erro ao fazer parse dos dados Deriv salvos:', parseError);
                localStorage.removeItem('deriv_connected');
                localStorage.removeItem('deriv_account_data');
              }
            }

            setUser(userData);
          } else {
            localStorage.removeItem('token');
          }
        }
      } catch (error) {
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // CORREÇÃO CRÍTICA: Listener para capturar callback OAuth de janela popup
  useEffect(() => {
    const handleOAuthCallback = async (event: MessageEvent) => {
      // Verificar origem por segurança
      if (event.origin !== window.location.origin) {
        console.warn('🔒 Callback OAuth de origem não confiável ignorado:', event.origin);
        return;
      }

      if (event.data && event.data.type === 'deriv-oauth-callback') {
        console.log('🔍 OAUTH CALLBACK: Dados recebidos na janela principal:', {
          accountsCount: event.data.accounts?.length,
          tokensCount: Object.keys(event.data.tokens || {}).length,
          primaryAccount: event.data.primaryAccount,
          primaryToken: event.data.primaryToken?.substring(0, 10) + '...'
        });

        try {
          // Processar o callback OAuth
          const response = await axios.post('/api/auth/deriv/process-callback', {
            accounts: event.data.accounts,
            tokens: event.data.tokens,
            allParams: event.data.allParams
          });

          if (response.data.success) {
            console.log('✅ OAUTH CALLBACK: Processamento bem-sucedido');

            // Atualizar dados do usuário
            updateUser({
              deriv_connected: true,
              deriv_account_id: response.data.accountInfo?.account?.loginid,
              deriv_email: response.data.accountInfo?.account?.email,
              deriv_currency: response.data.accountInfo?.account?.currency,
              deriv_is_virtual: response.data.accountInfo?.account?.is_virtual,
              deriv_fullname: response.data.accountInfo?.account?.fullname
            });

            // Buscar e definir contas disponíveis
            if (event.data.accounts && event.data.accounts.length > 0) {
              setAvailableAccounts(event.data.accounts);

              // Definir conta primária
              const primaryAccount = event.data.accounts.find((acc: DerivAccount) => !acc.is_virtual) || event.data.accounts[0];
              setCurrentAccount(primaryAccount);

              console.log('✅ OAUTH CALLBACK: Contas definidas:', {
                total: event.data.accounts.length,
                primary: primaryAccount.loginid
              });
            }

            // Salvar no localStorage
            localStorage.setItem('deriv_connected', 'true');
            localStorage.setItem('deriv_account_data', JSON.stringify({
              account_id: response.data.accountInfo?.account?.loginid,
              deriv_email: response.data.accountInfo?.account?.email,
              deriv_currency: response.data.accountInfo?.account?.currency,
              deriv_is_virtual: response.data.accountInfo?.account?.is_virtual,
              deriv_fullname: response.data.accountInfo?.account?.fullname
            }));

          } else {
            console.error('❌ OAUTH CALLBACK: Erro no processamento:', response.data.error);
          }
        } catch (error) {
          console.error('❌ OAUTH CALLBACK: Erro na chamada da API:', error);
        }
      } else if (event.data && event.data.type === 'deriv-oauth-error') {
        console.error('❌ OAUTH ERROR:', event.data.error);
        console.error('❌ DEBUG info:', event.data.debug);
      }
    };

    window.addEventListener('message', handleOAuthCallback);

    // Cleanup
    return () => {
      window.removeEventListener('message', handleOAuthCallback);
    };
  }, []); // Remove dependency para evitar erro de hoisting

  const login = async (email: string, password: string, isAdmin: boolean) => {
    try {
      setLoading(true);
      
      // Usar apenas uma rota de login para todos os tipos de usuário
      const response = await axios.post('/api/auth/login', { email, password, isAdmin });
      
      const { token, user: userData } = response.data;
      
      localStorage.setItem('token', token);
      setUser(userData);
      
      toast.success('Login realizado com sucesso!');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Erro ao fazer login';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('deriv_connected');
    localStorage.removeItem('deriv_account_data');
    setUser(null);
    toast.success('Logout realizado com sucesso!');
  };

  const updateUser = (userData: Partial<User>) => {
    console.log('🔄 AuthContext: updateUser called:', {
      current_user: user,
      update_data: userData,
      deriv_connected_changing: userData.deriv_connected !== user?.deriv_connected
    });

    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...userData };

      console.log('✅ AuthContext: User state updated:', {
        before: prev,
        after: updated,
        deriv_connected_changed: prev.deriv_connected !== updated.deriv_connected
      });

      return updated;
    });
  };

  // CORREÇÃO: Versão otimizada com controle de execuções múltiplas
  const fetchAccounts = async (source = 'unknown') => {
    // Prevenir múltiplas execuções simultâneas
    if (fetchAccountsRunning) {
      console.log('⏭️ AuthContext: fetchAccounts já está executando, pulando...');
      return;
    }

    try {
      setFetchAccountsRunning(true);
      console.log(`🔄 AuthContext: Buscando contas (fonte: ${source})...`);

      // ESTRATÉGIA 1: Verificar parâmetros OAuth na URL (prioridade máxima)
      // CORREÇÃO: Verificar tanto query params quanto hash fragment
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
      const oauthAccounts = [];

      // Combinar ambos os sources
      const allParams = new Map();
      urlParams.forEach((value, key) => allParams.set(key, value));
      hashParams.forEach((value, key) => allParams.set(key, value));

      console.log('🔍 AuthContext fetchAccounts: URL params found:', {
        query: Array.from(urlParams.entries()),
        hash: Array.from(hashParams.entries()),
        combined: Array.from(allParams.entries())
      });

      // Suportar até 10 contas (como no callback)
      for (let i = 1; i <= 10; i++) {
        const acct = allParams.get(`acct${i}`);
        const token = allParams.get(`token${i}`);
        const cur = allParams.get(`cur${i}`);

        if (acct && token) {
          oauthAccounts.push({
            loginid: acct,
            currency: cur || 'USD',
            is_virtual: acct.startsWith('VRT'),
            token: token
          });
        }
      }

      // Também verificar access_token diretamente
      const accessToken = allParams.get('access_token') || allParams.get('token');
      if (accessToken && !oauthAccounts.length) {
        console.log('🔍 AuthContext: Found direct access token');
        oauthAccounts.push({
          loginid: 'DERIV_ACCOUNT',
          currency: 'USD',
          is_virtual: false,
          token: accessToken
        });
      }

      if (oauthAccounts.length > 0) {
        console.log(`✅ OAuth: ${oauthAccounts.length} contas encontradas na URL`);

        setAvailableAccounts(oauthAccounts);

        if (!currentAccount) {
          const primaryAccount = oauthAccounts.find(acc => !acc.is_virtual) || oauthAccounts[0];
          setCurrentAccount(primaryAccount);
          console.log('🎯 OAuth: Conta ativa definida:', primaryAccount.loginid);
        }
        return;
      }

      // ESTRATÉGIA 2: Buscar via API status (contém contas salvas)
      const statusResponse = await axios.get('/api/auth/deriv/status');
      if (statusResponse.data.success && statusResponse.data.available_accounts) {
        const accounts = statusResponse.data.available_accounts;

        if (accounts.length > 0) {
          console.log(`✅ Status: ${accounts.length} contas carregadas`);

          setAvailableAccounts(accounts);
          console.log('🔥 DEBUG: availableAccounts definido com', accounts.length, 'contas:', accounts.map((acc: any) => acc.loginid));

          // CRITICAL FIX: Update user connection status when accounts are found
          if (statusResponse.data.connected && user && !user.deriv_connected) {
            console.log('🔄 AuthContext: Updating user connection status to true');
            updateUser({
              deriv_connected: true,
              deriv_account_id: statusResponse.data.account_id,
              deriv_email: statusResponse.data.deriv_email,
              deriv_currency: statusResponse.data.deriv_currency,
              deriv_is_virtual: statusResponse.data.is_virtual,
              deriv_fullname: statusResponse.data.fullname
            });
          }

          if (!currentAccount) {
            const primaryAccount = accounts.find((acc: any) => !acc.is_virtual) || accounts[0];
            setCurrentAccount(primaryAccount);
            console.log('🎯 Status: Conta ativa definida:', primaryAccount.loginid);
          }
          return;
        }
      }

      // ESTRATÉGIA 3: Buscar via API fetch-all (última tentativa)
      try {
        const allAccountsResponse = await axios.post('/api/auth/deriv/fetch-all-accounts');
        if (allAccountsResponse.data.success && allAccountsResponse.data.available_accounts) {
          const accounts = allAccountsResponse.data.available_accounts;
          console.log(`✅ FetchAll: ${accounts.length} contas encontradas`);

          setAvailableAccounts(accounts);

          if (!currentAccount && accounts.length > 0) {
            const primaryAccount = accounts.find((acc: DerivAccount) => !acc.is_virtual) || accounts[0];
            setCurrentAccount(primaryAccount);
            console.log('🎯 FetchAll: Conta ativa definida:', primaryAccount.loginid);
          }
          return;
        }
      } catch (apiError) {
        console.log('⚠️ FetchAll API falhou:', apiError);
      }

      console.log('❌ Nenhuma conta encontrada em todas as estratégias');

    } catch (error) {
      console.error('❌ Erro ao buscar contas:', error);
      toast.error('Erro ao carregar contas da Deriv');
    } finally {
      setFetchAccountsRunning(false);
    }
  };

  const switchAccount = async (account: DerivAccount, manual: boolean = false) => {
    try {
      setLoading(true);

      console.log('🔄 DERIV PATTERN: Starting official account switch:', {
        from: currentAccount?.loginid || 'N/A',
        to: account.loginid,
        is_virtual: account.is_virtual,
        url: '/api/auth/deriv/switch-account',
        payload: {
          is_virtual: account.is_virtual,
          loginid: account.loginid
        }
      });

      // OFFICIAL DERIV PATTERN: Update localStorage FIRST (before API call)
      console.log('💾 DERIV PATTERN: Updating localStorage first...');
      localStorage.setItem('deriv_account_data', JSON.stringify({
        account_id: account.loginid,
        deriv_currency: account.currency,
        deriv_is_virtual: account.is_virtual
      }));

      // Update current account state immediately (like official implementation)
      setCurrentAccount(account);

      // Update user state immediately
      updateUser({
        deriv_account_id: account.loginid,
        deriv_currency: account.currency,
        deriv_is_virtual: account.is_virtual
      });

      // Call backend to re-authorize with target account token
      console.log('📤 DERIV PATTERN: Calling switch-account API...');
      const response = await axios.post('/api/auth/deriv/switch-account', {
        is_virtual: account.is_virtual,
        loginid: account.loginid
      });

      console.log('📥 DERIV PATTERN: Backend response received:', {
        status: response.status,
        success: response.data.success,
        message: response.data.message,
        hasAccountInfo: !!response.data.accountInfo,
        accountId: response.data.accountInfo?.account?.id,
        balance: response.data.accountInfo?.account?.balance
      });

      if (response.data.success) {
        console.log('✅ DERIV PATTERN: Backend switch successful');

        // CRITICAL: Trigger WebSocket account switch (official pattern - no token needed)
        console.log('🔄 DERIV PATTERN: Triggering WebSocket account switch...');
        try {
          // OFFICIAL DERIV PATTERN: Dispatch event for WebSocket reinitialization
          // The WebSocket service will call /get-token internally
          window.dispatchEvent(new CustomEvent('deriv-account-switched', {
            detail: {
              accountId: account.loginid,
              account: account,
              useOfficialPattern: true  // Flag to use official switching pattern
            }
          }));
          console.log('✅ DERIV PATTERN: WebSocket switch event dispatched with official pattern (WebSocket will get token internally)');
        } catch (wsError) {
          console.error('❌ DERIV PATTERN: Error in WebSocket switch:', wsError);
        }

        console.log('✅ AuthContext: Switch realizado com sucesso:', {
          new_account: account.loginid,
          is_virtual: account.is_virtual,
          manual: manual
        });

        // CORREÇÃO: Só mostrar notificação quando é troca manual explícita
        if (manual) {
          toast.success(`Conta alterada para: ${account.loginid} (${account.currency}) - ${account.is_virtual ? 'Virtual' : 'Real'}`);
        }
      } else {
        throw new Error(response.data.error || 'Erro no switch de conta');
      }
    } catch (error: any) {
      console.error('❌ AuthContext: Erro ao trocar conta:', error);
      toast.error(error.response?.data?.error || 'Erro ao trocar conta');
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    availableAccounts,
    currentAccount,
    login,
    logout,
    updateUser,
    fetchAccounts,
    switchAccount,
  };

  // DEBUG: Expose state to window for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.authDebug = {
        user,
        availableAccounts,
        currentAccount,
        loading
      };
    }
  }, [user, availableAccounts, currentAccount, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext }; 