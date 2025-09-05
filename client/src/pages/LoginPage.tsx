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
  Link,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Person,
  PersonAdd
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface BrandingConfig {
  platform_name: string;
  platform_subtitle: string;
  logo_url?: string;
  favicon_url?: string;
}

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [branding, setBranding] = useState<BrandingConfig>({
    platform_name: 'EON PRO',
    platform_subtitle: 'Plataforma de Trading Inteligente'
  });
  const [accessLink, setAccessLink] = useState<string | null>(null);
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadBranding();
    loadAccessLink();
  }, []);

  const loadBranding = async () => {
    try {
      const response = await axios.get('/api/branding/config');
      setBranding(response.data);
      
      // Atualizar favicon dinamicamente se disponível
      if (response.data.favicon_url) {
        const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
        if (link) {
          link.href = response.data.favicon_url;
        } else {
          const newLink = document.createElement('link');
          newLink.rel = 'icon';
          newLink.href = response.data.favicon_url;
          document.head.appendChild(newLink);
        }
      }
      
      // Atualizar título da página
      document.title = `${response.data.platform_name} - ${window.location.pathname === '/admin' ? 'Painel Administrativo' : 'Login'}`;
    } catch (error) {
      console.error('Erro ao carregar branding:', error);
    }
  };

  const loadAccessLink = async () => {
    try {
      const response = await axios.get('/api/admin/access-link-config/current');
      if (response.data.access_link) {
        setAccessLink(response.data.access_link);
      }
    } catch (error) {
      console.error('Erro ao carregar link de acesso:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const isAdminPage = window.location.pathname === '/admin';
      await login(email, password, isAdminPage);
      navigate(isAdminPage ? '/admin' : '/dashboard');
    } catch (error: any) {
      console.error('Erro no login:', error);
      setError(error.response?.data?.error || 'Credenciais inválidas');
    }
  };

  const handleGetAccess = () => {
    if (accessLink) {
      // Redirecionar para o link configurado no admin
      window.open(accessLink, '_blank');
    } else {
      // Fallback para página de pagamento
      window.location.href = '/payment';
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
          maxWidth: 400,
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
              textAlign: 'center'
            }}
          >
            {window.location.pathname === '/admin' ? 'Painel Administrativo' : branding.platform_subtitle}
          </Typography>
        </Box>

        {/* Login Card */}
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
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <Person />}
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
                {loading ? 'Entrando...' : 'ENTRAR'}
              </Button>

              <Button
                fullWidth
                variant="contained"
                onClick={handleGetAccess}
                startIcon={<PersonAdd />}
                sx={{
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
                Obter Acesso
              </Button>

              <Box textAlign="center">
                <Link
                  href="/forgot-password"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    textDecoration: 'none',
                    '&:hover': {
                      color: 'var(--primary-color)',
                    },
                  }}
                >
                  Esqueceu a senha?
                </Link>
              </Box>

              <Box textAlign="center" sx={{ mt: 2 }}>
                <Link
                  href={window.location.pathname === '/admin' ? '/login' : '/admin'}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.5)',
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    '&:hover': {
                      color: 'var(--primary-color)',
                    },
                  }}
                >
                  {window.location.pathname === '/admin' ? 'Portal do Cliente' : 'Acesso Administrativo'}
                </Link>
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

export default LoginPage; 