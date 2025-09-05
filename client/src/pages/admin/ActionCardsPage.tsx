import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  Alert,
  IconButton,
  Input,
  FormControl,
  FormLabel,
  FormControlLabel,
  Checkbox,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  InputLabel
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  CloudUpload,
  Image,
  Save,
  Refresh,
  Visibility,
  VisibilityOff,
  PhotoCamera
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';

interface ActionCard {
  id?: number;
  title: string;
  subtitle?: string;
  image_url?: string;
  action_type: 'internal' | 'external';
  action_url: string;
  background_color: string;
  text_color: string;
  is_active: boolean;
  hide_title: boolean;
  order_index: number;
}

const ActionCardsPage: React.FC = () => {
  const [cards, setCards] = useState<ActionCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState(false);
  const [selectedCard, setSelectedCard] = useState<ActionCard | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const defaultCard: ActionCard = {
    title: '',
    subtitle: '',
    action_type: 'internal',
    action_url: '',
    background_color: '#00d4aa',
    text_color: '#ffffff',
    is_active: true,
    hide_title: false,
    order_index: 0
  };

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      const response = await axios.get('/api/admin/action-cards');
      setCards(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar cards:', error);
      toast.error('Erro ao carregar cards de ação');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCard = async () => {
    if (!selectedCard) return;

    try {
      if (!selectedCard.title.trim()) {
        toast.error('Título é obrigatório');
        return;
      }

      const formData = new FormData();
      formData.append('title', selectedCard.title);
      formData.append('subtitle', selectedCard.subtitle || '');
      formData.append('action_type', selectedCard.action_type);
      formData.append('action_url', selectedCard.action_url);
      formData.append('background_color', selectedCard.background_color);
      formData.append('text_color', selectedCard.text_color);
      formData.append('is_active', selectedCard.is_active.toString());
      formData.append('hide_title', selectedCard.hide_title.toString());
      formData.append('order_index', selectedCard.order_index.toString());

      if (imageFile) {
        formData.append('image', imageFile);
      }

      let response;
      if (selectedCard.id) {
        response = await axios.put(`/api/admin/action-cards/${selectedCard.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        response = await axios.post('/api/admin/action-cards', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      toast.success('Card salvo com sucesso!');
      setEditDialog(false);
      setSelectedCard(null);
      setImageFile(null);
      loadCards();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Erro ao salvar card';
      toast.error(message);
    }
  };

  const handleDeleteCard = async (cardId: number) => {
    if (!window.confirm('Tem certeza que deseja excluir este card?')) return;

    try {
      await axios.delete(`/api/admin/action-cards/${cardId}`);
      toast.success('Card excluído com sucesso!');
      loadCards();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Erro ao excluir card';
      toast.error(message);
    }
  };

  const handleToggleActive = async (card: ActionCard) => {
    try {
      await axios.patch(`/api/admin/action-cards/${card.id}/toggle`);
      toast.success(`Card ${card.is_active ? 'desativado' : 'ativado'} com sucesso!`);
      loadCards();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Erro ao alterar status do card';
      toast.error(message);
    }
  };

  const openEditDialog = (card?: ActionCard) => {
    if (card) {
      setSelectedCard({ ...card });
    } else {
      const newOrder = Math.max(...cards.map(c => c.order_index), 0) + 1;
      setSelectedCard({ ...defaultCard, order_index: newOrder });
    }
    setEditDialog(true);
  };

  const closeEditDialog = () => {
    setEditDialog(false);
    setSelectedCard(null);
    setImageFile(null);
  };

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
          Cards de Ação Principais
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ 
          fontSize: '1.1rem',
          fontWeight: 500
        }}>
          Configure os cards que aparecem na tela inicial do cliente
        </Typography>
      </Box>

      {/* Actions */}
      <Box mb={3} display="flex" gap={2} justifyContent="space-between" alignItems="center">
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => openEditDialog()}
          sx={{
            background: 'var(--button-gradient)',
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': {
              background: 'linear-gradient(135deg, #00b89c 0%, #009688 100%)',
            }
          }}
        >
          Novo Card
        </Button>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadCards}
          sx={{ borderRadius: '12px', textTransform: 'none' }}
        >
          Recarregar
        </Button>
      </Box>

      {/* Cards Grid */}
      <Grid container spacing={3}>
        {cards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.id}>
            <Card className="theme-card" sx={{ position: 'relative' }}>
              <CardContent sx={{ p: 2 }}>
                {/* Preview */}
                <Box
                  sx={{
                    borderRadius: '12px',
                    overflow: 'hidden',
                    mb: 2,
                    background: card.background_color,
                    color: card.text_color,
                    minHeight: '200px',
                    height: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textAlign: 'center',
                    p: 2.5,
                    position: 'relative',
                    opacity: card.is_active ? 1 : 0.6
                  }}
                >
                  {card.image_url && (
                    <Box
                      sx={{
                        width: '100%',
                        height: '100%',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        backgroundImage: `url(${card.image_url})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        borderRadius: '12px'
                      }}
                    />
                  )}
                  <Box sx={{ position: 'relative', zIndex: 1 }}>
                    {!card.hide_title && (
                      <Typography variant="h6" sx={{ 
                        fontWeight: 700, 
                        fontSize: '0.9rem',
                        textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                      }}>
                        {card.title}
                      </Typography>
                    )}
                    {card.subtitle && !card.hide_title && (
                      <Typography variant="body2" sx={{ 
                        fontSize: '0.8rem',
                        textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                      }}>
                        {card.subtitle}
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* Info */}
                <Box mb={2}>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label={card.is_active ? 'Ativo' : 'Inativo'}
                      size="small"
                      color={card.is_active ? 'success' : 'default'}
                    />
                    {card.hide_title && (
                      <Chip
                        label="Título Oculto"
                        size="small"
                        color="info"
                        variant="outlined"
                      />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    URL: {card.action_url}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Ordem: {card.order_index}
                  </Typography>
                </Box>

                {/* Actions */}
                <Box display="flex" gap={1} justifyContent="center">
                  <IconButton
                    size="small"
                    onClick={() => openEditDialog(card)}
                    color="primary"
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleToggleActive(card)}
                    color="info"
                  >
                    {card.is_active ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => card.id && handleDeleteCard(card.id)}
                    color="error"
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Edit Dialog */}
      <Dialog 
        open={editDialog} 
        onClose={closeEditDialog} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            background: 'var(--card-background)',
          }
        }}
      >
        <DialogTitle>
          {selectedCard?.id ? 'Editar Card' : 'Novo Card'}
        </DialogTitle>
        <DialogContent>
          {selectedCard && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              {/* Basic Info */}
              <Grid item xs={12} md={6}>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    label="Título *"
                    value={selectedCard.title}
                    onChange={(e) => setSelectedCard({ ...selectedCard, title: e.target.value })}
                    placeholder="Ex: VÍDEO-AULAS"
                  />
                  
                  <TextField
                    fullWidth
                    label="Subtítulo"
                    value={selectedCard.subtitle || ''}
                    onChange={(e) => setSelectedCard({ ...selectedCard, subtitle: e.target.value })}
                    placeholder="Ex: Aprenda a operar"
                  />

                  <FormControl fullWidth>
                    <InputLabel>Tipo de Ação</InputLabel>
                    <Select
                      value={selectedCard.action_type}
                      onChange={(e) => setSelectedCard({ ...selectedCard, action_type: e.target.value as 'internal' | 'external' })}
                    >
                      <MenuItem value="internal">Página Interna</MenuItem>
                      <MenuItem value="external">Link Externo</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    fullWidth
                    label="URL de Ação *"
                    value={selectedCard.action_url}
                    onChange={(e) => setSelectedCard({ ...selectedCard, action_url: e.target.value })}
                    placeholder={selectedCard.action_type === 'internal' ? 'Ex: /courses' : 'Ex: https://example.com'}
                    helperText={selectedCard.action_type === 'internal' ? 'Rota interna da aplicação' : 'URL completa externa'}
                  />
                </Stack>
              </Grid>

              {/* Visual Config */}
              <Grid item xs={12} md={6}>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    label="Cor de Fundo"
                    type="color"
                    value={selectedCard.background_color}
                    onChange={(e) => setSelectedCard({ ...selectedCard, background_color: e.target.value })}
                  />
                  
                  <TextField
                    fullWidth
                    label="Cor do Texto"
                    type="color"
                    value={selectedCard.text_color}
                    onChange={(e) => setSelectedCard({ ...selectedCard, text_color: e.target.value })}
                  />

                  <TextField
                    fullWidth
                    label="Ordem de Exibição"
                    type="number"
                    value={selectedCard.order_index}
                    onChange={(e) => setSelectedCard({ ...selectedCard, order_index: parseInt(e.target.value) || 0 })}
                    inputProps={{ min: 0 }}
                  />

                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedCard.hide_title}
                        onChange={(e) => setSelectedCard({ ...selectedCard, hide_title: e.target.checked })}
                        color="primary"
                      />
                    }
                    label="Ocultar título do card"
                    sx={{ mt: 1 }}
                  />

                  {/* Image Upload */}
                  <FormControl fullWidth>
                    <Button
                      component="label"
                      variant="outlined"
                      startIcon={<PhotoCamera />}
                      sx={{ py: 2 }}
                    >
                      Enviar Imagem de Fundo
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setImageFile(file);
                          }
                        }}
                      />
                    </Button>
                    {imageFile && (
                      <Alert severity="info" sx={{ mt: 1 }}>
                        Arquivo selecionado: {imageFile.name}
                      </Alert>
                    )}
                    {selectedCard.image_url && !imageFile && (
                      <Box sx={{ mt: 1, textAlign: 'center' }}>
                        <img 
                          src={selectedCard.image_url} 
                          alt="Preview"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '100px',
                            objectFit: 'contain',
                            borderRadius: '8px'
                          }}
                        />
                        <Typography variant="caption" display="block" color="text.secondary">
                          Imagem atual
                        </Typography>
                      </Box>
                    )}
                  </FormControl>
                </Stack>
              </Grid>

              {/* Preview */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Preview:
                </Typography>
                <Box
                  sx={{
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: selectedCard.background_color,
                    color: selectedCard.text_color,
                    minHeight: '280px',
                    height: '280px',
                    width: '180px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textAlign: 'center',
                    p: 3,
                    position: 'relative',
                    mx: 'auto'
                  }}
                >
                  {(selectedCard.image_url || imageFile) && (
                    <Box
                      sx={{
                        width: '100%',
                        height: '100%',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        backgroundImage: imageFile 
                          ? `url(${URL.createObjectURL(imageFile)})` 
                          : `url(${selectedCard.image_url})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        borderRadius: '12px'
                      }}
                    />
                  )}
                  <Box sx={{ position: 'relative', zIndex: 1 }}>
                    {!selectedCard.hide_title && (
                      <Typography variant="h6" sx={{ 
                        fontWeight: 700, 
                        fontSize: '1rem',
                        lineHeight: 1.3,
                        textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                        mb: selectedCard.subtitle ? 1 : 0
                      }}>
                        {selectedCard.title || 'Título do Card'}
                      </Typography>
                    )}
                    {selectedCard.subtitle && !selectedCard.hide_title && (
                      <Typography variant="body2" sx={{ 
                        fontSize: '0.85rem',
                        lineHeight: 1.4,
                        textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                        opacity: 0.9
                      }}>
                        {selectedCard.subtitle}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={closeEditDialog} sx={{ textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSaveCard} 
            variant="contained"
            sx={{
              background: 'var(--button-gradient)',
              textTransform: 'none',
              '&:hover': {
                background: 'linear-gradient(135deg, #00b89c 0%, #009688 100%)',
              }
            }}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ActionCardsPage;