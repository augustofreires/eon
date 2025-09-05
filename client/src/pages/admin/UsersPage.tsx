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
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Tooltip,
  Fab
} from '@mui/material';
import {
  People,
  Person,
  Block,
  CheckCircle,
  Warning,
  Add,
  Edit,
  Delete,
  Visibility,
  Save
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';

interface User {
  id: number;
  name?: string;
  email: string;
  role: string;
  deriv_connected: boolean;
  created_at: string;
  active: boolean;
}

interface UserFormData {
  name: string;
  email: string;
  password: string;
  role: string;
}

const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Estados para diálogos
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Estados para formulários
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    role: 'client'
  });
  
  // Estados para validação
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [submitting, setSubmitting] = useState(false);

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

  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Nome é obrigatório';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Email inválido';
    }
    
    if (!editDialogOpen && !formData.password.trim()) {
      errors.password = 'Senha é obrigatória';
    } else if (formData.password && formData.password.length < 6) {
      errors.password = 'Senha deve ter pelo menos 6 caracteres';
    }
    
    if (!formData.role) {
      errors.role = 'Função é obrigatória';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'client'
    });
    setFormErrors({});
  };

  const handleCreateUser = async () => {
    if (!validateForm()) return;
    
    setSubmitting(true);
    try {
      await axios.post('/api/admin/users', formData);
      toast.success('Usuário criado com sucesso!');
      setCreateDialogOpen(false);
      resetForm();
      loadUsers();
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      toast.error(error.response?.data?.error || 'Erro ao criar usuário');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser || !validateForm()) return;
    
    setSubmitting(true);
    try {
      const updateData: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role
      };
      
      if (formData.password) {
        updateData.password = formData.password;
      }
      
      await axios.put(`/api/admin/users/${selectedUser.id}`, updateData);
      toast.success('Usuário atualizado com sucesso!');
      setEditDialogOpen(false);
      resetForm();
      setSelectedUser(null);
      loadUsers();
    } catch (error: any) {
      console.error('Erro ao editar usuário:', error);
      toast.error(error.response?.data?.error || 'Erro ao editar usuário');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    setSubmitting(true);
    try {
      await axios.delete(`/api/admin/users/${selectedUser.id}`);
      toast.success('Usuário deletado com sucesso!');
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error: any) {
      console.error('Erro ao deletar usuário:', error);
      toast.error(error.response?.data?.error || 'Erro ao deletar usuário');
    } finally {
      setSubmitting(false);
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

  const openCreateDialog = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name || '',
      email: user.email,
      password: '',
      role: user.role
    });
    setFormErrors({});
    setEditDialogOpen(true);
  };

  const openViewDialog = async (user: User) => {
    try {
      const response = await axios.get(`/api/admin/users/${user.id}`);
      setSelectedUser(response.data.user);
      setViewDialogOpen(true);
    } catch (error: any) {
      console.error('Erro ao carregar dados do usuário:', error);
      toast.error(error.response?.data?.error || 'Erro ao carregar usuário');
    }
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'error';
      case 'client': return 'primary';
      default: return 'default';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'client': return 'Cliente';
      default: return role;
    }
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <People sx={{ fontSize: '2.5rem', color: 'primary.main' }} />
          Gerenciar Usuários
        </Typography>
        
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={openCreateDialog}
          sx={{
            background: 'linear-gradient(135deg, #00d4aa 0%, #00b89c 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #00b89c 0%, #00d4aa 100%)'
            }
          }}
        >
          Novo Usuário
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card className="theme-card">
            <CardContent>
              {users.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <People sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Nenhum usuário encontrado
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Clique em "Novo Usuário" para criar o primeiro usuário
                  </Typography>
                </Box>
              ) : (
                <List>
                  {users.map((user) => (
                    <ListItem
                      key={user.id}
                      sx={{
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        mb: 2,
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                        backdropFilter: 'blur(10px)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 8px 24px rgba(0, 212, 170, 0.1)',
                          borderColor: 'rgba(0, 212, 170, 0.2)'
                        }
                      }}
                    >
                      <ListItemIcon>
                        <Person color="primary" sx={{ fontSize: '1.5rem' }} />
                      </ListItemIcon>
                      
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={2}>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              {user.name || 'Sem nome'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {user.email}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
                            <Chip
                              label={getRoleLabel(user.role)}
                              size="small"
                              color={getRoleColor(user.role) as any}
                              sx={{ fontWeight: 600 }}
                            />
                            <Chip
                              label={new Date(user.created_at).toLocaleDateString()}
                              size="small"
                              variant="outlined"
                            />
                            {user.deriv_connected ? (
                              <Chip
                                icon={<CheckCircle />}
                                label="Corretora Conectada"
                                size="small"
                                color="success"
                                variant="outlined"
                              />
                            ) : (
                              <Chip
                                icon={<Warning />}
                                label="Corretora Desconectada"
                                size="small"
                                color="warning"
                                variant="outlined"
                              />
                            )}
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
                          sx={{ mr: 2 }}
                        />
                        
                        <Tooltip title="Visualizar">
                          <IconButton
                            onClick={() => openViewDialog(user)}
                            sx={{ color: 'info.main' }}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Editar">
                          <IconButton
                            onClick={() => openEditDialog(user)}
                            sx={{ color: 'warning.main' }}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Deletar">
                          <IconButton
                            onClick={() => openDeleteDialog(user)}
                            sx={{ color: 'error.main' }}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog Criar Usuário */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #00d4aa 0%, #00b89c 100%)',
          color: 'white' 
        }}>
          <Add sx={{ mr: 1, verticalAlign: 'middle' }} />
          Criar Novo Usuário
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome Completo"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                error={!!formErrors.name}
                helperText={formErrors.name}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                error={!!formErrors.email}
                helperText={formErrors.email}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Senha"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                error={!!formErrors.password}
                helperText={formErrors.password || 'Mínimo 6 caracteres'}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth error={!!formErrors.role}>
                <InputLabel>Função</InputLabel>
                <Select
                  value={formData.role}
                  label="Função"
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                >
                  <MenuItem value="client">Cliente</MenuItem>
                  <MenuItem value="admin">Administrador</MenuItem>
                </Select>
                {formErrors.role && (
                  <Typography variant="caption" color="error" sx={{ mt: 1, mx: 2 }}>
                    {formErrors.role}
                  </Typography>
                )}
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setCreateDialogOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateUser}
            disabled={submitting}
            startIcon={submitting ? null : <Save />}
            sx={{
              background: 'linear-gradient(135deg, #00d4aa 0%, #00b89c 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #00b89c 0%, #00d4aa 100%)'
              }
            }}
          >
            {submitting ? 'Criando...' : 'Criar Usuário'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Editar Usuário */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
          color: 'white' 
        }}>
          <Edit sx={{ mr: 1, verticalAlign: 'middle' }} />
          Editar Usuário
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome Completo"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                error={!!formErrors.name}
                helperText={formErrors.name}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                error={!!formErrors.email}
                helperText={formErrors.email}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nova Senha (opcional)"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                error={!!formErrors.password}
                helperText={formErrors.password || 'Deixe em branco para manter a senha atual'}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth error={!!formErrors.role}>
                <InputLabel>Função</InputLabel>
                <Select
                  value={formData.role}
                  label="Função"
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                >
                  <MenuItem value="client">Cliente</MenuItem>
                  <MenuItem value="admin">Administrador</MenuItem>
                </Select>
                {formErrors.role && (
                  <Typography variant="caption" color="error" sx={{ mt: 1, mx: 2 }}>
                    {formErrors.role}
                  </Typography>
                )}
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setEditDialogOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleEditUser}
            disabled={submitting}
            startIcon={submitting ? null : <Save />}
            sx={{
              background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #f57c00 0%, #ff9800 100%)'
              }
            }}
          >
            {submitting ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Visualizar Usuário */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
          color: 'white' 
        }}>
          <Visibility sx={{ mr: 1, verticalAlign: 'middle' }} />
          Detalhes do Usuário
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selectedUser && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Informações Básicas</Typography>
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">Nome:</Typography>
                  <Typography variant="body1">{selectedUser.name || 'Não informado'}</Typography>
                </Box>
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">Email:</Typography>
                  <Typography variant="body1">{selectedUser.email}</Typography>
                </Box>
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">Função:</Typography>
                  <Chip 
                    label={getRoleLabel(selectedUser.role)} 
                    color={getRoleColor(selectedUser.role) as any}
                    sx={{ mt: 1 }}
                  />
                </Box>
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">Status:</Typography>
                  <Chip 
                    label={selectedUser.active ? 'Ativo' : 'Inativo'} 
                    color={selectedUser.active ? 'success' : 'default'}
                    sx={{ mt: 1 }}
                  />
                </Box>
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">Corretora:</Typography>
                  <Chip 
                    icon={selectedUser.deriv_connected ? <CheckCircle /> : <Warning />}
                    label={selectedUser.deriv_connected ? 'Conectada' : 'Desconectada'} 
                    color={selectedUser.deriv_connected ? 'success' : 'warning'}
                    sx={{ mt: 1 }}
                  />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Cadastrado em:</Typography>
                  <Typography variant="body1">{new Date(selectedUser.created_at).toLocaleDateString('pt-BR')}</Typography>
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setViewDialogOpen(false)}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Deletar Usuário */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
          color: 'white' 
        }}>
          <Delete sx={{ mr: 1, verticalAlign: 'middle' }} />
          Confirmar Exclusão
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>Atenção!</Typography>
            Esta ação não pode ser desfeita. Todos os dados relacionados a este usuário serão perdidos permanentemente.
          </Alert>
          {selectedUser && (
            <Box>
              <Typography variant="body1" gutterBottom>
                Tem certeza que deseja deletar o usuário:
              </Typography>
              <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, mt: 2 }}>
                <Typography variant="body1" fontWeight="bold">
                  {selectedUser.name || 'Sem nome'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedUser.email}
                </Typography>
                <Chip 
                  label={getRoleLabel(selectedUser.role)} 
                  size="small"
                  color={getRoleColor(selectedUser.role) as any}
                  sx={{ mt: 1 }}
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteUser}
            disabled={submitting}
            startIcon={submitting ? null : <Delete />}
          >
            {submitting ? 'Deletando...' : 'Confirmar Exclusão'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminUsersPage;