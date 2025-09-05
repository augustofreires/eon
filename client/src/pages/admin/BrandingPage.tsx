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
  Avatar,
  IconButton,
  Input,
  FormControl,
  FormLabel,
  Stack,
  Chip,
  Divider
} from '@mui/material';
import {
  Palette,
  CloudUpload,
  Image,
  Web,
  Save,
  Refresh,
  PhotoCamera,
  Favorite,
  People
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';

interface BrandingConfig {
  id?: number;
  platform_name: string;
  platform_subtitle: string;
  logo_url?: string;
  favicon_url?: string;
  online_users_count?: number;
}

const BrandingPage: React.FC = () => {
  const [config, setConfig] = useState<BrandingConfig>({
    platform_name: 'EON PRO',
    platform_subtitle: 'Plataforma de Trading Inteligente',
    online_users_count: 2105
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await axios.get('/api/branding/admin/config');
      setConfig(response.data);
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
      toast.error('Erro ao carregar configuração de branding');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const response = await axios.put('/api/branding/admin/config', {
        platform_name: config.platform_name,
        platform_subtitle: config.platform_subtitle,
        online_users_count: config.online_users_count
      });
      
      setConfig(response.data);
      toast.success('Configuração salva com sucesso!');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Erro ao salvar configuração';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('logo', file);

    try {
      const response = await axios.post('/api/branding/admin/upload-logo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setConfig(prev => ({ ...prev, logo_url: response.data.logo_url }));
      toast.success('Logo enviado com sucesso!');
      setLogoFile(null);
    } catch (error: any) {
      const message = error.response?.data?.error || 'Erro ao enviar logo';
      toast.error(message);
    }
  };

  const handleFaviconUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('favicon', file);

    try {
      const response = await axios.post('/api/branding/admin/upload-favicon', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setConfig(prev => ({ ...prev, favicon_url: response.data.favicon_url }));
      toast.success('Favicon enviado com sucesso!');
      setFaviconFile(null);
    } catch (error: any) {
      const message = error.response?.data?.error || 'Erro ao enviar favicon';
      toast.error(message);
    }
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
          Configuração de Branding
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ 
          fontSize: '1.1rem',
          fontWeight: 500
        }}>
          Personalize a aparência e identidade visual da plataforma
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Preview Card */}
        <Grid item xs={12} md={4}>
          <Card className="theme-card" sx={{ position: 'sticky', top: 20 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ 
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                color: 'primary.main'
              }}>
                <Web />
                Preview
              </Typography>
              
              <Box
                sx={{
                  background: 'linear-gradient(135deg, #1e1e1e 0%, #2d1b1b 100%)',
                  borderRadius: 3,
                  p: 3,
                  textAlign: 'center',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                {config.logo_url ? (
                  <Box mb={2}>
                    <img 
                      src={config.logo_url} 
                      alt="Logo" 
                      style={{
                        maxWidth: '120px',
                        maxHeight: '60px',
                        objectFit: 'contain'
                      }}
                    />
                  </Box>
                ) : (
                  <Avatar
                    sx={{
                      width: 60,
                      height: 60,
                      mx: 'auto',
                      mb: 2,
                      background: 'var(--button-gradient)'
                    }}
                  >
                    <Web fontSize="large" />
                  </Avatar>
                )}
                
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    color: '#fff',
                    mb: 1
                  }}
                >
                  {config.platform_name}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.7)',
                  }}
                >
                  {config.platform_subtitle}
                </Typography>
                
                <Box mt={2}>
                  <Button
                    variant="contained"
                    size="small"
                    sx={{
                      background: 'var(--button-gradient)',
                      color: 'white'
                    }}
                  >
                    Botão Exemplo
                  </Button>
                </Box>
              </Box>

              <Box mt={2}>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Use a página "Temas" para configurar as cores da plataforma
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Configuration Forms */}
        <Grid item xs={12} md={8}>
          <Stack spacing={3}>
            {/* Basic Info */}
            <Card className="theme-card">
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ 
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  color: 'primary.main'
                }}>
                  <Palette />
                  Informações da Plataforma
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Nome da Plataforma"
                      value={config.platform_name}
                      onChange={(e) => setConfig(prev => ({ ...prev, platform_name: e.target.value }))}
                      placeholder="Ex: EON PRO"
                      required
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Subtítulo"
                      value={config.platform_subtitle}
                      onChange={(e) => setConfig(prev => ({ ...prev, platform_subtitle: e.target.value }))}
                      placeholder="Ex: Plataforma de Trading Inteligente"
                      required
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Contador de Usuários Online"
                      type="number"
                      value={config.online_users_count || 2105}
                      onChange={(e) => setConfig(prev => ({ ...prev, online_users_count: parseInt(e.target.value) || 2105 }))}
                      placeholder="Ex: 2105"
                      helperText="Número base de usuários online mostrado para clientes"
                      InputProps={{
                        startAdornment: <People sx={{ mr: 1, color: 'text.secondary' }} />
                      }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>


            {/* Logo Upload */}
            <Card className="theme-card">
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ 
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  color: 'primary.main'
                }}>
                  <Image />
                  Logo da Plataforma
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Button
                      component="label"
                      variant="outlined"
                      fullWidth
                      startIcon={<CloudUpload />}
                      sx={{ py: 2 }}
                    >
                      Enviar Logo
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setLogoFile(file);
                          }
                        }}
                      />
                    </Button>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    {config.logo_url && (
                      <Box textAlign="center">
                        <img 
                          src={config.logo_url} 
                          alt="Current Logo" 
                          style={{
                            maxWidth: '100%',
                            maxHeight: '60px',
                            objectFit: 'contain'
                          }}
                        />
                        <Typography variant="caption" display="block" color="text.secondary">
                          Logo atual
                        </Typography>
                      </Box>
                    )}
                  </Grid>
                </Grid>
                
                {logoFile && (
                  <Box mt={2}>
                    <Alert severity="info" sx={{ borderRadius: '12px' }}>
                      Arquivo selecionado: {logoFile.name}
                      <Button 
                        size="small" 
                        onClick={() => handleLogoUpload(logoFile)}
                        sx={{ ml: 2 }}
                      >
                        Enviar
                      </Button>
                    </Alert>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Favicon Upload */}
            <Card className="theme-card">
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ 
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  color: 'primary.main'
                }}>
                  <Favorite />
                  Favicon
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Button
                      component="label"
                      variant="outlined"
                      fullWidth
                      startIcon={<PhotoCamera />}
                      sx={{ py: 2 }}
                    >
                      Enviar Favicon
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setFaviconFile(file);
                          }
                        }}
                      />
                    </Button>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    {config.favicon_url && (
                      <Box textAlign="center">
                        <img 
                          src={config.favicon_url} 
                          alt="Current Favicon" 
                          style={{
                            width: '32px',
                            height: '32px',
                            objectFit: 'contain'
                          }}
                        />
                        <Typography variant="caption" display="block" color="text.secondary">
                          Favicon atual
                        </Typography>
                      </Box>
                    )}
                  </Grid>
                </Grid>
                
                {faviconFile && (
                  <Box mt={2}>
                    <Alert severity="info" sx={{ borderRadius: '12px' }}>
                      Arquivo selecionado: {faviconFile.name}
                      <Button 
                        size="small" 
                        onClick={() => handleFaviconUpload(faviconFile)}
                        sx={{ ml: 2 }}
                      >
                        Enviar
                      </Button>
                    </Alert>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="theme-card">
              <CardContent>
                <Box display="flex" gap={2} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={loadConfig}
                  >
                    Recarregar
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={handleSaveConfig}
                    disabled={saving}
                    sx={{
                      background: 'var(--button-gradient)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #00b89c 0%, #009688 100%)',
                      }
                    }}
                  >
                    {saving ? 'Salvando...' : 'Salvar Configuração'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BrandingPage;