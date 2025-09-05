import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  ExpandMore,
  Payment,
  Settings,
  Link as LinkIcon,
  Check,
  Error,
  Info,
  Add,
  Edit,
  Delete,
  ContentCopy,
  Webhook
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';

interface PaymentPlatform {
  id: number;
  name: string;
  enabled: boolean;
  webhook_url: string;
  secret_key?: string;
  config: {
    [key: string]: string;
  };
  status: 'active' | 'inactive' | 'error';
  last_webhook?: string;
  created_at: string;
}

const PaymentPlatformsPage: React.FC = () => {
  const [platforms, setPlatforms] = useState<PaymentPlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<PaymentPlatform | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    enabled: true,
    secret_key: '',
    config: {} as { [key: string]: string }
  });

  const platformTemplates = [
    {
      name: 'Perfectpay',
      icon: '💳',
      fields: [
        { key: 'api_key', label: 'API Key', required: true },
        { key: 'product_id', label: 'ID do Produto', required: true },
        { key: 'validation_token', label: 'Token de Validação', required: true }
      ]
    },
    {
      name: 'Hotmart',
      icon: '🔥',
      fields: [
        { key: 'client_id', label: 'Client ID', required: true },
        { key: 'client_secret', label: 'Client Secret', required: true },
        { key: 'product_id', label: 'ID do Produto', required: true }
      ]
    },
    {
      name: 'Kirvano',
      icon: '⚡',
      fields: [
        { key: 'api_token', label: 'API Token', required: true },
        { key: 'product_id', label: 'ID do Produto', required: true }
      ]
    },
    {
      name: 'Monetizze',
      icon: '💰',
      fields: [
        { key: 'consumer_key', label: 'Consumer Key', required: true },
        { key: 'consumer_token', label: 'Consumer Token', required: true },
        { key: 'product_id', label: 'ID do Produto', required: true }
      ]
    }
  ];

  useEffect(() => {
    loadPlatforms();
  }, []);

  const loadPlatforms = async () => {
    try {
      const response = await axios.get('/api/admin/payment-platforms');
      setPlatforms(response.data);
    } catch (error) {
      console.error('Erro ao carregar plataformas:', error);
      toast.error('Erro ao carregar plataformas de pagamento');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlatform = async () => {
    try {
      const data = {
        ...formData,
        config: Object.fromEntries(
          Object.entries(formData.config).filter(([_, value]) => value.trim() !== '')
        )
      };

      if (editingPlatform) {
        await axios.put(`/api/admin/payment-platforms/${editingPlatform.id}`, data);
        toast.success('Plataforma atualizada com sucesso!');
      } else {
        await axios.post('/api/admin/payment-platforms', data);
        toast.success('Plataforma adicionada com sucesso!');
      }

      setDialogOpen(false);
      setEditingPlatform(null);
      resetForm();
      loadPlatforms();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Erro ao salvar plataforma';
      toast.error(message);
    }
  };

  const handleDeletePlatform = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir esta plataforma?')) return;

    try {
      await axios.delete(`/api/admin/payment-platforms/${id}`);
      toast.success('Plataforma excluída com sucesso!');
      loadPlatforms();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Erro ao excluir plataforma';
      toast.error(message);
    }
  };

  const handleTogglePlatform = async (platform: PaymentPlatform) => {
    try {
      await axios.put(`/api/admin/payment-platforms/${platform.id}`, {
        ...platform,
        enabled: !platform.enabled
      });
      toast.success(`Plataforma ${!platform.enabled ? 'ativada' : 'desativada'} com sucesso!`);
      loadPlatforms();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Erro ao alterar status';
      toast.error(message);
    }
  };

  const handleEditPlatform = (platform: PaymentPlatform) => {
    setEditingPlatform(platform);
    setFormData({
      name: platform.name,
      enabled: platform.enabled,
      secret_key: platform.secret_key || '',
      config: { ...platform.config }
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      enabled: true,
      secret_key: '',
      config: {}
    });
  };

  const copyWebhookUrl = (platform: PaymentPlatform) => {
    navigator.clipboard.writeText(platform.webhook_url);
    toast.success('URL do webhook copiada!');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Check />;
      case 'error': return <Error />;
      default: return <Info />;
    }
  };

  return (
    <Box p={3}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" gutterBottom className="theme-text-gradient" sx={{ 
          fontWeight: 700,
          mb: 1
        }}>
          Plataformas de Pagamento
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ 
          fontSize: '1.1rem',
          fontWeight: 500 
        }}>
          Configure webhooks para integração automática com plataformas de venda
        </Typography>
      </Box>

      {/* Botão Adicionar */}
      <Box mb={3}>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
          sx={{
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            background: 'var(--button-gradient)',
            boxShadow: '0 4px 12px rgba(0, 212, 170, 0.3)',
            '&:hover': {
              background: 'linear-gradient(135deg, #00b89c 0%, #009688 100%)',
              transform: 'translateY(-2px)',
              boxShadow: '0 6px 16px rgba(0, 212, 170, 0.4)',
            }
          }}
        >
          Adicionar Plataforma
        </Button>
      </Box>

      {/* Lista de Plataformas */}
      <Grid container spacing={3}>
        {platforms.map((platform) => (
          <Grid item xs={12} md={6} lg={4} key={platform.id}>
            <Card className="theme-card" sx={{
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
              }
            }}>
              <CardContent sx={{ p: 3 }}>
                {/* Header do Card */}
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Payment sx={{ color: 'primary.main' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {platform.name}
                    </Typography>
                  </Box>
                  <Box display="flex" gap={1}>
                    <IconButton size="small" onClick={() => handleEditPlatform(platform)}>
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={() => handleDeletePlatform(platform.id)}
                      color="error"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                {/* Status */}
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={platform.enabled}
                        onChange={() => handleTogglePlatform(platform)}
                        color="primary"
                      />
                    }
                    label="Ativo"
                  />
                  <Chip
                    icon={getStatusIcon(platform.status)}
                    label={platform.status === 'active' ? 'Ativo' : 
                           platform.status === 'error' ? 'Erro' : 'Inativo'}
                    color={getStatusColor(platform.status)}
                    size="small"
                  />
                </Box>

                {/* Webhook URL */}
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    URL do Webhook:
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ 
                      flex: 1, 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis',
                      fontSize: '0.75rem'
                    }}>
                      {platform.webhook_url}
                    </Typography>
                    <IconButton size="small" onClick={() => copyWebhookUrl(platform)}>
                      <ContentCopy fontSize="small" />
                    </IconButton>
                  </Paper>
                </Box>

                {/* Configurações */}
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="body2">Configurações</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {Object.entries(platform.config).map(([key, value]) => (
                        <ListItem key={key} sx={{ px: 0 }}>
                          <ListItemText
                            primary={key.replace('_', ' ').toUpperCase()}
                            secondary={value ? '••••••••' : 'Não configurado'}
                            primaryTypographyProps={{ fontSize: '0.8rem' }}
                            secondaryTypographyProps={{ fontSize: '0.75rem' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>

                {/* Último webhook */}
                {platform.last_webhook && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Último webhook: {new Date(platform.last_webhook).toLocaleString()}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}

        {/* Card vazio quando não há plataformas */}
        {platforms.length === 0 && !loading && (
          <Grid item xs={12}>
            <Paper sx={{ 
              p: 4, 
              textAlign: 'center',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.05) 0%, rgba(0, 184, 156, 0.02) 100%)',
              border: '1px solid rgba(0, 212, 170, 0.1)'
            }}>
              <Webhook sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Nenhuma plataforma configurada
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Adicione sua primeira plataforma de pagamento para começar a receber webhooks
              </Typography>
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={() => {
                  resetForm();
                  setDialogOpen(true);
                }}
              >
                Adicionar Primeira Plataforma
              </Button>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Dialog de Configuração */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingPlatform ? 'Editar Plataforma' : 'Adicionar Plataforma'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Seleção de Template (apenas para nova plataforma) */}
            {!editingPlatform && (
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Selecione uma Plataforma:
                </Typography>
                <Grid container spacing={2}>
                  {platformTemplates.map((template) => (
                    <Grid item xs={12} sm={6} md={3} key={template.name}>
                      <Card
                        variant="outlined"
                        sx={{
                          cursor: 'pointer',
                          textAlign: 'center',
                          p: 2,
                          transition: 'all 0.2s',
                          border: formData.name === template.name ? '2px solid' : '1px solid',
                          borderColor: formData.name === template.name ? 'primary.main' : 'divider',
                          '&:hover': {
                            borderColor: 'primary.main',
                            transform: 'translateY(-2px)'
                          }
                        }}
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            name: template.name,
                            config: Object.fromEntries(
                              template.fields.map(field => [field.key, ''])
                            )
                          }));
                        }}
                      >
                        <Typography variant="h4" component="div" mb={1}>
                          {template.icon}
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {template.name}
                        </Typography>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
                <Divider sx={{ my: 3 }} />
              </Grid>
            )}

            {/* Configuração da Plataforma */}
            {formData.name && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Nome da Plataforma"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    disabled={!!editingPlatform}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Secret Key (Opcional)"
                    value={formData.secret_key}
                    onChange={(e) => setFormData(prev => ({ ...prev, secret_key: e.target.value }))}
                    type="password"
                  />
                </Grid>

                {/* Campos específicos da plataforma */}
                {platformTemplates
                  .find(t => t.name === formData.name)
                  ?.fields.map((field) => (
                    <Grid item xs={12} md={6} key={field.key}>
                      <TextField
                        fullWidth
                        label={field.label}
                        required={field.required}
                        value={formData.config[field.key] || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          config: {
                            ...prev.config,
                            [field.key]: e.target.value
                          }
                        }))}
                        type={field.key.includes('secret') || field.key.includes('key') ? 'password' : 'text'}
                      />
                    </Grid>
                  ))}

                <Grid item xs={12}>
                  <Alert severity="info" sx={{ borderRadius: '12px' }}>
                    <Typography variant="body2">
                      <strong>URL do Webhook:</strong> Após salvar, você receberá uma URL única 
                      para configurar nos webhooks da plataforma de pagamento.
                    </Typography>
                  </Alert>
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setDialogOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSavePlatform}
            disabled={!formData.name}
            sx={{
              background: 'var(--button-gradient)',
              '&:hover': {
                background: 'linear-gradient(135deg, #00b89c 0%, #009688 100%)',
              }
            }}
          >
            {editingPlatform ? 'Atualizar' : 'Adicionar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PaymentPlatformsPage;