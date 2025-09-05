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
  InputAdornment
} from '@mui/material';
import {
  Email,
  CheckCircle,
  ArrowBack
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface BrandingConfig {
  platform_name: string;
  platform_subtitle: string;
  logo_url?: string;
  favicon_url?: string;
}

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [branding, setBranding] = useState<BrandingConfig>({
    platform_name: 'EON PRO',
    platform_subtitle: 'Plataforma de Trading Inteligente'
  });

  useEffect(() => {
    loadBranding();
  }, []);

  const loadBranding = async () => {
    try {
      const response = await axios.get('/api/branding/config');
      setBranding(response.data);
      
      // Atualizar título da página
      document.title = `${response.data.platform_name} - Esqueceu a Senha`;
    } catch (error) {
      console.error('Erro ao carregar branding:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await axios.post('/api/auth/forgot-password', { email });
      setSuccess(true);
    } catch (error: any) {
      console.error('Erro ao solicitar reset de senha:', error);
      setError(error.response?.data?.error || 'Erro ao solicitar reset de senha');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #1e1e1e 0%, #2d1b1b 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          py: { xs: 2, sm: 0 }
        }}
      >
        <Box
          sx={{
            position: 'relative',
            zIndex: 2,
            width: '100%',
            maxWidth: 450,
            mx: 2,
            textAlign: 'center'
          }}
        >
          <CheckCircle sx={{ fontSize: 80, color: '#4CAF50', mb: 2 }} />
          
          <Card
            sx={{
              background: 'rgba(40, 40, 40, 0.95)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(76, 175, 80, 0.3)',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" sx={{ color: '#4CAF50', mb: 2, fontWeight: 600 }}>
                Solicitação Enviada!
              </Typography>
              <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 3, lineHeight: 1.6 }}>
                Se o email <strong>{email}</strong> existir em nossa base de dados, 
                você receberá um link para redefinir sua senha em alguns minutos.
              </Typography>
              <Typography sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 3, fontSize: '0.9rem' }}>
                Verifique também sua pasta de spam ou lixo eletrônico.
              </Typography>
              <Button
                variant="contained"
                onClick={() => navigate('/login')}
                startIcon={<ArrowBack />}
                sx={{
                  background: 'var(--button-gradient)',
                  '&:hover': {
                    background: 'var(--button-gradient)',
                    opacity: 0.9
                  },
                  borderRadius: 2,
                  px: 4
                }}
              >
                Voltar ao Login
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e1e1e 0%, #2d1b1b 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        py: { xs: 2, sm: 0 }
      }}
    >
      {/* Background Pattern */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 50%, rgba(255, 69, 0, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255, 140, 0, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 80%, rgba(255, 69, 0, 0.05) 0%, transparent 50%)
          `,
          zIndex: 1
        }}
      />

      {/* Main Content */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: 400,
          mx: 2
        }}
      >
        {/* Logo */}
        <Box textAlign="center" mb={4} mt={{ xs: 2, sm: 6 }}>
          {branding.logo_url ? (
            <Box mb={2}>
              <img 
                src={branding.logo_url} 
                alt={branding.platform_name}
                style={{
                  maxWidth: '280px',
                  maxHeight: '100px',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.3))'
                }}
              />
            </Box>
          ) : (
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                color: '#fff',
                textShadow: '0 0 20px var(--primary-color)',
                mb: 1
              }}
            >
              {branding.platform_name}
            </Typography>
          )}
          <Typography
            variant="h5"
            sx={{
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '1.3rem',
              fontWeight: 600
            }}
          >
            Esqueceu a Senha?
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.95rem',
              mt: 1
            }}
          >
            Digite seu email para receber um link de redefinição
          </Typography>
        </Box>

        {/* Forgot Password Card */}
        <Card
          sx={{
            background: 'rgba(40, 40, 40, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 69, 0, 0.2)',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}
        >
          <CardContent sx={{ p: 4 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Seu Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                margin="normal"
                required
                placeholder="exemplo@email.com"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'var(--primary-color)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'var(--primary-color)',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255, 255, 255, 0.7)',
                    '&.Mui-focused': {
                      color: 'var(--primary-color)',
                    },
                  },
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading || !email.trim()}
                startIcon={loading ? <CircularProgress size={20} /> : <Email />}
                sx={{
                  mt: 3,
                  mb: 2,
                  py: 1.5,
                  background: 'var(--button-gradient)',
                  '&:hover': {
                    background: 'var(--button-gradient)',
                    opacity: 0.9
                  },
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  borderRadius: 2,
                }}
              >
                {loading ? 'Enviando...' : 'ENVIAR LINK DE REDEFINIÇÃO'}
              </Button>
            </form>

            <Box textAlign="center" mt={2}>
              <Button
                variant="text"
                onClick={() => navigate('/login')}
                startIcon={<ArrowBack />}
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  textDecoration: 'none',
                  '&:hover': {
                    color: 'var(--primary-color)',
                    backgroundColor: 'transparent'
                  },
                }}
              >
                Voltar ao Login
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Security Info */}
        <Box
          sx={{
            mt: 3,
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '0.8rem',
            lineHeight: 1.5,
            maxWidth: 350,
            mx: 'auto'
          }}
        >
          ℹ️ Por questões de segurança, sempre mostraremos esta mensagem, 
          independentemente do email existir ou não em nossa base de dados.
        </Box>
      </Box>
    </Box>
  );
};

export default ForgotPasswordPage;