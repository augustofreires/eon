import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button
} from '@mui/material';
import {
  SmartToy,
  PlayArrow
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

const BotsPage: React.FC = () => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(false);

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
      toast.error('Erro ao carregar bots disponíveis');
    } finally {
      setLoading(false);
    }
  };

  const handleUseBot = (bot: Bot) => {
    // Redirecionar para página de operações com o bot selecionado
    window.location.href = `/operations?bot=${bot.id}`;
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        <SmartToy sx={{ mr: 1, verticalAlign: 'middle' }} />
        Bots Disponíveis
      </Typography>

      <Grid container spacing={3}>
        {bots.length === 0 ? (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box textAlign="center" py={4}>
                  <SmartToy sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Nenhum bot disponível
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Entre em contato com o administrador para ter acesso aos bots
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ) : (
          bots.map((bot) => (
            <Grid item xs={12} md={6} lg={4} key={bot.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    transition: 'transform 0.2s ease-in-out',
                    boxShadow: 4
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <SmartToy sx={{ fontSize: 32, color: 'primary.main', mr: 1 }} />
                    <Typography variant="h6" fontWeight="bold">
                      {bot.name}
                    </Typography>
                  </Box>

                  <Typography variant="body2" color="text.secondary" mb={2} sx={{ flexGrow: 1 }}>
                    {bot.description}
                  </Typography>

                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Chip
                      label="Disponível"
                      color="success"
                      size="small"
                      variant="outlined"
                    />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(bot.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>

                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<PlayArrow />}
                    onClick={() => handleUseBot(bot)}
                    sx={{ mt: 'auto' }}
                  >
                    Usar Bot
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>
    </Box>
  );
};

export default BotsPage; 