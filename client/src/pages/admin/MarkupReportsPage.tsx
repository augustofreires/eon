import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  Alert,
  CircularProgress,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  AccountBalanceWallet,
  Assessment,
  Refresh,
  Timeline,
  CalendarToday
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';

interface MarkupStats {
  totalRevenue: number;
  monthlyRevenue: number;
  totalContracts: number;
  averageMarkup: number;
  lastUpdated: string;
}

interface MonthlyStats {
  month: string;
  year: number;
  revenue: number;
  contracts: number;
}

interface Transaction {
  date: string;
  contractId: string;
  userId: string;
  userName: string;
  contractType: string;
  stake: number;
  payout: number;
  markupAmount: number;
  markupPercentage: number;
}

const MarkupReportsPage: React.FC = () => {
  const [stats, setStats] = useState<MarkupStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);

  const loadMonthlyData = useCallback(async () => {
    try {
      const response = await axios.get(`/api/admin/markup-monthly?month=${selectedMonth}&year=${selectedYear}`);
      setMonthlyStats(response.data);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error('Erro ao carregar dados mensais:', error);
      }
      // Se não encontrar dados para o mês, define como zero
      setMonthlyStats({
        month: selectedMonth.toString().padStart(2, '0'),
        year: selectedYear,
        revenue: 0,
        contracts: 0
      });
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    loadMarkupData();
  }, []);

  useEffect(() => {
    loadMonthlyData();
  }, [selectedMonth, selectedYear, loadMonthlyData]);

  const loadMarkupData = async () => {
    setLoading(true);
    try {
      // Carregar estatísticas gerais
      const statsResponse = await axios.get('/api/admin/markup-stats');
      setStats(statsResponse.data);

      // Carregar transações recentes
      const transactionsResponse = await axios.get('/api/admin/markup-transactions');
      setTransactions(transactionsResponse.data.transactions || []);

    } catch (error: any) {
      console.error('Erro ao carregar dados de markup:', error);
      if (error.response?.status !== 404) {
        toast.error('Erro ao carregar dados de markup');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await axios.post('/api/admin/sync-markup-data');
      await loadMarkupData();
      await loadMonthlyData();
      toast.success('Dados sincronizados com sucesso!');
    } catch (error) {
      console.error('Erro ao sincronizar dados:', error);
      toast.error('Erro ao sincronizar dados com a Deriv');
    } finally {
      setRefreshing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Relatórios de Markup Deriv
        </Typography>
        <Button
          variant="outlined"
          startIcon={refreshing ? <CircularProgress size={20} /> : <Refresh />}
          onClick={handleRefresh}
          disabled={refreshing}
          sx={{ borderRadius: '12px' }}
        >
          {refreshing ? 'Sincronizando...' : 'Sincronizar Dados'}
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Como funciona:</strong> Os dados de markup são sincronizados automaticamente com a Deriv API. 
          Comissões são pagas na sua conta Deriv por volta do dia 15 de cada mês.
        </Typography>
      </Alert>

      {/* Estatísticas Principais */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <AccountBalanceWallet sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main' }}>
                {stats ? formatCurrency(stats.totalRevenue * 0.5) : '--'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Seus Ganhos Totais
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                50% do markup gerado
              </Typography>
            </CardContent>
          </Card>
        </Grid>


        <Grid item xs={12} sm={6} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Assessment sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'info.main' }}>
                {stats ? stats.totalContracts.toLocaleString() : '--'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Contratos Executados
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Total de operações
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Histórico Mensal */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
              <CalendarToday sx={{ mr: 1, color: 'primary.main' }} />
              Histórico Mensal de Faturamento
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Mês</InputLabel>
                <Select
                  value={selectedMonth}
                  label="Mês"
                  onChange={(e) => setSelectedMonth(e.target.value as number)}
                >
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(month => (
                    <MenuItem key={month} value={month}>
                      {new Date(0, month - 1).toLocaleDateString('pt-BR', { month: 'long' })}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel>Ano</InputLabel>
                <Select
                  value={selectedYear}
                  label="Ano"
                  onChange={(e) => setSelectedYear(e.target.value as number)}
                >
                  {[2023, 2024, 2025, 2026].map(year => (
                    <MenuItem key={year} value={year}>{year}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, textAlign: 'center', background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(33, 150, 243, 0.05) 100%)' }}>
                <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 700 }}>
                  {monthlyStats ? formatCurrency(monthlyStats.revenue) : '--'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Markup Total do Mês
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, textAlign: 'center', background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.05) 100%)' }}>
                <Typography variant="h4" sx={{ color: 'success.main', fontWeight: 700 }}>
                  {monthlyStats ? formatCurrency(monthlyStats.revenue * 0.5) : '--'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Sua Parte (50%)
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, textAlign: 'center', background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(255, 152, 0, 0.05) 100%)' }}>
                <Typography variant="h4" sx={{ color: 'warning.main', fontWeight: 700 }}>
                  {monthlyStats ? monthlyStats.contracts.toLocaleString() : '--'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Contratos do Mês
                </Typography>
              </Paper>
            </Grid>
          </Grid>
          
          {monthlyStats && monthlyStats.revenue === 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                Nenhum faturamento encontrado para {new Date(0, selectedMonth - 1).toLocaleDateString('pt-BR', { month: 'long' })} de {selectedYear}.
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>


      {/* Status da Sincronização */}
      {stats && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Última atualização:</strong> {formatDate(stats.lastUpdated)}
            <br />
            <strong>Sistema:</strong> Integração ativa com a Deriv | <strong>Divisão:</strong> 50% Admin / 50% Plataforma
          </Typography>
        </Alert>
      )}

      {/* Transações Recentes */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Timeline sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Transações Recentes
            </Typography>
            <Chip 
              label={`${transactions.length} registros`} 
              color="primary" 
              size="small" 
              sx={{ ml: 2 }}
            />
          </Box>

          {transactions.length > 0 ? (
            <TableContainer component={Paper} elevation={0}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Data</strong></TableCell>
                    <TableCell><strong>Usuário</strong></TableCell>
                    <TableCell><strong>Tipo</strong></TableCell>
                    <TableCell align="right"><strong>Stake</strong></TableCell>
                    <TableCell align="right"><strong>Payout</strong></TableCell>
                    <TableCell align="right"><strong>Markup %</strong></TableCell>
                    <TableCell align="right"><strong>Markup Total</strong></TableCell>
                    <TableCell align="right"><strong>Sua Parte (50%)</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.map((transaction, index) => (
                    <TableRow key={index} hover>
                      <TableCell>{formatDate(transaction.date)}</TableCell>
                      <TableCell>{transaction.userName}</TableCell>
                      <TableCell>
                        <Chip 
                          label={transaction.contractType} 
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">{formatCurrency(transaction.stake)}</TableCell>
                      <TableCell align="right">{formatCurrency(transaction.payout)}</TableCell>
                      <TableCell align="right">
                        <Chip 
                          label={`${(transaction.markupPercentage * 100).toFixed(1)}%`}
                          color="success"
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: 'warning.main' }}>
                        {formatCurrency(transaction.markupAmount)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {formatCurrency(transaction.markupAmount * 0.5)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">
              <Typography variant="body2">
                Nenhuma transação encontrada. Os dados serão atualizados automaticamente conforme os usuários executam operações.
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Informações Adicionais */}
      <Box sx={{ mt: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              📊 Como Funciona o Sistema de Markup
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>• Cálculo Automático:</strong> O markup é aplicado automaticamente em todos os contratos
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>• Taxa Máxima:</strong> Até 3% sobre o payout potencial de cada contrato
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>• Pagamento:</strong> Comissões são creditadas na sua conta Deriv mensalmente
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>• Integração Segura:</strong> Sistema configurado para máxima rentabilidade
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>• Rastreamento:</strong> Dados sincronizados em tempo real com a Deriv API
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>• Transparência:</strong> Relatórios detalhados de todas as transações
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default MarkupReportsPage;