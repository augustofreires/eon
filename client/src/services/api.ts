import axios from 'axios';
import toast from 'react-hot-toast';

// Configurar axios para trabalhar com tanto dev quanto prod
const api = axios.create({
  // Em desenvolvimento: usa o proxy configurado no package.json (localhost:3001)
  // Em produção: usa URLs relativas (mesmo domínio)
  baseURL: process.env.NODE_ENV === 'production' ? '' : undefined,
  timeout: 30000, // 30 segundos de timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token JWT automaticamente
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔑 API: Token JWT incluído na requisição:', {
        url: config.url,
        method: config.method,
        hasAuth: !!config.headers.Authorization
      });
    } else {
      console.log('⚠️ API: Nenhum token JWT encontrado para:', {
        url: config.url,
        method: config.method
      });
    }
    return config;
  },
  (error) => {
    console.error('❌ API: Erro no interceptor de requisição:', error);
    return Promise.reject(error);
  }
);

// Interceptor para tratar respostas e erros
api.interceptors.response.use(
  (response) => {
    console.log('✅ API: Resposta recebida:', {
      url: response.config.url,
      status: response.status,
      data: response.data?.success ? 'success' : 'data received'
    });
    return response;
  },
  (error) => {
    console.error('❌ API: Erro na resposta:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.error || error.message
    });

    // Se token expirado ou não autorizado, limpar sessão
    if (error.response?.status === 401) {
      console.log('🔄 API: Token expirado, limpando sessão...');
      localStorage.removeItem('token');
      toast.error('Sessão expirada. Faça login novamente.');

      // Forçar refresh para voltar ao login
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
    }

    return Promise.reject(error);
  }
);

// Export da instância configurada
export default api;

// Export de funções utilitárias
export const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    console.log('✅ API: Token definido globalmente');
  } else {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    console.log('🗑️ API: Token removido globalmente');
  }
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem('token');
};