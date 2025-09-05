import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import Layout from '../components/Layout';
import CurrencyConverter from '../components/CurrencyConverter';

const CurrencyConverterPage: React.FC = () => {
  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 4, color: 'primary.main', textAlign: 'center' }}>
          Conversor de Moedas
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <CurrencyConverter />
        </Box>
      </Container>
    </Layout>
  );
};

export default CurrencyConverterPage;