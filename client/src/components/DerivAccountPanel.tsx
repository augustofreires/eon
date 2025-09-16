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
  Refresh
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

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
  compact?: boolean; // Para versão compacta integrada
}

const DerivAccountPanel: React.FC<DerivAccountPanelProps> = ({ isConnected, onRefresh, compact = false }) => {
  const { availableAccounts, currentAccount, fetchAccounts, switchAccount } = useAuth();
  const [accountInfo, setAccountInfo] = useState<DerivAccountInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const loadAccountInfo = async () => {
    if (!isConnected) return;
    
    try {
      setLoading(true);
      const response = await axios.get('/api/auth/deriv/account-info');
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
      // Só carregar contas se ainda não foram carregadas
      if (availableAccounts.length === 0) {
        console.log('🔄 DerivAccountPanel: Buscando contas (não há contas carregadas)');
        fetchAccounts('account-panel');
      } else {
        console.log('✅ DerivAccountPanel: Contas já carregadas:', {
          total: availableAccounts.length,
          current: currentAccount?.loginid || 'N/A'
        });
      }
    }
  }, [isConnected]);

  const handleRefresh = () => {
    loadAccountInfo();
    fetchAccounts('manual-refresh'); // Buscar contas disponíveis
    if (onRefresh) onRefresh();
  };

  const handleAccountMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleAccountMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSwitchAccount = async (account: any) => {
    try {
      console.log('🔄 DerivAccountPanel: Iniciando switch de conta:', {
        from: currentAccount?.loginid || 'N/A',
        to: account.loginid,
        is_virtual: account.is_virtual
      });

      setLoading(true);
      handleAccountMenuClose();

      await switchAccount(account);

      console.log('✅ DerivAccountPanel: Switch concluído, recarregando informações...');

      // Recarregar informações da conta após trocar
      setTimeout(() => {
        loadAccountInfo();
      }, 1500); // Aumentar delay para garantir que o backend processou
    } catch (error: any) {
      console.error('❌ DerivAccountPanel: Erro ao trocar conta:', error);
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
              cursor: 'pointer'
            }}
            onClick={handleAccountMenuOpen}
          >
            {accountInfo ? formatBalance(accountInfo.account.balance, accountInfo.account.currency) : '$ 0,00 USD'}
            <ExpandMore sx={{ color: '#B0B0B0', fontSize: '0.9rem', ml: 0.5 }} />
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

        {/* Menu de Contas */}
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
          {/* Show all available accounts from AuthContext */}
          {(() => {
            console.log('🔍 DerivAccountPanel: Renderizando menu de contas:', {
              availableAccounts: availableAccounts?.length || 0,
              currentAccount: currentAccount?.loginid || 'N/A',
              accounts: availableAccounts?.map(acc => ({
                loginid: acc.loginid,
                is_virtual: acc.is_virtual,
                currency: acc.currency
              })) || []
            });

            return availableAccounts && availableAccounts.length > 0 ? (
              availableAccounts.map((availableAccount) => (
                <MenuItem
                  key={availableAccount.loginid}
                  onClick={() => availableAccount.loginid !== currentAccount?.loginid ? handleSwitchAccount(availableAccount) : handleAccountMenuClose()}
                  sx={{
                    color: '#ffffff',
                    bgcolor: availableAccount.loginid === currentAccount?.loginid ? 'rgba(0, 212, 170, 0.1)' : 'transparent'
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{
                      color: availableAccount.loginid === currentAccount?.loginid ? '#00D4AA' : '#ffffff'
                    }}>
                      {availableAccount.loginid} {availableAccount.loginid === currentAccount?.loginid ? '(Atual)' : ''}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#B0B0B0' }}>
                      {availableAccount.is_virtual ? 'Virtual' : 'Real'} • {availableAccount.currency}
                    </Typography>
                  </Box>
                </MenuItem>
              ))
            ) : (
              // Fallback: sem contas disponíveis
              <MenuItem onClick={handleAccountMenuClose} sx={{ color: '#ffffff' }}>
                <Box>
                  <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
                    Nenhuma conta disponível
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#888' }}>
                    {availableAccounts?.length === 0 ? 'Lista vazia' : 'Aguardando carregamento...'}
                  </Typography>
                </Box>
              </MenuItem>
            );
          })()}
        </Menu>
      </Box>
    );
  }

  // Versão completa original
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
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      color: '#ffffff', 
                      fontWeight: 'bold',
                      fontSize: '1.1rem',
                      cursor: 'pointer'
                    }}
                    onClick={handleAccountMenuOpen}
                  >
                    {accountInfo ? formatBalance(accountInfo.account.balance, accountInfo.account.currency) : '$ 0,00 USD'}
                  </Typography>
                  <ExpandMore sx={{ color: '#B0B0B0', fontSize: '1rem' }} />
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

        {/* Menu de Contas */}
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
          {/* Show all available accounts from AuthContext */}
          {(() => {
            console.log('🔍 DerivAccountPanel: Renderizando menu de contas:', {
              availableAccounts: availableAccounts?.length || 0,
              currentAccount: currentAccount?.loginid || 'N/A',
              accounts: availableAccounts?.map(acc => ({
                loginid: acc.loginid,
                is_virtual: acc.is_virtual,
                currency: acc.currency
              })) || []
            });

            return availableAccounts && availableAccounts.length > 0 ? (
              availableAccounts.map((availableAccount) => (
                <MenuItem
                  key={availableAccount.loginid}
                  onClick={() => availableAccount.loginid !== currentAccount?.loginid ? handleSwitchAccount(availableAccount) : handleAccountMenuClose()}
                  sx={{
                    color: '#ffffff',
                    bgcolor: availableAccount.loginid === currentAccount?.loginid ? 'rgba(0, 212, 170, 0.1)' : 'transparent'
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{
                      color: availableAccount.loginid === currentAccount?.loginid ? '#00D4AA' : '#ffffff'
                    }}>
                      {availableAccount.loginid} {availableAccount.loginid === currentAccount?.loginid ? '(Atual)' : ''}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#B0B0B0' }}>
                      {availableAccount.is_virtual ? 'Virtual' : 'Real'} • {availableAccount.currency}
                    </Typography>
                  </Box>
                </MenuItem>
              ))
            ) : (
              // Fallback: sem contas disponíveis
              <MenuItem onClick={handleAccountMenuClose} sx={{ color: '#ffffff' }}>
                <Box>
                  <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
                    Nenhuma conta disponível
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#888' }}>
                    {availableAccounts?.length === 0 ? 'Lista vazia' : 'Aguardando carregamento...'}
                  </Typography>
                </Box>
              </MenuItem>
            );
          })()}
        </Menu>
      </CardContent>
    </Card>
  );
};

export default DerivAccountPanel;