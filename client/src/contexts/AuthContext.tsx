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
  fetchAccounts: () => Promise<void>;
  switchAccount: (account: DerivAccount) => Promise<void>;
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
    setUser(prev => prev ? { ...prev, ...userData } : null);
  };

  const fetchAccounts = async () => {
    try {
      console.log('🔄 AuthContext: Buscando todas as contas da Deriv...');

      // Primeiro tentar buscar TODAS as contas via API
      try {
        const allAccountsResponse = await axios.post('/api/auth/deriv/fetch-all-accounts');
        if (allAccountsResponse.data.success) {
          // Usar available_accounts se accounts não estiver disponível
          const accounts = allAccountsResponse.data.accounts || allAccountsResponse.data.available_accounts || [];
          console.log('✅ AuthContext: Todas as contas carregadas via API:', accounts.length);
          setAvailableAccounts(accounts);

          if (!currentAccount && accounts.length > 0) {
            // Priorizar conta Real (não virtual)
            const primaryAccount = accounts.find((acc: DerivAccount) => !acc.is_virtual) || accounts[0];
            setCurrentAccount(primaryAccount);
            console.log('🎯 AuthContext: Conta atual definida:', primaryAccount.loginid);
          }
          return; // Success, return early
        }
      } catch (apiError) {
        console.log('⚠️ Erro ao buscar via API, usando fallback...', apiError);
      }

      // Fallback: usar endpoint de status
      const response = await axios.get('/api/auth/deriv/status');
      if (response.data.success && response.data.available_accounts) {
        console.log('✅ AuthContext: Contas carregadas via status:', response.data.available_accounts.length);

        // Log detalhado das contas encontradas
        response.data.available_accounts.forEach((acc: any, idx: number) => {
          console.log(`   ${idx + 1}. ${acc.loginid} (${acc.is_virtual ? 'Virtual' : 'Real'}) - ${acc.currency}`);
        });

        setAvailableAccounts(response.data.available_accounts);

        if (!currentAccount && response.data.available_accounts.length > 0) {
          // Priorizar conta Real (não virtual)
          const primaryAccount = response.data.available_accounts.find((acc: DerivAccount) => !acc.is_virtual)
            || response.data.available_accounts[0];
          setCurrentAccount(primaryAccount);
          console.log('🎯 AuthContext: Conta atual definida (fallback):', primaryAccount.loginid);
        }
      } else {
        console.log('⚠️ Nenhuma conta encontrada no endpoint de status');
      }
    } catch (error) {
      console.error('❌ Erro ao buscar contas:', error);
      toast.error('Erro ao carregar contas da Deriv');
    }
  };

  const switchAccount = async (account: DerivAccount) => {
    try {
      setLoading(true);

      // Chamar endpoint para trocar conta (usar is_virtual em vez de account_id)
      const response = await axios.post('/api/auth/deriv/switch-account', {
        is_virtual: account.is_virtual
      });

      if (response.data.success) {
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

        toast.success(`Conta alterada para: ${account.loginid} (${account.currency}) - ${account.is_virtual ? 'Virtual' : 'Real'}`);
      }
    } catch (error) {
      console.error('Erro ao trocar conta:', error);
      toast.error('Erro ao trocar conta');
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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 