import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Alert,
  Button,
  Tooltip,
  Badge,
  LinearProgress,
  Avatar,
  Stack
} from '@mui/material';
import {
  AccountBalanceWallet,
  TrendingUp,
  TrendingDown,
  ExpandMore,
  Refresh,
  SwapHoriz,
  Visibility,
  VisibilityOff,
  AccountBalance,
  Speed,
  Timeline,
  Warning,
  CheckCircle,
  Error as ErrorIcon
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import useDerivOperations from '../hooks/useDerivOperations';

interface DerivAccount {
  id: string;
  balance: number;
  currency: string;
  is_virtual: boolean;
  fullname?: string;
  email?: string;
  loginid: string;
}

interface Transaction {
  id: string;
  amount: number;
  description: string;
  date: string;
  type: 'buy' | 'sell' | 'deposit' | 'withdrawal';
}

interface ProfitLoss {
  today: number;
  total: number;
  percentage: number;
}

interface EnhancedDerivAccountInfo {
  account: DerivAccount;
  transactions: Transaction[];
  profit_loss: ProfitLoss;
  trading_stats: {
    total_trades: number;
    winning_trades: number;
    losing_trades: number;
    win_rate: number;
  };
  warning?: string;
  available_accounts?: Array<{
    loginid: string;
    currency: string;
    is_virtual: boolean;
    balance?: number;
  }>;
}

interface EnhancedDerivAccountPanelProps {
  isConnected: boolean;
  onRefresh?: () => void;
  compact?: boolean;
  showAdvancedStats?: boolean;
}

const EnhancedDerivAccountPanel: React.FC<EnhancedDerivAccountPanelProps> = ({
  isConnected,
  onRefresh,
  compact = false,
  showAdvancedStats = true
}) => {
  const { availableAccounts, currentAccount, fetchAccounts, switchAccount } = useAuth();
  const { accountData, formatCurrency, formatProfit } = useDerivOperations();

  const [accountInfo, setAccountInfo] = useState<EnhancedDerivAccountInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const loadAccountInfo = useCallback(async () => {
    if (!isConnected) return;

    try {
      setLoading(true);
      const response = await axios.get('/api/auth/deriv/enhanced-account-info');
      setAccountInfo(response.data);
      setLastUpdate(new Date());

      if (response.data.warning) {
        toast.error(response.data.warning);
      }
    } catch (error: any) {
      console.error('Erro ao carregar informações da conta:', error);
      toast.error('Erro ao carregar informações da conta Deriv');
    } finally {
      setLoading(false);
    }
  }, [isConnected]);

  useEffect(() => {
    if (isConnected) {
      loadAccountInfo();
      // Auto-refresh a cada 30 segundos
      const interval = setInterval(loadAccountInfo, 30000);
      return () => clearInterval(interval);
    }
  }, [isConnected, loadAccountInfo]);

  // Sincronizar com dados do WebSocket quando disponível
  useEffect(() => {
    if (accountData && accountInfo) {
      setAccountInfo(prev => prev ? {
        ...prev,
        account: {
          ...prev.account,
          balance: accountData.balance,
          currency: accountData.currency,
          loginid: accountData.loginid,
          is_virtual: accountData.is_virtual
        }
      } : null);
      setLastUpdate(new Date());
    }
  }, [accountData, accountInfo]);

  const handleRefresh = useCallback(() => {
    loadAccountInfo();
    if (availableAccounts.length === 0) {
      fetchAccounts('enhanced-panel-refresh');
    }
    if (onRefresh) onRefresh();
  }, [loadAccountInfo, availableAccounts.length, fetchAccounts, onRefresh]);

  const handleAccountMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleAccountMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSwitchAccount = async (account: any) => {
    try {
      setLoading(true);
      handleAccountMenuClose();

      await switchAccount(account, true);

      // Recarregar informações após switch
      setTimeout(() => {
        loadAccountInfo();
      }, 2000);
    } catch (error: any) {
      console.error('Erro ao trocar conta:', error);
      toast.error('Erro ao trocar conta Deriv');
    } finally {
      setLoading(false);
    }
  };

  const toggleBalanceVisibility = () => {
    setBalanceVisible(!balanceVisible);
  };

  const getAccountTypeIcon = (isVirtual: boolean) => {
    return isVirtual ? '🎮' : '💰';
  };

  const getAccountTypeColor = (isVirtual: boolean) => {
    return isVirtual ? '#2196f3' : '#4caf50';
  };

  const formatBalance = (balance: number, currency: string, hideValue: boolean = false) => {
    if (hideValue) return '****';
    return formatCurrency(balance, currency);
  };

  const getProfitLossIcon = (amount: number) => {
    return amount >= 0 ? <TrendingUp /> : <TrendingDown />;
  };

  const getProfitLossColor = (amount: number) => {
    return amount >= 0 ? '#4caf50' : '#f44336';
  };

  const getConnectionStatusIcon = () => {
    if (loading) return <CircularProgress size={16} />;
    if (isConnected) return <CheckCircle sx={{ color: '#4caf50', fontSize: 16 }} />;
    return <ErrorIcon sx={{ color: '#f44336', fontSize: 16 }} />;
  };

  if (!isConnected) {
    return compact ? (
      <Alert
        severity="info"
        sx={{
          bgcolor: 'rgba(33, 150, 243, 0.1)',
          border: '1px solid rgba(33, 150, 243, 0.3)',
          borderRadius: 1,
          mb: 2
        }}
      >
        Conecte sua conta Deriv para ver informações detalhadas
      </Alert>
    ) : (
      <Card sx={{
        mb: 2,
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <CardContent>
          <Alert
            severity="warning"
            sx={{
              bgcolor: 'rgba(255, 193, 7, 0.1)',
              border: '1px solid rgba(255, 193, 7, 0.3)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography>Conecte sua conta Deriv para acessar todas as funcionalidades</Typography>
              <Button variant="outlined" size="small" sx={{ ml: 2 }}>
                Conectar
              </Button>
            </Box>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (loading && !accountInfo) {
    return (
      <Card sx={{
        mb: 2,
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
      }}>
        <CardContent sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          py: 3
        }}>
          <CircularProgress size={24} sx={{ color: '#00d4aa' }} />
          <Typography variant="body2" sx={{ ml: 2, color: '#ffffff' }}>
            Carregando informações da conta...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // Versão compacta
  if (compact) {
    return (
      <Card sx={{
        mb: 2,
        background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.1) 0%, rgba(0, 150, 200, 0.1) 100%)',
        border: '1px solid rgba(0, 212, 170, 0.3)'
      }}>
        <CardContent sx={{ p: 2 }}>
          {/* Header compacto */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{
                width: 24,
                height: 24,
                bgcolor: getAccountTypeColor(accountInfo?.account.is_virtual || false),
                fontSize: '0.8rem'
              }}>
                {getAccountTypeIcon(accountInfo?.account.is_virtual || false)}
              </Avatar>
              <Box>
                <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 600, fontSize: '0.85rem' }}>
                  {accountInfo?.account.is_virtual ? 'Demo' : 'Real'}
                </Typography>
                <Typography variant="caption" sx={{ color: '#b0b0b0', fontSize: '0.7rem' }}>
                  {accountInfo?.account.loginid || currentAccount?.loginid}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {getConnectionStatusIcon()}
              <Tooltip title="Atualizar">
                <IconButton
                  size="small"
                  onClick={handleRefresh}
                  disabled={loading}
                  sx={{ p: 0.5, color: '#b0b0b0' }}
                >
                  <Refresh fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={balanceVisible ? 'Ocultar saldo' : 'Mostrar saldo'}>
                <IconButton
                  size="small"
                  onClick={toggleBalanceVisibility}
                  sx={{ p: 0.5, color: '#b0b0b0' }}
                >
                  {balanceVisible ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Saldo e lucro/prejuízo */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ cursor: 'pointer' }} onClick={handleAccountMenuOpen}>
              <Typography variant="h6" sx={{
                color: '#ffffff',
                fontWeight: 'bold',
                fontSize: '1.1rem'
              }}>
                {formatBalance(
                  accountInfo?.account.balance || 0,
                  accountInfo?.account.currency || 'USD',
                  !balanceVisible
                )}
                <ExpandMore sx={{ color: '#b0b0b0', fontSize: '1rem', ml: 0.5 }} />
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {getProfitLossIcon(accountInfo?.profit_loss.today || 0)}
              <Typography variant="body2" sx={{
                color: getProfitLossColor(accountInfo?.profit_loss.today || 0),
                fontWeight: 'bold',
                fontSize: '0.9rem'
              }}>
                {balanceVisible ? formatProfit(accountInfo?.profit_loss.today || 0) : '****'}
              </Typography>
            </Box>
          </Box>

          {/* Estatísticas rápidas */}
          {showAdvancedStats && accountInfo?.trading_stats && (
            <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <Grid container spacing={1}>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: '#b0b0b0', display: 'block' }}>
                      Trades
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 'bold' }}>
                      {accountInfo.trading_stats.total_trades}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: '#b0b0b0', display: 'block' }}>
                      Taxa
                    </Typography>
                    <Typography variant="body2" sx={{
                      color: accountInfo.trading_stats.win_rate >= 50 ? '#4caf50' : '#f44336',
                      fontWeight: 'bold'
                    }}>
                      {accountInfo.trading_stats.win_rate.toFixed(0)}%
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: '#b0b0b0', display: 'block' }}>
                      Lucro
                    </Typography>
                    <Typography variant="body2" sx={{
                      color: getProfitLossColor(accountInfo.profit_loss.total),
                      fontWeight: 'bold'
                    }}>
                      {accountInfo.profit_loss.percentage.toFixed(1)}%
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Última atualização */}
          {lastUpdate && (
            <Typography variant="caption" sx={{
              color: '#888',
              fontSize: '0.65rem',
              display: 'block',
              textAlign: 'center',
              mt: 1
            }}>
              Atualizado: {lastUpdate.toLocaleTimeString('pt-BR')}
            </Typography>
          )}
        </CardContent>

        {/* Menu de contas */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleAccountMenuClose}
          PaperProps={{
            sx: {
              bgcolor: '#2d2d2d',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              minWidth: 300
            }
          }}
        >
          {availableAccounts && availableAccounts.length > 0 ? (
            availableAccounts.map((account) => (
              <MenuItem
                key={account.loginid}
                onClick={() => account.loginid !== currentAccount?.loginid ? handleSwitchAccount(account) : handleAccountMenuClose()}
                sx={{
                  color: '#ffffff',
                  bgcolor: account.loginid === currentAccount?.loginid ? 'rgba(0, 212, 170, 0.1)' : 'transparent',
                  '&:hover': {
                    bgcolor: 'rgba(0, 212, 170, 0.05)'
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <Avatar sx={{
                    width: 32,
                    height: 32,
                    bgcolor: getAccountTypeColor(account.is_virtual),
                    mr: 2,
                    fontSize: '0.9rem'
                  }}>
                    {getAccountTypeIcon(account.is_virtual)}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{
                      color: account.loginid === currentAccount?.loginid ? '#00d4aa' : '#ffffff',
                      fontWeight: account.loginid === currentAccount?.loginid ? 'bold' : 'normal'
                    }}>
                      {account.loginid}
                      {account.loginid === currentAccount?.loginid && (
                        <Chip label="Ativa" size="small" sx={{ ml: 1, height: 16 }} />
                      )}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#b0b0b0' }}>
                      {account.is_virtual ? 'Virtual' : 'Real'} • {account.currency}
                    </Typography>
                  </Box>
                  {account.loginid !== currentAccount?.loginid && (
                    <SwapHoriz sx={{ color: '#b0b0b0', fontSize: 16 }} />
                  )}
                </Box>
              </MenuItem>
            ))
          ) : (
            <MenuItem onClick={handleAccountMenuClose} sx={{ color: '#ffffff' }}>
              <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                Nenhuma conta disponível
              </Typography>
            </MenuItem>
          )}
        </Menu>
      </Card>
    );
  }

  // Versão completa - implementar se necessário
  return (
    <Card sx={{
      mb: 2,
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
          Versão completa em desenvolvimento...
        </Typography>
      </CardContent>
    </Card>
  );
};

export default EnhancedDerivAccountPanel;