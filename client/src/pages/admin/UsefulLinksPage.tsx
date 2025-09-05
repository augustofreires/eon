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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Link as LinkIcon,
  YouTube,
  Instagram,
  WhatsApp,
  Telegram,
  Support,
  Language,
  Facebook,
  Twitter,
  LinkedIn,
  Launch,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';

interface UsefulLink {
  id: number;
  title: string;
  url: string;
  description: string;
  type: string;
  icon: string;
  active: boolean;
  order: number;
  created_at: string;
  updated_at: string;
}

const UsefulLinksPage: React.FC = () => {
  console.log('🔧 UsefulLinksPage: Component mounting...');
  const [links, setLinks] = useState<UsefulLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<UsefulLink | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    description: '',
    type: 'custom',
    active: true,
    order: 0
  });

  const linkTypes = [
    { value: 'youtube', label: 'YouTube', icon: <YouTube sx={{ color: '#FF0000' }} />, color: '#FF0000' },
    { value: 'instagram', label: 'Instagram', icon: <Instagram sx={{ color: '#E4405F' }} />, color: '#E4405F' },
    { value: 'whatsapp', label: 'WhatsApp', icon: <WhatsApp sx={{ color: '#25D366' }} />, color: '#25D366' },
    { value: 'telegram', label: 'Telegram', icon: <Telegram sx={{ color: '#0088CC' }} />, color: '#0088CC' },
    { value: 'support', label: 'Suporte', icon: <Support sx={{ color: '#FF9800' }} />, color: '#FF9800' },
    { value: 'facebook', label: 'Facebook', icon: <Facebook sx={{ color: '#1877F2' }} />, color: '#1877F2' },
    { value: 'twitter', label: 'Twitter/X', icon: <Twitter sx={{ color: '#1DA1F2' }} />, color: '#1DA1F2' },
    { value: 'linkedin', label: 'LinkedIn', icon: <LinkedIn sx={{ color: '#0A66C2' }} />, color: '#0A66C2' },
    { value: 'website', label: 'Website', icon: <Language sx={{ color: '#4CAF50' }} />, color: '#4CAF50' },
    { value: 'custom', label: 'Personalizado', icon: <LinkIcon sx={{ color: '#9C27B0' }} />, color: '#9C27B0' }
  ];

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    try {
      const response = await axios.get('/api/admin/useful-links');
      console.log('Response from API:', response.data);
      
      // A API retorna { links, stats }, então pegamos apenas links
      if (response.data && response.data.links) {
        setLinks(response.data.links);
      } else {
        // Se for array direto
        setLinks(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Erro ao carregar links:', error);
      toast.error('Erro ao carregar links úteis');
      setLinks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLink = async () => {
    try {
      if (!formData.title.trim() || !formData.url.trim()) {
        toast.error('Título e URL são obrigatórios');
        return;
      }

      // Validar URL
      try {
        new URL(formData.url);
      } catch {
        toast.error('URL inválida');
        return;
      }

      const data = {
        ...formData,
        order: formData.order || links.length + 1
      };

      if (editingLink) {
        await axios.put(`/api/admin/useful-links/${editingLink.id}`, data);
        toast.success('Link atualizado com sucesso!');
      } else {
        await axios.post('/api/admin/useful-links', data);
        toast.success('Link adicionado com sucesso!');
      }

      setDialogOpen(false);
      setEditingLink(null);
      resetForm();
      loadLinks();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Erro ao salvar link';
      toast.error(message);
    }
  };

  const handleDeleteLink = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir este link?')) return;

    try {
      await axios.delete(`/api/admin/useful-links/${id}`);
      toast.success('Link excluído com sucesso!');
      loadLinks();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Erro ao excluir link';
      toast.error(message);
    }
  };

  const handleToggleLink = async (link: UsefulLink) => {
    try {
      await axios.put(`/api/admin/useful-links/${link.id}`, {
        ...link,
        active: !link.active
      });
      toast.success(`Link ${!link.active ? 'ativado' : 'desativado'} com sucesso!`);
      loadLinks();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Erro ao alterar status';
      toast.error(message);
    }
  };

  const handleEditLink = (link: UsefulLink) => {
    setEditingLink(link);
    setFormData({
      title: link.title,
      url: link.url,
      description: link.description || '',
      type: link.type,
      active: link.active,
      order: link.order
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      url: '',
      description: '',
      type: 'custom',
      active: true,
      order: 0
    });
  };

  const openLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getTypeInfo = (type: string) => {
    return linkTypes.find(t => t.value === type) || linkTypes[linkTypes.length - 1];
  };

  const activeLinks = links.filter(link => link.active);
  const inactiveLinks = links.filter(link => !link.active);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <div>Carregando...</div>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" gutterBottom className="theme-text-gradient" sx={{ 
          fontWeight: 700,
          mb: 1
        }}>
          Links Úteis
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ 
          fontSize: '1.1rem',
          fontWeight: 500 
        }}>
          Gerencie links para suas redes sociais, canais de suporte e outros recursos
        </Typography>
      </Box>

      {/* Statistics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ 
            p: 2, 
            textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.05) 100%)',
            border: '1px solid rgba(76, 175, 80, 0.2)'
          }}>
            <Typography variant="h3" color="success.main" fontWeight="bold">
              {activeLinks.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Links Ativos
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ 
            p: 2, 
            textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(158, 158, 158, 0.1) 0%, rgba(158, 158, 158, 0.05) 100%)',
            border: '1px solid rgba(158, 158, 158, 0.2)'
          }}>
            <Typography variant="h3" color="text.secondary" fontWeight="bold">
              {inactiveLinks.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Links Inativos
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ 
            p: 2, 
            textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.1) 0%, rgba(0, 212, 170, 0.05) 100%)',
            border: '1px solid rgba(0, 212, 170, 0.2)'
          }}>
            <Typography variant="h3" color="primary.main" fontWeight="bold">
              {links.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total de Links
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ 
            p: 2, 
            textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 193, 7, 0.05) 100%)',
            border: '1px solid rgba(255, 193, 7, 0.2)'
          }}>
            <Typography variant="h3" color="warning.main" fontWeight="bold">
              {new Set(links.map(link => link.type)).size}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tipos Diferentes
            </Typography>
          </Paper>
        </Grid>
      </Grid>

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
          Adicionar Novo Link
        </Button>
      </Box>

      {/* Lista de Links */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card className="theme-card">
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ 
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                color: 'primary.main'
              }}>
                <LinkIcon />
                Links Configurados
              </Typography>

              {links.length === 0 ? (
                <Paper sx={{ 
                  p: 4, 
                  textAlign: 'center',
                  background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.05) 0%, rgba(0, 184, 156, 0.02) 100%)',
                  border: '1px solid rgba(0, 212, 170, 0.1)'
                }}>
                  <LinkIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Nenhum link configurado
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={3}>
                    Adicione links para suas redes sociais e canais de suporte
                  </Typography>
                </Paper>
              ) : (
                <List>
                  {links.map((link, index) => {
                    const typeInfo = getTypeInfo(link.type);
                    return (
                      <React.Fragment key={link.id}>
                        <ListItem
                          sx={{
                            borderRadius: '12px',
                            mb: 1,
                            border: '1px solid rgba(0, 0, 0, 0.12)',
                            backgroundColor: link.active 
                              ? 'rgba(76, 175, 80, 0.05)'
                              : 'rgba(158, 158, 158, 0.05)',
                            '&:hover': {
                              backgroundColor: link.active 
                                ? 'rgba(76, 175, 80, 0.1)'
                                : 'rgba(158, 158, 158, 0.1)',
                              transform: 'translateY(-2px)',
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                            },
                            transition: 'all 0.3s ease'
                          }}
                        >
                          <ListItemIcon>
                            {typeInfo.icon}
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="body1" fontWeight="600">
                                  {link.title}
                                </Typography>
                                <Chip
                                  label={typeInfo.label}
                                  size="small"
                                  sx={{
                                    backgroundColor: `${typeInfo.color}20`,
                                    color: typeInfo.color,
                                    fontWeight: 500
                                  }}
                                />
                                {!link.active && (
                                  <Chip
                                    label="Inativo"
                                    size="small"
                                    icon={<VisibilityOff />}
                                    color="default"
                                  />
                                )}
                              </Box>
                            }
                            secondary={
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  {link.description || 'Sem descrição'}
                                </Typography>
                                <Typography 
                                  variant="caption" 
                                  color="text.secondary"
                                  sx={{ 
                                    display: 'block',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '300px'
                                  }}
                                >
                                  {link.url}
                                </Typography>
                              </Box>
                            }
                          />
                          <ListItemSecondaryAction>
                            <Box display="flex" alignItems="center" gap={1}>
                              <IconButton
                                size="small"
                                onClick={() => openLink(link.url)}
                                title="Abrir Link"
                              >
                                <Launch fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleToggleLink(link)}
                                title={link.active ? 'Desativar' : 'Ativar'}
                                color={link.active ? 'success' : 'default'}
                              >
                                {link.active ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleEditLink(link)}
                                title="Editar"
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteLink(link.id)}
                                title="Excluir"
                                color="error"
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Box>
                          </ListItemSecondaryAction>
                        </ListItem>
                        {index < links.length - 1 && <Divider />}
                      </React.Fragment>
                    );
                  })}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog de Configuração */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingLink ? 'Editar Link' : 'Adicionar Novo Link'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Link</InputLabel>
                <Select
                  value={formData.type}
                  label="Tipo de Link"
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                >
                  {linkTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      <Box display="flex" alignItems="center" gap={1}>
                        {type.icon}
                        {type.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Título"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
                placeholder="Ex: Canal no YouTube"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="URL"
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                required
                placeholder="https://..."
                type="url"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descrição"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Breve descrição do link (opcional)"
                multiline
                rows={2}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Ordem de Exibição"
                value={formData.order}
                onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                type="number"
                placeholder="0"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.active}
                    onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                    color="primary"
                  />
                }
                label="Link Ativo"
              />
            </Grid>

            <Grid item xs={12}>
              <Alert severity="info" sx={{ borderRadius: '12px' }}>
                <Typography variant="body2">
                  <strong>Dicas:</strong>
                  <br />• Links inativos não aparecerão para os clientes
                  <br />• Use a ordem para controlar a sequência de exibição
                  <br />• Teste sempre os links antes de ativar
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setDialogOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveLink}
            disabled={!formData.title.trim() || !formData.url.trim()}
            sx={{
              background: 'var(--button-gradient)',
              '&:hover': {
                background: 'linear-gradient(135deg, #00b89c 0%, #009688 100%)',
              }
            }}
          >
            {editingLink ? 'Atualizar' : 'Adicionar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsefulLinksPage;