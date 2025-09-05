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

const TermsPage: React.FC = () => {
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPage();
  }, []);

  const loadPage = async () => {
    try {
      const response = await axios.get('/api/pages/terms');
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

        {/* Aviso Importante */}
        <Box mb={4} display="flex" justifyContent="center">
          <Alert 
            severity="warning" 
            sx={{ 
              borderRadius: '16px',
              maxWidth: '900px',
              width: '100%'
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              <strong>⚠️ IMPORTANTE:</strong> Leia atentamente todos os termos antes de utilizar nossa plataforma. 
              O uso dos nossos serviços implica na aceitação integral destes termos e condições.
            </Typography>
          </Alert>
        </Box>

        {/* Conteúdo */}
        <Paper sx={{ 
          p: 4,
          borderRadius: '20px',
          background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.02) 0%, rgba(255, 152, 0, 0.01) 100%)',
          border: '1px solid rgba(255, 193, 7, 0.1)',
          maxWidth: '900px',
          mx: 'auto'
        }}>
          <Box sx={{
            '& h1': {
              fontSize: '2.5rem',
              fontWeight: 700,
              color: 'warning.main',
              marginBottom: '1.5rem',
              background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
              backgroundClip: 'text',
              textFillColor: 'transparent',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            },
            '& h2': {
              fontSize: '1.75rem',
              fontWeight: 600,
              color: 'text.primary',
              marginTop: '2rem',
              marginBottom: '1rem',
              borderLeft: '4px solid',
              borderColor: 'warning.main',
              paddingLeft: '1rem'
            },
            '& h3': {
              fontSize: '1.4rem',
              fontWeight: 600,
              color: 'text.primary',
              marginTop: '1.5rem',
              marginBottom: '0.75rem'
            },
            '& h4': {
              fontSize: '1.2rem',
              fontWeight: 600,
              color: 'warning.dark',
              marginTop: '1rem',
              marginBottom: '0.5rem'
            },
            '& p': {
              fontSize: '1rem',
              lineHeight: 1.7,
              marginBottom: '1rem',
              color: 'text.secondary',
              textAlign: 'justify'
            },
            '& ul, & ol': {
              fontSize: '1rem',
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
              color: 'warning.main',
              fontStyle: 'normal',
              fontWeight: 500
            },
            '& hr': {
              margin: '2rem 0',
              border: 'none',
              height: '2px',
              background: 'linear-gradient(90deg, transparent, rgba(255, 152, 0, 0.3), transparent)'
            }
          }}>
            <ReactMarkdown>
              {pageData.content}
            </ReactMarkdown>
          </Box>
        </Paper>

        {/* Footer da página com aviso legal */}
        <Box mt={4} textAlign="center">
          <Paper sx={{ 
            p: 3, 
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(244, 67, 54, 0.05) 0%, rgba(211, 47, 47, 0.02) 100%)',
            border: '1px solid rgba(244, 67, 54, 0.1)',
            maxWidth: '900px',
            mx: 'auto',
            mb: 2
          }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              🔒 <strong>DOCUMENTO LEGAL VINCULANTE</strong>
              <br />
              Este documento possui força legal e faz parte do contrato de prestação de serviços.
              <br />
              Ao utilizar nossa plataforma, você declara ter lido, compreendido e aceito todos os termos.
            </Typography>
          </Paper>
          
          <Typography variant="caption" color="text.secondary">
            Última atualização: {new Date(pageData.updated_at).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Typography>
        </Box>
      </Box>
    </Layout>
  );
};

export default TermsPage;