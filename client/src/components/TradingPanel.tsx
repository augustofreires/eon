import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  AccountBalance,
  Settings
} from '@mui/icons-material';
// Importar componentes oficiais da Deriv
import { Button } from '@deriv-com/quill-ui';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

interface BotConfig {
  id: string;
  name: string;
  description?: string;
  xml_content: string;
  is_active: boolean;
  created_at: string;
}

const TradingPanel: React.FC = () => {
  const { user, availableAccounts, currentAccount, switchAccount } = useAuth();
  const [bots, setBots] = useState<BotConfig[]>([]);
  const [selectedBot, setSelectedBot] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [balanceData, setBalanceData] = useState<any>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  // Ref para evitar processamento múltiplo
  const oauthProcessedRef = React.useRef(false);

  // Processar OAuth callback se há parâmetros na URL
  useEffect(() => {
    // Evitar processamento múltiplo
    if (oauthProcessedRef.current) {
      console.log('⏭️ TradingPanel: OAuth já processado, ignorando');
      return;
    }

    console.log('🔍 TradingPanel: useEffect executando...');
    console.log('🔍 TradingPanel: URL atual:', window.location.href);
    console.log('🔍 TradingPanel: Search params:', window.location.search);
    console.log('🔍 TradingPanel: User deriv_connected:', user?.deriv_connected);

    const urlParams = new URLSearchParams(window.location.search);
    const hasOAuthParams = urlParams.get('acct1') && urlParams.get('token1');

    console.log('🔍 TradingPanel: acct1:', urlParams.get('acct1'));
    console.log('🔍 TradingPanel: token1:', urlParams.get('token1'));
    console.log('🔍 TradingPanel: hasOAuthParams:', hasOAuthParams);

    // CORREÇÃO: Processar OAuth params independente do estado de conexão
    if (hasOAuthParams) {
      console.log('✅ TradingPanel: OAuth callback detectado na URL:', Object.fromEntries(urlParams));

      // Marcar como processado IMEDIATAMENTE
      oauthProcessedRef.current = true;

      // Extrair dados das contas
      const accounts: any[] = [];
      const tokens: { [key: string]: string } = {};

      for (let i = 1; i <= 10; i++) {
        const acct = urlParams.get(`acct${i}`);
        const token = urlParams.get(`token${i}`);
        const cur = urlParams.get(`cur${i}`);

        if (acct && token) {
          accounts.push({
            loginid: acct,
            currency: cur || 'USD',
            is_virtual: acct.startsWith('VRT'),
            token: token
          });
          tokens[acct] = token;
        }
      }

      if (accounts.length > 0) {
        console.log('✅ TradingPanel: Processando OAuth com', accounts.length, 'contas...');

        // Criar dados de callback compatíveis com AuthContext
        const callbackData = {
          type: 'deriv-oauth-callback',
          accounts: accounts,
          tokens: tokens,
          allParams: Object.fromEntries(urlParams),
          primaryToken: accounts[0]?.token,
          primaryAccount: accounts[0]?.loginid
        };

        console.log('📤 TradingPanel: Enviando postMessage com dados:', callbackData);

        // Enviar mensagem para AuthContext processar
        window.postMessage(callbackData, window.location.origin);

        // Limpar URL dos parâmetros OAuth IMEDIATAMENTE
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
        console.log('✅ TradingPanel: URL limpa dos parâmetros OAuth');
      }
    }
  }, []); // Executar apenas uma vez no mount para processar OAuth params

  // Carregar bots salvos e dados de saldo
  useEffect(() => {
    if (user?.deriv_connected) {
      loadUserBots();
      loadBalanceData();
    }
  }, [user?.deriv_connected]);

  // Atualizar saldo quando a conta atual mudar
  useEffect(() => {
    if (user?.deriv_connected && currentAccount) {
      console.log('🔄 TradingPanel: Conta atual mudou, atualizando saldo...', currentAccount.loginid);
      loadBalanceData();
    }
  }, [currentAccount?.loginid]);

  const loadUserBots = async () => {
    try {
      // Buscar bots disponíveis para o cliente (mesmos do /bots)
      const response = await axios.get('/api/bots');
      setBots(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar bots:', error);
    }
  };

  const loadBalanceData = async (retryCount = 0) => {
    const maxRetries = 2;

    try {
      setBalanceLoading(true);
      setBalanceError(null);

      console.log('🔄 TradingPanel: Carregando saldo da conta...', {
        currentAccount: currentAccount?.loginid,
        retryCount
      });

      const response = await axios.get('/api/auth/deriv/balance', {
        timeout: 10000 // 10 segundos de timeout
      });

      if (response.data.success) {
        console.log('✅ TradingPanel: Saldo carregado com sucesso:', response.data);
        setBalanceData(response.data);
        setBalanceError(null);
      } else {
        throw new Error(response.data.error || 'Erro ao carregar saldo');
      }

    } catch (error: any) {
      console.error('❌ TradingPanel: Erro ao carregar saldo:', error);

      const errorMessage = error.response?.data?.error || error.message || 'Erro ao carregar informações da conta Deriv';
      setBalanceError(errorMessage);

      // Retry automatico para erros de rede
      if (retryCount < maxRetries && (error.code === 'ECONNABORTED' || error.response?.status >= 500)) {
        console.log(`🔄 TradingPanel: Tentando novamente (${retryCount + 1}/${maxRetries})...`);
        setTimeout(() => {
          loadBalanceData(retryCount + 1);
        }, 2000 * (retryCount + 1)); // Delay progressivo
      } else {
        toast.error(`Erro ao carregar saldo: ${errorMessage}`);
      }
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleAccountSwitch = async (accountId: string) => {
    try {
      setBalanceLoading(true);
      const account = availableAccounts.find(acc => acc.loginid === accountId);
      if (account) {
        console.log('🔄 TradingPanel: Trocando conta para:', accountId);
        await switchAccount(account, true);

        // Aguardar um momento para a conta ser trocada
        setTimeout(() => {
          loadBalanceData();
        }, 1000);
      }
    } catch (error: any) {
      console.error('❌ TradingPanel: Erro ao trocar conta:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Erro ao trocar conta';
      toast.error(errorMessage);
    } finally {
      setBalanceLoading(false);
    }
  };


  const startBot = async (botId: string) => {
    try {
      setLoading(true);
      const response = await axios.post(`/api/bots/${botId}/start`, {
        accountId: currentAccount?.loginid
      });

      if (response.data.success) {
        toast.success('Bot iniciado!');
        loadUserBots();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao iniciar bot');
    } finally {
      setLoading(false);
    }
  };

  const stopBot = async (botId: string) => {
    try {
      setLoading(true);
      const response = await axios.post(`/api/bots/${botId}/stop`);

      if (response.data.success) {
        toast.success('Bot parado!');
        loadUserBots();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao parar bot');
    } finally {
      setLoading(false);
    }
  };

  // Listener para callback OAuth
  useEffect(() => {
    const handleOAuthMessage = async (event: MessageEvent) => {
      console.log('🔍 TradingPanel: OAuth message received:', {
        origin: event.origin,
        type: event.data?.type,
        hasData: !!event.data
      });

      // Verificar origem por segurança
      if (event.origin !== window.location.origin) {
        console.warn('🔒 TradingPanel: OAuth message from untrusted origin ignored:', event.origin);
        return;
      }

      if (event.data && event.data.type === 'deriv-oauth-callback') {
        console.log('✅ TradingPanel: OAuth callback received, updating user state...');

        const successToastId = toast.loading('🔄 Finalizando conexão Deriv...');

        try {
          // Aguardar um momento para o AuthContext processar
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Verificar se a conexão foi estabelecida consultando o backend
          const userResponse = await axios.get('/api/profile');

          if (userResponse.data.user?.deriv_connected) {
            console.log('✅ TradingPanel: User Deriv connection confirmed');
            toast.success('✅ Conexão Deriv realizada com sucesso!', { id: successToastId });

            // O AuthContext já deve ter processado os dados, apenas aguardamos a atualização do estado
            setTimeout(() => {
              if (!user?.deriv_connected) {
                console.log('🔄 TradingPanel: Forçando reload para atualizar estado...');
                window.location.reload();
              }
            }, 2000);

          } else {
            throw new Error('Conexão OAuth não foi confirmada no servidor');
          }
        } catch (error: any) {
          console.error('❌ TradingPanel: Erro ao verificar conexão OAuth:', error);
          toast.error('❌ Erro ao finalizar conexão. Tente novamente.', { id: successToastId });
        }

      } else if (event.data && event.data.type === 'deriv-oauth-error') {
        console.error('❌ TradingPanel: OAuth error:', event.data.error);
        toast.error(`❌ Erro OAuth: ${event.data.error}`);
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => {
      window.removeEventListener('message', handleOAuthMessage);
    };
  }, [user?.deriv_connected]);

  const handleOAuthConnect = async () => {
    try {
      console.log('🚀 TradingPanel: Starting Deriv OAuth connection...');

      const loadingToastId = toast.loading('🔄 Iniciando conexão com Deriv...');

      console.log('📱 TradingPanel: Requesting authorization URL...');
      const response = await axios.get('/api/auth/deriv/authorize');

      console.log('📄 TradingPanel: API Response:', response.data);

      if (response.data.success && (response.data.authUrl || response.data.auth_url)) {
        const authUrl = response.data.authUrl || response.data.auth_url;
        console.log('✅ TradingPanel: Authorization URL obtained successfully:', authUrl);
        toast.success('✅ URL OAuth obtida! Abrindo popup...', { id: loadingToastId });

        // Abrir popup
        const popup = window.open(authUrl, 'derivOAuth', 'width=500,height=700,scrollbars=yes,resizable=yes');

        if (!popup) {
          throw new Error('Popup foi bloqueado pelo navegador. Permita popups para este site.');
        }

        console.log('🪟 TradingPanel: Popup opened successfully');

      } else {
        throw new Error(response.data.error || 'Falha ao obter URL de autorização');
      }

    } catch (error: any) {
      console.error('❌ TradingPanel: OAuth error:', error);
      const message = error?.response?.data?.error || error?.message || 'Erro ao conectar com Deriv';
      toast.error(`❌ ${message}`);
    }
  };

  // Se não conectado, mostrar tela de conexão
  if (!user?.deriv_connected) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ color: '#ffffff', mb: 3 }}>
          🔐 Conexão Deriv Necessária
        </Typography>
        <Alert severity="warning" sx={{ mb: 3, maxWidth: 500, mx: 'auto' }}>
          Para usar o painel de trading, você precisa conectar sua conta Deriv primeiro.
        </Alert>
        <Button
          variant="primary"
          size="lg"
          onClick={handleOAuthConnect}
        >
          🔗 CONECTAR COM DERIV
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ color: '#ffffff', mb: 3, textAlign: 'center' }}>
        🎯 Operações Deriv - Painel de Controle
      </Typography>

      <Grid container spacing={3}>
        {/* Account & Balance Panel */}
        <Grid item xs={12} md={6}>
          <Card sx={{
            borderRadius: '12px',
            background: 'rgba(25, 45, 65, 0.8)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 212, 170, 0.1)'
          }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#00d4aa', mb: 2, display: 'flex', alignItems: 'center' }}>
                <AccountBalance sx={{ mr: 1 }} />
                Conta & Saldo
              </Typography>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel sx={{ color: '#ffffff' }}>Conta Ativa</InputLabel>
                <Select
                  value={currentAccount?.loginid || ''}
                  onChange={(e) => handleAccountSwitch(e.target.value)}
                  sx={{ color: '#ffffff' }}
                >
                  {availableAccounts.map((account) => (
                    <MenuItem key={account.loginid} value={account.loginid}>
                      {account.loginid} ({account.currency})
                      {account.is_virtual ? ' - Virtual' : ' - Real'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {currentAccount && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
                  <Chip
                    label={currentAccount.is_virtual ? 'VIRTUAL' : 'REAL'}
                    color={currentAccount.is_virtual ? 'warning' : 'success'}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {balanceLoading && <CircularProgress size={16} sx={{ color: '#00d4aa' }} />}
                    <Typography variant="h6" sx={{ color: '#ffffff' }}>
                      {balanceLoading ? 'Carregando...' :
                       balanceData?.balance ? `${balanceData.balance} ${currentAccount.currency}` :
                       balanceError ? 'Erro' : '0.00 ' + currentAccount.currency}
                    </Typography>
                  </Box>
                </Box>
              )}

              {balanceError && (
                <Alert severity="error" sx={{ mb: 2, fontSize: '0.8rem' }}>
                  {balanceError}
                </Alert>
              )}

              <Button
                variant="secondary"
                fullWidth
                onClick={() => loadBalanceData(0)}
                disabled={balanceLoading}
              >
                {balanceLoading ? '🔄 Carregando...' : '🔄 Atualizar Saldo'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Bot Management Panel */}
        <Grid item xs={12} md={6}>
          <Card sx={{
            borderRadius: '12px',
            background: 'rgba(25, 45, 65, 0.8)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 212, 170, 0.1)'
          }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#00d4aa', mb: 2, display: 'flex', alignItems: 'center' }}>
                <Settings sx={{ mr: 1 }} />
                Gerenciar Bots
              </Typography>

              <Button
                variant="secondary"
                fullWidth
                onClick={loadUserBots}
              >
                🔄 Atualizar Lista de Bots
              </Button>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel sx={{ color: '#ffffff' }}>Bot Ativo</InputLabel>
                <Select
                  value={selectedBot}
                  onChange={(e) => setSelectedBot(e.target.value)}
                  sx={{ color: '#ffffff' }}
                >
                  {bots.map((bot) => (
                    <MenuItem key={bot.id} value={bot.id}>
                      {bot.name} {bot.is_active ? '🟢' : '🔴'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="primary"
                  onClick={() => selectedBot && startBot(selectedBot)}
                  disabled={loading || !selectedBot}
                  style={{ flex: 1, backgroundColor: '#4CAF50' }}
                >
                  ▶️ Iniciar
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => selectedBot && stopBot(selectedBot)}
                  disabled={loading || !selectedBot}
                  style={{ flex: 1, backgroundColor: '#f44336' }}
                >
                  ⏹️ Parar
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Trading Chart Widget */}
        <Grid item xs={12}>
          <Card sx={{
            borderRadius: '12px',
            background: 'rgba(25, 45, 65, 0.8)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 212, 170, 0.1)'
          }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#00d4aa', mb: 2 }}>
                📊 Gráfico de Trading (Widget)
              </Typography>

              <Box sx={{
                height: '400px',
                border: '1px solid #333',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <iframe
                  src="https://widget.coinlib.io/widget?type=chart&theme=dark&coin_id=859&pref_coin_id=1505"
                  width="100%"
                  height="400px"
                  style={{ border: 'none' }}
                  title="Trading Chart"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Bot Status & Performance */}
        <Grid item xs={12}>
          <Card sx={{
            borderRadius: '12px',
            background: 'rgba(25, 45, 65, 0.8)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 212, 170, 0.1)'
          }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#00d4aa', mb: 2 }}>
                📈 Status dos Bots
              </Typography>

              {bots.length === 0 ? (
                <Alert severity="info">
                  Nenhum bot disponível. Acesse o <strong>Admin</strong> para adicionar bots XML.
                </Alert>
              ) : (
                <Grid container spacing={2}>
                  {bots.map((bot) => (
                    <Grid item xs={12} md={4} key={bot.id}>
                      <Card sx={{
                        background: bot.is_active ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                        border: `1px solid ${bot.is_active ? '#4CAF50' : '#f44336'}`
                      }}>
                        <CardContent>
                          <Typography variant="h6" sx={{ color: '#ffffff', mb: 1 }}>
                            {bot.name}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#ffffff' }}>
                            Status: {bot.is_active ? '🟢 Disponível' : '🔴 Inativo'}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#ffffff' }}>
                            Descrição: {bot.description || 'N/A'}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

    </Box>
  );
};

export default TradingPanel;