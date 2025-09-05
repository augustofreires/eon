import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  Paper,
  Divider,
  Switch,
  FormControlLabel,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Palette,
  Save,
  Refresh,
  ExpandMore,
  ColorLens,
  Gradient,
  FormatColorFill,
  Visibility
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useTheme } from '../../contexts/ThemeContext';

interface ThemeConfig {
  id?: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  titleColor: string;
  subtitleColor: string;
  menuTitleColor: string;
  backgroundGradient: string;
  cardBackground: string;
  textGradient: string;
  buttonGradient: string;
  hoverEffects: boolean;
  glassEffect: boolean;
  borderRadius: number;
  shadowIntensity: string;
  created_at?: string;
  updated_at?: string;
}

const defaultTheme: ThemeConfig = {
  primaryColor: '#e50914',
  secondaryColor: '#f40612',
  accentColor: '#ffffff',
  titleColor: '#ffffff',
  subtitleColor: '#b3b3b3',
  menuTitleColor: '#00d4aa',
  backgroundGradient: 'linear-gradient(135deg, #141414 0%, #000000 100%)',
  cardBackground: 'rgba(35, 35, 35, 0.95)',
  textGradient: 'linear-gradient(135deg, #e50914 0%, #f40612 100%)',
  buttonGradient: 'linear-gradient(135deg, #e50914 0%, #f40612 100%)',
  hoverEffects: true,
  glassEffect: true,
  borderRadius: 8,
  shadowIntensity: 'medium'
};

const ThemeConfigPage: React.FC = () => {
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { applyTheme, refreshTheme, theme: contextTheme } = useTheme();

  useEffect(() => {
    loadCurrentTheme();
  }, []);

  // Sincronizar com o tema do contexto quando ele mudar
  useEffect(() => {
    if (contextTheme && !loading) {
      console.log('🔄 [THEME CONFIG] Sincronizando com tema do contexto:', contextTheme);
      setTheme(contextTheme);
    }
  }, [contextTheme, loading]);

  const loadCurrentTheme = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/admin/theme-config/current');
      console.log('🎨 [THEME CONFIG] Resposta do servidor:', response.data);
      
      if (response.data.theme) {
        const serverTheme = response.data.theme;
        // Converter campos do banco (snake_case) para camelCase
        const loadedTheme = {
          ...defaultTheme,
          primaryColor: serverTheme.primary_color || serverTheme.primaryColor || defaultTheme.primaryColor,
          secondaryColor: serverTheme.secondary_color || serverTheme.secondaryColor || defaultTheme.secondaryColor,
          accentColor: serverTheme.accent_color || serverTheme.accentColor || defaultTheme.accentColor,
          titleColor: serverTheme.title_color || serverTheme.titleColor || defaultTheme.titleColor,
          subtitleColor: serverTheme.subtitle_color || serverTheme.subtitleColor || defaultTheme.subtitleColor,
          menuTitleColor: serverTheme.menu_title_color || serverTheme.menuTitleColor || defaultTheme.menuTitleColor,
          backgroundGradient: serverTheme.background_gradient || serverTheme.backgroundGradient || defaultTheme.backgroundGradient,
          cardBackground: serverTheme.card_background || serverTheme.cardBackground || defaultTheme.cardBackground,
          textGradient: serverTheme.text_gradient || serverTheme.textGradient || defaultTheme.textGradient,
          buttonGradient: serverTheme.button_gradient || serverTheme.buttonGradient || defaultTheme.buttonGradient,
          hoverEffects: serverTheme.hover_effects !== undefined ? Boolean(serverTheme.hover_effects) : (serverTheme.hoverEffects !== undefined ? serverTheme.hoverEffects : defaultTheme.hoverEffects),
          glassEffect: serverTheme.glass_effect !== undefined ? Boolean(serverTheme.glass_effect) : (serverTheme.glassEffect !== undefined ? serverTheme.glassEffect : defaultTheme.glassEffect),
          borderRadius: serverTheme.border_radius || serverTheme.borderRadius || defaultTheme.borderRadius,
          shadowIntensity: serverTheme.shadow_intensity || serverTheme.shadowIntensity || defaultTheme.shadowIntensity
        };
        
        console.log('🎯 [THEME CONFIG] Tema carregado:', loadedTheme);
        setTheme(loadedTheme);
      } else {
        console.log('⚠️ [THEME CONFIG] Nenhum tema encontrado, usando padrão');
        setTheme(defaultTheme);
      }
    } catch (error) {
      console.log('❌ [THEME CONFIG] Erro ao carregar tema, usando padrão:', error);
      setTheme(defaultTheme);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTheme = async () => {
    setSaving(true);
    try {
      console.log('🚀 [CLIENT] Enviando tema:', JSON.stringify(theme, null, 2));
      const response = await axios.post('/api/admin/theme-config', { theme });
      console.log('✅ [CLIENT] Resposta do servidor:', response.data);
      
      // Aplicar tema imediatamente após salvar
      applyTheme(theme);
      
      toast.success('Tema salvo com sucesso!');
    } catch (error: any) {
      console.error('Erro ao salvar tema:', error);
      console.error('Erro details:', error.response?.data);
      const errorMessage = error.response?.data?.error || 'Erro ao salvar configurações do tema';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setTheme(defaultTheme);
    toast.success('Tema resetado para o padrão');
  };

  const handleRefreshFromServer = async () => {
    setLoading(true);
    await loadCurrentTheme();
    await refreshTheme();
    toast.success('Tema recarregado do servidor');
  };

  const handleColorChange = (field: keyof ThemeConfig, value: string | number | boolean) => {
    const newTheme = {
      ...theme,
      [field]: value
    };
    setTheme(newTheme);
    
    // Aplicar tema em tempo real para preview automático
    applyTheme(newTheme);
  };

  const ColorPicker = ({ label, value, onChange, icon }: { 
    label: string; 
    value: string; 
    onChange: (value: string) => void;
    icon?: React.ReactNode;
  }) => (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        {icon}
        {label}
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <input
          type="color"
          value={value.includes('#') ? value : '#00d4aa'}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '50px',
            height: '50px',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer'
          }}
        />
        <TextField
          value={value}
          onChange={(e) => onChange(e.target.value)}
          size="small"
          sx={{ flex: 1 }}
          placeholder="CSS color value or gradient"
        />
      </Box>
    </Box>
  );

  const PreviewCard = () => (
    <Card sx={{
      borderRadius: `${theme.borderRadius}px`,
      background: theme.cardBackground,
      backdropFilter: theme.glassEffect ? 'blur(20px)' : 'none',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: theme.shadowIntensity === 'light' ? '0 4px 12px rgba(0, 0, 0, 0.1)' :
                 theme.shadowIntensity === 'medium' ? '0 8px 24px rgba(0, 0, 0, 0.15)' :
                 '0 12px 32px rgba(0, 0, 0, 0.2)',
      transition: theme.hoverEffects ? 'all 0.3s ease' : 'none',
      '&:hover': theme.hoverEffects ? {
        transform: 'translateY(-4px)',
        boxShadow: '0 12px 32px rgba(0, 212, 170, 0.1)'
      } : {}
    }}>
      <CardContent>
        <Typography variant="h6" sx={{
          background: theme.textGradient,
          backgroundClip: 'text',
          textFillColor: 'transparent',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 700,
          mb: 2
        }}>
          Prévia do Tema
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Este é um exemplo de como os cards ficarão com as configurações aplicadas.
        </Typography>
        <Button sx={{
          background: theme.buttonGradient,
          color: 'white',
          borderRadius: `${theme.borderRadius / 2}px`,
          '&:hover': {
            background: theme.buttonGradient,
            filter: 'brightness(1.1)'
          }
        }}>
          Botão de Exemplo
        </Button>
      </CardContent>
    </Card>
  );

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
        <Palette sx={{ fontSize: '2.5rem', color: 'primary.main' }} />
        Configuração de Tema
      </Typography>

      <Grid container spacing={3}>
        {/* Configurações */}
        <Grid item xs={12} md={8}>
          <Card sx={{
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)'
          }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                mb: 3
              }}>
                <ColorLens />
                Personalização Visual
              </Typography>

              <Accordion defaultExpanded sx={{ mb: 2, borderRadius: '16px' }}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    <Palette sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Cores Primárias
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <ColorPicker
                        label="Cor Primária"
                        value={theme.primaryColor}
                        onChange={(value) => handleColorChange('primaryColor', value)}
                        icon={<FormatColorFill fontSize="small" />}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <ColorPicker
                        label="Cor Secundária"
                        value={theme.secondaryColor}
                        onChange={(value) => handleColorChange('secondaryColor', value)}
                        icon={<FormatColorFill fontSize="small" />}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <ColorPicker
                        label="Cor de Destaque"
                        value={theme.accentColor}
                        onChange={(value) => handleColorChange('accentColor', value)}
                        icon={<FormatColorFill fontSize="small" />}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <ColorPicker
                        label="Cor dos Títulos"
                        value={theme.titleColor}
                        onChange={(value) => handleColorChange('titleColor', value)}
                        icon={<FormatColorFill fontSize="small" />}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <ColorPicker
                        label="Cor dos Subtítulos"
                        value={theme.subtitleColor}
                        onChange={(value) => handleColorChange('subtitleColor', value)}
                        icon={<FormatColorFill fontSize="small" />}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <ColorPicker
                        label="Cor dos Títulos do Menu"
                        value={theme.menuTitleColor}
                        onChange={(value) => handleColorChange('menuTitleColor', value)}
                        icon={<FormatColorFill fontSize="small" />}
                      />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>

              <Accordion sx={{ mb: 2, borderRadius: '16px' }}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    <Gradient sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Gradientes e Fundos
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <ColorPicker
                    label="Gradiente do Fundo"
                    value={theme.backgroundGradient}
                    onChange={(value) => handleColorChange('backgroundGradient', value)}
                  />
                  <ColorPicker
                    label="Fundo dos Cards"
                    value={theme.cardBackground}
                    onChange={(value) => handleColorChange('cardBackground', value)}
                  />
                  <ColorPicker
                    label="Gradiente dos Títulos"
                    value={theme.textGradient}
                    onChange={(value) => handleColorChange('textGradient', value)}
                  />
                  <ColorPicker
                    label="Gradiente dos Botões"
                    value={theme.buttonGradient}
                    onChange={(value) => handleColorChange('buttonGradient', value)}
                  />
                </AccordionDetails>
              </Accordion>

              <Accordion sx={{ mb: 2, borderRadius: '16px' }}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Efeitos Visuais
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={theme.hoverEffects}
                            onChange={(e) => handleColorChange('hoverEffects', e.target.checked)}
                          />
                        }
                        label="Efeitos de Hover"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={theme.glassEffect}
                            onChange={(e) => handleColorChange('glassEffect', e.target.checked)}
                          />
                        }
                        label="Efeito Glass/Blur"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Bordas Arredondadas
                      </Typography>
                      <TextField
                        type="number"
                        value={theme.borderRadius}
                        onChange={(e) => handleColorChange('borderRadius', parseInt(e.target.value) || 0)}
                        size="small"
                        fullWidth
                        InputProps={{ endAdornment: 'px' }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Intensidade das Sombras
                      </Typography>
                      <TextField
                        select
                        value={theme.shadowIntensity}
                        onChange={(e) => handleColorChange('shadowIntensity', e.target.value)}
                        size="small"
                        fullWidth
                        SelectProps={{ native: true }}
                      >
                        <option value="light">Leve</option>
                        <option value="medium">Média</option>
                        <option value="strong">Forte</option>
                      </TextField>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>

              <Divider sx={{ my: 3 }} />

              <Box display="flex" gap={2} flexWrap="wrap">
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={handleSaveTheme}
                  disabled={saving}
                  sx={{
                    background: 'linear-gradient(135deg, #00d4aa 0%, #00b89c 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #00b89c 0%, #00d4aa 100%)'
                    }
                  }}
                >
                  {saving ? 'Salvando...' : 'Salvar Tema'}
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={handleRefreshFromServer}
                  disabled={loading}
                >
                  {loading ? 'Carregando...' : 'Recarregar do Servidor'}
                </Button>
                
                <Button
                  variant="outlined"
                  onClick={handleReset}
                >
                  Resetar Padrão
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Prévia */}
        <Grid item xs={12} md={4}>
          <Box sx={{ position: 'sticky', top: 24 }}>
            <Typography variant="h6" gutterBottom sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              mb: 2
            }}>
              <Visibility />
              Prévia em Tempo Real
            </Typography>
            
            <PreviewCard />

            <Paper sx={{ 
              p: 2, 
              mt: 2, 
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 152, 0, 0.05) 100%)',
              border: '1px solid rgba(255, 193, 7, 0.2)'
            }}>
              <Alert severity="info" sx={{ background: 'transparent', p: 0 }}>
                <Typography variant="body2">
                  <strong>Dica:</strong> As mudanças são aplicadas em tempo real para visualização. 
                  Clique em "Salvar Tema" para aplicar a todos os usuários.
                </Typography>
              </Alert>
            </Paper>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ThemeConfigPage;