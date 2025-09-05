import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Alert,
  Divider,
  Grid
} from '@mui/material';
import {
  Link,
  Save,
  CheckCircle
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';

const AccessLinkPage: React.FC = () => {
  const [accessLink, setAccessLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAccessLink();
  }, []);

  const loadAccessLink = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/admin/access-link-config');
      if (response.data.config?.access_link) {
        setAccessLink(response.data.config.access_link);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!accessLink.trim()) {
      toast.error('Por favor, insira um link de acesso');
      return;
    }

    try {
      new URL(accessLink);
    } catch {
      toast.error('Por favor, insira um URL válido para o link de acesso');
      return;
    }

    setSaving(true);
    try {
      await axios.post('/api/admin/access-link-config', {
        access_link: accessLink.trim()
      });
      
      toast.success('Link de acesso salvo com sucesso!');
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast.error(error.response?.data?.error || 'Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Link do Botão "Obter Acesso"
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Link sx={{ mr: 2, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Link do Botão "Obter Acesso"
                </Typography>
              </Box>
              
              <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
                Configure o link que será usado no botão "Obter Acesso" na página de login.
                Os usuários serão redirecionados para este link quando clicarem no botão.
              </Typography>

              <TextField
                fullWidth
                label="Link do Botão 'Obter Acesso'"
                placeholder="https://exemplo.com/obter-acesso"
                value={accessLink}
                onChange={(e) => setAccessLink(e.target.value)}
                disabled={loading || saving}
                sx={{ mb: 2 }}
              />
              
              {accessLink && (
                <Alert severity="info">
                  <Typography variant="body2">
                    Preview: Os usuários serão redirecionados para<br />
                    <strong>{accessLink}</strong>
                  </Typography>
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
        <Button
          variant="contained"
          size="large"
          startIcon={saving ? <CheckCircle /> : <Save />}
          onClick={handleSave}
          disabled={loading || saving || !accessLink.trim()}
          sx={{
            px: 6,
            py: 1.5,
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          {saving ? 'Salvando...' : 'Salvar Link de Acesso'}
        </Button>
      </Box>
    </Box>
  );
};

export default AccessLinkPage;