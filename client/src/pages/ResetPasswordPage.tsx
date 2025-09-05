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
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Lock,
  CheckCircle,
  Error
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

interface BrandingConfig {
  platform_name: string;
  platform_subtitle: string;
  logo_url?: string;
  favicon_url?: string;
}

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [branding, setBranding] = useState<BrandingConfig>({
    platform_name: 'EON PRO',
    platform_subtitle: 'Plataforma de Trading Inteligente'
  });

  useEffect(() => {
    loadBranding();
    if (token) {
      validateToken();
    } else {
      setError('Token de redefinição não encontrado');
      setLoading(false);
    }
  }, [token]);

  const loadBranding = async () => {
    try {
      const response = await axios.get('/api/branding/config');
      setBranding(response.data);
      
      // Atualizar título da página
      document.title = `${response.data.platform_name} - Redefinir Senha`;
    } catch (error) {
      console.error('Erro ao carregar branding:', error);
    }
  };

  const validateToken = async () => {
    try {
      const response = await axios.get(`/api/auth/validate-reset-token/${token}`);
      if (response.data.valid) {
        setUserEmail(response.data.user.email);
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Token inválido ou expirado');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setSaving(true);
    try {
      await axios.post('/api/auth/reset-password', {
        token,
        newPassword
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (error: any) {
      console.error('Erro ao redefinir senha:', error);
      setError(error.response?.data?.error || 'Erro ao redefinir senha');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #1e1e1e 0%, #2d1b1b 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Box textAlign="center">
          <CircularProgress sx={{ color: 'var(--primary-color)', mb: 2 }} />
          <Typography sx={{ color: 'white' }}>
            Validando token de redefinição...
          </Typography>
        </Box>
      </Box>
    );
  }

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
            maxWidth: 400,
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
                Senha redefinida com sucesso!
              </Typography>
              <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 3 }}>
                Sua senha foi atualizada. Você será redirecionado para a página de login em alguns segundos.
              </Typography>
              <Button
                variant="contained"
                onClick={() => navigate('/login')}
                sx={{
                  background: 'var(--button-gradient)',
                  '&:hover': {
                    background: 'var(--button-gradient)',
                    opacity: 0.9
                  },
                  borderRadius: 2,
                }}
              >
                Ir para Login
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
              fontWeight: 600,
              mb: 1
            }}
          >
            Redefinir Senha
          </Typography>
          {userEmail && (
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.9rem'
              }}
            >
              Para: {userEmail}
            </Typography>
          )}
        </Box>

        {/* Reset Password Card */}
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
              <Alert 
                severity="error" 
                sx={{ mb: 3 }}
                icon={<Error />}
              >
                {error}
              </Alert>
            )}

            {!error && (
              <form onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="Nova Senha"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  margin="normal"
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
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

                <TextField
                  fullWidth
                  label="Confirmar Nova Senha"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  margin="normal"
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                          sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
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
                  disabled={saving}
                  startIcon={saving ? <CircularProgress size={20} /> : <CheckCircle />}
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
                  {saving ? 'Redefinindo...' : 'REDEFINIR SENHA'}
                </Button>
              </form>
            )}

            <Box textAlign="center" mt={2}>
              <Button
                variant="text"
                onClick={() => navigate('/login')}
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
      </Box>
    </Box>
  );
};

export default ResetPasswordPage;