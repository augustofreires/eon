import React from 'react';
import { Box, Typography } from '@mui/material';

function App() {
  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <Typography variant="h2" color="white" sx={{ mb: 2 }}>
        Deriv Bots Platform
      </Typography>
      <Typography variant="h5" color="white">
        Sistema funcionando! 🚀
      </Typography>
    </Box>
  );
}

export default App;