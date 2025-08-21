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
  Chip
} from '@mui/material';
import {
  SmartToy,
  Add,
  Delete,
  Edit,
  Upload,
  Download
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Bot {
  id: number;
  name: string;
  description: string;
  xml_content: string;
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

  const handleUploadBot = async () => {
    if (!newBot.name || !newBot.description || !newBot.xml_content) {
      toast.error('Preencha todos os campos');
      return;
    }

    try {
      await axios.post('/api/bots', newBot);
      toast.success('Bot adicionado com sucesso!');
      setUploadDialogOpen(false);
      setNewBot({ name: '', description: '', xml_content: '' });
      loadBots();
    } catch (error: any) {
      console.error('Erro ao adicionar bot:', error);
      toast.error(error.response?.data?.error || 'Erro ao adicionar bot');
    }
  };

  const handleDeleteBot = async (botId: number) => {
    if (!confirm('Tem certeza que deseja deletar este bot?')) return;

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
                        <SmartToy color="primary" />
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
                          color="error"
                          onClick={() => handleDeleteBot(bot.id)}
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
            <TextField
              fullWidth
              label="Nome do Bot"
              value={newBot.name}
              onChange={(e) => setNewBot(prev => ({ ...prev, name: e.target.value }))}
              margin="normal"
              required
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
            />

            <TextField
              fullWidth
              label="Conteúdo XML"
              value={newBot.xml_content}
              onChange={(e) => setNewBot(prev => ({ ...prev, xml_content: e.target.value }))}
              margin="normal"
              multiline
              rows={10}
              required
              helperText="Cole aqui o conteúdo XML do bot da Deriv"
            />
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
    </Box>
  );
};

export default AdminBotsPage; 