import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Paper
} from '@mui/material';
import { Save, CheckCircle, Error } from '@mui/icons-material';
import axios from 'axios';

interface DerivSettings {
  deriv_app_id: string;
  deriv_app_token: string;
}

const DerivSettings: React.FC = () => {
  const [settings, setSettings] = useState<DerivSettings>({
    deriv_app_id: '',
    deriv_app_token: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/admin/settings');
      setSettings(response.data);
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao carregar configurações' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      await axios.put('/api/admin/settings', settings);
      setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao salvar configurações' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!settings.deriv_app_id) {
      setMessage({ type: 'error', text: 'App ID é obrigatório para testar conexão' });
      return;
    }

    setTesting(true);
    setMessage(null);

    try {
      const response = await axios.post('/api/admin/test-deriv-connection', {
        app_id: settings.deriv_app_id
      });
      setMessage({ type: 'success', text: 'Conexão com Deriv estabelecida com sucesso!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao conectar com Deriv. Verifique o App ID.' });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Configurações da Deriv
      </Typography>
      
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Informações Importantes
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          • O App ID da Deriv é usado para rastrear operações e aplicar markup automaticamente
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          • O markup é configurado diretamente no seu app na Deriv, não na plataforma
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • Para obter seu App ID, acesse o Dashboard da Deriv → Applications → Applications Manager
        </Typography>
      </Paper>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Configurações da Deriv
          </Typography>

          {message && (
            <Alert 
              severity={message.type} 
              sx={{ mb: 2 }}
              onClose={() => setMessage(null)}
            >
              {message.text}
            </Alert>
          )}

          <Box component="form" sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="App ID da Deriv"
              value={settings.deriv_app_id}
              onChange={(e) => setSettings({ ...settings, deriv_app_id: e.target.value })}
              margin="normal"
              placeholder="Ex: 82349"
              helperText="ID do seu aplicativo na Deriv"
            />

            <TextField
              fullWidth
              label="App Token da Deriv"
              value={settings.deriv_app_token}
              onChange={(e) => setSettings({ ...settings, deriv_app_token: e.target.value })}
              margin="normal"
              type="password"
              placeholder="Token secreto do seu app"
              helperText="Token de autenticação do seu aplicativo"
            />

            <Divider sx={{ my: 3 }} />

            <Box display="flex" gap={2} flexWrap="wrap">
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Salvando...' : 'Salvar Configurações'}
              </Button>

              <Button
                variant="outlined"
                startIcon={testing ? <CircularProgress size={20} /> : <CheckCircle />}
                onClick={handleTestConnection}
                disabled={testing || !settings.deriv_app_id}
              >
                {testing ? 'Testando...' : 'Testar Conexão'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default DerivSettings; 