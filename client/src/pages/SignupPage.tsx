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
  IconButton,
  Link
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Person,
  PersonAdd
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

interface BrandingConfig {
  platform_name: string;
  platform_subtitle: string;
  logo_url?: string;
  favicon_url?: string;
}

const SignupPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState<BrandingConfig>({
    platform_name: 'EON PRO',
    platform_subtitle: 'Plataforma de Trading Inteligente'
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadBranding();
  }, []);

  const loadBranding = async () => {
    try {
      const response = await axios.get('/api/branding/config');
      setBranding(response.data);
    } catch (error) {
      console.error('Erro ao carregar branding:', error);
    }
  };

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    setError('');
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Nome é obrigatório');
      return false;
    }

    if (!formData.email.trim()) {
      setError('Email é obrigatório');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Por favor, insira um email válido');
      return false;
    }

    if (!formData.password) {
      setError('Senha é obrigatória');
      return false;
    }

    if (formData.password.length < 6) {
      setError('Senha deve ter pelo menos 6 caracteres');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.post('/api/auth/signup', {
        name: formData.name,
        email: formData.email,
        password: formData.password
      });

      toast.success('Conta criada com sucesso! Você pode fazer login agora.');
      navigate('/login');
    } catch (error: any) {
      console.error('Erro no cadastro:', error);
      const errorMessage = error.response?.data?.error || 'Erro ao criar conta. Tente novamente.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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
          maxWidth: 450,
          mx: 2,
          maxHeight: { xs: '100vh', sm: 'none' },
          overflowY: { xs: 'auto', sm: 'visible' }
        }}
      >
        {/* Logo */}
        <Box textAlign="center" mb={4} mt={{ xs: 2, sm: 6 }} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {branding.logo_url ? (
            <Box mb={2} sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
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
                mb: 1,
                textAlign: 'center'
              }}
            >
              {branding.platform_name}
            </Typography>
          )}
          <Typography
            variant="body1"
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '1.1rem',
              mb: 1,
              textAlign: 'center'
            }}
          >
            Criar Nova Conta
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '0.9rem',
              textAlign: 'center'
            }}
          >
            {branding.platform_subtitle}
          </Typography>
        </Box>

        {/* Signup Card */}
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
                label="Nome Completo"
                value={formData.name}
                onChange={handleInputChange('name')}
                margin="normal"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
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
                      borderColor: 'rgba(255, 69, 0, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#ff4500',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255, 255, 255, 0.7)',
                    '&.Mui-focused': {
                      color: '#ff4500',
                    },
                  },
                }}
              />

              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleInputChange('email')}
                margin="normal"
                required
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
                      borderColor: 'rgba(255, 69, 0, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#ff4500',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255, 255, 255, 0.7)',
                    '&.Mui-focused': {
                      color: '#ff4500',
                    },
                  },
                }}
              />

              <TextField
                fullWidth
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange('password')}
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
                      borderColor: 'rgba(255, 69, 0, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#ff4500',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255, 255, 255, 0.7)',
                    '&.Mui-focused': {
                      color: '#ff4500',
                    },
                  },
                }}
              />

              <TextField
                fullWidth
                label="Confirmar Senha"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleInputChange('confirmPassword')}
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
                      borderColor: 'rgba(255, 69, 0, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#ff4500',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255, 255, 255, 0.7)',
                    '&.Mui-focused': {
                      color: '#ff4500',
                    },
                  },
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <PersonAdd />}
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
                {loading ? 'Criando Conta...' : 'CRIAR CONTA'}
              </Button>

              <Box textAlign="center" mt={2}>
                <Button
                  variant="text"
                  onClick={() => navigate('/login')}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    textDecoration: 'none',
                    '&:hover': {
                      color: '#ff4500',
                    },
                  }}
                >
                  Já tem uma conta? Fazer Login
                </Button>
              </Box>
            </form>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <Box
          sx={{
            mt: { xs: 2, sm: 4 },
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: { xs: '0.75rem', sm: '0.85rem' },
            lineHeight: 1.5,
            maxWidth: 600,
            mx: 'auto',
            px: { xs: 1, sm: 0 }
          }}
        >
          A Deriv oferece derivativos complexos como opções e contratos por diferença ('CFDs'). 
          Estes produtos podem não ser adequados para todos os clientes, e sua comercialização 
          envolve riscos para você. Certifique-se de compreender os seguintes riscos antes de 
          negociar produtos derivados: a) você pode perder parte ou todo o dinheiro investido 
          na negociação, b) se sua negociação envolver conversão de moeda, as taxas de câmbio 
          afetarão seus lucros e perdas. Nunca se deve negociar com dinheiro emprestado ou 
          dinheiro que não se pode perder.
        </Box>

        {/* Legal Links */}
        <Box
          sx={{
            mt: { xs: 2, sm: 3 },
            mb: { xs: 2, sm: 0 },
            textAlign: 'center',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            pt: 2
          }}
        >
          <Link
            href="/about"
            sx={{
              color: 'rgba(255, 255, 255, 0.4)',
              textDecoration: 'none',
              fontSize: '0.8rem',
              mx: 2,
              '&:hover': {
                color: 'rgba(255, 255, 255, 0.6)',
                textDecoration: 'underline',
              },
            }}
          >
            Quem Somos
          </Link>
          <Link
            href="/terms"
            sx={{
              color: 'rgba(255, 255, 255, 0.4)',
              textDecoration: 'none',
              fontSize: '0.8rem',
              mx: 2,
              '&:hover': {
                color: 'rgba(255, 255, 255, 0.6)',
                textDecoration: 'underline',
              },
            }}
          >
            Termos e Condições
          </Link>
        </Box>
      </Box>
    </Box>
  );
};

export default SignupPage;