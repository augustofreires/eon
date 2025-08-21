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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from '@mui/material';
import {
  School,
  Add,
  Delete,
  Edit,
  PlayCircle
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

const AdminCoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
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

  const modules = [
    'Introdução ao Trading',
    'Análise Técnica',
    'Estratégias de Bot',
    'Gestão de Risco',
    'Psicologia do Trading'
  ];

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/courses');
      setCourses(response.data.courses);
    } catch (error) {
      console.error('Erro ao carregar cursos:', error);
      toast.error('Erro ao carregar cursos');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCourse = async () => {
    if (!newCourse.title || !newCourse.description || !newCourse.video_url || !newCourse.module) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      if (editingCourse) {
        await axios.put(`/api/courses/${editingCourse.id}`, newCourse);
        toast.success('Curso atualizado com sucesso!');
      } else {
        await axios.post('/api/courses', newCourse);
        toast.success('Curso adicionado com sucesso!');
      }
      
      setDialogOpen(false);
      setEditingCourse(null);
      setNewCourse({ title: '', description: '', video_url: '', module: '', duration: '' });
      loadCourses();
    } catch (error: any) {
      console.error('Erro ao salvar curso:', error);
      toast.error(error.response?.data?.error || 'Erro ao salvar curso');
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
    if (!confirm('Tem certeza que deseja deletar este curso?')) return;

    try {
      await axios.delete(`/api/courses/${courseId}`);
      toast.success('Curso deletado com sucesso!');
      loadCourses();
    } catch (error: any) {
      console.error('Erro ao deletar curso:', error);
      toast.error(error.response?.data?.error || 'Erro ao deletar curso');
    }
  };

  const handleOpenDialog = () => {
    setEditingCourse(null);
    setNewCourse({ title: '', description: '', video_url: '', module: '', duration: '' });
    setDialogOpen(true);
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          <School sx={{ mr: 1, verticalAlign: 'middle' }} />
          Gerenciar Cursos
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleOpenDialog}
        >
          Adicionar Curso
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              {courses.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <School sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Nenhum curso cadastrado
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Adicione seu primeiro curso para começar
                  </Typography>
                </Box>
              ) : (
                <List>
                  {courses.map((course) => (
                    <ListItem
                      key={course.id}
                      sx={{
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1
                      }}
                    >
                      <ListItemIcon>
                        <PlayCircle color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={course.title}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary" mb={1}>
                              {course.description}
                            </Typography>
                            <Box display="flex" gap={1} flexWrap="wrap">
                              <Chip
                                label={course.module}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                              {course.duration && (
                                <Chip
                                  label={course.duration}
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                              <Chip
                                label={new Date(course.created_at).toLocaleDateString()}
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                          </Box>
                        }
                      />
                      <Box>
                        <IconButton
                          color="primary"
                          onClick={() => handleEditCourse(course)}
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => handleDeleteCourse(course.id)}
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog para adicionar/editar curso */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingCourse ? 'Editar Curso' : 'Adicionar Novo Curso'}
        </DialogTitle>
        <DialogContent>
          <Box py={2}>
            <TextField
              fullWidth
              label="Título do Curso"
              value={newCourse.title}
              onChange={(e) => setNewCourse(prev => ({ ...prev, title: e.target.value }))}
              margin="normal"
              required
            />

            <TextField
              fullWidth
              label="Descrição"
              value={newCourse.description}
              onChange={(e) => setNewCourse(prev => ({ ...prev, description: e.target.value }))}
              margin="normal"
              multiline
              rows={3}
              required
            />

            <TextField
              fullWidth
              label="URL do Vídeo (YouTube)"
              value={newCourse.video_url}
              onChange={(e) => setNewCourse(prev => ({ ...prev, video_url: e.target.value }))}
              margin="normal"
              required
              helperText="Cole aqui o link do vídeo do YouTube"
            />

            <FormControl fullWidth margin="normal" required>
              <InputLabel>Módulo</InputLabel>
              <Select
                value={newCourse.module}
                onChange={(e) => setNewCourse(prev => ({ ...prev, module: e.target.value }))}
                label="Módulo"
              >
                {modules.map((module) => (
                  <MenuItem key={module} value={module}>
                    {module}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

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
          >
            {editingCourse ? 'Atualizar' : 'Adicionar'} Curso
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminCoursesPage; 