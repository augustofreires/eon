import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import api, { setAuthToken, getAuthToken } from '../services/api';

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

  // Estados de controle para evitar execuções simultâneas
  const fetchAccountsRunning = useRef(false);
  const switchAccountRunning = useRef(false);

  // updateUser callback (declarado antes de ser usado)
  const updateUser = useCallback((userData: Partial<User>) => {
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
  }, [user]);

  // Configurar token no início se existir
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      setAuthToken(token);
    }
  }, []);

  // Função simplificada para buscar contas seguindo padrão oficial Deriv
  const fetchAccounts = useCallback(async (source = 'unknown') => {
    // Prevenir múltiplas execuções simultâneas
    if (fetchAccountsRunning.current) {
      console.log('⏭️ AuthContext: fetchAccounts já está executando, aguardando...');
      return;
    }

    try {
      fetchAccountsRunning.current = true;
      console.log(`🔄 AuthContext: Buscando contas (fonte: ${source})...`);

      // Buscar contas via API backend que usa o padrão oficial Deriv
      const response = await api.post('/api/auth/deriv/fetch-all-accounts');
      const accounts = response.data.accounts || [];

      if (accounts.length > 0) {
        console.log(`✅ AuthContext: ${accounts.length} contas carregadas via API`);
        setAvailableAccounts(accounts);

        // Set current account se não tiver uma definida
        if (!currentAccount && accounts.length > 0) {
          console.log('🎯 AuthContext: Definindo primeira conta como atual:', accounts[0].loginid);
          setCurrentAccount(accounts[0]);
        }

        // Update user connection status when accounts are found
        if (user && !user.deriv_connected) {
          console.log('🔄 AuthContext: Updating user connection status to true');
          updateUser({ deriv_connected: true });
        }
      } else {
        console.log('⚠️ AuthContext: Nenhuma conta retornada pela API');
        setAvailableAccounts([]);
        setCurrentAccount(null);
      }
    } catch (error: any) {
      console.error('❌ AuthContext fetchAccounts: Erro:', error);

      // Se não conseguiu buscar via API, tentar verificar status
      try {
        const statusResponse = await api.get('/api/auth/deriv/status');
        if (!statusResponse.data.connected) {
          console.log('⚠️ AuthContext: Usuário não conectado à Deriv');
          setAvailableAccounts([]);
          setCurrentAccount(null);
        }
      } catch (statusError) {
        console.error('❌ AuthContext: Erro ao verificar status:', statusError);
      }
    } finally {
      fetchAccountsRunning.current = false;
    }
  }, [currentAccount, user]);

  // Switch de conta simplificado seguindo padrão oficial Deriv
  const switchAccount = useCallback(async (account: DerivAccount, manual: boolean = false) => {
    // Prevenir múltiplas execuções
    if (switchAccountRunning.current) {
      console.log('⏭️ AuthContext: switchAccount já está executando');
      return;
    }

    // Se já é a conta atual, não fazer nada
    if (currentAccount?.loginid === account.loginid) {
      console.log('ℹ️ AuthContext: Conta já é a atual, pulando switch');
      return;
    }

    try {
      switchAccountRunning.current = true;
      setLoading(true);

      console.log('🔄 AuthContext: Iniciando switch de conta:', {
        from: currentAccount?.loginid || 'N/A',
        to: account.loginid,
        is_virtual: account.is_virtual,
        manual: manual
      });

      if (manual) {
        toast.loading(`Trocando para ${account.loginid}...`, { id: 'switch-account' });
      }

      const response = await api.post('/api/auth/deriv/switch-account', {
        loginid: account.loginid,
        is_virtual: account.is_virtual,
        currency: account.currency
      });

      if (response.data.success) {
        console.log('✅ AuthContext: Switch account successful');

        // Atualizar conta atual e dados do usuário
        setCurrentAccount(account);
        updateUser({
          deriv_account_id: account.loginid,
          deriv_currency: account.currency,
          deriv_is_virtual: account.is_virtual
        });

        if (manual) {
          toast.success(`Conta trocada para ${account.loginid}`, { id: 'switch-account' });
        }

        console.log('✅ AuthContext: Switch completo para:', account.loginid);
      } else {
        throw new Error(response.data.error || 'Erro no switch');
      }
    } catch (error: any) {
      console.error('❌ AuthContext: Erro ao trocar conta:', error);
      const message = error.response?.data?.error || 'Erro ao trocar conta';

      if (manual) {
        toast.error(message, { id: 'switch-account' });
      }

      throw error;
    } finally {
      setLoading(false);
      switchAccountRunning.current = false;
    }
  }, [currentAccount, updateUser]);

  // Verificar token ao carregar (sem localStorage problemático)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await api.get('/api/auth/verify');
          if (response.data.valid) {
            setUser(response.data.user);
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

  // Listener para callback OAuth simplificado
  useEffect(() => {
    const handleOAuthCallback = async (event: MessageEvent) => {
      // Verificar origem por segurança
      if (event.origin !== window.location.origin) {
        console.warn('🔒 Callback OAuth de origem não confiável ignorado:', event.origin);
        return;
      }

      if (event.data && event.data.type === 'deriv-oauth-callback') {
        console.log('🔍 OAUTH CALLBACK: Dados recebidos:', {
          accountsCount: event.data.accounts?.length,
          tokensCount: Object.keys(event.data.tokens || {}).length,
          primaryAccount: event.data.primaryAccount
        });

        try {
          // Processar o callback OAuth via backend que segue padrão oficial Deriv
          const response = await api.post('/api/auth/deriv/process-callback', {
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

            // Carregar contas disponíveis após callback
            fetchAccounts('oauth-callback');

            toast.success('🎉 Conta Deriv conectada com sucesso!');
          } else {
            console.error('❌ OAUTH CALLBACK: Erro no processamento:', response.data.error);
            toast.error('Erro ao processar conexão OAuth');
          }
        } catch (error) {
          console.error('❌ OAUTH CALLBACK: Erro na chamada da API:', error);
          toast.error('Erro ao conectar com Deriv');
        }
      } else if (event.data && event.data.type === 'deriv-oauth-error') {
        console.error('❌ OAUTH ERROR:', event.data.error);
        toast.error('Erro na autorização Deriv');
      }
    };

    window.addEventListener('message', handleOAuthCallback);

    return () => {
      window.removeEventListener('message', handleOAuthCallback);
    };
  }, [updateUser, fetchAccounts]);

  const login = async (email: string, password: string, isAdmin: boolean) => {
    try {
      setLoading(true);

      const response = await api.post('/api/auth/login', { email, password, isAdmin });

      const { token, user: userData } = response.data;

      setAuthToken(token);
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
    setAuthToken(null);
    setUser(null);
    setAvailableAccounts([]);
    setCurrentAccount(null);
    toast.success('Logout realizado com sucesso!');
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