import React, { useState } from 'react';
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

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(email, password, true); // isAdmin = true para login admin
      navigate('/admin');
    } catch (error: any) {
      console.error('Erro no login:', error);
      setError(error.response?.data?.error || 'Credenciais inválidas');
    }
  };

  const handleGetAccess = () => {
    // Redirecionar para página de pagamento
    window.location.href = '/payment';
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
        overflow: 'hidden'
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
        <Box textAlign="center" mb={4}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              color: '#fff',
              textShadow: '0 0 20px rgba(255, 69, 0, 0.5)',
              mb: 1
            }}
          >
            EON PRO
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '1.1rem'
            }}
          >
            Plataforma de Trading Inteligente
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
                startIcon={loading ? <CircularProgress size={20} /> : <Person />}
                sx={{
                  mt: 3,
                  mb: 2,
                  py: 1.5,
                  background: 'linear-gradient(135deg, #ff4500 0%, #ff6347 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #ff6347 0%, #ff4500 100%)',
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
                  background: 'linear-gradient(135deg, #ff4500 0%, #ff6347 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #ff6347 0%, #ff4500 100%)',
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
                  href="#"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    textDecoration: 'none',
                    '&:hover': {
                      color: '#ff4500',
                    },
                  }}
                >
                  Esqueceu a senha?
                </Link>
              </Box>
            </form>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <Box
          sx={{
            mt: 4,
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '0.85rem',
            lineHeight: 1.5,
            maxWidth: 600,
            mx: 'auto'
          }}
        >
          O Deriv oferece derivativos complexos como opções e contratos por diferença ('CFDs'). 
          Estes produtos podem não ser adequados para todos os clientes, e sua comercialização 
          envolve riscos para você. Certifique-se de compreender os seguintes riscos antes de 
          negociar produtos derivados: a) você pode perder parte ou todo o dinheiro investido 
          na negociação, b) se sua negociação envolver conversão de moeda, as taxas de câmbio 
          afetarão seus lucros e perdas. Nunca se deve negociar com dinheiro emprestado ou 
          dinheiro que não se pode perder.
        </Box>
      </Box>
    </Box>
  );
};

export default LoginPage; 