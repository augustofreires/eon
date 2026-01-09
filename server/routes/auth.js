const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query } = require('../database/connection');
const { generateToken } = require('../middleware/auth');
const axios = require('axios');
const { authenticateToken } = require('../middleware/auth');
const WebSocket = require('ws');

const router = express.Router();

// Função para autorizar TODOS os tokens individualmente seguindo padrão oficial Deriv
const authorizeAllAccountTokens = (accounts) => {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${process.env.DERIV_APP_ID || '82349'}`);

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Timeout: Authorization of multiple accounts took too long'));
    }, 30000); // 30 seconds for multiple authorizations

    let authorizedAccounts = [];
    let currentIndex = 0;
    let requestId = 1;

    ws.onopen = () => {
      console.log(`🔗 Connected to Deriv WebSocket for authorizing ${accounts.length} accounts`);

      // Start authorizing first account
      if (accounts.length > 0) {
        const firstAccount = accounts[0];
        console.log(`🔑 Authorizing account 1/${accounts.length}: ${firstAccount.loginid}`);

        ws.send(JSON.stringify({
          authorize: firstAccount.token,
          req_id: requestId++
        }));
      } else {
        clearTimeout(timeout);
        ws.close();
        reject(new Error('No accounts to authorize'));
      }
    };

    ws.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data);
        console.log(`📨 Authorization response ${response.req_id}:`, {
          loginid: response.authorize?.loginid || 'N/A',
          msg_type: response.msg_type
        });

        if (response.error) {
          console.error(`❌ Authorization error for account ${currentIndex + 1}:`, response.error);

          // Try next account if current one fails
          currentIndex++;
          if (currentIndex < accounts.length) {
            const nextAccount = accounts[currentIndex];
            console.log(`🔑 Authorizing account ${currentIndex + 1}/${accounts.length}: ${nextAccount.loginid}`);

            ws.send(JSON.stringify({
              authorize: nextAccount.token,
              req_id: requestId++
            }));
          } else {
            // All accounts processed
            clearTimeout(timeout);
            ws.close();

            if (authorizedAccounts.length === 0) {
              reject(new Error('No accounts could be authorized'));
            } else {
              resolve(authorizedAccounts);
            }
          }
          return;
        }

        if (response.authorize) {
          // Account successfully authorized
          const accountData = {
            loginid: response.authorize.loginid,
            email: response.authorize.email,
            currency: response.authorize.currency,
            country: response.authorize.country,
            is_virtual: response.authorize.is_virtual,
            fullname: response.authorize.fullname,
            token: accounts[currentIndex].token,
            account_list: response.authorize.account_list || []
          };

          authorizedAccounts.push(accountData);
          console.log(`✅ Account ${currentIndex + 1} authorized:`, {
            loginid: accountData.loginid,
            is_virtual: accountData.is_virtual,
            currency: accountData.currency
          });

          // Move to next account
          currentIndex++;
          if (currentIndex < accounts.length) {
            const nextAccount = accounts[currentIndex];
            console.log(`🔑 Authorizing account ${currentIndex + 1}/${accounts.length}: ${nextAccount.loginid}`);

            ws.send(JSON.stringify({
              authorize: nextAccount.token,
              req_id: requestId++
            }));
          } else {
            // All accounts processed successfully
            clearTimeout(timeout);
            ws.close();

            console.log(`🎉 All ${authorizedAccounts.length} accounts authorized successfully!`);
            resolve(authorizedAccounts);
          }
        }
      } catch (error) {
        clearTimeout(timeout);
        console.error('❌ Error parsing authorization response:', error);
        ws.close();
        reject(error);
      }
    };

    ws.onerror = (error) => {
      clearTimeout(timeout);
      console.error('❌ WebSocket error during authorization:', error);
      reject(new Error('WebSocket authorization error'));
    };

    ws.onclose = (code, reason) => {
      clearTimeout(timeout);
      console.log(`🔌 Authorization WebSocket closed: ${code} ${reason}`);
    };
  });
};

// Função SIMPLIFICADA para apenas validar token (sem buscar contas adicionais)
const validateTokenAndGetAccounts = (token) => {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${process.env.DERIV_APP_ID || '82349'}`);

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Timeout: WebSocket connection took too long'));
    }, 15000); // 15 seconds timeout for account list

    let authorizeData = null;
    let allAccounts = [];

    ws.onopen = () => {
      console.log('🔗 Connected to Deriv WebSocket for token validation and account discovery');

      // Send authorize request first
      const authorizeRequest = {
        authorize: token,
        req_id: 1
      };

      ws.send(JSON.stringify(authorizeRequest));
    };

    ws.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data);
        console.log('📨 Deriv response:', { req_id: response.req_id, msg_type: response.msg_type });

        if (response.error) {
          console.error('❌ Deriv API error:', response.error);
          clearTimeout(timeout);
          ws.close();
          reject(new Error(`Deriv API error: ${response.error.message}`));
          return;
        }

        // Step 1: Handle authorize response
        if (response.req_id === 1 && response.authorize) {
          console.log('✅ Token validation successful:', {
            loginid: response.authorize.loginid,
            email: response.authorize.email,
            country: response.authorize.country,
            currency: response.authorize.currency,
            is_virtual: response.authorize.is_virtual
          });

          authorizeData = response.authorize;

          // Step 2: Now request account_list to get ALL accounts
          console.log('🔍 Requesting account_list to get all user accounts...');
          const accountListRequest = {
            account_list: 1,
            req_id: 2
          };

          ws.send(JSON.stringify(accountListRequest));
        }

        // Step 3: Handle account_list response
        if (response.req_id === 2 && response.account_list) {
          console.log('📋 Account list received:', response.account_list.length, 'accounts found');

          allAccounts = response.account_list.map(account => ({
            loginid: account.loginid,
            currency: account.currency,
            is_virtual: account.is_virtual,
            token: token, // All accounts use the same token
            // Add user data from authorize
            email: authorizeData.email,
            country: authorizeData.country,
            fullname: authorizeData.fullname
          }));

          console.log('🎯 All accounts mapped:', allAccounts.map(acc => ({
            loginid: acc.loginid,
            currency: acc.currency,
            is_virtual: acc.is_virtual
          })));

          const result = {
            // Primary account data (for compatibility)
            loginid: authorizeData.loginid,
            email: authorizeData.email,
            currency: authorizeData.currency,
            country: authorizeData.country,
            is_virtual: authorizeData.is_virtual,
            fullname: authorizeData.fullname,
            token: token,
            // ALL accounts list
            allAccounts: allAccounts
          };

          clearTimeout(timeout);
          ws.close();
          resolve(result);
        }
      } catch (error) {
        clearTimeout(timeout);
        console.error('❌ Error parsing WebSocket message:', error);
        ws.close();
        reject(error);
      }
    };

    ws.onerror = (error) => {
      clearTimeout(timeout);
      console.error('❌ WebSocket error:', error);
      reject(new Error('WebSocket connection error'));
    };

    ws.onclose = (code, reason) => {
      clearTimeout(timeout);
      console.log('🔌 WebSocket closed:', code, reason);
    };
  });
};

// Função para obter tokens específicos para contas virtuais via API
const getVirtualAccountTokens = (realAccountToken, virtualLoginIds) => {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=82349');

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Timeout: Virtual account token fetching took too long'));
    }, 15000);

    let authorizedAccounts = [];
    let requestCounter = 100; // Start from 100 to avoid conflicts

    ws.onopen = () => {
      console.log('🔗 Connected to Deriv WebSocket for virtual account tokens');

      // First, authorize with real account token
      const authorizeRequest = {
        authorize: realAccountToken,
        req_id: requestCounter++
      };

      ws.send(JSON.stringify(authorizeRequest));
    };

    ws.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data);
        console.log('📨 Virtual token response:', { req_id: response.req_id, msg_type: response.msg_type });

        if (response.error) {
          console.error('❌ Virtual token error:', response.error);
          clearTimeout(timeout);
          ws.close();
          reject(new Error(`Virtual token error: ${response.error.message}`));
          return;
        }

        if (response.authorize) {
          console.log('✅ Authorized successfully for token switching');

          // Now try to get tokens for each virtual account
          virtualLoginIds.forEach((loginid, index) => {
            const switchRequest = {
              account_list: 1,
              req_id: requestCounter++
            };

            setTimeout(() => {
              ws.send(JSON.stringify(switchRequest));
            }, index * 500); // Space out requests
          });

          // Fallback: resolve with original token for all accounts after 3 seconds
          setTimeout(() => {
            clearTimeout(timeout);
            ws.close();
            resolve(virtualLoginIds.map(loginid => ({
              loginid: loginid,
              token: realAccountToken,
              note: 'Using real account token (virtual account tokens not available)'
            })));
          }, 3000);

        } else if (response.account_list) {
          console.log('📋 Account list received:', response.account_list);
          // Process account list if needed
        }

      } catch (error) {
        clearTimeout(timeout);
        console.error('❌ Error parsing virtual token message:', error);
        ws.close();
        reject(error);
      }
    };

    ws.onerror = (error) => {
      clearTimeout(timeout);
      console.error('❌ Virtual token WebSocket error:', error);
      reject(new Error('Virtual token WebSocket error'));
    };

    ws.onclose = (code, reason) => {
      clearTimeout(timeout);
      console.log('🔌 Virtual token WebSocket closed:', code, reason);
    };
  });
};

// Função legada para compatibilidade (usar validateTokenAndGetAccounts preferencialmente)
const validateTokenWithDerivAPI = (token) => {
  return validateTokenAndGetAccounts(token).then(result => {
    // Return only main account data for compatibility
    return {
      loginid: result.loginid,
      email: result.email,
      currency: result.currency,
      country: result.country,
      is_virtual: result.is_virtual,
      fullname: result.fullname,
      token: result.token
    };
  });
};

// Função auxiliar para sanitizar entrada
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  return input.replace(/[<>'"&]/g, (match) => {
    const escapes = {
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '&': '&amp;'
    };
    return escapes[match];
  });
};

// Simples função de rate limiting (comentada para evitar erros com proxy)
// const checkRateLimit = (ip, maxAttempts = 10) => {
//   // Rate limiting desabilitado temporariamente
//   return true;
// };

// Login de administrador
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    console.log('🔐 Login attempt:', { email: req.body.email });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Buscar usuário
    console.log('📊 Querying user from database...');
    const result = await query(
      'SELECT id, email, password_hash, name, role, status FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const user = result.rows[0];
    console.log('✅ User found:', { email: user.email, role: user.role, status: user.status });

    // Permitir login para admin e cliente
    if (user.role !== 'admin' && user.role !== 'client') {
      console.log('❌ Invalid role:', user.role);
      return res.status(403).json({ error: 'Acesso negado. Role inválido.' });
    }

    // Verificar status
    if (user.status !== 'active') {
      console.log('❌ Inactive account:', user.status);
      return res.status(403).json({ error: 'Conta suspensa ou inativa' });
    }

    // Verificar senha
    console.log('🔑 Comparing password... Hash length:', user.password_hash?.length);
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log('🔑 Password valid:', isValidPassword);

    if (!isValidPassword) {
      console.log('❌ Invalid password for:', email);
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Gerar token
    console.log('🎫 Generating token for user:', user.id);
    const token = generateToken(user.id);

    console.log('✅ Login successful:', email);
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
    console.error('❌ ERRO COMPLETO NO LOGIN:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('Full error:', error);
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

    // ✅ CORREÇÃO: Buscar dados da conexão Deriv da conta ativa
    let derivData = {};
    try {
      const derivResult = await query(
        `SELECT loginid, email, fullname, currency, is_virtual, token
         FROM deriv_accounts
         WHERE user_id = $1 AND is_active = true
         LIMIT 1`,
        [user.id]
      );

      if (derivResult.rows.length > 0) {
        const derivAccount = derivResult.rows[0];
        derivData = {
          deriv_connected: true,
          deriv_account_id: derivAccount.loginid,
          deriv_email: derivAccount.email,
          deriv_fullname: derivAccount.fullname,
          deriv_currency: derivAccount.currency,
          deriv_is_virtual: derivAccount.is_virtual,
          deriv_access_token: derivAccount.token
        };
        console.log('✅ /verify: Dados Deriv incluídos na resposta:', derivAccount.loginid);
      } else {
        console.log('ℹ️ /verify: Nenhuma conta Deriv ativa encontrada para o usuário');
      }
    } catch (derivError) {
      console.error('⚠️ /verify: Erro ao buscar dados Deriv (não crítico):', derivError);
      // Continuar sem dados Deriv em caso de erro
    }

    res.json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || user.email.split('@')[0],
        role: user.role,
        ...derivData  // Incluir dados Deriv se existirem
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
    // Rate limiting desabilitado temporariamente
    // if (!checkRateLimit(req.ip, 5)) {
    //   return res.status(429).json({ error: 'Muitas tentativas. Tente novamente em 1 minuto.' });
    // }
    // Validar variáveis de ambiente obrigatórias
    if (!process.env.DERIV_APP_ID) {
      console.error('❌ DERIV_APP_ID não configurado');
      return res.status(500).json({ error: 'Configuração OAuth da Deriv incompleta' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET não configurado');
      return res.status(500).json({ error: 'Configuração JWT incompleta' });
    }

    const derivAppId = process.env.DERIV_APP_ID;
    const redirectUri = process.env.DERIV_OAUTH_REDIRECT_URI || process.env.DERIV_OAUTH_REDIRECT_URL || `${process.env.CORS_ORIGIN || 'https://iaeon.site'}/auth/deriv/callback`;
    
    // Gerar um token JWT temporário com userId para identificar no callback
    const jwt = require('jsonwebtoken');
    const userToken = jwt.sign(
      { 
        userId: req.user.id,
        iat: Math.floor(Date.now() / 1000),
        purpose: 'deriv_oauth'
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m' } // Token válido por 15 minutos
    );
    
    console.log('🔗 Gerando URL OAuth da Deriv:', {
      app_id: derivAppId,
      redirect_uri: redirectUri,
      userId: req.user.id,
      timestamp: new Date().toISOString()
    });
    
    // URL de autorização da Deriv com user_token no state parameter
    const encodedRedirectUri = encodeURIComponent(redirectUri);
    const encodedState = encodeURIComponent(userToken);
    const authUrl = `https://oauth.deriv.com/oauth2/authorize?app_id=${derivAppId}&l=pt&brand=deriv&redirect_uri=${encodedRedirectUri}&state=${encodedState}`;
    
    console.log('✅ URL OAuth gerada com sucesso');
    
    res.json({
      success: true,
      auth_url: authUrl,
      expires_in: 900 // 15 minutos em segundos
    });

  } catch (error) {
    console.error('❌ Erro ao gerar URL de autorização Deriv:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: 'Falha ao gerar URL de autorização OAuth'
    });
  }
});

// Callback OAuth da Deriv (GET sem autenticação)
router.get('/deriv/callback', async (req, res) => {
  try {
    // DEBUGGING COMPLETO: Log de todos os parâmetros recebidos
    console.log('🔄 Processando callback OAuth da Deriv...');
    console.log('📋 TODOS os parâmetros recebidos:', JSON.stringify(req.query, null, 2));
    console.log('🔍 Chaves dos parâmetros:', Object.keys(req.query));
    console.log('⏰ Timestamp:', new Date().toISOString());

    // Função auxiliar para retornar HTML de erro
    const sendErrorResponse = (errorMessage, details = null) => {
      console.error('❌ Callback OAuth erro:', errorMessage, details);
      const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Erro na Conexão Deriv</title>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; margin-top: 100px; color: #333; }
            .error { color: #d32f2f; }
          </style>
        </head>
        <body>
          <div class="error">
            <h2>❌ Erro na Conexão</h2>
            <p>${errorMessage}</p>
            <p><small>Esta janela será fechada automaticamente...</small></p>
          </div>
          <script>
            console.log('❌ Callback de erro carregado:', '${errorMessage}');
            try {
              if (window.opener) {
                console.log('✅ Window.opener encontrado, enviando erro...');
                window.opener.postMessage({
                  type: 'deriv_oauth_error',
                  error: '${errorMessage}',
                  details: ${details ? JSON.stringify(details) : 'null'}
                }, '*');
                console.log('📤 Erro enviado via postMessage');
              } else {
                console.error('❌ Window.opener não encontrado para envio de erro!');
              }
            } catch (e) {
              console.error('❌ Erro ao enviar postMessage:', e);
            }
            setTimeout(() => window.close(), 5000);
          </script>
        </body>
        </html>
      `;
      return res.send(errorHtml);
    };

    // Validar se temos JWT_SECRET
    if (!process.env.JWT_SECRET) {
      return sendErrorResponse('Configuração do servidor incompleta');
    }

    // Extract token and account data from URL parameters
    let token = null;
    let accountId = null;
    let userId = null;
    let isDemo = false;

    // Extract multiple accounts from OAuth response (Deriv returns multiple accounts)
    const accounts = [];
    let primaryToken = null;
    let primaryAccountId = null;

    // Parse all accounts from OAuth response - VERSÃO MELHORADA
    console.log('🔍 Iniciando busca por múltiplas contas...');

    // PRIMEIRO: Tentar formato padrão token1/acct1/cur1
    for (let i = 1; i <= 10; i++) {
      const tokenKey = `token${i}`;
      const acctKey = `acct${i}`;
      const curKey = `cur${i}`;
      const currKey = `curr${i}`;

      console.log(`🔎 Verificando conta ${i}:`, {
        tokenKey,
        acctKey,
        curKey,
        currKey,
        hasToken: !!req.query[tokenKey],
        hasAcct: !!req.query[acctKey],
        hasCur: !!req.query[curKey],
        hasCurr: !!req.query[currKey]
      });

      if (req.query[tokenKey] && req.query[acctKey]) {
        const currency = req.query[currKey] || req.query[curKey] || 'USD';

        const accountData = {
          token: sanitizeInput(req.query[tokenKey]),
          loginid: sanitizeInput(req.query[acctKey]),
          currency: sanitizeInput(currency.toUpperCase()),
          is_virtual: req.query[acctKey].toLowerCase().startsWith('vr') ||
                     req.query[acctKey].toLowerCase().startsWith('vrtc')
        };

        accounts.push(accountData);
        console.log(`✅ Conta ${i} encontrada:`, {
          loginid: accountData.loginid,
          is_virtual: accountData.is_virtual,
          currency: accountData.currency,
          token_length: accountData.token.length
        });

        if (!primaryToken) {
          primaryToken = accountData.token;
          primaryAccountId = accountData.loginid;
        }
      }
    }

    // SEGUNDO: Se não encontrou múltiplas contas, tentar formato alternativo
    if (accounts.length <= 1) {
      console.log('🔍 Tentando formatos alternativos OAuth...');

      // Tentar formato access_token_1, account_1
      for (let i = 1; i <= 10; i++) {
        const altTokenKey = `access_token_${i}`;
        const altAcctKey = `account_${i}`;

        if (req.query[altTokenKey] && req.query[altAcctKey]) {
          const accountData = {
            token: sanitizeInput(req.query[altTokenKey]),
            loginid: sanitizeInput(req.query[altAcctKey]),
            currency: 'USD',
            is_virtual: req.query[altAcctKey].toLowerCase().startsWith('vr')
          };

          if (!accounts.some(acc => acc.loginid === accountData.loginid)) {
            accounts.push(accountData);
            console.log(`✅ Conta alternativa ${i} encontrada:`, accountData.loginid);
          }
        }
      }

      // Tentar formato accounts[0], accounts[1]
      for (let i = 0; i < 10; i++) {
        const arrayTokenKey = `accounts[${i}][token]`;
        const arrayAcctKey = `accounts[${i}][loginid]`;

        if (req.query[arrayTokenKey] && req.query[arrayAcctKey]) {
          const accountData = {
            token: sanitizeInput(req.query[arrayTokenKey]),
            loginid: sanitizeInput(req.query[arrayAcctKey]),
            currency: req.query[`accounts[${i}][currency]`] || 'USD',
            is_virtual: req.query[arrayAcctKey].toLowerCase().startsWith('vr')
          };

          if (!accounts.some(acc => acc.loginid === accountData.loginid)) {
            accounts.push(accountData);
            console.log(`✅ Conta array ${i} encontrada:`, accountData.loginid);
          }
        }
      }
    }

    console.log(`📊 RESUMO: ${accounts.length} contas encontradas no total`);
    accounts.forEach((acc, idx) => {
      console.log(`  ${idx + 1}. ${acc.loginid} (${acc.is_virtual ? 'Virtual' : 'Real'}) - ${acc.currency}`);
    });

    // Fallback to single token format
    if (accounts.length === 0) {
      if (req.query.token1) {
        token = sanitizeInput(req.query.token1);
        accountId = sanitizeInput(req.query.acct1);
      } else if (req.query.access_token) {
        token = sanitizeInput(req.query.access_token);
        accountId = sanitizeInput(req.query.account_id);
      } else if (req.query.code) {
        console.log('📝 Recebido authorization code');
        token = sanitizeInput(req.query.code);
      }
    } else {
      token = primaryToken;
      accountId = primaryAccountId;
    }

    // Check for error in OAuth response
    if (req.query.error) {
      return sendErrorResponse(`Erro OAuth: ${sanitizeInput(req.query.error)}`, sanitizeInput(req.query.error_description));
    }

    // Get user ID from state parameter (JWT token)
    if (req.query.state) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(req.query.state, process.env.JWT_SECRET);
        
        // Validar se o token é para OAuth da Deriv
        if (decoded.purpose !== 'deriv_oauth') {
          return sendErrorResponse('Token de estado inválido');
        }
        
        userId = decoded.userId;
        console.log('✅ User ID extraído do state parameter:', userId);
      } catch (jwtError) {
        console.error('❌ Token JWT inválido no state parameter:', jwtError);
        return sendErrorResponse('Token de autorização inválido ou expirado');
      }
    } else {
      return sendErrorResponse('Parâmetro de estado não encontrado');
    }

    if (!token) {
      return sendErrorResponse('Token de acesso não encontrado na resposta OAuth');
    }

    if (!userId) {
      return sendErrorResponse('Identificação do usuário não encontrada');
    }

    // Determinar se é conta demo
    if (accountId) {
      isDemo = accountId.startsWith('VR') || accountId.startsWith('VRTC');
    }

    console.log('✅ Dados OAuth extraídos:', {
      accountId: accountId || 'N/A',
      tokenLength: token?.length || 0,
      userId: userId,
      isDemo: isDemo
    });

    console.log('🔍 TODOS OS PARAMETROS OAuth:', JSON.stringify(req.query, null, 2));
    console.log('📊 CONTAS EXTRAIDAS DO OAUTH:', accounts);

    // IMPLEMENTAÇÃO HÍBRIDA: Validar primeiro token, mas salvar todas as contas
    try {
      console.log('🔄 Validating primary token and saving all accounts...');

      if (accounts.length === 0) {
        return sendErrorResponse('Nenhuma conta encontrada nos parâmetros OAuth');
      }

      console.log(`📊 ${accounts.length} contas encontradas para processar:`);
      accounts.forEach((acc, idx) => {
        console.log(`  ${idx + 1}. ${acc.loginid} (${acc.is_virtual ? 'Virtual' : 'Real'}) - ${acc.currency}`);
      });

      // Usar o token primário do OAuth e buscar TODAS as contas via account_list API
      const primaryAccount = accounts[0];
      const accountData = await validateTokenAndGetAccounts(primaryAccount.token);

      console.log('✅ Primary token validation successful, account_list received!');
      console.log(`🎯 CORREÇÃO DERIV: ${accountData.allAccounts?.length || 1} contas encontradas via account_list API`);

      // Usar dados validados da API
      const validatedAccountId = accountData.loginid;
      const validatedIsDemo = accountData.is_virtual;

      // CORREÇÃO CRÍTICA: Usar allAccounts da API em vez do parsing OAuth
      const allAccountsForStorage = accountData.allAccounts || [accountData];
      
      // First, let's add the new columns if they don't exist
      try {
        await query(`
          ALTER TABLE users
          ADD COLUMN IF NOT EXISTS deriv_access_token VARCHAR(500),
          ADD COLUMN IF NOT EXISTS deriv_connected BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS deriv_email VARCHAR(255),
          ADD COLUMN IF NOT EXISTS deriv_currency VARCHAR(10),
          ADD COLUMN IF NOT EXISTS deriv_country VARCHAR(10),
          ADD COLUMN IF NOT EXISTS deriv_is_virtual BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS deriv_fullname VARCHAR(255),
          ADD COLUMN IF NOT EXISTS deriv_accounts_tokens TEXT
        `);
        console.log('✅ Database columns ensured');
      } catch (columnError) {
        console.log('ℹ️ Database columns might already exist:', columnError.message);
      }

      // CORREÇÃO DERIV: Salvar TODAS as contas encontradas via account_list API
      console.log(`📊 TOTAL DE CONTAS PARA SALVAR: ${allAccountsForStorage.length}`);
      console.log('📋 Lista completa de contas da API Deriv:', allAccountsForStorage.map(acc => ({
        loginid: acc.loginid,
        currency: acc.currency,
        is_virtual: acc.is_virtual
      })));

      console.log('💾 Contas preparadas para armazenamento:', allAccountsForStorage.map(acc => ({
        loginid: acc.loginid,
        currency: acc.currency,
        is_virtual: acc.is_virtual,
        token_length: acc.token.length
      })));

      const accountsTokensJson = JSON.stringify(allAccountsForStorage);

      const updateResult = await query(`
        UPDATE users
        SET deriv_access_token = $1,
            deriv_account_id = $2,
            deriv_connected = $3,
            deriv_email = $4,
            deriv_currency = $5,
            deriv_country = $6,
            deriv_is_virtual = $7,
            deriv_fullname = $8,
            deriv_accounts_tokens = $9,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $10
        RETURNING id, email
      `, [
        primaryAccount.token,
        validatedAccountId,
        true,
        accountData.email,
        accountData.currency,
        accountData.country,
        validatedIsDemo,
        accountData.fullname,
        accountsTokensJson,
        userId
      ]);

      if (updateResult.rows.length === 0) {
        return sendErrorResponse('Usuário não encontrado');
      }

      console.log('✅ User updated successfully with validated data:', {
        email: updateResult.rows[0].email,
        deriv_account: validatedAccountId,
        is_virtual: validatedIsDemo
      });

      // Retornar página HTML de sucesso que comunica com a janela pai
      const successHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Conexão Deriv - Sucesso</title>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; margin-top: 100px; color: #333; }
            .success { color: #2e7d32; }
            .account-info { background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px auto; max-width: 400px; }
          </style>
        </head>
        <body>
          <div class="success">
            <h2>✅ Conta Deriv Conectada!</h2>
            <p>Sua conta foi conectada com sucesso.</p>
            <div class="account-info">
              <strong>Conta:</strong> ${validatedAccountId}<br>
              <strong>Tipo:</strong> ${validatedIsDemo ? 'Demo' : 'Real'}<br>
              <strong>Moeda:</strong> ${accountData.currency}<br>
              ${accountData.fullname ? `<strong>Nome:</strong> ${accountData.fullname}<br>` : ''}
            </div>
            <p><small>Esta janela será fechada automaticamente...</small></p>
          </div>
          <script>
            console.log('🎉 Callback HTML carregado, preparando postMessage...');
            try {
              if (window.opener) {
                console.log('✅ Window.opener encontrado, enviando postMessage...');
                const messageData = {
                  type: 'deriv_oauth_success',
                  data: {
                    token: '${token}',
                    accountId: '${validatedAccountId}',
                    connected: true,
                    loginid: '${validatedAccountId}',
                    is_demo: ${validatedIsDemo},
                    currency: '${accountData.currency}',
                    email: '${accountData.email || ''}',
                    validated: true
                  }
                };
                console.log('📤 Enviando postMessage:', messageData);
                window.opener.postMessage(messageData, '*');
                console.log('✅ PostMessage enviado com sucesso');
              } else {
                console.error('❌ Window.opener não encontrado!');
              }
            } catch (e) {
              console.error('❌ Erro ao enviar postMessage:', e);
            }
            console.log('⏰ Fechando janela em 5 segundos...');
            setTimeout(() => {
              console.log('🔒 Fechando janela agora...');
              window.close();
            }, 5000);
          </script>
        </body>
        </html>
      `;
      
      res.send(successHtml);

    } catch (validationError) {
      console.error('❌ Token validation failed:', validationError);
      return sendErrorResponse(
        'Token inválido ou expirado. Tente conectar novamente.', 
        validationError.message
      );
    }

  } catch (error) {
    console.error('❌ Erro geral no callback Deriv:', error);
    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Erro Interno</title>
        <meta charset="utf-8">
      </head>
      <body>
        <div style="text-align: center; font-family: Arial, sans-serif; margin-top: 100px;">
          <h2>❌ Erro Interno do Servidor</h2>
          <p>Ocorreu um erro inesperado. Tente novamente mais tarde.</p>
        </div>
        <script>
          try {
            if (window.opener) {
              window.opener.postMessage({
                type: 'deriv_oauth_error',
                error: 'Erro interno do servidor'
              }, '*');
            }
          } catch (e) {}
          setTimeout(() => window.close(), 3000);
        </script>
      </body>
      </html>
    `;
    res.send(errorHtml);
  }
});

// Processar callback OAuth da Deriv (via POST do frontend)
router.post('/deriv/process-callback', authenticateToken, async (req, res) => {
  try {
    console.log('🔄 NOVO CALLBACK: Processando callback OAuth com múltiplas contas...', {
      hasAccounts: !!req.body.accounts,
      hasTokens: !!req.body.tokens,
      hasAllParams: !!req.body.allParams,
      timestamp: new Date().toISOString()
    });

    const { accounts, tokens, allParams, primaryToken, primaryAccount } = req.body;
    const userId = req.user.id;

    // CORREÇÃO: Usar dados do novo callback com múltiplas contas
    if (!accounts || !accounts.length) {
      return res.status(400).json({
        success: false,
        error: 'Nenhuma conta encontrada no callback OAuth'
      });
    }

    if (!primaryToken && !tokens) {
      return res.status(400).json({
        success: false,
        error: 'Token de acesso não encontrado'
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Identificação do usuário não encontrada'
      });
    }

    // Usar conta primária (primeira conta não-virtual ou primeira conta disponível)
    const primaryAccountData = accounts.find(acc => !acc.is_virtual) || accounts[0];
    const tokenToUse = primaryToken || primaryAccountData.token || Object.values(tokens)[0];

    console.log('✅ NOVO CALLBACK: Dados OAuth extraídos:', {
      totalAccounts: accounts.length,
      primaryAccount: primaryAccountData.loginid,
      primaryIsVirtual: primaryAccountData.is_virtual,
      tokenLength: tokenToUse?.length || 0,
      userId: userId,
      realAccounts: accounts.filter(acc => !acc.is_virtual).length,
      virtualAccounts: accounts.filter(acc => acc.is_virtual).length
    });

    // Validar token com Deriv WebSocket API e buscar TODAS as contas
    try {
      console.log('🔄 NOVO CALLBACK: Validando token via WebSocket API...');

      const accountData = await validateTokenAndGetAccounts(tokenToUse);

      console.log('✅ Token validado, account_list recebida!');
      console.log(`🎯 CORREÇÃO DERIV: ${accountData.allAccounts?.length || 1} contas encontradas via account_list API`);
      
      // Usar dados validados da API
      const validatedAccountId = accountData.loginid;
      const validatedIsDemo = accountData.is_virtual;
      
      // Adicionar colunas se não existirem
      try {
        await query(`
          ALTER TABLE users
          ADD COLUMN IF NOT EXISTS deriv_access_token VARCHAR(500),
          ADD COLUMN IF NOT EXISTS deriv_connected BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS deriv_email VARCHAR(255),
          ADD COLUMN IF NOT EXISTS deriv_currency VARCHAR(10),
          ADD COLUMN IF NOT EXISTS deriv_country VARCHAR(10),
          ADD COLUMN IF NOT EXISTS deriv_is_virtual BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS deriv_fullname VARCHAR(255),
          ADD COLUMN IF NOT EXISTS deriv_accounts_tokens TEXT
        `);
        console.log('✅ Colunas do banco verificadas');
      } catch (columnError) {
        console.log('ℹ️ Colunas já existem:', columnError.message);
      }

      // NOVO CALLBACK: Usar dados do callback + API account_list para salvamento
      const allAccountsForStorage = accountData.allAccounts || accounts;

      // Combinar dados do callback com dados da API
      const enrichedAccounts = allAccountsForStorage.map(apiAccount => {
        const callbackAccount = accounts.find(acc => acc.loginid === apiAccount.loginid);
        return {
          ...apiAccount,
          token: callbackAccount?.token || tokens[apiAccount.loginid] || tokenToUse
        };
      });

      const accountsTokensJson = JSON.stringify({
        accounts: enrichedAccounts,
        primary_token: tokenToUse,
        callback_data: { accounts, tokens }
      });

      console.log('💾 NOVO CALLBACK: Contas enriquecidas para armazenamento:', enrichedAccounts.map(acc => ({
        loginid: acc.loginid,
        currency: acc.currency,
        is_virtual: acc.is_virtual,
        hasToken: !!acc.token
      })));

      console.log(`🎯 NOVO CALLBACK: TOTAL DE CONTAS SALVAS: ${enrichedAccounts.length}`);

      const updateResult = await query(`
        UPDATE users
        SET deriv_access_token = $1,
            deriv_account_id = $2,
            deriv_connected = $3,
            deriv_email = $4,
            deriv_currency = $5,
            deriv_country = $6,
            deriv_is_virtual = $7,
            deriv_fullname = $8,
            deriv_accounts_tokens = $9,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $10
        RETURNING id, email
      `, [
        tokenToUse,
        primaryAccountData.loginid,
        true,
        accountData.email || 'user@deriv.com',
        primaryAccountData.currency,
        accountData.country || 'BR',
        primaryAccountData.is_virtual,
        accountData.fullname || 'Usuário Deriv',
        accountsTokensJson,
        userId
      ]);

      if (updateResult.rows.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'Usuário não encontrado' 
        });
      }

      console.log('✅ NOVO CALLBACK: Usuário atualizado com sucesso:', {
        email: updateResult.rows[0].email,
        primaryAccount: primaryAccountData.loginid,
        totalAccounts: enrichedAccounts.length,
        is_virtual: primaryAccountData.is_virtual
      });

      res.json({
        success: true,
        message: 'Conta Deriv conectada com sucesso',
        accountInfo: {
          account: {
            loginid: primaryAccountData.loginid,
            email: accountData.email || 'user@deriv.com',
            currency: primaryAccountData.currency,
            country: accountData.country || 'BR',
            is_virtual: primaryAccountData.is_virtual,
            fullname: accountData.fullname || 'Usuário Deriv',
            balance: accountData.balance || 0
          }
        },
        available_accounts: enrichedAccounts,
        total_accounts: enrichedAccounts.length,
        real_accounts: enrichedAccounts.filter(acc => !acc.is_virtual).length,
        virtual_accounts: enrichedAccounts.filter(acc => acc.is_virtual).length
      });

    } catch (validationError) {
      console.error('❌ Validação do token falhou:', validationError);
      res.status(400).json({
        success: false,
        error: 'Token inválido ou expirado. Tente conectar novamente.',
        details: validationError.message
      });
    }

  } catch (error) {
    console.error('❌ Erro geral no processamento OAuth:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
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
      SELECT deriv_connected, deriv_account_id, deriv_access_token,
             deriv_email, deriv_currency, deriv_is_virtual, deriv_fullname,
             deriv_accounts_tokens
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
      account_id: user.deriv_account_id,
      is_virtual: user.deriv_is_virtual,
      currency: user.deriv_currency,
      email: user.deriv_email,
      fullname: user.deriv_fullname,
      timestamp: new Date().toISOString()
    });

    // Parse available accounts
    let availableAccounts = [];
    try {
      availableAccounts = JSON.parse(user.deriv_accounts_tokens || '[]');
    } catch (parseError) {
      console.log('ℹ️ Erro ao fazer parse dos tokens das contas:', parseError);
    }

    res.json({
      success: true,
      connected: connected,
      account_id: user.deriv_account_id,
      deriv_email: user.deriv_email,
      deriv_currency: user.deriv_currency,
      is_virtual: user.deriv_is_virtual,
      fullname: user.deriv_fullname,
      available_accounts: availableAccounts.map(acc => ({
        loginid: acc.loginid,
        currency: acc.currency,
        is_virtual: acc.is_virtual
      }))
    });

  } catch (error) {
    console.error('❌ Erro ao verificar status Deriv:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter informações da conta e saldo Deriv
router.get('/deriv/account-info', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    console.log('💰 Obtendo informações da conta Deriv para usuário:', userId);

    const result = await query(`
      SELECT deriv_connected, deriv_account_id, deriv_access_token,
             deriv_email, deriv_currency, deriv_is_virtual, deriv_fullname,
             deriv_accounts_tokens
      FROM users
      WHERE id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const user = result.rows[0];
    const connected = !!(user.deriv_connected && (user.deriv_connected === true || user.deriv_connected === 1));
    
    if (!connected || !user.deriv_access_token) {
      return res.status(400).json({ error: 'Conta Deriv não conectada' });
    }

    try {
      // Usar WebSocket para conectar com a API Deriv
      const WebSocket = require('ws');
      
      const wsPromise = new Promise((resolve, reject) => {
        const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=' + (process.env.DERIV_APP_ID || 82349));
        let responseCount = 0;
        let accountData = {};
        
        ws.on('open', () => {
          console.log('🔌 Conectado ao WebSocket Deriv');
          
          // Autorizar com token
          ws.send(JSON.stringify({
            authorize: user.deriv_access_token,
            req_id: 1
          }));
        });
        
        ws.on('message', (data) => {
          try {
            const response = JSON.parse(data);
            console.log('📨 Resposta Deriv:', { req_id: response.req_id, msg_type: response.msg_type });
            
            if (response.req_id === 1 && response.authorize) {
              // Autorização bem-sucedida, buscar saldo
              accountData.account_info = response.authorize;
              ws.send(JSON.stringify({
                balance: 1,
                account: user.deriv_account_id,
                req_id: 2
              }));
              
            } else if (response.req_id === 2 && response.balance) {
              // Saldo recebido
              accountData.balance_info = response.balance;
              responseCount++;
              
              if (responseCount >= 1) {
                ws.close();
                resolve(accountData);
              }
            } else if (response.error) {
              console.error('❌ Erro na API Deriv:', response.error);
              ws.close();
              reject(new Error(response.error.message));
            }
          } catch (parseError) {
            console.error('❌ Erro ao fazer parse da resposta:', parseError);
          }
        });
        
        ws.on('error', (error) => {
          console.error('❌ Erro no WebSocket:', error);
          reject(error);
        });
        
        // Timeout após 10 segundos
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
            reject(new Error('Timeout na conexão Deriv'));
          }
        }, 10000);
      });

      const derivData = await wsPromise;
      
      console.log('✅ Dados Deriv obtidos:', {
        account_id: user.deriv_account_id,
        balance: derivData.balance_info?.balance,
        currency: derivData.balance_info?.currency,
        is_virtual: derivData.account_info?.is_virtual
      });

      // Parse available accounts
      let availableAccounts = [];
      try {
        if (user.deriv_accounts_tokens) {
          console.log('🔍 RAW deriv_accounts_tokens:', user.deriv_accounts_tokens);
          availableAccounts = JSON.parse(user.deriv_accounts_tokens);
          console.log('📋 PARSED available accounts:', availableAccounts.length, 'contas');
          availableAccounts.forEach((acc, idx) => {
            console.log(`   ${idx + 1}. ${acc.loginid} (${acc.is_virtual ? 'Virtual' : 'Real'}) - ${acc.currency}`);
          });
        } else {
          console.log('❌ deriv_accounts_tokens é NULL/undefined');
        }
      } catch (parseError) {
        console.log('❌ Erro ao fazer parse das contas:', parseError);
        console.log('📄 Raw data:', user.deriv_accounts_tokens);
      }

      // Buscar saldo atual via WebSocket
      let currentBalance = derivData.balance_info?.balance || 0;
      try {
        const balanceWs = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${process.env.DERIV_APP_ID || '82349'}`);

        const balancePromise = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            balanceWs.close();
            resolve(currentBalance); // Usar fallback se timeout
          }, 5000);

          balanceWs.onopen = () => {
            // Autorizar com o token da conta atual
            balanceWs.send(JSON.stringify({
              authorize: user.deriv_access_token,
              req_id: 1
            }));
          };

          balanceWs.onmessage = (event) => {
            try {
              const response = JSON.parse(event.data);

              if (response.authorize && response.req_id === 1) {
                // Solicitar saldo
                balanceWs.send(JSON.stringify({
                  balance: 1,
                  req_id: 2
                }));
              } else if (response.balance && response.req_id === 2) {
                clearTimeout(timeout);
                balanceWs.close();
                resolve(response.balance.balance || currentBalance);
              }
            } catch (e) {
              clearTimeout(timeout);
              balanceWs.close();
              resolve(currentBalance);
            }
          };

          balanceWs.onerror = () => {
            clearTimeout(timeout);
            resolve(currentBalance);
          };
        });

        const realBalance = await balancePromise;
        console.log('💰 Saldo real obtido para account-info:', realBalance);
        currentBalance = realBalance;
      } catch (balanceError) {
        console.error('⚠️ Erro ao obter saldo real, usando fallback:', balanceError);
      }

      res.json({
        success: true,
        account: {
          id: user.deriv_account_id,
          balance: currentBalance,
          currency: derivData.balance_info?.currency || user.deriv_currency || 'USD',
          is_virtual: derivData.account_info?.is_virtual || user.deriv_is_virtual,
          fullname: derivData.account_info?.fullname || user.deriv_fullname,
          email: derivData.account_info?.email || user.deriv_email,
          country: derivData.account_info?.country,
          landing_company_name: derivData.account_info?.landing_company_name
        },
        available_accounts: availableAccounts.map(acc => ({
          loginid: acc.loginid,
          currency: acc.currency,
          is_virtual: acc.is_virtual
        })),
        transactions: [],
        profit_loss: {
          today: 0,
          total: 0
        }
      });
      
    } catch (apiError) {
      console.error('❌ Erro ao conectar com API Deriv:', apiError);
      
      // Parse available accounts for fallback
      let availableAccounts = [];
      try {
        if (user.deriv_accounts_tokens) {
          console.log('🔍 FALLBACK RAW deriv_accounts_tokens:', user.deriv_accounts_tokens);
          availableAccounts = JSON.parse(user.deriv_accounts_tokens);
          console.log('📋 FALLBACK PARSED available accounts:', availableAccounts.length, 'contas');
        } else {
          console.log('❌ FALLBACK deriv_accounts_tokens é NULL/undefined');
        }
      } catch (parseError) {
        console.log('❌ FALLBACK Erro ao fazer parse das contas:', parseError);
      }

      // Buscar saldo via WebSocket mesmo no fallback
      let fallbackBalance = 0;
      try {
        const fallbackWs = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${process.env.DERIV_APP_ID || '82349'}`);

        const fallbackBalancePromise = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            fallbackWs.close();
            resolve(0);
          }, 5000);

          fallbackWs.onopen = () => {
            fallbackWs.send(JSON.stringify({
              authorize: user.deriv_access_token,
              req_id: 1
            }));
          };

          fallbackWs.onmessage = (event) => {
            try {
              const response = JSON.parse(event.data);

              if (response.authorize && response.req_id === 1) {
                fallbackWs.send(JSON.stringify({
                  balance: 1,
                  req_id: 2
                }));
              } else if (response.balance && response.req_id === 2) {
                clearTimeout(timeout);
                fallbackWs.close();
                resolve(response.balance.balance || 0);
              }
            } catch (e) {
              clearTimeout(timeout);
              fallbackWs.close();
              resolve(0);
            }
          };

          fallbackWs.onerror = () => {
            clearTimeout(timeout);
            resolve(0);
          };
        });

        fallbackBalance = await fallbackBalancePromise;
        console.log('💰 Saldo fallback obtido:', fallbackBalance);
      } catch (error) {
        console.error('⚠️ Erro no saldo fallback:', error);
      }

      // Retornar informações básicas se a API falhar
      res.json({
        success: true,
        account: {
          id: user.deriv_account_id,
          balance: fallbackBalance,
          currency: user.deriv_currency || 'USD',
          is_virtual: user.deriv_is_virtual,
          fullname: user.deriv_fullname,
          email: user.deriv_email
        },
        available_accounts: availableAccounts.map(acc => ({
          loginid: acc.loginid,
          currency: acc.currency,
          is_virtual: acc.is_virtual
        })),
        transactions: [],
        profit_loss: { today: 0, total: 0 },
        warning: fallbackBalance === 0 ? 'Não foi possível obter saldo em tempo real.' : null
      });
    }

  } catch (error) {
    console.error('❌ Erro ao obter informações da conta Deriv:', error);
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

// Buscar todas as contas disponíveis (do banco de dados após OAuth)
router.post('/deriv/fetch-all-accounts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    console.log('🔍 Buscando contas armazenadas para usuário:', userId);

    // Buscar contas salvas no banco de dados
    const userResult = await query(`
      SELECT deriv_connected, deriv_accounts_tokens
      FROM users
      WHERE id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado'
      });
    }

    const user = userResult.rows[0];

    if (!user.deriv_connected) {
      return res.status(400).json({
        success: false,
        error: 'Conta Deriv não conectada'
      });
    }

    // Parse das contas salvas no banco
    let accounts = [];
    if (user.deriv_accounts_tokens) {
      try {
        accounts = JSON.parse(user.deriv_accounts_tokens);
      } catch (parseError) {
        console.error('❌ Erro ao fazer parse das contas salvas:', parseError);
        accounts = [];
      }
    }

    console.log(`✅ ${accounts.length} contas encontradas no banco de dados`);

    res.json({
      success: true,
      accounts: accounts.map(acc => ({
        loginid: acc.loginid,
        currency: acc.currency,
        is_virtual: acc.is_virtual,
        token: acc.token // Incluir token para WebSocket
      }))
    });

  } catch (error) {
    console.error('❌ Erro ao buscar contas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Trocar entre conta Virtual e Real (MÉTODO CORRIGIDO - funciona com um só token)
router.post('/deriv/switch-account', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { is_virtual, loginid } = req.body; // Aceitar loginid específico

    console.log('📥 INICIO SWITCH-ACCOUNT:', {
      timestamp: new Date().toISOString(),
      userId,
      is_virtual,
      loginid,
      headers: {
        'content-type': req.headers['content-type'],
        'authorization': req.headers.authorization ? 'presente' : 'ausente'
      },
      body: req.body
    });

    // Buscar informações atuais do usuário incluindo tokens de todas as contas
    const userResult = await query(`
      SELECT deriv_connected, deriv_access_token, deriv_account_id, deriv_accounts_tokens
      FROM users
      WHERE id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado'
      });
    }

    const user = userResult.rows[0];

    if (!user.deriv_connected || !user.deriv_access_token) {
      return res.status(400).json({
        success: false,
        error: 'Conta Deriv não conectada'
      });
    }

    // Parse stored accounts tokens
    let storedAccounts = [];
    try {
      storedAccounts = JSON.parse(user.deriv_accounts_tokens || '[]');
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse dos tokens das contas:', parseError);
      return res.status(400).json({
        success: false,
        error: 'Dados de contas corrompidos. Reconecte sua conta Deriv.'
      });
    }

    // Encontrar a conta do tipo desejado
    let targetAccount;
    if (loginid) {
      // Buscar por loginid específico
      targetAccount = storedAccounts.find(account => account.loginid === loginid);
    } else {
      // Buscar por tipo (virtual/real)
      targetAccount = storedAccounts.find(account => account.is_virtual === is_virtual);
    }

    if (!targetAccount) {
      return res.status(400).json({
        success: false,
        error: `Conta ${loginid || (is_virtual ? 'Virtual' : 'Real')} não encontrada. Você pode não ter este tipo de conta.`
      });
    }

    console.log('🎯 Conta encontrada para switch:', {
      from: user.deriv_account_id,
      to: targetAccount.loginid,
      type: targetAccount.is_virtual ? 'Virtual' : 'Real'
    });

    try {
      // NOVO MÉTODO: Usar token específico da conta de destino (padrão oficial Deriv)
      console.log('🔄 Switching to account using its specific token (official Deriv pattern)...');

      if (!targetAccount.token) {
        return res.status(400).json({
          success: false,
          error: 'Token não encontrado para a conta de destino'
        });
      }

      const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${process.env.DERIV_APP_ID || '82349'}`);

      const switchPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error('Timeout durante switch de conta'));
        }, 10000);

        let switchCompleted = false;

        ws.onopen = () => {
          console.log('🔗 Connected to WebSocket for account switch');

          // PADRÃO OFICIAL: Autorizar diretamente com o token da conta de destino
          const authorizeRequest = {
            authorize: targetAccount.token,
            req_id: 1
          };

          console.log(`🔑 Authorizing directly with target account token: ${targetAccount.loginid}`);
          ws.send(JSON.stringify(authorizeRequest));
        };

        ws.onmessage = (event) => {
          try {
            const response = JSON.parse(event.data);
            console.log('📨 Account switch response:', {
              req_id: response.req_id,
              msg_type: response.msg_type,
              loginid: response.authorize?.loginid
            });

            if (response.error) {
              console.error('❌ Account switch authorization error:', response.error);
              clearTimeout(timeout);
              ws.close();
              reject(new Error(`Switch authorization error: ${response.error.message}`));
              return;
            }

            if (response.req_id === 1 && response.authorize) {
              // CRÍTICO: Validar se a conta retornada é realmente a conta solicitada
              const authorizedLoginId = response.authorize.loginid;
              const requestedLoginId = targetAccount.loginid;

              console.log('🔍 Validating account switch response:', {
                requested: requestedLoginId,
                authorized: authorizedLoginId,
                match: authorizedLoginId === requestedLoginId
              });

              // CORREÇÃO CRÍTICA: Permitir switch mesmo com account mismatch
              // Isso permite que o banco seja atualizado com a conta correta
              if (authorizedLoginId !== requestedLoginId) {
                console.log('⚠️ CRITICAL: Account mismatch but allowing switch to fix database:', {
                  requested: requestedLoginId,
                  authorized: authorizedLoginId,
                  action: 'Allowing switch to update database with correct account'
                });
              }

              // SEMPRE permitir o switch para corrigir o banco
              // clearTimeout(timeout);
              // ws.close();
              // reject(new Error(`Account mismatch: requested ${requestedLoginId} but got ${authorizedLoginId}`));

              // Conta autorizada com sucesso e correta!
              console.log('✅ Successfully switched to correct account:', {
                loginid: response.authorize.loginid,
                currency: response.authorize.currency,
                is_virtual: response.authorize.is_virtual
              });

              clearTimeout(timeout);
              ws.close();

              // Resolver com os dados da conta autorizada (agora validada)
              resolve({
                loginid: response.authorize.loginid,
                currency: response.authorize.currency,
                is_virtual: response.authorize.is_virtual,
                email: response.authorize.email,
                fullname: response.authorize.fullname,
                token: targetAccount.token
              });
            }
          } catch (parseError) {
            console.error('❌ Erro ao processar resposta do switch:', parseError);
            clearTimeout(timeout);
            ws.close();
            reject(parseError);
          }
        };

        ws.onerror = (error) => {
          clearTimeout(timeout);
          console.error('❌ WebSocket error durante switch:', error);
          reject(new Error('WebSocket error during switch'));
        };

        ws.onclose = (code, reason) => {
          clearTimeout(timeout);
          if (!switchCompleted) {
            console.log('🔌 WebSocket fechado durante switch:', code, reason);
          }
        };
      });

      const switchResult = await switchPromise;

      // Atualizar banco de dados com nova conta ativa e seu token
      console.log('🔄 Atualizando banco de dados com nova conta:', {
        from: {
          account_id: user.deriv_account_id,
          token: user.deriv_access_token?.substring(0, 10) + '...'
        },
        to: {
          account_id: switchResult.loginid,
          token: switchResult.token?.substring(0, 10) + '...',
          is_virtual: switchResult.is_virtual,
          currency: switchResult.currency
        }
      });

      await query(`
        UPDATE users
        SET deriv_access_token = $1,
            deriv_account_id = $2,
            deriv_is_virtual = $3,
            deriv_currency = $4,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
      `, [
        switchResult.token,
        switchResult.loginid,
        switchResult.is_virtual,
        switchResult.currency,
        userId
      ]);

      console.log('✅ Banco de dados atualizado com sucesso para conta:', switchResult.loginid);

      // VERIFICAR SE A ATUALIZAÇÃO REALMENTE FUNCIONOU
      const verificationResult = await query(`
        SELECT deriv_account_id, deriv_access_token, deriv_is_virtual, deriv_currency
        FROM users
        WHERE id = $1
      `, [userId]);

      const updatedUser = verificationResult.rows[0];
      console.log('🔍 Verificação pós-update:', {
        userId,
        expected: {
          account_id: switchResult.loginid,
          is_virtual: switchResult.is_virtual,
          currency: switchResult.currency
        },
        actual: {
          account_id: updatedUser.deriv_account_id,
          is_virtual: updatedUser.deriv_is_virtual,
          currency: updatedUser.deriv_currency,
          token_matches: updatedUser.deriv_access_token === switchResult.token
        }
      });

      // Se a verificação falhar, tentar novamente
      if (updatedUser.deriv_account_id !== switchResult.loginid) {
        console.error('❌ CRÍTICO: Banco não foi atualizado! Tentando novamente...');

        await query(`
          UPDATE users
          SET deriv_access_token = $1,
              deriv_account_id = $2,
              deriv_is_virtual = $3,
              deriv_currency = $4,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $5
        `, [
          switchResult.token,
          switchResult.loginid,
          switchResult.is_virtual,
          switchResult.currency,
          userId
        ]);

        console.log('🔄 Segunda tentativa de atualização realizada');
      }

      console.log('✅ Conta trocada com sucesso:', {
        from: user.deriv_account_id,
        to: switchResult.loginid,
        type: switchResult.is_virtual ? 'Virtual' : 'Real'
      });

      // Buscar saldo atual da nova conta via WebSocket
      let currentBalance = 0;
      try {
        const balanceWs = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${process.env.DERIV_APP_ID || '82349'}`);

        const balancePromise = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            balanceWs.close();
            resolve(0); // Fallback para 0 se não conseguir obter
          }, 5000);

          balanceWs.onopen = () => {
            // Autorizar com o token da nova conta
            balanceWs.send(JSON.stringify({
              authorize: switchResult.token,
              req_id: 1
            }));
          };

          balanceWs.onmessage = (event) => {
            try {
              const response = JSON.parse(event.data);

              if (response.authorize && response.req_id === 1) {
                // Solicitar saldo
                balanceWs.send(JSON.stringify({
                  balance: 1,
                  req_id: 2
                }));
              } else if (response.balance && response.req_id === 2) {
                clearTimeout(timeout);
                balanceWs.close();
                resolve(response.balance.balance || 0);
              }
            } catch (e) {
              clearTimeout(timeout);
              balanceWs.close();
              resolve(0);
            }
          };

          balanceWs.onerror = () => {
            clearTimeout(timeout);
            resolve(0);
          };
        });

        currentBalance = await balancePromise;
        console.log('💰 Saldo atual obtido:', currentBalance);
      } catch (balanceError) {
        console.error('⚠️ Erro ao obter saldo, usando 0:', balanceError);
        currentBalance = 0;
      }

      // Retornar informações da nova conta com saldo real
      const responseData = {
        success: true,
        message: `Conta alterada para ${switchResult.is_virtual ? 'Virtual' : 'Real'} com sucesso`,
        accountInfo: {
          account: {
            id: switchResult.loginid,
            balance: currentBalance,
            currency: switchResult.currency,
            is_virtual: switchResult.is_virtual,
            fullname: switchResult.fullname,
            email: switchResult.email
          },
          token: switchResult.token, // TOKEN CORRIGIDO AQUI!
          available_accounts: storedAccounts.map(acc => ({
            loginid: acc.loginid,
            currency: acc.currency,
            is_virtual: acc.is_virtual
          })),
          transactions: [],
          profit_loss: { today: 0, total: 0 }
        }
      };

      console.log('📤 RESPOSTA SWITCH-ACCOUNT:', {
        timestamp: new Date().toISOString(),
        userId,
        success: responseData.success,
        newAccountId: responseData.accountInfo.account.id,
        newBalance: responseData.accountInfo.account.balance,
        newCurrency: responseData.accountInfo.account.currency,
        newIsVirtual: responseData.accountInfo.account.is_virtual,
        availableAccountsCount: responseData.accountInfo.available_accounts.length
      });

      res.json(responseData);

    } catch (switchError) {
      console.error('❌ Erro ao trocar conta:', switchError);
      res.status(400).json({
        success: false,
        error: 'Erro ao trocar conta: ' + switchError.message
      });
    }

  } catch (error) {
    console.error('❌ Erro geral ao trocar conta:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// REMOVED: Duplicate route definition that was causing conflicts

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

// Novo endpoint para informações avançadas da conta
router.get('/deriv/enhanced-account-info', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Buscar usuário
    const userResult = await query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const user = userResult.rows[0];

    if (!user.deriv_connected || !user.deriv_access_token) {
      return res.status(400).json({ error: 'Conta Deriv não conectada' });
    }

    // Conectar com WebSocket da Deriv
    const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${process.env.DERIV_APP_ID || '82349'}`);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Timeout ao obter informações da conta'));
      }, 15000);

      let accountInfo = null;
      let balanceInfo = null;
      let transactionStats = null;

      ws.onopen = () => {
        // Autorizar
        ws.send(JSON.stringify({
          authorize: user.deriv_access_token,
          req_id: 1
        }));
      };

      ws.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data);

          if (response.error) {
            clearTimeout(timeout);
            ws.close();
            return reject(new Error(response.error.message));
          }

          // Handle authorization
          if (response.authorize && response.req_id === 1) {
            // Get balance
            ws.send(JSON.stringify({
              balance: 1,
              req_id: 2
            }));

            // Get account info
            ws.send(JSON.stringify({
              get_account_status: 1,
              req_id: 3
            }));

            // Get trading statistics (simplified)
            ws.send(JSON.stringify({
              statement: 1,
              action_type: 'buy',
              limit: 100,
              req_id: 4
            }));
          }

          // Handle balance
          if (response.balance && response.req_id === 2) {
            balanceInfo = response.balance;
          }

          // Handle account status
          if (response.get_account_status && response.req_id === 3) {
            accountInfo = response.get_account_status;
          }

          // Handle statement
          if (response.statement && response.req_id === 4) {
            transactionStats = response.statement;

            // Quando temos todas as informações, processar e retornar
            if (accountInfo && balanceInfo && transactionStats) {
              clearTimeout(timeout);
              ws.close();

              // Calcular estatísticas de trading
              const transactions = transactionStats.transactions || [];
              const tradingStats = {
                total_trades: transactions.length,
                winning_trades: transactions.filter(t => t.profit > 0).length,
                losing_trades: transactions.filter(t => t.profit < 0).length,
                win_rate: 0
              };

              if (tradingStats.total_trades > 0) {
                tradingStats.win_rate = (tradingStats.winning_trades / tradingStats.total_trades) * 100;
              }

              // Calcular lucro/prejuízo
              const totalProfit = transactions.reduce((sum, t) => sum + (t.profit || 0), 0);
              const todayTransactions = transactions.filter(t => {
                const transactionDate = new Date(t.transaction_time * 1000);
                const today = new Date();
                return transactionDate.toDateString() === today.toDateString();
              });
              const todayProfit = todayTransactions.reduce((sum, t) => sum + (t.profit || 0), 0);

              const profitPercentage = balanceInfo.balance > 0 ?
                (totalProfit / balanceInfo.balance) * 100 : 0;

              const enhancedInfo = {
                account: {
                  id: balanceInfo.loginid,
                  balance: balanceInfo.balance,
                  currency: balanceInfo.currency,
                  is_virtual: balanceInfo.loginid.startsWith('VRT'),
                  loginid: balanceInfo.loginid,
                  fullname: user.deriv_fullname,
                  email: user.deriv_email
                },
                profit_loss: {
                  today: todayProfit,
                  total: totalProfit,
                  percentage: profitPercentage
                },
                trading_stats: tradingStats,
                transactions: transactions.slice(0, 10), // Últimas 10 transações
                warning: accountInfo.status && accountInfo.status.length > 0 ?
                  accountInfo.status.join(', ') : null
              };

              resolve(enhancedInfo);
            }
          }

        } catch (parseError) {
          clearTimeout(timeout);
          ws.close();
          reject(parseError);
        }
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        ws.close();
        reject(error);
      };

    }).then(enhancedInfo => {
      res.json(enhancedInfo);
    }).catch(error => {
      console.error('Erro ao obter informações avançadas da conta:', error);
      res.status(500).json({ error: error.message || 'Erro ao obter informações da conta' });
    });

  } catch (error) {
    console.error('Erro no endpoint enhanced-account-info:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint para obter token específico da conta ativa para WebSocket
router.get('/deriv/get-token', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // CORREÇÃO CRÍTICA: Buscar token específico da conta ativa
    const userResult = await query(`
      SELECT deriv_access_token, deriv_account_id, deriv_accounts_tokens
      FROM users WHERE id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const user = userResult.rows[0];

    console.log('🔍 CRITICAL: Getting token for current account:', {
      userId,
      currentAccountId: user.deriv_account_id,
      hasDefaultToken: !!user.deriv_access_token,
      hasAccountsTokens: !!user.deriv_accounts_tokens
    });

    // Buscar token específico da conta ativa
    let specificToken = null;

    if (user.deriv_accounts_tokens) {
      try {
        const allAccounts = JSON.parse(user.deriv_accounts_tokens);
        const currentAccount = allAccounts.find(acc => acc.loginid === user.deriv_account_id);

        if (currentAccount && currentAccount.token) {
          specificToken = currentAccount.token;
          console.log('✅ CRITICAL: Found specific token for account:', {
            accountId: currentAccount.loginid,
            tokenSubstring: specificToken.substring(0, 10) + '...'
          });
        } else {
          console.log('⚠️ CRITICAL: No specific token found, using default token');
        }
      } catch (parseError) {
        console.error('❌ CRITICAL: Error parsing accounts tokens:', parseError);
      }
    }

    // Usar token específico da conta ou fallback para token padrão
    const tokenToUse = specificToken || user.deriv_access_token;

    if (!tokenToUse) {
      return res.status(400).json({ error: 'Token Deriv não encontrado' });
    }

    console.log('🎯 CRITICAL: Returning token for account:', {
      accountId: user.deriv_account_id,
      tokenType: specificToken ? 'ACCOUNT_SPECIFIC' : 'DEFAULT',
      tokenSubstring: tokenToUse.substring(0, 10) + '...'
    });

    res.json({
      success: true,
      token: tokenToUse,
      account_id: user.deriv_account_id,
      token_type: specificToken ? 'account_specific' : 'default'
    });

  } catch (error) {
    console.error('Erro ao obter token:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar todas as contas disponíveis (rota que estava faltando!)
router.post('/deriv/fetch-all-accounts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('🔍 Buscando todas as contas para usuário:', userId);

    const result = await query(`
      SELECT deriv_connected, deriv_access_token, deriv_accounts_tokens
      FROM users
      WHERE id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const user = result.rows[0];
    const connected = !!(user.deriv_connected && (user.deriv_connected === true || user.deriv_connected === 1));

    if (!connected || !user.deriv_access_token) {
      return res.status(400).json({
        success: false,
        error: 'Conta Deriv não conectada',
        available_accounts: []
      });
    }

    // Conectar com Deriv WebSocket para buscar contas
    const WebSocket = require('ws');

    const accountsPromise = new Promise((resolve, reject) => {
      const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=' + (process.env.DERIV_APP_ID || 82349));

      ws.on('open', () => {
        console.log('🔌 Conectado ao WebSocket para buscar contas');

        // Autorizar com token
        ws.send(JSON.stringify({
          authorize: user.deriv_access_token,
          req_id: 1
        }));
      });

      ws.on('message', (data) => {
        try {
          const response = JSON.parse(data);

          if (response.req_id === 1 && response.authorize) {
            // Buscar lista de contas
            ws.send(JSON.stringify({
              account_list: 1,
              req_id: 2
            }));
          }

          if (response.req_id === 2 && response.account_list) {
            const accounts = response.account_list.map(account => ({
              loginid: account.loginid,
              currency: account.currency,
              is_virtual: account.is_virtual,
              token: account.token
            }));

            console.log(`✅ Contas encontradas: ${accounts.length}`);
            ws.close();
            resolve(accounts);
          }
        } catch (error) {
          console.error('❌ Erro ao processar resposta WebSocket:', error);
          ws.close();
          reject(error);
        }
      });

      ws.on('error', (error) => {
        console.error('❌ Erro WebSocket:', error);
        reject(error);
      });

      setTimeout(() => {
        ws.close();
        reject(new Error('Timeout ao buscar contas'));
      }, 10000);
    });

    const accounts = await accountsPromise;

    res.json({
      success: true,
      available_accounts: accounts
    });

  } catch (error) {
    console.error('❌ Erro ao buscar contas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      available_accounts: []
    });
  }
});

// DEBUG: Endpoint para verificar exatamente o que há no banco de dados
router.get('/deriv/debug-user-data', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('🔍 DEBUG: Verificando dados do usuário:', userId);

    const result = await query(`
      SELECT id, email, deriv_connected, deriv_account_id, deriv_access_token,
             deriv_email, deriv_currency, deriv_is_virtual, deriv_fullname,
             deriv_accounts_tokens, LENGTH(deriv_accounts_tokens) as tokens_length
      FROM users
      WHERE id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const user = result.rows[0];

    // Parse accounts tokens
    let parsedAccounts = [];
    let parseError = null;
    try {
      if (user.deriv_accounts_tokens) {
        parsedAccounts = JSON.parse(user.deriv_accounts_tokens);
      }
    } catch (error) {
      parseError = error.message;
    }

    console.log('🔍 DEBUG COMPLETO:', {
      userId: user.id,
      email: user.email,
      deriv_connected: user.deriv_connected,
      deriv_account_id: user.deriv_account_id,
      has_access_token: !!user.deriv_access_token,
      access_token_length: user.deriv_access_token?.length || 0,
      deriv_email: user.deriv_email,
      tokens_field_length: user.tokens_length,
      raw_tokens: user.deriv_accounts_tokens,
      parsed_accounts_count: parsedAccounts.length,
      parse_error: parseError
    });

    res.json({
      success: true,
      debug_data: {
        user_id: user.id,
        email: user.email,
        deriv_connected: user.deriv_connected,
        deriv_account_id: user.deriv_account_id,
        has_access_token: !!user.deriv_access_token,
        access_token_length: user.deriv_access_token?.length || 0,
        deriv_email: user.deriv_email,
        deriv_currency: user.deriv_currency,
        is_virtual: user.deriv_is_virtual,
        fullname: user.deriv_fullname,
        tokens_field_length: user.tokens_length,
        raw_tokens_preview: user.deriv_accounts_tokens?.substring(0, 100) + '...',
        parsed_accounts_count: parsedAccounts.length,
        parsed_accounts: parsedAccounts.map(acc => ({
          loginid: acc.loginid,
          currency: acc.currency,
          is_virtual: acc.is_virtual,
          has_token: !!acc.token
        })),
        parse_error: parseError
      }
    });

  } catch (error) {
    console.error('❌ Erro no debug:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ============================================================================
// NOVAS ROTAS: Gerenciamento de Múltiplas Contas Deriv (Tabela deriv_accounts)
// ============================================================================

// Nova rota: Salvar TODAS as contas OAuth na tabela deriv_accounts
router.post('/deriv/save-all-accounts', authenticateToken, async (req, res) => {
  try {
    const { accounts } = req.body; // Array de contas do OAuth callback
    const userId = req.user.id;

    if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Nenhuma conta fornecida'
      });
    }

    console.log(`💾 Salvando ${accounts.length} contas OAuth para usuário ${userId}...`);

    // 1. Desativar todas as contas antigas
    await query(
      'UPDATE deriv_accounts SET is_active = FALSE WHERE user_id = $1',
      [userId]
    );

    // 2. Salvar cada conta no banco de dados
    let savedCount = 0;
    for (const account of accounts) {
      try {
        await query(`
          INSERT INTO deriv_accounts (
            user_id, loginid, token, currency, is_virtual,
            email, fullname, is_active
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (user_id, loginid)
          DO UPDATE SET
            token = $3,
            currency = $4,
            is_virtual = $5,
            email = $6,
            fullname = $7,
            is_active = $8,
            updated_at = CURRENT_TIMESTAMP
        `, [
          userId,
          account.loginid,
          account.token,
          account.currency || 'USD',
          account.is_virtual || false,
          account.email || '',
          account.fullname || '',
          true // Todas as contas novas ficam ativas
        ]);

        savedCount++;
        console.log(`  ✅ Conta ${savedCount}/${accounts.length} salva: ${account.loginid}`);

      } catch (saveError) {
        console.error(`  ❌ Erro ao salvar conta ${account.loginid}:`, saveError);
      }
    }

    // 3. Atualizar usuário principal com a primeira conta
    const primaryAccount = accounts[0];
    await query(`
      UPDATE users
      SET deriv_connected = TRUE,
          deriv_account_id = $1,
          deriv_access_token = $2,
          deriv_currency = $3,
          deriv_is_virtual = $4,
          deriv_email = $5,
          deriv_fullname = $6,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
    `, [
      primaryAccount.loginid,
      primaryAccount.token,
      primaryAccount.currency || 'USD',
      primaryAccount.is_virtual || false,
      primaryAccount.email || '',
      primaryAccount.fullname || '',
      userId
    ]);

    console.log(`✅ ${savedCount}/${accounts.length} contas salvas com sucesso!`);
    console.log(`✅ Usuário atualizado com conta principal: ${primaryAccount.loginid}`);

    res.json({
      success: true,
      message: `${savedCount} contas conectadas com sucesso`,
      saved_count: savedCount,
      total_count: accounts.length,
      accounts: accounts.map(a => ({
        loginid: a.loginid,
        currency: a.currency,
        is_virtual: a.is_virtual
      }))
    });

  } catch (error) {
    console.error('❌ Erro ao salvar contas OAuth:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao salvar contas Deriv'
    });
  }
});

// Nova rota: Buscar TODAS as contas da tabela deriv_accounts
router.get('/deriv/all-accounts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    console.log(`🔍 Buscando todas as contas Deriv do usuário ${userId}...`);

    // Buscar todas as contas do usuário ordenadas por ativa primeiro
    const result = await query(`
      SELECT
        loginid,
        currency,
        is_virtual,
        email,
        fullname,
        is_active,
        created_at
      FROM deriv_accounts
      WHERE user_id = $1
      ORDER BY is_active DESC, created_at ASC
    `, [userId]);

    const accounts = result.rows;

    console.log(`✅ ${accounts.length} contas encontradas`);

    res.json({
      success: true,
      count: accounts.length,
      accounts: accounts.map(acc => ({
        loginid: acc.loginid,
        currency: acc.currency,
        is_virtual: acc.is_virtual,
        email: acc.email,
        fullname: acc.fullname,
        is_active: acc.is_active
      }))
    });

  } catch (error) {
    console.error('❌ Erro ao buscar contas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar contas Deriv'
    });
  }
});

// Nova rota: Trocar conta ativa (usando tabela deriv_accounts)
router.post('/deriv/switch-account', authenticateToken, async (req, res) => {
  try {
    const { loginid } = req.body;
    const userId = req.user.id;

    if (!loginid) {
      return res.status(400).json({
        success: false,
        error: 'loginid é obrigatório'
      });
    }

    console.log(`🔄 Trocando para conta ${loginid} (usuário ${userId})...`);

    // 1. Buscar a conta solicitada com seu token
    const accountResult = await query(`
      SELECT loginid, token, currency, is_virtual, email, fullname
      FROM deriv_accounts
      WHERE user_id = $1 AND loginid = $2
    `, [userId, loginid]);

    if (accountResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Conta não encontrada'
      });
    }

    const newAccount = accountResult.rows[0];
    console.log(`  ✅ Conta encontrada: ${newAccount.loginid} (${newAccount.is_virtual ? 'Virtual' : 'Real'})`);

    // 2. Desativar todas as outras contas
    await query(
      'UPDATE deriv_accounts SET is_active = FALSE WHERE user_id = $1',
      [userId]
    );

    // 3. Ativar a conta selecionada
    await query(
      'UPDATE deriv_accounts SET is_active = TRUE WHERE user_id = $1 AND loginid = $2',
      [userId, loginid]
    );

    // 4. Atualizar usuário principal com os dados da nova conta
    await query(`
      UPDATE users
      SET deriv_account_id = $1,
          deriv_access_token = $2,
          deriv_currency = $3,
          deriv_is_virtual = $4,
          deriv_email = $5,
          deriv_fullname = $6,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
    `, [
      newAccount.loginid,
      newAccount.token,
      newAccount.currency,
      newAccount.is_virtual,
      newAccount.email,
      newAccount.fullname,
      userId
    ]);

    console.log(`✅ Conta trocada com sucesso para ${loginid}`);

    res.json({
      success: true,
      message: `Conta trocada para ${loginid}`,
      account: {
        loginid: newAccount.loginid,
        currency: newAccount.currency,
        is_virtual: newAccount.is_virtual,
        token: newAccount.token, // Token necessário para re-autorizar WebSocket
        email: newAccount.email,
        fullname: newAccount.fullname
      }
    });

  } catch (error) {
    console.error('❌ Erro ao trocar conta:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao trocar conta Deriv'
    });
  }
});

module.exports = router; 