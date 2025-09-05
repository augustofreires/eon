import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert
} from '@mui/material';
import Layout from '../components/Layout';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

interface PageData {
  id: number;
  slug: string;
  title: string;
  content: string;
  meta_description: string;
  is_published: boolean;
  updated_at: string;
}

const AboutPage: React.FC = () => {
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPage();
  }, []);

  const loadPage = async () => {
    try {
      const response = await axios.get('/api/pages/about');
      setPageData(response.data);
    } catch (error: any) {
      console.error('Erro ao carregar página:', error);
      setError('Página não encontrada ou não publicada');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (error || !pageData) {
    return (
      <Layout>
        <Box p={3}>
          <Alert severity="error" sx={{ borderRadius: '12px' }}>
            {error || 'Página não encontrada'}
          </Alert>
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
            {pageData.title}
          </Typography>
          {pageData.meta_description && (
            <Typography variant="body1" color="text.secondary" sx={{ 
              fontSize: '1.1rem',
              fontWeight: 500,
              maxWidth: '800px',
              mx: 'auto'
            }}>
              {pageData.meta_description}
            </Typography>
          )}
        </Box>

        {/* Conteúdo */}
        <Paper sx={{ 
          p: 4,
          borderRadius: '20px',
          background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.02) 0%, rgba(0, 184, 156, 0.01) 100%)',
          border: '1px solid rgba(0, 212, 170, 0.1)',
          maxWidth: '900px',
          mx: 'auto'
        }}>
          <Box sx={{
            '& h1': {
              fontSize: '2.5rem',
              fontWeight: 700,
              color: 'primary.main',
              marginBottom: '1.5rem',
              background: 'var(--text-gradient)',
              backgroundClip: 'text',
              textFillColor: 'transparent',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            },
            '& h2': {
              fontSize: '2rem',
              fontWeight: 600,
              color: 'text.primary',
              marginTop: '2rem',
              marginBottom: '1rem'
            },
            '& h3': {
              fontSize: '1.5rem',
              fontWeight: 600,
              color: 'text.primary',
              marginTop: '1.5rem',
              marginBottom: '0.75rem'
            },
            '& p': {
              fontSize: '1.1rem',
              lineHeight: 1.7,
              marginBottom: '1rem',
              color: 'text.secondary'
            },
            '& ul, & ol': {
              fontSize: '1.1rem',
              lineHeight: 1.7,
              marginBottom: '1rem',
              color: 'text.secondary',
              paddingLeft: '1.5rem'
            },
            '& li': {
              marginBottom: '0.5rem'
            },
            '& strong': {
              color: 'text.primary',
              fontWeight: 600
            },
            '& em': {
              color: 'primary.main'
            }
          }}>
            <ReactMarkdown>
              {pageData.content}
            </ReactMarkdown>
          </Box>
        </Paper>

        {/* Footer da página */}
        <Box mt={4} textAlign="center">
          <Typography variant="caption" color="text.secondary">
            Última atualização: {new Date(pageData.updated_at).toLocaleDateString('pt-BR')}
          </Typography>
        </Box>
      </Box>
    </Layout>
  );
};

export default AboutPage;