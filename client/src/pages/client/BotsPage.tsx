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
  image_url?: string;
}

const BotsPage: React.FC = () => {
  const [bots, setBots] = useState<Bot[]>([]);
  
  // Função para gerar thumbnail placeholder
  const generateBotThumbnail = (botName: string, botId: number) => {
    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
      'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    ];
    
    return colors[botId % colors.length];
  };
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
      <Typography variant="h4" gutterBottom sx={{ 
        fontWeight: 700,
        background: 'linear-gradient(135deg, #00d4aa 0%, #00b89c 100%)',
        backgroundClip: 'text',
        textFillColor: 'transparent',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        mb: 3,
        display: 'flex',
        alignItems: 'center',
        gap: 2
      }}>
        <SmartToy sx={{ fontSize: '2.5rem', color: 'primary.main' }} />
        Biblioteca de Bots Premium
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
            <Grid item xs={12} sm={6} md={4} lg={3} key={bot.id}>
              <Box
                className="theme-card"
                onClick={() => handleUseBot(bot)}
                sx={{
                  cursor: 'pointer',
                  overflow: 'hidden',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  height: '300px',
                  '&:hover': {
                    transform: 'translateY(-8px) scale(1.03)',
                    boxShadow: '0 20px 40px rgba(0, 212, 170, 0.15)',
                    border: '2px solid rgba(0, 212, 170, 0.3)',
                    '& .bot-thumbnail': {
                      transform: 'scale(1.1)',
                    },
                    '& .bot-play-button': {
                      opacity: 1,
                      transform: 'translate(-50%, -50%) scale(1)',
                    },
                    '& .bot-gradient-overlay': {
                      opacity: 0.8,
                    }
                  }
                }}
              >
                {/* Thumbnail Principal */}
                <Box
                  className="bot-thumbnail"
                  sx={{
                    height: '180px',
                    background: bot.image_url 
                      ? `url(${bot.image_url})` 
                      : generateBotThumbnail(bot.name, bot.id),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    transition: 'transform 0.4s ease',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  {/* Gradiente Overlay */}
                  <Box
                    className="bot-gradient-overlay"
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.7) 100%)',
                      opacity: 0.4,
                      transition: 'opacity 0.3s ease',
                    }}
                  />
                  
                  {/* Ícone Central - só mostra se não tiver imagem */}
                  {!bot.image_url && (
                    <SmartToy 
                      sx={{ 
                        fontSize: '4rem',
                        color: 'white',
                        textShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                        zIndex: 2,
                        opacity: 0.9
                      }} 
                    />
                  )}
                  
                  {/* Botão Play no Hover */}
                  <Box
                    className="bot-play-button"
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%) scale(0.8)',
                      opacity: 0,
                      transition: 'all 0.3s ease',
                      zIndex: 3,
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: 'rgba(0, 212, 170, 0.9)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 4px 16px rgba(0, 212, 170, 0.4)'
                    }}
                  >
                    <PlayArrow sx={{ color: 'white', fontSize: '2rem', ml: 0.5 }} />
                  </Box>
                  
                  {/* Status Badge */}
                  <Chip
                    label="Premium"
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                      color: 'rgba(0, 0, 0, 0.8)',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      boxShadow: '0 2px 8px rgba(255, 215, 0, 0.3)',
                      zIndex: 2
                    }}
                  />
                </Box>
                
                {/* Informações do Bot */}
                <Box sx={{ p: 2, height: '120px', display: 'flex', flexDirection: 'column' }}>
                  <Typography 
                    variant="h6" 
                    sx={{
                      fontWeight: 700,
                      mb: 0.5,
                      fontSize: '1rem',
                      color: 'text.primary',
                      lineHeight: 1.2
                    }}
                  >
                    {bot.name}
                  </Typography>
                  
                  <Typography 
                    variant="body2" 
                    sx={{
                      color: 'text.secondary',
                      mb: 1,
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      fontSize: '0.875rem',
                      flexGrow: 1
                    }}
                  >
                    {bot.description}
                  </Typography>
                  
                  {/* Footer */}
                  <Box 
                    display="flex" 
                    justifyContent="space-between" 
                    alignItems="center"
                    sx={{ mt: 'auto' }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {new Date(bot.created_at).toLocaleDateString()}
                    </Typography>
                    
                    <Box
                      sx={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                        boxShadow: '0 0 8px rgba(76, 175, 80, 0.6)'
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            </Grid>
          ))
        )}
      </Grid>
    </Box>
  );
};

export default BotsPage; 