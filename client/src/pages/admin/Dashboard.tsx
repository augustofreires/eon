import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  SmartToy,
  School,
  People,
  AccountBalance
} from '@mui/icons-material';
import axios from 'axios';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBots: 0,
    totalCourses: 0
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await axios.get('/api/admin/dashboard');
      const { stats } = response.data;
      
      setStats({
        totalUsers: stats.total_clients || 0,
        totalBots: stats.total_bots || 0,
        totalCourses: stats.total_courses || 0
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        <DashboardIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Dashboard Administrativo
      </Typography>

      <Grid container spacing={3}>
        {/* Estatísticas */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <People sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">{stats.totalUsers}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Usuários
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <SmartToy sx={{ fontSize: 40, color: 'secondary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">{stats.totalBots}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Bots
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <School sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">{stats.totalCourses}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Cursos
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>


        {/* Ações Rápidas */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Ações Rápidas
              </Typography>
              <List>
                <ListItem button onClick={() => window.location.href = '/admin/bots'}>
                  <ListItemIcon>
                    <SmartToy />
                  </ListItemIcon>
                  <ListItemText primary="Gerenciar Bots" />
                </ListItem>
                <ListItem button onClick={() => window.location.href = '/admin/courses'}>
                  <ListItemIcon>
                    <School />
                  </ListItemIcon>
                  <ListItemText primary="Gerenciar Cursos" />
                </ListItem>
                <ListItem button onClick={() => window.location.href = '/admin/users'}>
                  <ListItemIcon>
                    <People />
                  </ListItemIcon>
                  <ListItemText primary="Gerenciar Usuários" />
                </ListItem>
                <ListItem button onClick={() => window.location.href = '/admin/affiliate'}>
                  <ListItemIcon>
                    <AccountBalance />
                  </ListItemIcon>
                  <ListItemText primary="Configurar Corretora" />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Status do Sistema */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Status do Sistema
              </Typography>
              <Box>
                <Chip
                  label="Online"
                  color="success"
                  sx={{ mr: 1, mb: 1 }}
                />
                <Chip
                  label="Corretora Conectada"
                  color="success"
                  sx={{ mr: 1, mb: 1 }}
                />
                <Chip
                  label="Banco de Dados OK"
                  color="success"
                  sx={{ mr: 1, mb: 1 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboard; 