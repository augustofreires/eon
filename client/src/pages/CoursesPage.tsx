import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper
} from '@mui/material';
import {
  ExpandMore,
  PlayCircle,
  School,
  VideoLibrary
} from '@mui/icons-material';
import YouTube from 'react-youtube';
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

const CoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

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

  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const groupCoursesByModule = () => {
    const grouped: { [key: string]: Course[] } = {};
    courses.forEach(course => {
      if (!grouped[course.module]) {
        grouped[course.module] = [];
      }
      grouped[course.module].push(course);
    });
    return grouped;
  };

  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Carregando cursos...</Typography>
      </Box>
    );
  }

  const groupedCourses = groupCoursesByModule();

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        <School sx={{ mr: 1, verticalAlign: 'middle' }} />
        Cursos de Trading
      </Typography>

      <Grid container spacing={3}>
        {/* Lista de Cursos */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <VideoLibrary sx={{ mr: 1, verticalAlign: 'middle' }} />
                Aulas Disponíveis
              </Typography>

              {Object.keys(groupedCourses).length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={4}>
                  Nenhum curso disponível
                </Typography>
              ) : (
                Object.entries(groupedCourses).map(([module, moduleCourses]) => (
                  <Accordion key={module} sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {module}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box>
                        {moduleCourses.map((course) => (
                          <Paper
                            key={course.id}
                            elevation={1}
                            sx={{
                              p: 2,
                              mb: 1,
                              cursor: 'pointer',
                              backgroundColor: selectedCourse?.id === course.id ? 'primary.light' : 'background.paper',
                              '&:hover': {
                                backgroundColor: 'action.hover'
                              }
                            }}
                            onClick={() => handleCourseSelect(course)}
                          >
                            <Box display="flex" alignItems="center" mb={1}>
                              <PlayCircle sx={{ mr: 1, color: 'primary.main' }} />
                              <Typography variant="body2" fontWeight="medium">
                                {course.title}
                              </Typography>
                            </Box>
                            
                            <Typography variant="body2" color="text.secondary" mb={1}>
                              {course.description}
                            </Typography>
                            
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Chip
                                label={course.duration}
                                size="small"
                                variant="outlined"
                              />
                              <Typography variant="caption" color="text.secondary">
                                {new Date(course.created_at).toLocaleDateString()}
                              </Typography>
                            </Box>
                          </Paper>
                        ))}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Player de Vídeo */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              {selectedCourse ? (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    {selectedCourse.title}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    {selectedCourse.description}
                  </Typography>

                  <Box
                    sx={{
                      position: 'relative',
                      width: '100%',
                      height: 0,
                      paddingBottom: '56.25%', // 16:9 aspect ratio
                      mb: 2
                    }}
                  >
                    <YouTube
                      videoId={getYouTubeId(selectedCourse.video_url) || ''}
                      opts={{
                        width: '100%',
                        height: '100%',
                        playerVars: {
                          autoplay: 0,
                        },
                      }}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%'
                      }}
                    />
                  </Box>

                  <Box display="flex" gap={1} flexWrap="wrap">
                    <Chip label={selectedCourse.module} color="primary" />
                    <Chip label={selectedCourse.duration} variant="outlined" />
                    <Chip 
                      label={new Date(selectedCourse.created_at).toLocaleDateString()} 
                      variant="outlined" 
                    />
                  </Box>
                </Box>
              ) : (
                <Box
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  minHeight="400px"
                  textAlign="center"
                >
                  <VideoLibrary sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Selecione uma aula
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Escolha uma aula da lista ao lado para começar a assistir
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CoursesPage; 