const jwt = require('jsonwebtoken');
const { query } = require('../database/connection');

// Middleware para verificar token JWT
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso necessário' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar usuário no banco
    const result = await query(
      'SELECT id, email, role, status FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    const user = result.rows[0];
    
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Conta suspensa ou inativa' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Erro na autenticação:', error);
    return res.status(403).json({ error: 'Token inválido' });
  }
};

// Middleware para verificar se é admin
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }
  next();
};

// Middleware para verificar se é cliente
const requireClient = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }
  if (req.user.role !== 'client') {
    return res.status(403).json({ error: 'Acesso negado. Apenas clientes.' });
  }
  next();
};

// Middleware para verificar se tem acesso ao bot
const requireBotAccess = async (req, res, next) => {
  try {
    const botId = req.params.botId || req.body.botId;
    
    if (!botId) {
      return res.status(400).json({ error: 'ID do bot necessário' });
    }

    // Admin tem acesso a todos os bots
    if (req.user.role === 'admin') {
      return next();
    }

    // Verificar permissão do cliente
    const result = await query(
      `SELECT can_access FROM user_bot_permissions 
       WHERE user_id = $1 AND bot_id = $2`,
      [req.user.id, botId]
    );

    if (result.rows.length === 0 || !result.rows[0].can_access) {
      return res.status(403).json({ error: 'Acesso negado a este bot' });
    }

    next();
  } catch (error) {
    console.error('Erro ao verificar acesso ao bot:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Gerar token JWT
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireClient,
  requireBotAccess,
  generateToken
}; 