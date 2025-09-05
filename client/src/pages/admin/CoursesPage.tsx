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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Paper,
  Alert,
  Stack
} from '@mui/material';
import {
  School,
  Add,
  Delete,
  Edit,
  PlayCircle,
  ExpandMore,
  VideoLibrary,
  Book,
  CloudUpload,
  Image
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Course {
  id: number;
  title: string;
  description: string;
  video_url: string;
  module: string;
  duration: string;
  created_at: string;
}

interface CoursesByModule {
  [module: string]: Course[];
}

interface BrandingConfig {
  courses_banner_url?: string;
}

const AdminCoursesPage: React.FC = () => {
  const [coursesByModule, setCoursesByModule] = useState<CoursesByModule>({});
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    video_url: '',
    module: '',
    duration: ''
  });
  const [branding, setBranding] = useState<BrandingConfig>({});
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  // Não precisamos mais do array fixo de módulos
  // Os módulos serão carregados dinamicamente do banco de dados
  
  useEffect(() => {
    loadCourses();
    loadBranding();
  }, []);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/courses');
      // A API já retorna cursos agrupados por módulo
      const groupedCourses = response.data.courses;
      
      // Converter os dados para o formato esperado
      const formattedCourses: CoursesByModule = {};
      
      Object.keys(groupedCourses).forEach(module => {
        formattedCourses[module] = groupedCourses[module].map((course: any) => ({
          id: course.id,
          title: course.title,
          description: course.description,
          video_url: course.youtube_url,
          module: course.module,
          duration: course.duration ? `${course.duration} min` : '',
          created_at: course.created_at
        }));
      });
      
      setCoursesByModule(formattedCourses);
    } catch (error) {
      console.error('Erro ao carregar cursos:', error);
      toast.error('Erro ao carregar cursos');
    } finally {
      setLoading(false);
    }
  };

  const loadBranding = async () => {
    try {
      const response = await axios.get('/api/branding/config');
      setBranding(response.data);
    } catch (error) {
      console.error('Erro ao carregar configuração de branding:', error);
    }
  };

  const handleBannerUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('banner', file);

    try {
      const response = await axios.post('/api/branding/admin/upload-courses-banner', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setBranding(prev => ({ ...prev, courses_banner_url: response.data.courses_banner_url }));
      toast.success('Banner de cursos enviado com sucesso!');
      setBannerFile(null);
    } catch (error: any) {
      const message = error.response?.data?.error || 'Erro ao enviar banner';
      toast.error(message);
    }
  };

  const handleRemoveBanner = async () => {
    try {
      await axios.delete('/api/branding/admin/remove-courses-banner');
      setBranding(prev => ({ ...prev, courses_banner_url: undefined }));
      toast.success('Banner removido com sucesso!');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Erro ao remover banner';
      toast.error(message);
    }
  };

  const handleSaveCourse = async () => {
    if (!newCourse.title || !newCourse.description || !newCourse.video_url || !newCourse.module) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const courseData = {
        title: newCourse.title,
        description: newCourse.description,
        youtube_url: newCourse.video_url,
        module: newCourse.module.trim(), // Permitir módulos personalizados
        duration: newCourse.duration ? parseInt(newCourse.duration.replace(/\D/g, '')) : undefined
      };

      if (editingCourse) {
        await axios.put(`/api/courses/${editingCourse.id}`, courseData);
        toast.success('Aula atualizada com sucesso!');
      } else {
        await axios.post('/api/courses', courseData);
        toast.success('Aula adicionada com sucesso!');
      }
      
      setDialogOpen(false);
      setEditingCourse(null);
      setNewCourse({ title: '', description: '', video_url: '', module: '', duration: '' });
      loadCourses();
    } catch (error: any) {
      console.error('Erro ao salvar aula:', error);
      toast.error(error.response?.data?.error || 'Erro ao salvar aula');
    }
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setNewCourse({
      title: course.title,
      description: course.description,
      video_url: course.video_url,
      module: course.module,
      duration: course.duration
    });
    setDialogOpen(true);
  };

  const handleDeleteCourse = async (courseId: number) => {
    if (!window.confirm('Tem certeza que deseja deletar esta aula?')) return;

    try {
      await axios.delete(`/api/courses/${courseId}`);
      toast.success('Aula deletada com sucesso!');
      loadCourses();
    } catch (error: any) {
      console.error('Erro ao deletar aula:', error);
      toast.error(error.response?.data?.error || 'Erro ao deletar aula');
    }
  };

  const handleOpenDialog = (presetModule?: string) => {
    setEditingCourse(null);
    setNewCourse({ 
      title: '', 
      description: '', 
      video_url: '', 
      module: presetModule || '', 
      duration: '' 
    });
    setDialogOpen(true);
  };

  const getTotalCoursesCount = () => {
    return Object.values(coursesByModule).reduce((total, courses) => total + courses.length, 0);
  };

  const getModulesCount = () => {
    return Object.keys(coursesByModule).length;
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" className="theme-text-gradient" sx={{ 
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <School sx={{ fontSize: '2.5rem', color: 'primary.main' }} />
          Gerenciar Cursos
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
          sx={{
            background: 'linear-gradient(135deg, #00d4aa 0%, #00b89c 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #00b89c 0%, #00d4aa 100%)'
            }
          }}
        >
          Adicionar Aula
        </Button>
      </Box>

      {/* Banner de Cursos */}
      <Card className="theme-card" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ 
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: 'primary.main'
          }}>
            <Image />
            Banner da Página de Cursos
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Banner que substitui o card "Selecione uma Aula" na página de cursos. Recomendado: 800x400px
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Button
                component="label"
                variant="outlined"
                fullWidth
                startIcon={<CloudUpload />}
                sx={{ py: 2 }}
              >
                Enviar Banner
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setBannerFile(file);
                    }
                  }}
                />
              </Button>
            </Grid>
            
            <Grid item xs={12} md={6}>
              {branding.courses_banner_url && (
                <Box textAlign="center">
                  <img 
                    src={branding.courses_banner_url} 
                    alt="Current Banner" 
                    style={{
                      maxWidth: '100%',
                      maxHeight: '80px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}
                  />
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                    Banner atual
                  </Typography>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<Delete />}
                    onClick={handleRemoveBanner}
                    sx={{ mt: 1 }}
                  >
                    Remover
                  </Button>
                </Box>
              )}
            </Grid>
          </Grid>
          
          {bannerFile && (
            <Box mt={2}>
              <Alert severity="info" sx={{ borderRadius: '12px' }}>
                Arquivo selecionado: {bannerFile.name}
                <Button 
                  size="small" 
                  onClick={() => handleBannerUpload(bannerFile)}
                  sx={{ ml: 2 }}
                >
                  Enviar
                </Button>
              </Alert>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, textAlign: 'center', borderRadius: '16px' }}>
            <Book sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
            <Typography variant="h4" fontWeight="bold">
              {getModulesCount()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Módulos
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, textAlign: 'center', borderRadius: '16px' }}>
            <VideoLibrary sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
            <Typography variant="h4" fontWeight="bold">
              {getTotalCoursesCount()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Aulas
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, textAlign: 'center', borderRadius: '16px' }}>
            <PlayCircle sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
            <Typography variant="h4" fontWeight="bold">
              {Math.round(getTotalCoursesCount() * 12.5)} min
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Duração Total (estimada)
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Lista de módulos e aulas */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          {Object.keys(coursesByModule).length === 0 ? (
            <Card className="theme-card" sx={{
              borderRadius: '20px',
              textAlign: 'center',
              py: 6
            }}>
              <CardContent>
                <School sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h5" color="text.secondary" gutterBottom>
                  Nenhum curso cadastrado
                </Typography>
                <Typography variant="body1" color="text.secondary" mb={3}>
                  Crie seu primeiro módulo e comece a adicionar aulas
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => handleOpenDialog()}
                  size="large"
                >
                  Criar Primeira Aula
                </Button>
              </CardContent>
            </Card>
          ) : (
            Object.keys(coursesByModule).map((module) => (
              <Accordion
                key={module}
                defaultExpanded
                sx={{
                  mb: 2,
                  borderRadius: '16px !important',
                  '&:before': { display: 'none' },
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMore />}
                  sx={{
                    backgroundColor: 'primary.main',
                    color: 'white',
                    borderRadius: '16px 16px 0 0',
                    minHeight: 64,
                    '&.Mui-expanded': {
                      borderRadius: '16px 16px 0 0'
                    }
                  }}
                >
                  <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                    <Box display="flex" alignItems="center" gap={2}>
                      <Book />
                      <Typography variant="h6" fontWeight="bold">
                        {module}
                      </Typography>
                      <Chip 
                        label={`${coursesByModule[module].length} aula${coursesByModule[module].length !== 1 ? 's' : ''}`}
                        size="small"
                        sx={{ 
                          backgroundColor: 'rgba(255,255,255,0.2)',
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                      />
                    </Box>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Add />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDialog(module);
                      }}
                      sx={{
                        color: 'white',
                        borderColor: 'rgba(255,255,255,0.5)',
                        '&:hover': {
                          borderColor: 'white',
                          backgroundColor: 'rgba(255,255,255,0.1)'
                        }
                      }}
                    >
                      Adicionar Aula
                    </Button>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  <List>
                    {coursesByModule[module].map((course, index) => (
                      <React.Fragment key={course.id}>
                        <ListItem
                          sx={{
                            py: 2,
                            '&:hover': {
                              backgroundColor: 'rgba(0, 212, 170, 0.05)'
                            }
                          }}
                        >
                          <ListItemIcon>
                            <PlayCircle color="primary" sx={{ fontSize: 32 }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Typography variant="h6" fontWeight="600">
                                {course.title}
                              </Typography>
                            }
                            secondary={
                              <Box>
                                <Typography variant="body2" color="text.secondary" mb={1}>
                                  {course.description}
                                </Typography>
                                <Box display="flex" gap={1} flexWrap="wrap">
                                  {course.duration && (
                                    <Chip
                                      label={course.duration}
                                      size="small"
                                      variant="outlined"
                                      color="secondary"
                                    />
                                  )}
                                  <Chip
                                    label={new Date(course.created_at).toLocaleDateString()}
                                    size="small"
                                    variant="outlined"
                                  />
                                  <Chip
                                    label={`Aula ${index + 1}`}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                  />
                                </Box>
                              </Box>
                            }
                          />
                          <Box display="flex" gap={1}>
                            <IconButton
                              color="primary"
                              onClick={() => handleEditCourse(course)}
                              size="small"
                            >
                              <Edit />
                            </IconButton>
                            <IconButton
                              color="error"
                              onClick={() => handleDeleteCourse(course.id)}
                              size="small"
                            >
                              <Delete />
                            </IconButton>
                          </Box>
                        </ListItem>
                        {index < coursesByModule[module].length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            ))
          )}
        </Grid>
      </Grid>

      {/* Dialog para adicionar/editar aula */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingCourse ? 'Editar Aula' : 'Adicionar Nova Aula'}
        </DialogTitle>
        <DialogContent>
          <Box py={2}>
            <TextField
              fullWidth
              label="Nome do Módulo"
              value={newCourse.module}
              onChange={(e) => setNewCourse(prev => ({ ...prev, module: e.target.value }))}
              margin="normal"
              required
              helperText="Digite o nome do módulo (novo ou existente)"
              placeholder="Ex: Introdução ao Trading, Estratégias Avançadas..."
            />

            <TextField
              fullWidth
              label="Título da Aula"
              value={newCourse.title}
              onChange={(e) => setNewCourse(prev => ({ ...prev, title: e.target.value }))}
              margin="normal"
              required
              placeholder="Ex: Como criar sua primeira estratégia"
            />

            <TextField
              fullWidth
              label="Descrição da Aula"
              value={newCourse.description}
              onChange={(e) => setNewCourse(prev => ({ ...prev, description: e.target.value }))}
              margin="normal"
              multiline
              rows={3}
              required
              placeholder="Descreva o que será ensinado nesta aula..."
            />

            <TextField
              fullWidth
              label="URL do Vídeo (YouTube)"
              value={newCourse.video_url}
              onChange={(e) => setNewCourse(prev => ({ ...prev, video_url: e.target.value }))}
              margin="normal"
              required
              helperText="Cole aqui o link do vídeo do YouTube"
              placeholder="https://www.youtube.com/watch?v=..."
            />

            <TextField
              fullWidth
              label="Duração (opcional)"
              value={newCourse.duration}
              onChange={(e) => setNewCourse(prev => ({ ...prev, duration: e.target.value }))}
              margin="normal"
              placeholder="Ex: 15:30"
              helperText="Duração do vídeo (formato: MM:SS)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSaveCourse}
            variant="contained"
            disabled={!newCourse.title || !newCourse.description || !newCourse.video_url || !newCourse.module}
            sx={{
              background: 'linear-gradient(135deg, #00d4aa 0%, #00b89c 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #00b89c 0%, #00d4aa 100%)'
              }
            }}
          >
            {editingCourse ? 'Atualizar' : 'Adicionar'} Aula
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminCoursesPage;