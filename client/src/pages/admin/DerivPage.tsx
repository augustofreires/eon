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

const DerivPage: React.FC = () => {
  const [affiliateLink, setAffiliateLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAffiliateLink();
  }, []);

  const loadAffiliateLink = async () => {
    setLoading(true);
    try {
      const affiliateResponse = await axios.get('/api/admin/deriv-config');
      if (affiliateResponse.data.config?.affiliate_link) {
        setAffiliateLink(affiliateResponse.data.config.affiliate_link);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!affiliateLink.trim()) {
      toast.error('Por favor, insira um link de afiliado');
      return;
    }

    try {
      new URL(affiliateLink);
    } catch {
      toast.error('Por favor, insira um URL válido para o link de afiliado');
      return;
    }

    setSaving(true);
    try {
      await axios.post('/api/admin/deriv-config', {
        affiliate_link: affiliateLink.trim()
      });
      
      toast.success('Link de afiliado salvo com sucesso!');
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
        Link de Afiliado Deriv
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Link sx={{ mr: 2, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Link de Afiliado Deriv
                </Typography>
              </Box>
              
              <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
                Configure o link de afiliado que será usado nos botões de cadastro da corretora.
                Este link aparecerá quando os usuários clicarem em "Criar conta" ou "Conectar conta Deriv".
              </Typography>

              <TextField
                fullWidth
                label="Link de Afiliado Deriv"
                placeholder="https://deriv.com/signup/?t=..."
                value={affiliateLink}
                onChange={(e) => setAffiliateLink(e.target.value)}
                disabled={loading || saving}
                sx={{ mb: 2 }}
              />
              
              {affiliateLink && (
                <Alert severity="info">
                  <Typography variant="body2">
                    Preview: Os usuários serão redirecionados para<br />
                    <strong>{affiliateLink}</strong>
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
          disabled={loading || saving || !affiliateLink.trim()}
          sx={{
            px: 6,
            py: 1.5,
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          {saving ? 'Salvando...' : 'Salvar Link de Afiliado'}
        </Button>
      </Box>
    </Box>
  );
};

export default DerivPage;