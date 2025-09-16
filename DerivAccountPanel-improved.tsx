// Versão melhorada do DerivAccountPanel.tsx com melhor tratamento de contas
// Esta é a versão corrigida que você deve aplicar na VPS

import React, { useState, useEffect } from 'react';
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
  Alert
} from '@mui/material';
import {
  AccountBalanceWallet,
  TrendingUp,
  TrendingDown,
  ExpandMore,
  Refresh,
  Info
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';

interface DerivAccount {
  id: string;
  balance: number;
  currency: string;
  is_virtual: boolean;
  fullname?: string;
  email?: string;
}

interface Transaction {
  id: string;
  amount: number;
  description: string;
  date: string;
}

interface ProfitLoss {
  today: number;
  total: number;
}

interface DerivAccountInfo {
  account: DerivAccount;
  transactions: Transaction[];
  profit_loss: ProfitLoss;
  warning?: string;
  available_accounts?: Array<{
    loginid: string;
    currency: string;
    is_virtual: boolean;
  }>;
}

interface DerivAccountPanelProps {
  isConnected: boolean;
  onRefresh?: () => void;
  compact?: boolean;
}

const DerivAccountPanel: React.FC<DerivAccountPanelProps> = ({ isConnected, onRefresh, compact = false }) => {
  const [accountInfo, setAccountInfo] = useState<DerivAccountInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const loadAccountInfo = async () => {
    if (!isConnected) return;

    try {
      setLoading(true);
      const response = await axios.get('/api/auth/deriv/account-info');

      // DEBUG: Log para diagnóstico
      console.log('🔍 AccountInfo DEBUG:', {
        hasAccountInfo: !!response.data,
        availableAccounts: response.data?.available_accounts,
        accountsCount: response.data?.available_accounts?.length || 0,
        currentAccount: response.data?.account,
        rawResponse: response.data
      });

      setAccountInfo(response.data);

      if (response.data.warning) {
        toast.error(response.data.warning);
      }
    } catch (error: any) {
      console.error('Erro ao carregar informações da conta:', error);
      toast.error('Erro ao carregar informações da conta Deriv');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      loadAccountInfo();
    }
  }, [isConnected]);

  const handleRefresh = () => {
    loadAccountInfo();
    if (onRefresh) onRefresh();
  };

  const handleAccountMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleAccountMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSwitchAccount = async (switchToVirtual: boolean) => {
    try {
      setLoading(true);
      handleAccountMenuClose();

      const response = await axios.post('/api/auth/deriv/switch-account', {
        is_virtual: switchToVirtual
      });

      if (response.data.success) {
        setAccountInfo(response.data.accountInfo);
        toast.success(`Conta alterada para ${switchToVirtual ? 'Virtual' : 'Real'} com sucesso!`);
      } else {
        toast.error(response.data.message || 'Erro ao trocar conta');
      }
    } catch (error: any) {
      console.error('Erro ao trocar conta:', error);
      toast.error('Erro ao trocar conta Deriv');
    } finally {
      setLoading(false);
    }
  };

  const formatBalance = (balance: number, currency: string) => {
    return `$ ${balance.toFixed(2)} ${currency}`;
  };

  const formatProfitLoss = (amount: number) => {
    const sign = amount >= 0 ? '+' : '';
    return `${sign}$ ${amount.toFixed(2)}`;
  };

  // Melhorada: Função para obter contas disponíveis com fallback
  const getAvailableAccounts = () => {
    if (!accountInfo) return [];

    // Se temos available_accounts do backend, usar elas
    if (accountInfo.available_accounts && Array.isArray(accountInfo.available_accounts) && accountInfo.available_accounts.length > 0) {
      return accountInfo.available_accounts;
    }

    // Fallback: criar lista com a conta atual
    if (accountInfo.account) {
      return [{
        loginid: accountInfo.account.id,
        currency: accountInfo.account.currency,
        is_virtual: accountInfo.account.is_virtual
      }];
    }

    return [];
  };

  // Melhorada: Função para renderizar menu de contas
  const renderAccountMenu = () => {
    const availableAccounts = getAvailableAccounts();

    console.log('🔍 Menu de contas DEBUG:', {
      availableAccountsCount: availableAccounts.length,
      availableAccounts,
      currentAccountId: accountInfo?.account.id
    });

    if (availableAccounts.length === 0) {
      return (
        <MenuItem disabled sx={{ color: '#B0B0B0' }}>
          <Box>
            <Typography variant="body2">
              Nenhuma conta disponível
            </Typography>
            <Typography variant="caption">
              Reconecte sua conta Deriv
            </Typography>
          </Box>
        </MenuItem>
      );
    }

    if (availableAccounts.length === 1) {
      const singleAccount = availableAccounts[0];
      return (
        <MenuItem disabled sx={{ color: '#B0B0B0' }}>
          <Box>
            <Typography variant="body2" sx={{ color: '#ffffff' }}>
              {singleAccount.loginid} (Única conta)
            </Typography>
            <Typography variant="caption" sx={{ color: '#B0B0B0' }}>
              {singleAccount.is_virtual ? 'Virtual' : 'Real'} • {singleAccount.currency}
            </Typography>
          </Box>
        </MenuItem>
      );
    }

    // Múltiplas contas disponíveis
    return availableAccounts.map((availableAccount) => (
      <MenuItem
        key={availableAccount.loginid}
        onClick={() => availableAccount.loginid !== accountInfo?.account.id ? handleSwitchAccount(availableAccount.is_virtual) : handleAccountMenuClose()}
        sx={{
          color: '#ffffff',
          bgcolor: availableAccount.loginid === accountInfo?.account.id ? 'rgba(0, 212, 170, 0.1)' : 'transparent'
        }}
      >
        <Box>
          <Typography variant="body2" sx={{
            color: availableAccount.loginid === accountInfo?.account.id ? '#00D4AA' : '#ffffff'
          }}>
            {availableAccount.loginid} {availableAccount.loginid === accountInfo?.account.id ? '(Atual)' : ''}
          </Typography>
          <Typography variant="caption" sx={{ color: '#B0B0B0' }}>
            {availableAccount.is_virtual ? 'Virtual' : 'Real'} • {availableAccount.currency}
          </Typography>
        </Box>
      </MenuItem>
    ));
  };

  if (!isConnected) {
    return compact ? (
      <Box sx={{
        p: 2,
        mb: 2,
        bgcolor: 'rgba(33, 150, 243, 0.1)',
        border: '1px solid rgba(33, 150, 243, 0.3)',
        borderRadius: 1
      }}>
        <Typography variant="body2" sx={{ color: '#2196F3', textAlign: 'center' }}>
          Conecte sua conta Deriv para ver saldo
        </Typography>
      </Box>
    ) : (
      <Card sx={{ mb: 2, background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)' }}>
        <CardContent>
          <Alert severity="info" sx={{ bgcolor: 'rgba(33, 150, 243, 0.1)', border: '1px solid rgba(33, 150, 243, 0.3)' }}>
            Conecte sua conta Deriv para ver saldo e informações
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (loading && !accountInfo) {
    return (
      <Card sx={{ mb: 2, background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)' }}>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 3 }}>
          <CircularProgress size={24} />
          <Typography variant="body2" sx={{ ml: 2, color: '#ffffff' }}>
            Carregando informações da conta...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // Versão compacta integrada
  if (compact) {
    const availableAccounts = getAvailableAccounts();
    const hasMultipleAccounts = availableAccounts.length > 1;

    return (
      <Box sx={{
        mb: 2,
        p: 2,
        background: 'rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(0, 212, 170, 0.3)',
        borderRadius: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountBalanceWallet sx={{ color: '#00D4AA', fontSize: '1.2rem' }} />
            <Typography variant="body2" sx={{ color: '#B0B0B0', fontSize: '0.8rem' }}>
              {accountInfo?.account.is_virtual ? 'Conta Virtual' : 'Conta Real'}
            </Typography>
            <Chip
              label={accountInfo?.account.id || 'N/A'}
              size="small"
              sx={{
                bgcolor: 'rgba(0, 212, 170, 0.2)',
                color: '#00D4AA',
                fontSize: '0.6rem',
                height: '18px'
              }}
            />
            {/* Indicador de múltiplas contas */}
            {hasMultipleAccounts && (
              <Chip
                label={`${availableAccounts.length} contas`}
                size="small"
                sx={{
                  bgcolor: 'rgba(255, 193, 7, 0.2)',
                  color: '#FFC107',
                  fontSize: '0.6rem',
                  height: '18px'
                }}
              />
            )}
          </Box>
          <IconButton
            onClick={handleRefresh}
            disabled={loading}
            sx={{ p: 0.5, color: '#B0B0B0' }}
          >
            <Refresh fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography
            variant="h6"
            sx={{
              color: '#ffffff',
              fontWeight: 'bold',
              fontSize: '1rem',
              cursor: hasMultipleAccounts ? 'pointer' : 'default'
            }}
            onClick={hasMultipleAccounts ? handleAccountMenuOpen : undefined}
          >
            {accountInfo ? formatBalance(accountInfo.account.balance, accountInfo.account.currency) : '$ 0,00 USD'}
            {hasMultipleAccounts && <ExpandMore sx={{ color: '#B0B0B0', fontSize: '0.9rem', ml: 0.5 }} />}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {accountInfo && accountInfo.profit_loss.total >= 0 ? (
              <TrendingUp sx={{ color: '#4CAF50', fontSize: '0.9rem' }} />
            ) : (
              <TrendingDown sx={{ color: '#F44336', fontSize: '0.9rem' }} />
            )}
            <Typography
              variant="body2"
              sx={{
                color: accountInfo && accountInfo.profit_loss.total >= 0 ? '#4CAF50' : '#F44336',
                fontWeight: 'bold',
                fontSize: '0.9rem'
              }}
            >
              {accountInfo ? formatProfitLoss(accountInfo.profit_loss.total) : '$ 0,00'}
            </Typography>
          </Box>
        </Box>

        {/* Menu de Contas - Só aparece se há múltiplas contas */}
        {hasMultipleAccounts && (
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleAccountMenuClose}
            PaperProps={{
              sx: {
                bgcolor: '#2d2d2d',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            {renderAccountMenu()}
          </Menu>
        )}

        {/* Informação para conta única */}
        {!hasMultipleAccounts && availableAccounts.length === 1 && (
          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Info sx={{ color: '#B0B0B0', fontSize: '0.8rem' }} />
            <Typography variant="caption" sx={{ color: '#B0B0B0', fontSize: '0.7rem' }}>
              Conta única disponível
            </Typography>
          </Box>
        )}
      </Box>
    );
  }

  // Versão completa original (com as mesmas melhorias)
  return (
    <Card sx={{
      mb: 2,
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <CardContent sx={{ p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          {/* Informações da Conta */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccountBalanceWallet sx={{ color: '#00D4AA' }} />
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ color: '#B0B0B0', fontSize: '0.85rem' }}>
                    {accountInfo?.account.is_virtual ? 'Conta Virtual' : 'Conta Real'}
                  </Typography>
                  <Chip
                    label={accountInfo?.account.id || 'N/A'}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(0, 212, 170, 0.2)',
                      color: '#00D4AA',
                      fontSize: '0.7rem',
                      height: '20px'
                    }}
                  />
                  {/* Indicador de múltiplas contas */}
                  {getAvailableAccounts().length > 1 && (
                    <Chip
                      label={`${getAvailableAccounts().length} contas`}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(255, 193, 7, 0.2)',
                        color: '#FFC107',
                        fontSize: '0.7rem',
                        height: '20px'
                      }}
                    />
                  )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      color: '#ffffff',
                      fontWeight: 'bold',
                      fontSize: '1.1rem',
                      cursor: getAvailableAccounts().length > 1 ? 'pointer' : 'default'
                    }}
                    onClick={getAvailableAccounts().length > 1 ? handleAccountMenuOpen : undefined}
                  >
                    {accountInfo ? formatBalance(accountInfo.account.balance, accountInfo.account.currency) : '$ 0,00 USD'}
                  </Typography>
                  {getAvailableAccounts().length > 1 && (
                    <ExpandMore sx={{ color: '#B0B0B0', fontSize: '1rem' }} />
                  )}
                  <IconButton
                    onClick={handleRefresh}
                    disabled={loading}
                    sx={{ p: 0.5, color: '#B0B0B0' }}
                  >
                    <Refresh fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </Box>
          </Grid>

          {/* Lucro/Prejuízo */}
          <Grid item xs={12} md={6}>
            <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
              <Typography variant="body2" sx={{ color: '#B0B0B0', fontSize: '0.85rem' }}>
                Lucro/Prejuízo
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                {accountInfo && accountInfo.profit_loss.total >= 0 ? (
                  <TrendingUp sx={{ color: '#4CAF50', fontSize: '1rem' }} />
                ) : (
                  <TrendingDown sx={{ color: '#F44336', fontSize: '1rem' }} />
                )}
                <Typography
                  variant="h6"
                  sx={{
                    color: accountInfo && accountInfo.profit_loss.total >= 0 ? '#4CAF50' : '#F44336',
                    fontWeight: 'bold',
                    fontSize: '1.1rem'
                  }}
                >
                  {accountInfo ? formatProfitLoss(accountInfo.profit_loss.total) : '$ 0,00'}
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Contador de Operações */}
          <Grid item xs={12}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              p: 1,
              bgcolor: 'rgba(0, 212, 170, 0.1)',
              borderRadius: 1,
              border: '1px solid rgba(0, 212, 170, 0.3)'
            }}>
              <Typography variant="body2" sx={{ color: '#00D4AA', fontWeight: 'bold' }}>
                Operações
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip label="0" size="small" sx={{ bgcolor: '#4CAF50', color: 'white', minWidth: '32px' }} />
                <Chip label="0" size="small" sx={{ bgcolor: '#F44336', color: 'white', minWidth: '32px' }} />
                <Chip label="0" size="small" sx={{ bgcolor: '#FF9800', color: 'white', minWidth: '32px' }} />
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Menu de Contas - Versão completa */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleAccountMenuClose}
          PaperProps={{
            sx: {
              bgcolor: '#2d2d2d',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }
          }}
        >
          {renderAccountMenu()}
        </Menu>
      </CardContent>
    </Card>
  );
};

export default DerivAccountPanel;