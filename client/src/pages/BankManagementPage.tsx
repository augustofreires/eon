import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  LinearProgress,
  Fab,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  AccountBalance,
  TrendingUp,
  TrendingDown,
  Add,
  Edit,
  Settings,
  Assessment,
  MonetizationOn,
  ShowChart,
  ExpandMore,
  Save,
  Refresh
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useLanguage } from '../contexts/LanguageContext';

interface BankConfig {
  id?: number;
  deposito_inicial: number;
  percentual_meta: number;
  percentual_perda: number;
}

interface BankRecord {
  id?: number;
  dia: number;
  data_operacao: string;
  stop_win: number;
  stop_loss: number;
  deposito: number;
  saldo_inicial: number;
  saldo_final: number;
  resultado: number;
  resultado_percentual: number;
  resultado_acumulado: number;
  objetivo_alcancado: 'WIN' | 'LOSS' | 'PENDING';
  observacoes?: string;
}

interface ProjectionDay {
  dia: number;
  stopWin: number;
  stopLoss: number;
  deposito: number;
  saldoInicial: number;
  saldoFinal: number;
  resultado: number;
  resultadoPercentual: number;
  resultadoAcumulado: number;
}

const BankManagementPage: React.FC = () => {
  const { t } = useLanguage();
  const [config, setConfig] = useState<BankConfig>({
    deposito_inicial: 100.00,
    percentual_meta: 5.00,
    percentual_perda: 9.00
  });
  const [projection, setProjection] = useState<ProjectionDay[]>([]);
  const [records, setRecords] = useState<BankRecord[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BankRecord | null>(null);
  const [recordForm, setRecordForm] = useState({
    dia: 1,
    data_operacao: new Date().toISOString().split('T')[0],
    saldo_final: '',
    resultado: '',
    objetivo_alcancado: 'PENDING',
    observacoes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadConfig(),
        loadProjection(),
        loadRecords(),
        loadStatistics()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const response = await axios.get('/api/bank-management/config');
      if (response.data.config) {
        setConfig(response.data.config);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    }
  };

  const loadProjection = async () => {
    try {
      const response = await axios.get('/api/bank-management/projection?dias=30');
      if (response.data.projection) {
        setProjection(response.data.projection);
      }
    } catch (error) {
      console.error('Erro ao carregar projeção:', error);
    }
  };

  const loadRecords = async () => {
    try {
      const response = await axios.get(`/api/bank-management/records?_t=${Date.now()}`);
      if (response.data.records) {
        console.log('🔍 Registros recebidos da API:', response.data.records.map((r: any) => ({ dia: r.dia, data: r.data_operacao })));
        setRecords(response.data.records);
      }
    } catch (error) {
      console.error('Erro ao carregar registros:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await axios.get('/api/bank-management/statistics');
      if (response.data) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleSaveConfig = async () => {
    try {
      await axios.post('/api/bank-management/config', config);
      toast.success(t('bank.configSavedSuccess'));
      setConfigDialogOpen(false);
      loadProjection(); // Recarregar projeção com nova configuração
    } catch (error: any) {
      console.error('Erro ao salvar configuração:', error);
      toast.error(error.response?.data?.error || 'Erro ao salvar configuração');
    }
  };

  const handleSaveRecord = async () => {
    if (!recordForm.saldo_final || !recordForm.resultado) {
      toast.error(t('bank.fillRequiredFields'));
      return;
    }
    
    const recordData = {
      dia: recordForm.dia,
      data_operacao: recordForm.data_operacao,
      saldo_final: parseFloat(recordForm.saldo_final),
      resultado: parseFloat(recordForm.resultado),
      objetivo_alcancado: recordForm.objetivo_alcancado as 'WIN' | 'LOSS' | 'PENDING',
      observacoes: recordForm.observacoes
    };

    await handleAddRecord(recordData);
  };

  const handleAddRecord = async (recordData: Partial<BankRecord>) => {
    try {
      if (editingRecord) {
        await axios.put(`/api/bank-management/record/${editingRecord.id}`, recordData);
        toast.success(t('bank.recordUpdatedSuccess'));
      } else {
        await axios.post('/api/bank-management/record', recordData);
        toast.success(t('bank.recordAddedSuccess'));
      }
      setRecordDialogOpen(false);
      setEditingRecord(null);
      loadData(); // Recarregar tudo para atualizar estatísticas
    } catch (error: any) {
      console.error('Erro ao salvar registro:', error);
      toast.error(error.response?.data?.error || 'Erro ao salvar registro');
    }
  };

  const getResultColor = (resultado: number) => {
    if (resultado > 0) return 'success';
    if (resultado < 0) return 'error';
    return 'default';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WIN': return 'success';
      case 'LOSS': return 'error';
      default: return 'warning';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    // Adiciona T00:00:00 para evitar problemas de fuso horário
    return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const ConfigDialog = () => (
    <Dialog open={configDialogOpen} onClose={() => setConfigDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ 
        background: 'var(--button-gradient)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        <Settings />
        {t('bank.configTitle')}
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              label={t('bank.initialDeposit')}
              type="number"
              value={config.deposito_inicial}
              onChange={(e) => setConfig(prev => ({ ...prev, deposito_inicial: parseFloat(e.target.value) || 0 }))}
              fullWidth
              inputProps={{ step: 0.01, min: 0 }}
              helperText={t('bank.initialBankValue')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label={t('bank.dailyTarget')}
              type="number"
              value={config.percentual_meta}
              onChange={(e) => setConfig(prev => ({ ...prev, percentual_meta: parseFloat(e.target.value) || 0 }))}
              fullWidth
              inputProps={{ step: 0.1, min: 0.1, max: 50 }}
              helperText={t('bank.desiredDailyGain')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Stop Loss (%)"
              type="number"
              value={config.percentual_perda}
              onChange={(e) => setConfig(prev => ({ ...prev, percentual_perda: parseFloat(e.target.value) || 0 }))}
              fullWidth
              inputProps={{ step: 0.1, min: 0.1, max: 50 }}
              helperText={t('bank.maxDailyLoss')}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setConfigDialogOpen(false)}>{t('common.cancel')}</Button>
        <Button variant="contained" startIcon={<Save />} onClick={handleSaveConfig}>
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );

  const StatisticsCards = () => {
    if (!statistics) return null;

    return (
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card className="theme-card" sx={{ textAlign: 'center' }}>
            <CardContent>
              <AccountBalance sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {formatCurrency(config.deposito_inicial)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('bank.initialCapital')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card className="theme-card" sx={{ textAlign: 'center' }}>
            <CardContent>
              <TrendingUp sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {statistics.statistics.dias_positivos || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('bank.positiveDays')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card className="theme-card" sx={{ textAlign: 'center' }}>
            <CardContent>
              <TrendingDown sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold" color="error.main">
                {statistics.statistics.dias_negativos || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('bank.negativeDays')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card className="theme-card" sx={{ textAlign: 'center' }}>
            <CardContent>
              <Assessment sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold" color="info.main">
                {statistics.performance.win_rate}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('bank.hitRate')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" className="theme-text-gradient" sx={{ 
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <MonetizationOn sx={{ fontSize: '2.5rem', color: 'primary.main' }} />
          {t('bank.title')}
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadData}
            disabled={loading}
          >
            {t('bank.refresh')}
          </Button>
          <Button
            variant="contained"
            startIcon={<Settings />}
            onClick={() => setConfigDialogOpen(true)}
            sx={{ background: 'var(--button-gradient)' }}
          >
            {t('bank.configure')}
          </Button>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 3, borderRadius: '4px' }} />}

      {/* Statistics */}
      <StatisticsCards />

      {/* Config Info */}
      <Card className="theme-card" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShowChart />
            {t('bank.currentConfig')}
          </Typography>
          <Grid container spacing={2}>
            <Grid item>
              <Chip 
                label={`${t('bank.target')}: ${config.percentual_meta}%`} 
                color="success" 
                sx={{ fontWeight: 'bold' }} 
              />
            </Grid>
            <Grid item>
              <Chip 
                label={`Stop Loss: ${config.percentual_perda}%`} 
                color="error"
                sx={{ fontWeight: 'bold' }} 
              />
            </Grid>
            <Grid item>
              <Chip 
                label={`${t('bank.capital')}: ${formatCurrency(config.deposito_inicial)}`} 
                color="primary"
                sx={{ fontWeight: 'bold' }} 
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Projeção */}
      <Accordion defaultExpanded sx={{ mb: 3, borderRadius: '16px !important' }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Assessment />
            {t('bank.growthProjection')}
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: 'rgba(var(--primary-rgb), 0.1)' }}>
                  <TableCell><strong>{t('bank.day')}</strong></TableCell>
                  <TableCell><strong>{t('bank.stopWin')}</strong></TableCell>
                  <TableCell><strong>{t('bank.stopLoss')}</strong></TableCell>
                  <TableCell><strong>{t('bank.deposit')}</strong></TableCell>
                  <TableCell><strong>{t('bank.finalBalance')}</strong></TableCell>
                  <TableCell><strong>{t('bank.result')}</strong></TableCell>
                  <TableCell><strong>{t('bank.accumulated')}</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {projection.slice(0, 30).map((day) => (
                  <TableRow key={day.dia} hover>
                    <TableCell>{day.dia.toString().padStart(2, '0')}</TableCell>
                    <TableCell>{formatCurrency(day.stopWin)}</TableCell>
                    <TableCell>{formatCurrency(day.stopLoss)}</TableCell>
                    <TableCell>{formatCurrency(day.deposito)}</TableCell>
                    <TableCell>{formatCurrency(day.saldoFinal)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={`${formatCurrency(day.resultado)} (${day.resultadoPercentual.toFixed(1)}%)`}
                        color="success"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography color="success.main" fontWeight="bold">
                        {formatCurrency(day.resultadoAcumulado)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>

      {/* Registros Reais */}
      <Card className="theme-card">
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Assessment />
              {t('bank.operationRecords')}
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                setRecordForm({
                  dia: records.length + 1,
                  data_operacao: new Date().toISOString().split('T')[0],
                  saldo_final: '',
                  resultado: '',
                  objetivo_alcancado: 'PENDING',
                  observacoes: ''
                });
                setEditingRecord(null);
                setRecordDialogOpen(true);
              }}
              sx={{ background: 'var(--button-gradient)' }}
            >
              {t('bank.newRecord')}
            </Button>
          </Box>

          {records.length === 0 ? (
            <Alert severity="info" sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" gutterBottom>{t('bank.noRecordsFound')}</Typography>
              <Typography variant="body1">
                {t('bank.startAddingResults')}
              </Typography>
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'rgba(var(--primary-rgb), 0.1)' }}>
                    <TableCell><strong>{t('bank.day')}</strong></TableCell>
                    <TableCell><strong>{t('bank.date')}</strong></TableCell>
                    <TableCell><strong>{t('bank.stopWin')}</strong></TableCell>
                    <TableCell><strong>{t('bank.stopLoss')}</strong></TableCell>
                    <TableCell><strong>{t('bank.result')}</strong></TableCell>
                    <TableCell><strong>{t('bank.status')}</strong></TableCell>
                    <TableCell><strong>{t('bank.accumulated')}</strong></TableCell>
                    <TableCell><strong>{t('bank.actions')}</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id} hover>
                      <TableCell>{record.dia.toString().padStart(2, '0')}</TableCell>
                      <TableCell>{formatDate(record.data_operacao)}</TableCell>
                      <TableCell>{formatCurrency(record.stop_win)}</TableCell>
                      <TableCell>{formatCurrency(record.stop_loss)}</TableCell>
                      <TableCell>
                        <Chip 
                          label={`${formatCurrency(record.resultado)} (${record.resultado_percentual.toFixed(1)}%)`}
                          color={getResultColor(record.resultado)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={record.objetivo_alcancado}
                          color={getStatusColor(record.objetivo_alcancado)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography 
                          color={record.resultado_acumulado >= 0 ? 'success.main' : 'error.main'}
                          fontWeight="bold"
                        >
                          {formatCurrency(record.resultado_acumulado)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={t('bank.edit')}>
                          <Button
                            size="small"
                            onClick={() => {
                              setEditingRecord(record);
                              setRecordForm({
                                dia: record.dia,
                                data_operacao: record.data_operacao,
                                saldo_final: record.saldo_final.toString(),
                                resultado: record.resultado.toString(),
                                objetivo_alcancado: record.objetivo_alcancado,
                                observacoes: record.observacoes || ''
                              });
                              setRecordDialogOpen(true);
                            }}
                          >
                            <Edit />
                          </Button>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ConfigDialog />
      
      {/* Diálogo de Registro */}
      <Dialog open={recordDialogOpen} onClose={() => setRecordDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ 
          background: 'var(--button-gradient)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <Add />
          {editingRecord ? t('bank.editRecord') : t('bank.newOperationRecord')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('bank.day')}
                  type="number"
                  value={recordForm.dia}
                  onChange={(e) => setRecordForm({ ...recordForm, dia: parseInt(e.target.value) || 1 })}
                  inputProps={{ min: 1 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('bank.operationDate')}
                  type="date"
                  value={recordForm.data_operacao}
                  onChange={(e) => setRecordForm({ ...recordForm, data_operacao: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={`${t('bank.finalBalance')} ($)`}
                  type="number"
                  value={recordForm.saldo_final}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRecordForm({ ...recordForm, saldo_final: e.target.value })}
                  inputProps={{ step: '0.01', min: '0' }}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={`${t('bank.result')} ($)`}
                  type="number"
                  value={recordForm.resultado}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRecordForm({ ...recordForm, resultado: e.target.value })}
                  inputProps={{ step: '0.01' }}
                  helperText={t('bank.positiveForGain')}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>{t('bank.objectiveAchieved')}</InputLabel>
                  <Select
                    value={recordForm.objetivo_alcancado}
                    label={t('bank.objectiveAchieved')}
                    onChange={(e) => setRecordForm({ ...recordForm, objetivo_alcancado: e.target.value })}
                  >
                    <MenuItem value="PENDING">{t('bank.pending')}</MenuItem>
                    <MenuItem value="WIN">{t('bank.targetReached')}</MenuItem>
                    <MenuItem value="LOSS">{t('bank.stopLoss')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('bank.observations')}
                  multiline
                  rows={3}
                  value={recordForm.observacoes}
                  onChange={(e) => setRecordForm({ ...recordForm, observacoes: e.target.value })}
                  placeholder={t('bank.addObservations')}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRecordDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button 
            variant="contained" 
            onClick={handleSaveRecord}
            disabled={!recordForm.saldo_final || !recordForm.resultado}
            startIcon={<Save />}
            sx={{ background: 'var(--button-gradient)' }}
          >
            {editingRecord ? t('bank.update') : t('common.save')} {t('bank.newRecord')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BankManagementPage;