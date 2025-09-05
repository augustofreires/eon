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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Chip,
  Divider
} from '@mui/material';
import {
  Add,
  Edit,
  Visibility,
  VisibilityOff,
  Article,
  Description,
  Public,
  PublicOff,
  Save
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';

interface EditablePage {
  id: number;
  slug: string;
  title: string;
  content: string;
  meta_description: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

const PagesPage: React.FC = () => {
  const [pages, setPages] = useState<EditablePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<EditablePage | null>(null);
  const [formData, setFormData] = useState({
    slug: '',
    title: '',
    content: '',
    meta_description: '',
    is_published: true
  });

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    try {
      const response = await axios.get('/api/admin/pages');
      setPages(response.data);
    } catch (error) {
      console.error('Erro ao carregar páginas:', error);
      toast.error('Erro ao carregar páginas');
      setPages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePage = async () => {
    try {
      if (!formData.title.trim() || !formData.content.trim()) {
        toast.error('Título e conteúdo são obrigatórios');
        return;
      }

      if (!editingPage && !formData.slug.trim()) {
        toast.error('Slug é obrigatório para novas páginas');
        return;
      }

      const data = {
        ...formData,
        slug: editingPage ? editingPage.slug : formData.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')
      };

      if (editingPage) {
        await axios.put(`/api/admin/pages/${editingPage.id}`, data);
        toast.success('Página atualizada com sucesso!');
      } else {
        await axios.post('/api/admin/pages', data);
        toast.success('Página criada com sucesso!');
      }

      setDialogOpen(false);
      setEditingPage(null);
      resetForm();
      loadPages();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Erro ao salvar página';
      toast.error(message);
    }
  };

  const handleTogglePage = async (page: EditablePage) => {
    try {
      await axios.patch(`/api/admin/pages/${page.id}/toggle`);
      toast.success(`Página ${!page.is_published ? 'publicada' : 'despublicada'} com sucesso!`);
      loadPages();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Erro ao alterar status';
      toast.error(message);
    }
  };

  const handleEditPage = (page: EditablePage) => {
    setEditingPage(page);
    setFormData({
      slug: page.slug,
      title: page.title,
      content: page.content,
      meta_description: page.meta_description || '',
      is_published: page.is_published
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      slug: '',
      title: '',
      content: '',
      meta_description: '',
      is_published: true
    });
  };

  const publishedPages = pages.filter(page => page.is_published);
  const draftPages = pages.filter(page => !page.is_published);

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
          Gestão de Páginas
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ 
          fontSize: '1.1rem',
          fontWeight: 500
        }}>
          Gerencie as páginas informativas da plataforma
        </Typography>
      </Box>

      {/* Estatísticas */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={4}>
          <Card className="theme-card" sx={{ 
            background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.05) 100%)',
            border: '1px solid rgba(76, 175, 80, 0.2)'
          }}>
            <CardContent sx={{ textAlign: 'center', p: 3 }}>
              <Public sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
              <Typography variant="h3" color="success.main" fontWeight="bold">
                {publishedPages.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Páginas Publicadas
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <Card className="theme-card" sx={{ 
            background: 'linear-gradient(135deg, rgba(158, 158, 158, 0.1) 0%, rgba(158, 158, 158, 0.05) 100%)',
            border: '1px solid rgba(158, 158, 158, 0.2)'
          }}>
            <CardContent sx={{ textAlign: 'center', p: 3 }}>
              <PublicOff sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h3" color="text.secondary" fontWeight="bold">
                {draftPages.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Rascunhos
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <Card className="theme-card" sx={{ 
            background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.1) 0%, rgba(0, 212, 170, 0.05) 100%)',
            border: '1px solid rgba(0, 212, 170, 0.2)'
          }}>
            <CardContent sx={{ textAlign: 'center', p: 3 }}>
              <Article sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h3" color="primary.main" fontWeight="bold">
                {pages.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total de Páginas
              </Typography>
            </CardContent>
          </Card>
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
          Nova Página
        </Button>
      </Box>

      {/* Lista de Páginas */}
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
                <Description />
                Páginas Configuradas
              </Typography>

              {pages.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <Article sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Nenhuma página encontrada
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Crie sua primeira página informativa
                  </Typography>
                </Box>
              ) : (
                <List>
                  {pages.map((page, index) => (
                    <React.Fragment key={page.id}>
                      <ListItem
                        sx={{
                          borderRadius: '12px',
                          mb: 1,
                          border: '1px solid rgba(0, 0, 0, 0.12)',
                          backgroundColor: page.is_published 
                            ? 'rgba(76, 175, 80, 0.05)'
                            : 'rgba(158, 158, 158, 0.05)',
                          '&:hover': {
                            backgroundColor: page.is_published 
                              ? 'rgba(76, 175, 80, 0.1)'
                              : 'rgba(158, 158, 158, 0.1)',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                          },
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <ListItemIcon>
                          {page.is_published ? (
                            <Public color="success" />
                          ) : (
                            <PublicOff color="disabled" />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="body1" fontWeight="600">
                                {page.title}
                              </Typography>
                              <Chip
                                label={`/${page.slug}`}
                                size="small"
                                variant="outlined"
                                sx={{ fontFamily: 'monospace' }}
                              />
                              {page.is_published ? (
                                <Chip
                                  label="Publicado"
                                  size="small"
                                  color="success"
                                />
                              ) : (
                                <Chip
                                  label="Rascunho"
                                  size="small"
                                  color="default"
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {page.meta_description || 'Sem descrição'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Última atualização: {new Date(page.updated_at).toLocaleString('pt-BR')}
                              </Typography>
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Box display="flex" alignItems="center" gap={1}>
                            <IconButton
                              size="small"
                              onClick={() => handleTogglePage(page)}
                              title={page.is_published ? 'Despublicar' : 'Publicar'}
                              color={page.is_published ? 'success' : 'default'}
                            >
                              {page.is_published ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleEditPage(page)}
                              title="Editar"
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < pages.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog de Edição */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle>
          {editingPage ? 'Editar Página' : 'Nova Página'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {!editingPage && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Slug (URL)"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')
                  }))}
                  required
                  placeholder="quem-somos"
                  helperText="Usado na URL. Ex: /quem-somos"
                />
              </Grid>
            )}
            
            <Grid item xs={12} md={editingPage ? 12 : 6}>
              <TextField
                fullWidth
                label="Título da Página"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
                placeholder="Ex: Quem Somos"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Meta Descrição"
                value={formData.meta_description}
                onChange={(e) => setFormData(prev => ({ ...prev, meta_description: e.target.value }))}
                placeholder="Descrição para SEO (opcional)"
                multiline
                rows={2}
                helperText="Descrição que aparece nos resultados de busca"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Conteúdo da Página"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                required
                placeholder="Digite o conteúdo em Markdown..."
                multiline
                rows={15}
                helperText="Use Markdown para formatação. Ex: # Título, **negrito**, *itálico*"
                sx={{
                  '& .MuiInputBase-input': {
                    fontFamily: 'monospace'
                  }
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_published}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_published: e.target.checked }))}
                    color="primary"
                  />
                }
                label="Publicar página"
              />
            </Grid>

            <Grid item xs={12}>
              <Alert severity="info" sx={{ borderRadius: '12px' }}>
                <Typography variant="body2">
                  <strong>💡 Dicas:</strong>
                  <br />• Use # para títulos principais, ## para subtítulos
                  <br />• **texto** para negrito, *texto* para itálico
                  <br />• Páginas despublicadas não aparecem para os clientes
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
            onClick={handleSavePage}
            disabled={!formData.title.trim() || !formData.content.trim()}
            startIcon={<Save />}
            sx={{
              background: 'var(--button-gradient)',
              '&:hover': {
                background: 'linear-gradient(135deg, #00b89c 0%, #009688 100%)',
              }
            }}
          >
            {editingPage ? 'Atualizar' : 'Criar Página'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PagesPage;