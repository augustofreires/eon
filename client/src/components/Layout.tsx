import React, { useState, useEffect } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import api from '../services/api';
import {
  Menu as MenuIcon,
  Dashboard,
  SmartToy,
  PlayArrow,
  School,
  People,
  Logout,
  AccountCircle,
  MonetizationOn,
  Link,
  Palette,
  AccountBalance,
  Assessment,
  CurrencyExchange,
  Payment,
  Link as LinkIcon,
  Article,
  Brush,
  Dashboard as DashboardCards,
  OpenInNew,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage, Language } from '../contexts/LanguageContext';

interface BrandingConfig {
  platform_name: string;
  platform_subtitle: string;
  logo_url?: string;
  favicon_url?: string;
  online_users_count?: number;
}

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [branding, setBranding] = useState<BrandingConfig>({
    platform_name: 'Corretora Bots Platform',
    platform_subtitle: 'Plataforma de Trading',
    online_users_count: 2105
  });
  const [onlineUsers, setOnlineUsers] = useState(2105);
  const [userProfilePicture, setUserProfilePicture] = useState<string | null>(null);
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    loadBranding();
  }, []);

  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadBranding = async () => {
    try {
      const response = await api.get('/api/branding/config');
      setBranding(response.data);
      if (response.data.online_users_count) {
        setOnlineUsers(response.data.online_users_count);
      }
    } catch (error) {
      console.error('Erro ao carregar branding:', error);
    }
  };

  const loadUserProfile = async () => {
    try {
      const response = await api.get('/api/profile');
      setUserProfilePicture(response.data.profile_picture || null);
    } catch (error) {
      console.error('Erro ao carregar perfil do usuário:', error);
    }
  };

  // Simular variação no contador de usuários online
  useEffect(() => {
    const interval = setInterval(() => {
      const baseCount = branding.online_users_count || 2105;
      const variation = Math.floor(Math.random() * 20) - 10; // Variação de -10 a +10
      const newCount = Math.max(baseCount + variation, baseCount - 50); // Mín baseCount-50
      setOnlineUsers(newCount);
    }, 30000); // Atualiza a cada 30 segundos

    return () => clearInterval(interval);
  }, [branding.online_users_count]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
    navigate('/');
  };

  const handleProfileClick = () => {
    navigate('/profile');
    handleMenuClose();
  };
  
  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
    handleMenuClose();
  };


  const isAdmin = user?.role === 'admin';

  const adminMenuItems = [
    { text: t('nav.dashboard'), icon: <Dashboard />, path: '/admin' },
    { text: t('nav.users'), icon: <People />, path: '/admin/users' },
    { text: t('nav.bots'), icon: <SmartToy />, path: '/admin/bots' },
    { text: t('nav.courses'), icon: <School />, path: '/admin/courses' },
    { text: t('nav.theme'), icon: <Palette />, path: '/admin/theme' },
    { text: 'Branding', icon: <Brush />, path: '/admin/branding' },
    { text: 'Cards de Ação', icon: <DashboardCards />, path: '/admin/action-cards' },
    { text: t('nav.deriv'), icon: <MonetizationOn />, path: '/admin/deriv' },
    { text: 'Link Obter Acesso', icon: <OpenInNew />, path: '/admin/access-link' },
    { text: 'Relatórios Markup', icon: <Assessment />, path: '/admin/markup-reports' },
    { text: 'Plataformas de Pagamento', icon: <Payment />, path: '/admin/payment-platforms' },
    { text: 'Links Úteis', icon: <LinkIcon />, path: '/admin/useful-links' },
    { text: 'Gestão de Páginas', icon: <Article />, path: '/admin/pages' },
  ];

  const clientMenuItems = [
    { text: t('nav.dashboard'), icon: <Dashboard />, path: '/dashboard' },
    { text: t('nav.bots'), icon: <SmartToy />, path: '/bots' },
    { text: t('nav.operations'), icon: <PlayArrow />, path: '/operations' },
    { text: t('nav.bankManagement'), icon: <AccountBalance />, path: '/bank-management' },
    { text: 'Conversor de Moedas', icon: <CurrencyExchange />, path: '/currency-converter' },
    { text: 'Links Úteis', icon: <LinkIcon />, path: '/useful-links' },
    { text: t('nav.courses'), icon: <School />, path: '/courses' },
    { text: t('nav.connect'), icon: <Link />, path: '/deriv' },
  ];

  const menuItems = isAdmin ? adminMenuItems : clientMenuItems;

  const drawer = (
    <Box sx={{ width: 250 }}>
      <Box sx={{ 
        p: 3, 
        pt: 3,
        textAlign: 'center',
        background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.1) 0%, rgba(0, 184, 156, 0.05) 100%)',
        borderRadius: '0 0 20px 0',
        mb: 2
      }}>
        <Typography variant="body2" sx={{ 
          color: 'text.secondary',
          fontWeight: 500,
          opacity: 0.8,
          mb: !isAdmin ? 1 : 0
        }}>
          {isAdmin ? 'Painel Admin' : branding.platform_subtitle || 'Área Premium'}
        </Typography>
        
        {/* Contador de usuários online na sidebar - apenas para mobile e clientes */}
        {!isAdmin && (
          <Box sx={{
            display: { xs: 'flex', sm: 'none' },
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            px: 2,
            py: 1,
            mt: 1,
            backgroundColor: 'rgba(0, 212, 170, 0.1)',
            borderRadius: '16px',
            border: '1px solid rgba(0, 212, 170, 0.2)',
            animation: 'pulse 2s infinite'
          }}>
            <Box sx={{
              width: 6,
              height: 6,
              backgroundColor: '#4ade80',
              borderRadius: '50%',
              animation: 'blink 1.5s infinite'
            }} />
            <Typography variant="body2" sx={{
              color: 'rgba(255, 255, 255, 0.9)',
              fontWeight: 600,
              fontSize: '0.8rem'
            }}>
              {onlineUsers.toLocaleString()} Online
            </Typography>
          </Box>
        )}
      </Box>
      <List>
        {menuItems.map((item) => (
          <ListItem
            key={item.text}
            button
            onClick={() => {
              navigate(item.path);
              setDrawerOpen(false);
            }}
            sx={{
              mx: 2,
              mb: 1,
              borderRadius: '16px',
              backgroundColor: location.pathname === item.path 
                ? 'linear-gradient(135deg, rgba(0, 212, 170, 0.15) 0%, rgba(0, 184, 156, 0.1) 100%)' 
                : 'transparent',
              border: location.pathname === item.path 
                ? '1px solid rgba(0, 212, 170, 0.2)' 
                : '1px solid transparent',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                backgroundColor: location.pathname === item.path 
                  ? 'linear-gradient(135deg, rgba(0, 212, 170, 0.2) 0%, rgba(0, 184, 156, 0.15) 100%)'
                  : 'rgba(0, 212, 170, 0.08)',
                transform: 'translateX(4px)',
                boxShadow: '0 4px 12px rgba(0, 212, 170, 0.1)',
              },
              '&:active': {
                transform: 'translateX(2px)',
              }
            }}
          >
            <ListItemIcon sx={{ 
              color: location.pathname === item.path ? 'primary.main' : 'text.secondary',
              minWidth: '40px',
              transition: 'all 0.3s ease'
            }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.text}
              sx={{
                '& .MuiListItemText-primary': {
                  color: location.pathname === item.path ? 'primary.main' : 'text.primary',
                  fontWeight: location.pathname === item.path ? 600 : 500,
                  fontSize: '0.95rem',
                  transition: 'all 0.3s ease'
                },
              }}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: 'linear-gradient(135deg, rgba(26, 31, 58, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0, 212, 170, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          borderRadius: '0 0 24px 24px',
        }}
      >
        <Toolbar sx={{ py: 1.5 }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setDrawerOpen(!drawerOpen)}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            {branding.logo_url ? (
              <img 
                src={branding.logo_url} 
                alt={branding.platform_name}
                style={{
                  maxHeight: '40px',
                  maxWidth: '200px',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.2))'
                }}
              />
            ) : (
              <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                {branding.platform_name}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
            {/* Contador de usuários online - apenas para desktop e clientes */}
            {!isAdmin && (
              <Box sx={{
                display: { xs: 'none', sm: 'flex' },
                alignItems: 'center',
                gap: 1,
                px: 2,
                py: 0.8,
                backgroundColor: 'rgba(0, 212, 170, 0.15)',
                borderRadius: '20px',
                border: '1px solid rgba(0, 212, 170, 0.3)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 12px rgba(0, 212, 170, 0.2)',
                animation: 'pulse 2s infinite'
              }}>
                <Box sx={{
                  width: 8,
                  height: 8,
                  backgroundColor: '#4ade80',
                  borderRadius: '50%',
                  animation: 'blink 1.5s infinite',
                  flexShrink: 0
                }} />
                <Typography variant="body2" sx={{
                  color: 'rgba(255, 255, 255, 0.95)',
                  fontWeight: 600,
                  fontSize: '0.875rem'
                }}>
                  Onlines: 
                </Typography>
                <Typography variant="body2" sx={{
                  color: '#4ade80',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  textShadow: '0 0 8px rgba(74, 222, 128, 0.5)',
                  whiteSpace: 'nowrap'
                }}>
                  {onlineUsers.toLocaleString()}
                </Typography>
              </Box>
            )}
            <Typography variant="body2" sx={{ 
              color: 'rgba(255, 255, 255, 0.9)',
              fontWeight: 500,
              fontSize: { xs: '0.8rem', sm: '0.875rem' },
              maxWidth: { xs: '80px', sm: 'none' },
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {user?.name}
            </Typography>
            <IconButton
              onClick={handleMenuOpen}
              sx={{ 
                color: 'inherit',
                '&:hover': {
                  backgroundColor: 'rgba(0, 212, 170, 0.1)',
                }
              }}
            >
              <Avatar 
                src={userProfilePicture || undefined}
                sx={{ 
                  width: 36, 
                  height: 36, 
                  bgcolor: 'linear-gradient(135deg, #00d4aa 0%, #00b89c 100%)',
                  boxShadow: '0 4px 12px rgba(0, 212, 170, 0.3)',
                  border: '2px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                {!userProfilePicture && <AccountCircle />}
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: 250 }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: 250,
              background: 'linear-gradient(135deg, rgba(26, 31, 58, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%)',
              backdropFilter: 'blur(20px)',
              borderRight: '1px solid rgba(0, 212, 170, 0.1)',
              borderRadius: '0 24px 24px 0',
              boxShadow: '4px 0 20px rgba(0, 0, 0, 0.1)',
              marginTop: '100px',
              height: 'calc(100vh - 100px)',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: 250,
              background: 'linear-gradient(135deg, rgba(26, 31, 58, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%)',
              backdropFilter: 'blur(20px)',
              borderRight: '1px solid rgba(0, 212, 170, 0.1)',
              borderRadius: '0 24px 24px 0',
              boxShadow: '4px 0 20px rgba(0, 0, 0, 0.1)',
              marginTop: '100px',
              height: 'calc(100vh - 100px)',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 0.25, md: 3 },
          width: { sm: `calc(100% - 250px)` },
          marginTop: '100px',
          minHeight: 'calc(100vh - 100px)',
          borderRadius: '24px 0 0 0',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.02) 0%, rgba(26, 31, 58, 0.02) 100%)',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(0, 212, 170, 0.3), transparent)',
          }
        }}
      >
        {children}
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        sx={{
          '& .MuiPaper-root': {
            background: 'linear-gradient(135deg, rgba(26, 31, 58, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 212, 170, 0.1)',
            borderRadius: '16px',
            minWidth: 220,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            mt: 1,
          },
        }}
      >
        <MenuItem 
          onClick={handleProfileClick}
          sx={{
            borderRadius: '12px',
            mx: 1,
            my: 0.5,
            '&:hover': {
              backgroundColor: 'rgba(0, 212, 170, 0.1)',
            }
          }}
        >
          <ListItemIcon sx={{ color: 'text.secondary' }}>
            <AccountCircle fontSize="small" />
          </ListItemIcon>
          {t('nav.profile')}
        </MenuItem>
        
        {/* Language Selector */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: 1, 
          my: 1, 
          mx: 2 
        }}>
          <IconButton
            onClick={() => handleLanguageChange('pt')}
            sx={{
              width: 32,
              height: 32,
              border: language === 'pt' ? '2px solid' : '1px solid rgba(255, 255, 255, 0.2)',
              borderColor: language === 'pt' ? 'primary.main' : 'rgba(255, 255, 255, 0.2)',
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: 'rgba(0, 212, 170, 0.1)'
              }
            }}
            title="Português"
          >
            <span style={{ fontSize: '18px' }}>🇧🇷</span>
          </IconButton>
          
          <IconButton
            onClick={() => handleLanguageChange('en')}
            sx={{
              width: 32,
              height: 32,
              border: language === 'en' ? '2px solid' : '1px solid rgba(255, 255, 255, 0.2)',
              borderColor: language === 'en' ? 'primary.main' : 'rgba(255, 255, 255, 0.2)',
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: 'rgba(0, 212, 170, 0.1)'
              }
            }}
            title="English"
          >
            <span style={{ fontSize: '18px' }}>🇺🇸</span>
          </IconButton>
          
          <IconButton
            onClick={() => handleLanguageChange('es')}
            sx={{
              width: 32,
              height: 32,
              border: language === 'es' ? '2px solid' : '1px solid rgba(255, 255, 255, 0.2)',
              borderColor: language === 'es' ? 'primary.main' : 'rgba(255, 255, 255, 0.2)',
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: 'rgba(0, 212, 170, 0.1)'
              }
            }}
            title="Español"
          >
            <span style={{ fontSize: '18px' }}>🇪🇸</span>
          </IconButton>
        </Box>
        
        <Divider sx={{ 
          mx: 2, 
          my: 1, 
          borderColor: 'rgba(255, 255, 255, 0.1)' 
        }} />
        <MenuItem 
          onClick={handleLogout}
          sx={{
            borderRadius: '12px',
            mx: 1,
            my: 0.5,
            color: 'error.main',
            '&:hover': {
              backgroundColor: 'rgba(244, 67, 54, 0.1)',
            }
          }}
        >
          <ListItemIcon sx={{ color: 'error.main' }}>
            <Logout fontSize="small" />
          </ListItemIcon>
          {t('nav.logout')}
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Layout; 