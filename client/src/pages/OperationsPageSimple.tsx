import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const OperationsPageSimple: React.FC = () => {
  console.log('🚀 OperationsPageSimple renderizado!');
  
  return (
    <Box sx={{ 
      p: 3,
      minHeight: '100vh',
      background: 'linear-gradient(135deg, rgba(10, 25, 41, 0.95) 0%, rgba(15, 35, 55, 0.9) 100%)'
    }}>
      <Typography variant="h4" sx={{ color: '#ffffff', mb: 3 }}>
        Página de Operações (Teste)
      </Typography>
      
      <Card sx={{
        borderRadius: '12px',
        background: 'rgba(25, 45, 65, 0.8)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(0, 212, 170, 0.1)'
      }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ color: '#00d4aa', mb: 2 }}>
            🎯 Status do Teste
          </Typography>
          
          <Typography variant="body1" sx={{ color: '#ffffff', mb: 2 }}>
            Se você está vendo esta mensagem, a estrutura básica está funcionando!
          </Typography>
          
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Isso significa que o problema está no componente OperationsPage original, não na rota ou autenticação.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default OperationsPageSimple;