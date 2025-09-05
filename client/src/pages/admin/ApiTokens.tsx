import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';

interface ApiToken {
  display_name: string;
  scopes: string[];
  token: string;
  valid_for_ip: string;
  last_used: string;
}

const ApiTokens: React.FC = () => {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [showTokens, setShowTokens] = useState<{ [key: string]: boolean }>({});
  const [newToken, setNewToken] = useState({
    name: '',
    scopes: ['read', 'trade'],
    validForCurrentIpOnly: false
  });

  const availableScopes = [
    { value: 'admin', label: 'Admin' },
    { value: 'read', label: 'Read' },
    { value: 'trade', label: 'Trade' },
    { value: 'payments', label: 'Payments' },
    { value: 'trading_information', label: 'Trading Information' }
  ];

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/admin/api-tokens');
      setTokens(response.data.tokens);
    } catch (error) {
      console.error('Erro ao carregar tokens:', error);
      toast.error('Erro ao carregar tokens da API');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateToken = async () => {
    if (!newToken.name.trim()) {
      toast.error('Nome do token é obrigatório');
      return;
    }

    setCreating(true);
    try {
      const response = await axios.post('/api/admin/api-tokens', {
        token_name: newToken.name,
        scopes: newToken.scopes,
        valid_for_current_ip_only: newToken.validForCurrentIpOnly ? 1 : 0
      });

      toast.success('Token criado com sucesso!');
      setOpenDialog(false);
      setNewToken({ name: '', scopes: ['read', 'trade'], validForCurrentIpOnly: false });
      loadTokens();
    } catch (error: any) {
      console.error('Erro ao criar token:', error);
      toast.error(error.response?.data?.error || 'Erro ao criar token');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteToken = async (token: string) => {
    if (!confirm('Tem certeza que deseja deletar este token?')) {
      return;
    }

    setDeleting(token);
    try {
      await axios.delete(`/api/admin/api-tokens/${token}`);
      toast.success('Token deletado com sucesso!');
      loadTokens();
    } catch (error: any) {
      console.error('Erro ao deletar token:', error);
      toast.error(error.response?.data?.error || 'Erro ao deletar token');
    } finally {
      setDeleting(null);
    }
  };

  const toggleTokenVisibility = (token: string) => {
    setShowTokens(prev => ({
      ...prev,
      [token]: !prev[token]
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Token copiado para a área de transferência!');
  };

  const handleScopeChange = (scope: string) => {
    setNewToken(prev => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter(s => s !== scope)
        : [...prev.scopes, scope]
    }));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Gerenciar API Tokens
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Criar Novo Token
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Os tokens de API permitem que aplicações acessem a Corretora em seu nome. 
        Use com cuidado e apenas para aplicações confiáveis.
      </Alert>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Tokens Existentes
          </Typography>

          {tokens.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" py={4}>
              Nenhum token encontrado. Crie seu primeiro token para começar.
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>Permissões</TableCell>
                    <TableCell>Token</TableCell>
                    <TableCell>Último Uso</TableCell>
                    <TableCell>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tokens.map((token, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {token.display_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={0.5} flexWrap="wrap">
                          {token.scopes.map((scope) => (
                            <Chip
                              key={scope}
                              label={scope}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography
                            variant="body2"
                            fontFamily="monospace"
                            sx={{
                              maxWidth: 200,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {showTokens[token.token] ? token.token : '••••••••••••••••'}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => toggleTokenVisibility(token.token)}
                          >
                            {showTokens[token.token] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => copyToClipboard(token.token)}
                          >
                            <CopyIcon />
                          </IconButton>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {token.last_used || 'Nunca usado'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          color="error"
                          onClick={() => handleDeleteToken(token.token)}
                          disabled={deleting === token.token}
                        >
                          {deleting === token.token ? <CircularProgress size={20} /> : <DeleteIcon />}
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Dialog para criar novo token */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Criar Novo Token de API</DialogTitle>
        <DialogContent>
          <Box py={2}>
            <TextField
              fullWidth
              label="Nome do Token"
              value={newToken.name}
              onChange={(e) => setNewToken(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Bot Trading Token"
              margin="normal"
            />

            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              Permissões (Scopes)
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              {availableScopes.map((scope) => (
                <FormControlLabel
                  key={scope.value}
                  control={
                    <Checkbox
                      checked={newToken.scopes.includes(scope.value)}
                      onChange={() => handleScopeChange(scope.value)}
                    />
                  }
                  label={`${scope.label} (${scope.value})`}
                />
              ))}
            </Box>

            <Divider sx={{ my: 2 }} />

            <FormControlLabel
              control={
                <Checkbox
                  checked={newToken.validForCurrentIpOnly}
                  onChange={(e) => setNewToken(prev => ({ 
                    ...prev, 
                    validForCurrentIpOnly: e.target.checked 
                  }))}
                />
              }
              label="Válido apenas para o IP atual"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleCreateToken}
            variant="contained"
            disabled={creating || !newToken.name.trim()}
          >
            {creating ? <CircularProgress size={20} /> : 'Criar Token'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApiTokens; 