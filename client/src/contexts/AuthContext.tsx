import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

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
      const urlParams = new URLSearchParams(window.location.search);
      const oauthAccounts = [];

      for (let i = 1; i <= 3; i++) {
        const acct = urlParams.get(`acct${i}`);
        const token = urlParams.get(`token${i}`);
        const cur = urlParams.get(`cur${i}`);

        if (acct && token && cur) {
          oauthAccounts.push({
            loginid: acct,
            currency: cur,
            is_virtual: acct.startsWith('VRT'),
            token: token
          });
        }
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

      console.log('🔄 AuthContext: Iniciando switch de conta:', {
        from: currentAccount?.loginid || 'N/A',
        to: account.loginid,
        is_virtual: account.is_virtual
      });

      // Chamar endpoint para trocar conta (usar loginid específico)
      const response = await axios.post('/api/auth/deriv/switch-account', {
        is_virtual: account.is_virtual,
        loginid: account.loginid
      });

      if (response.data.success) {
        // Atualizar conta atual IMEDIATAMENTE
        setCurrentAccount(account);

        // Atualizar dados do usuário com a nova conta
        updateUser({
          deriv_account_id: account.loginid,
          deriv_currency: account.currency,
          deriv_is_virtual: account.is_virtual
        });

        // Atualizar localStorage
        localStorage.setItem('deriv_account_data', JSON.stringify({
          account_id: account.loginid,
          deriv_currency: account.currency,
          deriv_is_virtual: account.is_virtual
        }));

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