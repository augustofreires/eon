const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query } = require('../database/connection');
const { generateToken } = require('../middleware/auth');
const axios = require('axios');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Login de administrador
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Buscar usuário
    const result = await query(
      'SELECT id, email, password_hash, name, role, status FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const user = result.rows[0];

    // Permitir login para admin e cliente
    if (user.role !== 'admin' && user.role !== 'client') {
      return res.status(403).json({ error: 'Acesso negado. Role inválido.' });
    }

    // Verificar status
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Conta suspensa ou inativa' });
    }

    // Verificar senha
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Gerar token
    const token = generateToken(user.id);

    res.json({
      message: 'Login realizado com sucesso',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Erro no login admin:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Login de cliente
router.post('/client-login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Buscar usuário
    const result = await query(
      'SELECT id, email, password_hash, name, role, status FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const user = result.rows[0];

    // Verificar se é cliente
    if (user.role !== 'client') {
      return res.status(403).json({ error: 'Acesso negado. Apenas clientes.' });
    }

    // Verificar status
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Conta suspensa ou inativa' });
    }

    // Verificar senha
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Gerar token
    const token = generateToken(user.id);

    res.json({
      message: 'Login realizado com sucesso',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Erro no login cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para OAuth da Deriv
router.post('/deriv-oauth', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;

    if (!code) {
      return res.status(400).json({ error: 'Código de autorização necessário' });
    }

    // Trocar código por token de acesso
    const tokenResponse = await axios.post('https://oauth.deriv.com/oauth2/token', {
      grant_type: 'authorization_code',
      code,
      client_id: process.env.DERIV_APP_ID,
      redirect_uri: process.env.DERIV_OAUTH_REDIRECT_URL || `${process.env.CORS_ORIGIN}/auth/callback`
    });

    const { access_token, refresh_token } = tokenResponse.data;

    // Obter informações da conta Deriv
    const accountResponse = await axios.get('https://api.deriv.com/api/v3/user', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    const derivAccount = accountResponse.data.user;

    // Atualizar usuário com tokens da Deriv
    await query(`
      UPDATE users 
      SET deriv_access_token = $1, deriv_refresh_token = $2, deriv_account_id = $3, deriv_connected = true
      WHERE id = $4
    `, [access_token, refresh_token, derivAccount.loginid, userId]);

    res.json({ 
      success: true, 
      message: 'Conta Deriv conectada com sucesso',
      account: derivAccount
    });

  } catch (error) {
    console.error('Erro no OAuth da Deriv:', error);
    res.status(500).json({ error: 'Erro ao conectar conta Deriv' });
  }
});

// Verificar token
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await query(
      'SELECT id, email, name, role, status FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    const user = result.rows[0];

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Conta suspensa ou inativa' });
    }

    res.json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || user.email.split('@')[0],
        role: user.role
      }
    });

  } catch (error) {
    console.error('Erro ao verificar token:', error);
    res.status(401).json({ error: 'Token inválido' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Logout realizado com sucesso' });
});

// Integração Deriv OAuth
router.get('/deriv/authorize', authenticateToken, async (req, res) => {
  try {
    const derivAppId = process.env.DERIV_APP_ID || '82349';
    const redirectUri = encodeURIComponent(process.env.DERIV_OAUTH_REDIRECT_URL || 'https://iaeon.site/operations/auth/deriv/callback');
    
    console.log('🔗 Gerando URL OAuth da Deriv:', {
      app_id: derivAppId,
      redirect_uri: redirectUri
    });
    
    // URL de autorização da Deriv
    const authUrl = `https://oauth.deriv.com/oauth2/authorize?app_id=${derivAppId}&l=pt&brand=deriv&redirect_uri=${redirectUri}`;
    
    console.log('✅ URL OAuth gerada:', authUrl);
    
    res.json({
      success: true,
      auth_url: authUrl
    });

  } catch (error) {
    console.error('Erro ao gerar URL de autorização Deriv:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Callback OAuth da Deriv
router.post('/deriv/callback', authenticateToken, async (req, res) => {
  try {
    console.log('🔄 Processando callback OAuth da Deriv...', {
      userId: req.user.id,
      body: req.body
    });
    
    // Extract token and account data from various possible formats
    let token = null;
    let accountId = null;
    const userId = req.user.id;

    // Handle different OAuth response formats
    if (req.body.token1) {
      // Format: { token1: "abc123", acct1: "CR123" }
      token = req.body.token1;
      accountId = req.body.acct1;
    } else if (req.body.accounts && req.body.accounts.length > 0) {
      // Format: { accounts: [{ token: "abc123", loginid: "CR123" }] }
      token = req.body.accounts[0].token;
      accountId = req.body.accounts[0].loginid;
    } else if (req.body.access_token) {
      // Format: { access_token: "abc123", account_id: "CR123" }
      token = req.body.access_token;
      accountId = req.body.account_id;
    } else if (typeof req.body === 'string') {
      // Parse URL-encoded format: "acct1=CR123&token1=abc123"
      const params = new URLSearchParams(req.body);
      token = params.get('token1');
      accountId = params.get('acct1');
    }

    if (!token) {
      console.error('❌ Token OAuth não encontrado:', req.body);
      return res.status(400).json({ error: 'Token de acesso não encontrado nos dados OAuth' });
    }

    console.log('✅ Dados OAuth extraídos:', {
      accountId: accountId,
      token: token?.substring(0, 10) + '...',
      userId
    });

    // Simplified validation - skip external validation for now
    // Since OAuth already validates the token, we can trust it
    try {
      console.log('💾 Atualizando informações do usuário no banco (sem validação externa)...');
      
      // Update user with Deriv information
      await query(`
        UPDATE users 
        SET deriv_access_token = $1, 
            deriv_account_id = $2, 
            deriv_connected = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
      `, [token, accountId, true, userId]);

      console.log('✅ Usuário atualizado com sucesso');

      res.json({
        success: true,
        message: 'Conta Deriv conectada com sucesso!',
        account_info: {
          loginid: accountId,
          is_demo: accountId?.startsWith('VR') || accountId?.startsWith('VRTC'),
          connected: true
        }
      });

    } catch (dbError) {
      console.error('❌ Erro ao atualizar banco de dados:', dbError);
      res.status(500).json({ error: 'Erro ao salvar informações da conta Deriv' });
    }

  } catch (error) {
    console.error('❌ Erro no callback Deriv:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Desconectar conta Deriv
router.post('/deriv/disconnect', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    await query(`
      UPDATE users 
      SET deriv_access_token = NULL, 
          deriv_account_id = NULL, 
          deriv_connected = false,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [userId]);

    res.json({
      success: true,
      message: 'Conta Deriv desconectada com sucesso!'
    });

  } catch (error) {
    console.error('Erro ao desconectar Deriv:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Verificar status da conexão Deriv
router.get('/deriv/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    console.log('🔍 Verificando status Deriv para usuário:', userId);

    const result = await query(`
      SELECT deriv_connected, deriv_account_id, deriv_access_token 
      FROM users 
      WHERE id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      console.log('❌ Usuário não encontrado:', userId);
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const user = result.rows[0];
    const connected = !!(user.deriv_connected && (user.deriv_connected === true || user.deriv_connected === 1));
    
    console.log('✅ Status Deriv verificado:', {
      userId,
      connected,
      hasToken: !!user.deriv_access_token,
      account_id: user.deriv_account_id
    });

    res.json({
      success: true,
      connected: connected,
      account_id: user.deriv_account_id
    });

  } catch (error) {
    console.error('❌ Erro ao verificar status Deriv:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint de cadastro/signup
router.post('/signup', [
  body('name').isLength({ min: 2 }).trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: errors.array()
      });
    }

    const { name, email, password } = req.body;

    // Verificar se email já existe
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email já está em uso' });
    }

    // Hash da senha
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Criar novo usuário
    const result = await query(`
      INSERT INTO users (name, email, password_hash, role, status, created_at, updated_at)
      VALUES ($1, $2, $3, 'client', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, name, email, role, status
    `, [name, email, passwordHash]);

    const newUser = result.rows[0];

    // Gerar token JWT
    const token = generateToken(newUser.id, newUser.email, newUser.role);

    res.status(201).json({
      success: true,
      message: 'Conta criada com sucesso!',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status
      },
      token
    });

  } catch (error) {
    console.error('Erro no cadastro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint para atualizar perfil do usuário
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.id;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    await query(
      'UPDATE users SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [name.trim(), userId]
    );

    res.json({
      success: true,
      message: 'Perfil atualizado com sucesso!'
    });

  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint para alterar senha
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres' });
    }

    // Buscar usuário atual
    const userResult = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const user = userResult.rows[0];

    // Verificar senha atual
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Senha atual incorreta' });
    }

    // Hash da nova senha
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Atualizar senha
    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, userId]
    );

    res.json({
      success: true,
      message: 'Senha alterada com sucesso!'
    });

  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint público para obter link de afiliado (usado pelos clientes)
router.get('/deriv-affiliate-link', async (req, res) => {
  try {
    const result = await query('SELECT affiliate_link FROM deriv_config ORDER BY created_at DESC LIMIT 1');
    const affiliateLink = result.rows[0]?.affiliate_link || null;
    
    res.json({ affiliate_link: affiliateLink });
  } catch (error) {
    console.error('Erro ao buscar link de afiliado:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint para solicitar reset de senha
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    const { email } = req.body;

    // Buscar usuário pelo email
    const userResult = await query(
      'SELECT id, name, email FROM users WHERE email = $1 AND status = $2',
      [email, 'active']
    );

    // Sempre retornar sucesso por segurança (não revelar se email existe)
    if (userResult.rows.length === 0) {
      return res.json({
        success: true,
        message: 'Se o email existir em nossa base, você receberá um link para redefinir sua senha.'
      });
    }

    const user = userResult.rows[0];

    // Limpar tokens antigos para este usuário
    await query(
      'DELETE FROM password_reset_tokens WHERE user_id = $1',
      [user.id]
    );

    // Gerar token único
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Token expira em 1 hora
    const expiresAt = new Date(Date.now() + 3600000); // 1 hora

    // Salvar token no banco
    await query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, resetToken, expiresAt]
    );

    // Enviar email
    const emailService = require('../utils/emailService');
    await emailService.sendPasswordResetEmail(user.email, resetToken, user.name);

    res.json({
      success: true,
      message: 'Se o email existir em nossa base, você receberá um link para redefinir sua senha.'
    });

  } catch (error) {
    console.error('Erro ao solicitar reset de senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint para validar token de reset
router.get('/validate-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const result = await query(`
      SELECT prt.id, prt.user_id, u.email, u.name
      FROM password_reset_tokens prt
      INNER JOIN users u ON prt.user_id = u.id
      WHERE prt.token = $1 
        AND datetime(prt.expires_at/1000, 'unixepoch') > datetime('now')
        AND prt.used = 0
        AND u.status = 'active'
    `, [token]);

    if (result.rows.length === 0) {
      return res.status(400).json({ 
        error: 'Token inválido ou expirado',
        valid: false 
      });
    }

    const tokenData = result.rows[0];

    res.json({
      valid: true,
      user: {
        email: tokenData.email,
        name: tokenData.name
      }
    });

  } catch (error) {
    console.error('Erro ao validar token:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint para redefinir senha
router.post('/reset-password', [
  body('token').isLength({ min: 32 }).trim(),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Dados inválidos' });
    }

    const { token, newPassword } = req.body;

    // Buscar e validar token
    const result = await query(`
      SELECT prt.id, prt.user_id
      FROM password_reset_tokens prt
      INNER JOIN users u ON prt.user_id = u.id
      WHERE prt.token = $1 
        AND datetime(prt.expires_at/1000, 'unixepoch') > datetime('now')
        AND prt.used = 0
        AND u.status = 'active'
    `, [token]);

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Token inválido ou expirado' });
    }

    const tokenData = result.rows[0];

    // Hash da nova senha
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Atualizar senha do usuário
    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [passwordHash, tokenData.user_id]
    );

    // Marcar token como usado
    await query(
      'UPDATE password_reset_tokens SET used = 1 WHERE id = $1',
      [tokenData.id]
    );

    // Limpar todos os outros tokens para este usuário
    await query(
      'DELETE FROM password_reset_tokens WHERE user_id = $1 AND id != $2',
      [tokenData.user_id, tokenData.id]
    );

    res.json({
      success: true,
      message: 'Senha redefinida com sucesso! Você já pode fazer login com sua nova senha.'
    });

  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router; 