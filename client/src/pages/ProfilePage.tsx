import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Avatar,
  Grid,
  Divider,
  Chip,
  Paper,
  IconButton
} from '@mui/material';
import {
  Person,
  Email,
  Save,
  CheckCircle,
  AccountCircle,
  Security,
  Info,
  PhotoCamera,
  Delete,
  CloudUpload
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import axios from 'axios';
import toast from 'react-hot-toast';

interface UserProfile {
  id: number;
  email: string;
  name: string;
  role: string;
  profile_picture?: string;
}

const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Carregar dados do perfil incluindo foto
  React.useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await axios.get('/api/profile');
      const profile: UserProfile = response.data;
      setProfilePicture(profile.profile_picture || null);
      setFormData(prev => ({
        ...prev,
        name: profile.name,
        email: profile.email
      }));
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    }
  };

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    setError('');
    setSuccess('');
  };

  const handlePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Apenas arquivos de imagem são permitidos');
      return;
    }

    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 5MB.');
      return;
    }

    setUploadingPicture(true);
    const formData = new FormData();
    formData.append('picture', file);

    try {
      const response = await axios.post('/api/profile/upload-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setProfilePicture(response.data.profile_picture);
      toast.success('Foto de perfil atualizada com sucesso!');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Erro ao enviar foto';
      toast.error(errorMessage);
    } finally {
      setUploadingPicture(false);
      // Limpar input
      event.target.value = '';
    }
  };

  const handleRemovePicture = async () => {
    if (!profilePicture) return;

    try {
      await axios.delete('/api/profile/remove-picture');
      setProfilePicture(null);
      toast.success('Foto de perfil removida!');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Erro ao remover foto';
      toast.error(errorMessage);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError(t('error.nameRequired'));
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.put('/api/profile', {
        name: formData.name
      });

      updateUser({ name: formData.name });
      setSuccess(t('message.profileUpdated'));
      toast.success(t('message.profileUpdated'));
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Erro ao atualizar perfil';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.currentPassword) {
      setError(t('error.currentPasswordRequired'));
      return;
    }

    if (!formData.newPassword) {
      setError(t('error.newPasswordRequired'));
      return;
    }

    if (formData.newPassword.length < 6) {
      setError(t('error.minPassword'));
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError(t('error.passwordsNotMatch'));
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.put('/api/auth/change-password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });

      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));

      setSuccess(t('message.passwordChanged'));
      toast.success(t('message.passwordChanged'));
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Erro ao alterar senha';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return { label: t('profile.administrator'), color: 'error' as const };
      case 'client':
        return { label: t('profile.client'), color: 'primary' as const };
      default:
        return { label: t('profile.user'), color: 'default' as const };
    }
  };

  if (!user) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const roleInfo = getRoleLabel(user.role);

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom className="theme-text-gradient" sx={{ 
        fontWeight: 700,
        mb: 3,
        display: 'flex',
        alignItems: 'center',
        gap: 2
      }}>
        <Person sx={{ fontSize: '2.5rem', color: 'primary.main' }} />
{t('profile.title')}
      </Typography>

      <Grid container spacing={4}>
        {/* Informações do Usuário */}
        <Grid item xs={12} md={4}>
          <Card className="theme-card" sx={{
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
          }}>
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <Box sx={{ position: 'relative', display: 'inline-block', mb: 2 }}>
                <Avatar
                  src={profilePicture || undefined}
                  sx={{
                    width: 100,
                    height: 100,
                    bgcolor: 'primary.main',
                    fontSize: '2.5rem',
                    boxShadow: '0 8px 24px rgba(0, 212, 170, 0.3)'
                  }}
                >
                  {!profilePicture && <AccountCircle fontSize="inherit" />}
                </Avatar>
                
                <Box sx={{ 
                  position: 'absolute', 
                  bottom: -5, 
                  right: -5,
                  display: 'flex',
                  gap: 0.5
                }}>
                  <IconButton
                    component="label"
                    disabled={uploadingPicture}
                    sx={{
                      bgcolor: 'primary.main',
                      color: 'white',
                      width: 32,
                      height: 32,
                      '&:hover': {
                        bgcolor: 'primary.dark'
                      }
                    }}
                  >
                    {uploadingPicture ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <PhotoCamera sx={{ fontSize: 16 }} />
                    )}
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handlePictureUpload}
                    />
                  </IconButton>
                  
                  {profilePicture && (
                    <IconButton
                      onClick={handleRemovePicture}
                      sx={{
                        bgcolor: 'error.main',
                        color: 'white',
                        width: 32,
                        height: 32,
                        '&:hover': {
                          bgcolor: 'error.dark'
                        }
                      }}
                    >
                      <Delete sx={{ fontSize: 16 }} />
                    </IconButton>
                  )}
                </Box>
              </Box>
              
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                {user.name}
              </Typography>
              
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                {user.email}
              </Typography>
              
              <Chip
                icon={roleInfo.label === 'Administrador' ? <Security /> : <Person />}
                label={roleInfo.label}
                color={roleInfo.color}
                sx={{
                  fontWeight: 600,
                  px: 2,
                  py: 1
                }}
              />

              <Divider sx={{ my: 3 }} />

              <Paper sx={{ 
                p: 2, 
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.1) 0%, rgba(0, 184, 156, 0.05) 100%)',
                border: '1px solid rgba(0, 212, 170, 0.2)'
              }}>
                <Typography variant="body2" color="text.secondary" sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <Info fontSize="small" />
{t('profile.memberSince')} {new Date().getFullYear()}
                </Typography>
              </Paper>
            </CardContent>
          </Card>
        </Grid>

        {/* Formulários */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={3}>
            {/* Atualizar Perfil */}
            <Grid item xs={12}>
              <Card className="theme-card" sx={{
                borderRadius: '20px',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
              }}>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h6" gutterBottom sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    mb: 3,
                    fontWeight: 700
                  }}>
                    <Person />
{t('profile.personalInfo')}
                  </Typography>

                  {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
                  {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

                  <form onSubmit={handleProfileUpdate}>
                    <Grid container spacing={3}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label={t('profile.fullName')}
                          value={formData.name}
                          onChange={handleInputChange('name')}
                          required
                          sx={{ mb: 2 }}
                        />
                      </Grid>
                      
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label={t('common.email')}
                          value={formData.email}
                          disabled
                          helperText={t('profile.emailCannotChange')}
                          sx={{ mb: 3 }}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <Button
                          type="submit"
                          variant="contained"
                          size="large"
                          startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                          disabled={loading}
                          sx={{
                            background: 'linear-gradient(135deg, #00d4aa 0%, #00b89c 100%)',
                            px: 4,
                            py: 1.5,
                            '&:hover': {
                              background: 'linear-gradient(135deg, #00b89c 0%, #00d4aa 100%)'
                            }
                          }}
                        >
{loading ? t('profile.saving') : t('profile.saveChanges')}
                        </Button>
                      </Grid>
                    </Grid>
                  </form>
                </CardContent>
              </Card>
            </Grid>

            {/* Alterar Senha */}
            <Grid item xs={12}>
              <Card className="theme-card" sx={{
                borderRadius: '20px',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
              }}>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h6" gutterBottom sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    mb: 3,
                    fontWeight: 700
                  }}>
                    <Security />
{t('profile.changePassword')}
                  </Typography>

                  <form onSubmit={handlePasswordChange}>
                    <Grid container spacing={3}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label={t('common.currentPassword')}
                          type="password"
                          value={formData.currentPassword}
                          onChange={handleInputChange('currentPassword')}
                          required
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label={t('common.newPassword')}
                          type="password"
                          value={formData.newPassword}
                          onChange={handleInputChange('newPassword')}
                          required
                          helperText={t('profile.minCharacters')}
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label={t('common.confirmPassword')}
                          type="password"
                          value={formData.confirmPassword}
                          onChange={handleInputChange('confirmPassword')}
                          required
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <Button
                          type="submit"
                          variant="contained"
                          size="large"
                          startIcon={loading ? <CircularProgress size={20} /> : <Security />}
                          disabled={loading}
                          sx={{
                            background: 'linear-gradient(135deg, #ff4500 0%, #ff6347 100%)',
                            px: 4,
                            py: 1.5,
                            '&:hover': {
                              background: 'linear-gradient(135deg, #ff6347 0%, #ff4500 100%)'
                            }
                          }}
                        >
{loading ? t('profile.changing') : t('profile.changePasswordButton')}
                        </Button>
                      </Grid>
                    </Grid>
                  </form>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProfilePage;