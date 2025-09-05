import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  Input,
  Avatar,
  Stack
} from '@mui/material';
import {
  SmartToy,
  Add,
  Delete,
  Edit,
  Upload,
  Download,
  PhotoCamera
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Bot {
  id: number;
  name: string;
  description: string;
  xml_content: string;
  xml_filename?: string;
  image_url?: string;
  created_at: string;
}

const AdminBotsPage: React.FC = () => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [newBot, setNewBot] = useState({
    name: '',
    description: '',
    xml_content: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imageUploadDialog, setImageUploadDialog] = useState<{ open: boolean; botId: number | null }>({ open: false, botId: null });

  useEffect(() => {
    loadBots();
  }, []);

  const loadBots = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/bots');
      setBots(response.data.bots);
    } catch (error) {
      console.error('Erro ao carregar bots:', error);
      toast.error('Erro ao carregar bots');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.xml')) {
        toast.error('Por favor, selecione apenas arquivos XML');
        return;
      }
      
      setSelectedFile(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setNewBot(prev => ({ 
          ...prev, 
          xml_content: content,
          name: prev.name || file.name.replace('.xml', '')
        }));
      };
      reader.readAsText(file);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione apenas arquivos de imagem');
        return;
      }
      setSelectedImageFile(file);
    }
  };

  const uploadBotImage = async (botId: number, imageFile: File) => {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      await axios.post(`/api/bots/${botId}/image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Imagem do bot enviada com sucesso!');
      loadBots();
      setImageUploadDialog({ open: false, botId: null });
      setSelectedImageFile(null);
    } catch (error: any) {
      const message = error.response?.data?.error || 'Erro ao enviar imagem';
      toast.error(message);
    }
  };

  const handleUploadBot = async () => {
    if (!selectedFile) {
      toast.error('Selecione um arquivo XML');
      return;
    }

    if (!newBot.name || !newBot.description) {
      toast.error('Preencha o nome e descrição do bot');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('xml', selectedFile);
      if (selectedImageFile) {
        formData.append('image', selectedImageFile);
      }
      formData.append('name', newBot.name);
      formData.append('description', newBot.description);
      
      await axios.post('/api/bots/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Bot adicionado com sucesso!');
      setUploadDialogOpen(false);
      setNewBot({ name: '', description: '', xml_content: '' });
      setSelectedFile(null);
      setSelectedImageFile(null);
      loadBots();
    } catch (error: any) {
      console.error('Erro ao adicionar bot:', error);
      toast.error(error.response?.data?.error || 'Erro ao adicionar bot');
    }
  };

  const isValidXML = (xmlString: string): boolean => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
      const parseError = xmlDoc.querySelector('parsererror');
      return !parseError;
    } catch (error) {
      return false;
    }
  };

  const handleDownloadBot = (bot: Bot) => {
    const element = document.createElement('a');
    const file = new Blob([bot.xml_content], { type: 'application/xml' });
    element.href = URL.createObjectURL(file);
    element.download = `${bot.name}.xml`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('Bot baixado com sucesso!');
  };

  const handleDeleteBot = async (botId: number) => {
    if (!window.confirm('Tem certeza que deseja deletar este bot?')) return;

    try {
      await axios.delete(`/api/bots/${botId}`);
      toast.success('Bot deletado com sucesso!');
      loadBots();
    } catch (error: any) {
      console.error('Erro ao deletar bot:', error);
      toast.error(error.response?.data?.error || 'Erro ao deletar bot');
    }
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          <SmartToy sx={{ mr: 1, verticalAlign: 'middle' }} />
          Gerenciar Bots
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setUploadDialogOpen(true)}
        >
          Adicionar Bot
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              {bots.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <SmartToy sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Nenhum bot cadastrado
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Adicione seu primeiro bot para começar
                  </Typography>
                </Box>
              ) : (
                <List>
                  {bots.map((bot) => (
                    <ListItem
                      key={bot.id}
                      sx={{
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1
                      }}
                    >
                      <ListItemIcon>
                        {bot.image_url ? (
                          <Avatar
                            src={bot.image_url}
                            alt={bot.name}
                            sx={{ width: 56, height: 56 }}
                            variant="rounded"
                          />
                        ) : (
                          <SmartToy color="primary" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={bot.name}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary" mb={1}>
                              {bot.description}
                            </Typography>
                            <Box display="flex" gap={1}>
                              <Chip
                                label="XML"
                                size="small"
                                variant="outlined"
                              />
                              <Chip
                                label={new Date(bot.created_at).toLocaleDateString()}
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                          </Box>
                        }
                      />
                      <Box>
                        <IconButton
                          color="secondary"
                          onClick={() => setImageUploadDialog({ open: true, botId: bot.id })}
                          title="Adicionar/Alterar imagem"
                        >
                          <PhotoCamera />
                        </IconButton>
                        <IconButton
                          color="primary"
                          onClick={() => handleDownloadBot(bot)}
                          title="Baixar XML"
                        >
                          <Download />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => handleDeleteBot(bot.id)}
                          title="Deletar bot"
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog para adicionar bot */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Adicionar Novo Bot
        </DialogTitle>
        <DialogContent>
          <Box py={2}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Upload do arquivo XML do bot criado na plataforma da Corretora. 
                <br />
                Você pode baixar o XML do seu bot em: <strong>deriv.com/trading-platforms/deriv-bot</strong>
              </Typography>
            </Alert>

            <Box sx={{ mb: 3, p: 2, border: '2px dashed', borderColor: 'divider', borderRadius: 2 }}>
              <input
                accept=".xml"
                style={{ display: 'none' }}
                id="xml-file-upload"
                type="file"
                onChange={handleFileUpload}
              />
              <label htmlFor="xml-file-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<Upload />}
                  fullWidth
                  sx={{ mb: 1 }}
                >
                  {selectedFile ? `Arquivo: ${selectedFile.name}` : 'Selecionar Arquivo XML'}
                </Button>
              </label>
              <Typography variant="caption" color="text.secondary" display="block" textAlign="center">
                Selecione o arquivo XML do bot exportado da Corretora
              </Typography>
            </Box>

            <TextField
              fullWidth
              label="Nome do Bot"
              value={newBot.name}
              onChange={(e) => setNewBot(prev => ({ ...prev, name: e.target.value }))}
              margin="normal"
              required
              helperText="Nome será preenchido automaticamente com o nome do arquivo"
            />

            <TextField
              fullWidth
              label="Descrição"
              value={newBot.description}
              onChange={(e) => setNewBot(prev => ({ ...prev, description: e.target.value }))}
              margin="normal"
              multiline
              rows={3}
              required
              helperText="Descreva a estratégia e funcionamento do bot"
            />

            <TextField
              fullWidth
              label="Conteúdo XML"
              value={newBot.xml_content}
              onChange={(e) => setNewBot(prev => ({ ...prev, xml_content: e.target.value }))}
              margin="normal"
              multiline
              rows={8}
              required
              helperText="Conteúdo será preenchido automaticamente ao selecionar o arquivo"
              InputProps={{
                style: { fontFamily: 'monospace', fontSize: '12px' }
              }}
            />

            <Box sx={{ mt: 3, p: 2, border: '2px dashed', borderColor: 'divider', borderRadius: 2 }}>
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="bot-image-upload"
                type="file"
                onChange={handleImageUpload}
              />
              <label htmlFor="bot-image-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<PhotoCamera />}
                  fullWidth
                  sx={{ mb: 1 }}
                >
                  {selectedImageFile ? `Imagem: ${selectedImageFile.name}` : 'Selecionar Imagem (Opcional)'}
                </Button>
              </label>
              <Typography variant="caption" color="text.secondary" display="block" textAlign="center">
                Adicione uma imagem miniatura para o bot
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleUploadBot}
            variant="contained"
            disabled={!newBot.name || !newBot.description || !newBot.xml_content}
          >
            Adicionar Bot
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para upload de imagem do bot */}
      <Dialog
        open={imageUploadDialog.open}
        onClose={() => setImageUploadDialog({ open: false, botId: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Adicionar/Alterar Imagem do Bot</DialogTitle>
        <DialogContent>
          <Box py={2}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Selecione uma imagem para ser exibida como miniatura do bot.
                <br />
                Formatos aceitos: JPG, PNG, GIF (máx. 10MB)
              </Typography>
            </Alert>

            <Box sx={{ mb: 3, p: 2, border: '2px dashed', borderColor: 'divider', borderRadius: 2 }}>
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="bot-image-dialog-upload"
                type="file"
                onChange={handleImageUpload}
              />
              <label htmlFor="bot-image-dialog-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<PhotoCamera />}
                  fullWidth
                  sx={{ mb: 1 }}
                >
                  {selectedImageFile ? `Arquivo: ${selectedImageFile.name}` : 'Selecionar Imagem'}
                </Button>
              </label>
              <Typography variant="caption" color="text.secondary" display="block" textAlign="center">
                Clique para selecionar uma imagem
              </Typography>
            </Box>

            {selectedImageFile && (
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Typography variant="body2" color="text.secondary" mb={1}>
                  Preview:
                </Typography>
                <Avatar
                  src={URL.createObjectURL(selectedImageFile)}
                  alt="Preview"
                  sx={{ width: 120, height: 120, mx: 'auto' }}
                  variant="rounded"
                />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setImageUploadDialog({ open: false, botId: null });
            setSelectedImageFile(null);
          }}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              if (imageUploadDialog.botId && selectedImageFile) {
                uploadBotImage(imageUploadDialog.botId, selectedImageFile);
              }
            }}
            variant="contained"
            disabled={!selectedImageFile}
          >
            Enviar Imagem
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminBotsPage; 