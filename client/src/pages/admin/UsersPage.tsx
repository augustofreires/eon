import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Chip,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  People,
  Person,
  Block,
  CheckCircle,
  Warning
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';

interface User {
  id: number;
  email: string;
  role: string;
  deriv_connected: boolean;
  created_at: string;
  active: boolean;
}

const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/admin/users');
      setUsers(response.data.users);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId: number, active: boolean) => {
    try {
      await axios.put(`/api/admin/users/${userId}/status`, { active });
      toast.success(`Usuário ${active ? 'ativado' : 'desativado'} com sucesso!`);
      loadUsers();
    } catch (error: any) {
      console.error('Erro ao alterar status do usuário:', error);
      toast.error(error.response?.data?.error || 'Erro ao alterar status');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'error';
      case 'client': return 'primary';
      default: return 'default';
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        <People sx={{ mr: 1, verticalAlign: 'middle' }} />
        Gerenciar Usuários
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              {users.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <People sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Nenhum usuário encontrado
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Os usuários aparecerão aqui quando se cadastrarem
                  </Typography>
                </Box>
              ) : (
                <List>
                  {users.map((user) => (
                    <ListItem
                      key={user.id}
                      sx={{
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1
                      }}
                    >
                      <ListItemIcon>
                        <Person color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={user.email}
                        secondary={
                          <Box>
                            <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                              <Chip
                                label={user.role}
                                size="small"
                                color={getRoleColor(user.role) as any}
                                variant="outlined"
                              />
                              <Chip
                                label={new Date(user.created_at).toLocaleDateString()}
                                size="small"
                                variant="outlined"
                              />
                              {user.deriv_connected ? (
                                <Chip
                                  icon={<CheckCircle />}
                                  label="Deriv Conectado"
                                  size="small"
                                  color="success"
                                  variant="outlined"
                                />
                              ) : (
                                <Chip
                                  icon={<Warning />}
                                  label="Deriv Desconectado"
                                  size="small"
                                  color="warning"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          </Box>
                        }
                      />
                      <Box display="flex" alignItems="center" gap={1}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={user.active}
                              onChange={(e) => handleToggleUserStatus(user.id, e.target.checked)}
                              color="primary"
                            />
                          }
                          label={user.active ? 'Ativo' : 'Inativo'}
                        />
                      </Box>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminUsersPage; 