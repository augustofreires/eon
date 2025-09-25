import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import './styles/theme.css';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ProfilePage from './pages/ProfilePage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AdminDashboard from './pages/admin/Dashboard';
import AdminCoursesPage from './pages/admin/CoursesPage';
import AdminBotsPage from './pages/admin/BotsPage';
import AdminUsersPage from './pages/admin/UsersPage';
import ThemeConfigPage from './pages/admin/ThemeConfig';
import AdminDerivPage from './pages/admin/DerivPage';
import AdminAccessLinkPage from './pages/admin/AccessLinkPage';
import AdminMarkupReportsPage from './pages/admin/MarkupReportsPage';
import PaymentPlatformsPage from './pages/admin/PaymentPlatformsPage';
import AdminUsefulLinksPage from './pages/admin/UsefulLinksPage';
import AdminPagesPage from './pages/admin/PagesPage';
import AdminBrandingPage from './pages/admin/BrandingPage';
import ActionCardsPage from './pages/admin/ActionCardsPage';
import ClientDashboard from './pages/client/Dashboard';
import ClientBotsPage from './pages/client/BotsPage';
import CoursesPage from './pages/CoursesPage';
import OperationsMinimal from './pages/OperationsMinimal';
import BankManagementPage from './pages/BankManagementPage';
import CurrencyConverterPage from './pages/CurrencyConverterPage';
import UsefulLinksPage from './pages/UsefulLinksPage';
import AboutPage from './pages/AboutPage';
import TermsPage from './pages/TermsPage';
import DerivConnection from './pages/DerivConnection';
import DerivCallback from './pages/DerivCallback';
import Layout from './components/Layout';

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ 
  children, 
  adminOnly = false 
}) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Carregando...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

// Aplicar tema do cache instantaneamente
const applyInstantTheme = () => {
  try {
    const cachedTheme = localStorage.getItem('deriv-theme-cache');
    if (cachedTheme) {
      const theme = JSON.parse(cachedTheme);
      const root = document.documentElement;
      
      root.style.setProperty('--primary-color', theme.primaryColor);
      root.style.setProperty('--secondary-color', theme.secondaryColor);
      root.style.setProperty('--accent-color', theme.accentColor);
      root.style.setProperty('--title-color', theme.titleColor);
      root.style.setProperty('--subtitle-color', theme.subtitleColor);
      root.style.setProperty('--menu-title-color', theme.menuTitleColor);
      root.style.setProperty('--background-gradient', theme.backgroundGradient);
      root.style.setProperty('--card-background', theme.cardBackground);
      root.style.setProperty('--text-gradient', theme.textGradient);
      root.style.setProperty('--button-gradient', theme.buttonGradient);
      root.style.setProperty('--border-radius', `${theme.borderRadius}px`);
    }
  } catch (error) {
    // Silencioso para não poluir o console em produção
  }
};

function AppContent() {
  const { user } = useAuth();
  
  // Aplicar tema instantaneamente quando o componente montar
  React.useEffect(() => {
    applyInstantTheme();
  }, []);
  
  return (
    <Box className="theme-background" sx={{ minHeight: '100vh' }}>
      <Routes>
        <Route path="/" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace /> : <LoginPage />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <SignupPage />} />
        <Route path="/forgot-password" element={user ? <Navigate to="/dashboard" replace /> : <ForgotPasswordPage />} />
        <Route path="/reset-password" element={user ? <Navigate to="/dashboard" replace /> : <ResetPasswordPage />} />
        
        {/* Admin routes */}
        <Route path="/admin" element={
          user ? (
            user.role === 'admin' ? (
              <ProtectedRoute adminOnly>
                <Layout>
                  <AdminDashboard />
                </Layout>
              </ProtectedRoute>
            ) : (
              <Navigate to="/dashboard" replace />
            )
          ) : (
            <LoginPage />
          )
        } />
        
        <Route path="/admin/courses" element={
          <ProtectedRoute adminOnly>
            <Layout>
              <AdminCoursesPage />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/admin/bots" element={
          <ProtectedRoute adminOnly>
            <Layout>
              <AdminBotsPage />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/admin/users" element={
          <ProtectedRoute adminOnly>
            <Layout>
              <AdminUsersPage />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/admin/theme" element={
          <ProtectedRoute adminOnly>
            <Layout>
              <ThemeConfigPage />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/admin/deriv" element={
          <ProtectedRoute adminOnly>
            <Layout>
              <AdminDerivPage />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/admin/access-link" element={
          <ProtectedRoute adminOnly>
            <Layout>
              <AdminAccessLinkPage />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/admin/markup-reports" element={
          <ProtectedRoute adminOnly>
            <Layout>
              <AdminMarkupReportsPage />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/admin/payment-platforms" element={
          <ProtectedRoute adminOnly>
            <Layout>
              <PaymentPlatformsPage />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/admin/useful-links" element={
          <ProtectedRoute adminOnly>
            <Layout>
              <AdminUsefulLinksPage />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/admin/pages" element={
          <ProtectedRoute adminOnly>
            <Layout>
              <AdminPagesPage />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/admin/branding" element={
          <ProtectedRoute adminOnly>
            <Layout>
              <AdminBrandingPage />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/admin/action-cards" element={
          <ProtectedRoute adminOnly>
            <Layout>
              <ActionCardsPage />
            </Layout>
          </ProtectedRoute>
        } />
        
        {/* Client routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Layout>
              <ClientDashboard />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/bots" element={
          <ProtectedRoute>
            <Layout>
              <ClientBotsPage />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/courses" element={
          <ProtectedRoute>
            <Layout>
              <CoursesPage />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/operations" element={
          <ProtectedRoute>
            <Layout>
              <OperationsMinimal />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/bank-management" element={
          <ProtectedRoute>
            <Layout>
              <BankManagementPage />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/currency-converter" element={
          <ProtectedRoute>
            <CurrencyConverterPage />
          </ProtectedRoute>
        } />
        
        <Route path="/deriv" element={
          <ProtectedRoute>
            <Layout>
              <DerivConnection />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/profile" element={
          <ProtectedRoute>
            <Layout>
              <ProfilePage />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/useful-links" element={
          <ProtectedRoute>
            <Layout>
              <UsefulLinksPage />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/about" element={
          <ProtectedRoute>
            <Layout>
              <AboutPage />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/terms" element={
          <ProtectedRoute>
            <Layout>
              <TermsPage />
            </Layout>
          </ProtectedRoute>
        } />
        
        {/* Rota pública para callback OAuth */}
        <Route path="/auth/deriv/callback" element={<DerivCallback />} />
        <Route path="/operations/auth/deriv/callback" element={<DerivCallback />} />
      </Routes>
      <Toaster position="top-right" />
    </Box>
  );
}

function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default App; 