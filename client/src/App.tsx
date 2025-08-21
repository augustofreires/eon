import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';
import LoginPage from './pages/LoginPage';

function App() {
  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)' }}>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </Box>
  );
}

export default App; 