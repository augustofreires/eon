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
  Paper,
  Button
} from '@mui/material';
import {
  ExpandMore,
  PlayCircle,
  School,
  VideoLibrary,
  SkipNext,
  SkipPrevious,
  CheckCircle
} from '@mui/icons-material';
import YouTube from 'react-youtube';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useLanguage } from '../contexts/LanguageContext';

interface Course {
  id: number;
  title: string;
  description: string;
  video_url: string;
  module: string;
  duration: string;
  created_at: string;
}

interface BrandingConfig {
  courses_banner_url?: string;
}

const CoursesPage: React.FC = () => {
  const { t } = useLanguage();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [currentCourseIndex, setCurrentCourseIndex] = useState<number>(0);
  const [completedCourses, setCompletedCourses] = useState<number[]>([]);
  const [branding, setBranding] = useState<BrandingConfig>({});

  useEffect(() => {
    loadCourses();
    loadBranding();
  }, []);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/courses');
      // A API retorna cursos agrupados por módulo, vamos converter em array plano
      const coursesByModule = response.data.courses;
      const flatCourses: Course[] = [];
      
      Object.keys(coursesByModule).forEach(module => {
        coursesByModule[module].forEach((course: any) => {
          flatCourses.push({
            id: course.id,
            title: course.title,
            description: course.description,
            video_url: course.youtube_url,
            module: course.module,
            duration: course.duration ? `${course.duration} min` : 'N/A',
            created_at: course.created_at
          });
        });
      });
      
      setCourses(flatCourses);
    } catch (error) {
      console.error('Erro ao carregar cursos:', error);
      toast.error(t('courses.errorLoadingCourses'));
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
    const index = courses.findIndex(c => c.id === course.id);
    setCurrentCourseIndex(index);
  };

  const handleNextCourse = () => {
    if (currentCourseIndex < courses.length - 1) {
      const nextIndex = currentCourseIndex + 1;
      setCurrentCourseIndex(nextIndex);
      setSelectedCourse(courses[nextIndex]);
    }
  };

  const handlePreviousCourse = () => {
    if (currentCourseIndex > 0) {
      const prevIndex = currentCourseIndex - 1;
      setCurrentCourseIndex(prevIndex);
      setSelectedCourse(courses[prevIndex]);
    }
  };

  const handleMarkComplete = () => {
    if (selectedCourse && !completedCourses.includes(selectedCourse.id)) {
      setCompletedCourses(prev => [...prev, selectedCourse.id]);
      toast.success(t('courses.classCompleted'));
      
      // Auto avançar para próxima aula
      setTimeout(() => {
        if (currentCourseIndex < courses.length - 1) {
          handleNextCourse();
        }
      }, 1000);
    }
  };

  const isLastCourse = () => currentCourseIndex >= courses.length - 1;
  const isFirstCourse = () => currentCourseIndex <= 0;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>{t('courses.loadingCourses')}</Typography>
      </Box>
    );
  }

  const groupedCourses = groupCoursesByModule();

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom className="theme-text-gradient" sx={{ 
        fontWeight: 700,
        mb: 3,
        display: 'flex',
        alignItems: 'center',
        gap: 2
      }}>
        <School sx={{ fontSize: '2.5rem', color: 'primary.main' }} />
        {t('courses.title')}
      </Typography>

      <Grid container spacing={3}>
        {/* Player de Vídeo - Primeiro no Mobile */}
        <Grid item xs={12} md={8} order={{ xs: 1, md: 2 }}>
          <Card className="theme-card" sx={{
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 32px rgba(0, 212, 170, 0.1)'
            }
          }}>
            <CardContent sx={{ p: 3 }}>
              {selectedCourse ? (
                <Box>
                  <Typography variant="h5" gutterBottom className="theme-text-gradient" sx={{
                    fontWeight: 700,
                    mb: 2,
                    lineHeight: 1.2
                  }}>
                    {selectedCourse.title}
                  </Typography>
                  
                  <Typography variant="body1" color="text.secondary" mb={3} sx={{
                    lineHeight: 1.6,
                    opacity: 0.9
                  }}>
                    {selectedCourse.description}
                  </Typography>

                  <Box
                    sx={{
                      position: 'relative',
                      width: '100%',
                      height: 0,
                      paddingBottom: '56.25%', // 16:9 aspect ratio
                      mb: 3,
                      borderRadius: '16px',
                      overflow: 'hidden',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
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

                  {/* Controles de Navegação */}
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Box display="flex" gap={1}>
                      <Button
                        variant="outlined"
                        startIcon={<SkipPrevious />}
                        onClick={handlePreviousCourse}
                        disabled={isFirstCourse()}
                        sx={{
                          borderRadius: '25px',
                          textTransform: 'none',
                          fontWeight: 600
                        }}
                      >
                        {t('courses.previous')}
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={<CheckCircle />}
                        onClick={handleMarkComplete}
                        disabled={completedCourses.includes(selectedCourse.id)}
                        sx={{
                          borderRadius: '25px',
                          textTransform: 'none',
                          fontWeight: 600,
                          background: completedCourses.includes(selectedCourse.id) 
                            ? 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)'
                            : 'var(--button-gradient)'
                        }}
                      >
                        {completedCourses.includes(selectedCourse.id) ? t('courses.completed') : t('courses.markCompleted')}
                      </Button>
                      <Button
                        variant="contained"
                        endIcon={<SkipNext />}
                        onClick={handleNextCourse}
                        disabled={isLastCourse()}
                        sx={{
                          borderRadius: '25px',
                          textTransform: 'none',
                          fontWeight: 600,
                          background: 'var(--button-gradient)'
                        }}
                      >
                        {t('courses.next')}
                      </Button>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {t('courses.classesCount').replace('{current}', (currentCourseIndex + 1).toString()).replace('{total}', courses.length.toString())}
                    </Typography>
                  </Box>

                  <Box display="flex" gap={1.5} flexWrap="wrap">
                    <Chip 
                      label={selectedCourse.module} 
                      sx={{
                        borderRadius: '20px',
                        background: 'var(--button-gradient)',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        boxShadow: '0 4px 12px rgba(var(--primary-rgb), 0.3)'
                      }}
                    />
                    <Chip 
                      label={selectedCourse.duration} 
                      sx={{
                        borderRadius: '20px',
                        background: 'rgba(var(--primary-rgb), 0.1)',
                        border: '1px solid rgba(var(--primary-rgb), 0.2)',
                        color: 'primary.main',
                        fontWeight: 600,
                        fontSize: '0.85rem'
                      }}
                    />
                    <Chip 
                      label={new Date(selectedCourse.created_at).toLocaleDateString()} 
                      sx={{
                        borderRadius: '20px',
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'text.secondary',
                        fontWeight: 500,
                        fontSize: '0.85rem'
                      }}
                    />
                    {completedCourses.includes(selectedCourse.id) && (
                      <Chip 
                        label={t('courses.completed')} 
                        icon={<CheckCircle />}
                        sx={{
                          borderRadius: '20px',
                          background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '0.85rem'
                        }}
                      />
                    )}
                  </Box>
                </Box>
              ) : branding.courses_banner_url ? (
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    minHeight: '400px',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    background: 'rgba(var(--primary-rgb), 0.03)',
                    border: '1px solid rgba(0, 212, 170, 0.2)',
                    cursor: courses.length > 0 ? 'pointer' : 'default',
                    transition: 'all 0.3s ease',
                    '&:hover': courses.length > 0 ? {
                      transform: 'scale(1.02)',
                      boxShadow: '0 12px 32px rgba(0, 212, 170, 0.15)'
                    } : {}
                  }}
                  onClick={() => {
                    if (courses.length > 0) {
                      handleCourseSelect(courses[0]);
                    }
                  }}
                >
                  <img
                    src={branding.courses_banner_url}
                    alt="Banner dos Cursos"
                    style={{
                      width: '100%',
                      height: '100%',
                      minHeight: '400px',
                      objectFit: 'cover',
                      borderRadius: '16px',
                    }}
                  />
                  {courses.length > 0 && (
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 16,
                        right: 16,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        backdropFilter: 'blur(10px)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}
                    >
                      <PlayCircle sx={{ fontSize: '1.2rem' }} />
                      <Typography variant="body2" fontWeight={600}>
                        Começar Primeiro Curso
                      </Typography>
                    </Box>
                  )}
                </Box>
              ) : (
                <Box
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  minHeight="400px"
                  textAlign="center"
                  sx={{
                    background: 'rgba(var(--primary-rgb), 0.03)',
                    borderRadius: '16px',
                    border: '1px dashed rgba(0, 212, 170, 0.2)',
                    p: 4
                  }}
                >
                  <Box
                    sx={{
                      width: '120px',
                      height: '120px',
                      borderRadius: '50%',
                      background: 'rgba(var(--primary-rgb), 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 3,
                      boxShadow: '0 8px 24px rgba(var(--primary-rgb), 0.1)'
                    }}
                  >
                    <VideoLibrary sx={{ fontSize: '3rem', color: 'primary.main' }} />
                  </Box>
                  <Typography variant="h5" gutterBottom className="theme-text-gradient" sx={{
                    fontWeight: 700,
                    mb: 2
                  }}>
                    {t('courses.selectClass')}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{
                    lineHeight: 1.6,
                    opacity: 0.8
                  }}>
                    {t('courses.selectClassDescription').replace('{location}', courses.length > 0 ? (courses.length > 1 ? t('courses.locationBelow') : t('courses.locationBeside')) : '')}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Lista de Cursos - Segundo no Mobile */}
        <Grid item xs={12} md={4} order={{ xs: 2, md: 1 }}>
          <Card className="theme-card" sx={{
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 32px rgba(0, 212, 170, 0.1)'
            }
          }}>
            <CardContent>
              <Typography variant="h6" gutterBottom className="theme-text-gradient" sx={{
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 3
              }}>
                <VideoLibrary sx={{ fontSize: '1.5rem', color: 'primary.main' }} />
                {t('courses.courseLibrary')}
              </Typography>

              {Object.keys(groupedCourses).length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={4}>
                  {t('courses.noCoursesAvailable')}
                </Typography>
              ) : (
                Object.entries(groupedCourses).map(([module, moduleCourses]) => (
                  <Accordion key={module} sx={{ 
                    mb: 2,
                    borderRadius: '16px !important',
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.3s ease',
                    overflow: 'hidden',
                    '&:hover': {
                      boxShadow: '0 6px 20px rgba(0, 212, 170, 0.08)'
                    },
                    '&:before': { display: 'none' },
                    '&.Mui-expanded': {
                      borderRadius: '16px !important'
                    }
                  }}>
                    <AccordionSummary 
                      expandIcon={<ExpandMore sx={{ color: 'primary.main' }} />}
                      sx={{
                        borderRadius: '16px !important',
                        background: 'rgba(var(--primary-rgb), 0.08)',
                        minHeight: '56px !important',
                        '&.Mui-expanded': {
                          borderRadius: '16px 16px 0 0 !important',
                          minHeight: '56px !important'
                        },
                        '& .MuiAccordionSummary-content': {
                          margin: '12px 0 !important',
                        },
                        '& .MuiAccordionSummary-content.Mui-expanded': {
                          margin: '12px 0 !important',
                        },
                        '& .MuiAccordionSummary-expandIconWrapper': {
                          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          transform: 'rotate(0deg)',
                        },
                        '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded': {
                          transform: 'rotate(180deg)',
                        }
                      }}
                    >
                      <Typography variant="subtitle1" fontWeight={700} className="theme-menu-title" sx={{
                        fontWeight: 700
                      }}>
                        {module}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{
                      borderRadius: '0 0 16px 16px !important',
                      padding: '16px !important'
                    }}>
                      <Box>
                        {moduleCourses.map((course) => (
                          <Paper
                            key={course.id}
                            elevation={0}
                            sx={{
                              p: 2.5,
                              mb: 1.5,
                              cursor: 'pointer',
                              borderRadius: '12px',
                              background: selectedCourse?.id === course.id 
                                ? 'linear-gradient(135deg, rgba(0, 212, 170, 0.15) 0%, rgba(0, 184, 156, 0.1) 100%)'
                                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
                              border: selectedCourse?.id === course.id 
                                ? '2px solid rgba(0, 212, 170, 0.3)'
                                : '1px solid rgba(255, 255, 255, 0.05)',
                              backdropFilter: 'blur(10px)',
                              boxShadow: selectedCourse?.id === course.id 
                                ? '0 8px 24px rgba(0, 212, 170, 0.15)'
                                : '0 4px 12px rgba(0, 0, 0, 0.05)',
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                              '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: '0 8px 24px rgba(var(--primary-rgb), 0.12)',
                                background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.08) 0%, rgba(0, 184, 156, 0.04) 100%)'
                              }
                            }}
                            onClick={() => handleCourseSelect(course)}
                          >
                            <Box display="flex" alignItems="center" mb={1.5}>
                              <Box
                                sx={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  background: completedCourses.includes(course.id) 
                                    ? 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)'
                                    : 'var(--button-gradient)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  mr: 1.5,
                                  boxShadow: '0 4px 12px rgba(var(--primary-rgb), 0.3)'
                                }}
                              >
                                {completedCourses.includes(course.id) ? (
                                  <CheckCircle sx={{ color: 'white', fontSize: '1.2rem' }} />
                                ) : (
                                  <PlayCircle sx={{ color: 'white', fontSize: '1.2rem' }} />
                                )}
                              </Box>
                              <Typography variant="body1" fontWeight={600} sx={{
                                color: 'text.primary',
                                lineHeight: 1.3
                              }}>
                                {course.title}
                              </Typography>
                            </Box>
                            
                            <Typography variant="body2" color="text.secondary" mb={2} sx={{
                              lineHeight: 1.5,
                              opacity: 0.9
                            }}>
                              {course.description}
                            </Typography>
                            
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Chip
                                label={course.duration}
                                size="small"
                                sx={{
                                  borderRadius: '20px',
                                  background: 'rgba(var(--primary-rgb), 0.1)',
                                  border: '1px solid rgba(var(--primary-rgb), 0.2)',
                                  color: 'primary.main',
                                  fontWeight: 600,
                                  fontSize: '0.75rem'
                                }}
                              />
                              <Typography variant="caption" color="text.secondary" sx={{
                                opacity: 0.7,
                                fontWeight: 500
                              }}>
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

      </Grid>
    </Box>
  );
};

export default CoursesPage; 