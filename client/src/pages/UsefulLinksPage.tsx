import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress
} from '@mui/material';
import {
  Link as LinkIcon,
  YouTube,
  Instagram,
  WhatsApp,
  Telegram,
  Support,
  Language,
  Facebook,
  Twitter,
  LinkedIn,
  Launch
} from '@mui/icons-material';
import Layout from '../components/Layout';
import axios from 'axios';
import toast from 'react-hot-toast';

interface UsefulLink {
  id: number;
  title: string;
  url: string;
  description: string;
  type: string;
  icon: string;
  active: boolean;
  order: number;
}

const UsefulLinksPage: React.FC = () => {
  const [links, setLinks] = useState<UsefulLink[]>([]);
  const [loading, setLoading] = useState(true);

  const linkTypes = [
    { value: 'youtube', label: 'YouTube', icon: <YouTube sx={{ color: '#FF0000' }} />, color: '#FF0000' },
    { value: 'instagram', label: 'Instagram', icon: <Instagram sx={{ color: '#E4405F' }} />, color: '#E4405F' },
    { value: 'whatsapp', label: 'WhatsApp', icon: <WhatsApp sx={{ color: '#25D366' }} />, color: '#25D366' },
    { value: 'telegram', label: 'Telegram', icon: <Telegram sx={{ color: '#0088CC' }} />, color: '#0088CC' },
    { value: 'support', label: 'Suporte', icon: <Support sx={{ color: '#FF9800' }} />, color: '#FF9800' },
    { value: 'facebook', label: 'Facebook', icon: <Facebook sx={{ color: '#1877F2' }} />, color: '#1877F2' },
    { value: 'twitter', label: 'Twitter/X', icon: <Twitter sx={{ color: '#1DA1F2' }} />, color: '#1DA1F2' },
    { value: 'linkedin', label: 'LinkedIn', icon: <LinkedIn sx={{ color: '#0A66C2' }} />, color: '#0A66C2' },
    { value: 'website', label: 'Website', icon: <Language sx={{ color: '#4CAF50' }} />, color: '#4CAF50' },
    { value: 'custom', label: 'Link', icon: <LinkIcon sx={{ color: '#9C27B0' }} />, color: '#9C27B0' }
  ];

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    try {
      const response = await axios.get('/api/useful-links');
      // Filtrar apenas links ativos e ordenar
      const activeLinks = response.data
        .filter((link: UsefulLink) => link.active)
        .sort((a: UsefulLink, b: UsefulLink) => a.order - b.order);
      setLinks(activeLinks);
    } catch (error) {
      console.error('Erro ao carregar links:', error);
      toast.error('Erro ao carregar links úteis');
    } finally {
      setLoading(false);
    }
  };

  const openLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getTypeInfo = (type: string) => {
    return linkTypes.find(t => t.value === type) || linkTypes[linkTypes.length - 1];
  };

  // Links que aparecerão como cards de ação (não devem aparecer na seção agrupada)
  const actionCardTypes = ['support', 'whatsapp', 'telegram'];
  
  const groupedLinks = linkTypes.reduce((acc, type) => {
    // Filtrar links que não são do tipo "ação" para evitar duplicação
    const typeLinks = links.filter(link => 
      link.type === type.value && !actionCardTypes.includes(link.type)
    );
    if (typeLinks.length > 0) {
      acc[type.value] = {
        ...type,
        links: typeLinks
      };
    }
    return acc;
  }, {} as any);

  if (loading) {
    return (
      <Layout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box p={3}>
        {/* Header */}
        <Box mb={4} textAlign="center">
          <Typography variant="h4" gutterBottom className="theme-text-gradient" sx={{ 
            fontWeight: 700,
            mb: 1
          }}>
            Links Úteis
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ 
            fontSize: '1.1rem',
            fontWeight: 500,
            maxWidth: '600px',
            mx: 'auto'
          }}>
            Acesse nossos canais oficiais, redes sociais e recursos de suporte
          </Typography>
        </Box>

        {links.length === 0 ? (
          <Paper sx={{ 
            p: 6, 
            textAlign: 'center',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.05) 0%, rgba(0, 184, 156, 0.02) 100%)',
            border: '1px solid rgba(0, 212, 170, 0.1)'
          }}>
            <LinkIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 3 }} />
            <Typography variant="h5" color="text.secondary" gutterBottom>
              Nenhum link disponível
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Os links úteis serão exibidos aqui quando forem configurados
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {Object.values(groupedLinks).map((group: any) => (
              <Grid item xs={12} md={6} lg={4} key={group.value}>
                <Card className="theme-card" sx={{
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
                  }
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box display="flex" alignItems="center" mb={2}>
                      {group.icon}
                      <Typography variant="h6" sx={{ ml: 1, fontWeight: 600 }}>
                        {group.label}
                      </Typography>
                    </Box>

                    <List sx={{ p: 0 }}>
                      {group.links.map((link: UsefulLink) => (
                        <ListItem
                          key={link.id}
                          sx={{
                            px: 0,
                            py: 1,
                            borderRadius: '8px',
                            mb: 1,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              backgroundColor: `${group.color}10`,
                              transform: 'translateX(4px)',
                            },
                            cursor: 'pointer'
                          }}
                          onClick={() => openLink(link.url)}
                        >
                          <ListItemIcon sx={{ minWidth: '32px' }}>
                            <Launch fontSize="small" sx={{ color: group.color }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Typography variant="body1" fontWeight="600">
                                {link.title}
                              </Typography>
                            }
                            secondary={link.description || 'Clique para acessar'}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            ))}

            {/* Card de Ação para links únicos */}
            {links.filter(link => 
              ['support', 'whatsapp', 'telegram'].includes(link.type)
            ).map((link) => {
              const typeInfo = getTypeInfo(link.type);
              return (
                <Grid item xs={12} sm={6} md={4} key={`action-${link.id}`}>
                  <Card 
                    className="theme-card" 
                    sx={{
                      background: `linear-gradient(135deg, ${typeInfo.color}15 0%, ${typeInfo.color}05 100%)`,
                      border: `1px solid ${typeInfo.color}30`,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: `0 8px 25px ${typeInfo.color}20`,
                        border: `1px solid ${typeInfo.color}50`,
                      }
                    }}
                    onClick={() => openLink(link.url)}
                  >
                    <CardContent sx={{ textAlign: 'center', p: 3 }}>
                      <Box mb={2}>
                        {React.cloneElement(typeInfo.icon, { 
                          sx: { 
                            fontSize: 48, 
                            color: typeInfo.color 
                          } 
                        })}
                      </Box>
                      <Typography variant="h6" gutterBottom fontWeight="600">
                        {link.title}
                      </Typography>
                      {link.description && (
                        <Typography variant="body2" color="text.secondary" mb={2}>
                          {link.description}
                        </Typography>
                      )}
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<Launch />}
                        sx={{
                          backgroundColor: typeInfo.color,
                          '&:hover': {
                            backgroundColor: typeInfo.color,
                            filter: 'brightness(0.9)',
                          }
                        }}
                      >
                        Acessar
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        {/* Footer com informações */}
        {links.length > 0 && (
          <Box mt={6} textAlign="center">
            <Paper sx={{ 
              p: 3,
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.05) 0%, rgba(0, 184, 156, 0.02) 100%)',
              border: '1px solid rgba(0, 212, 170, 0.1)'
            }}>
              <Typography variant="body2" color="text.secondary">
                💡 <strong>Dica:</strong> Salve nossos links importantes nos seus favoritos para acesso rápido!
              </Typography>
            </Paper>
          </Box>
        )}
      </Box>
    </Layout>
  );
};

export default UsefulLinksPage;