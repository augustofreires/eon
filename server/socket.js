const { query } = require('./database/connection');

module.exports = (io) => {
  // Armazenar conexões ativas
  const activeConnections = new Map();

  io.on('connection', (socket) => {
    console.log('🔌 Nova conexão Socket.io:', socket.id);

    // Autenticar usuário
    socket.on('authenticate', async (data) => {
      try {
        const { token } = data;
        
        if (!token) {
          socket.emit('auth_error', { message: 'Token não fornecido' });
          return;
        }

        // Verificar token JWT
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Buscar usuário
        const result = await query(
          'SELECT id, email, name, role FROM users WHERE id = $1',
          [decoded.userId]
        );

        if (result.rows.length === 0) {
          socket.emit('auth_error', { message: 'Usuário não encontrado' });
          return;
        }

        const user = result.rows[0];
        
        // Armazenar informações do usuário na conexão
        socket.userId = user.id;
        socket.userRole = user.role;
        
        // Adicionar à lista de conexões ativas
        if (!activeConnections.has(user.id)) {
          activeConnections.set(user.id, new Set());
        }
        activeConnections.get(user.id).add(socket.id);

        // Entrar em sala específica do usuário
        socket.join(`user_${user.id}`);
        
        // Se for admin, entrar na sala de admin
        if (user.role === 'admin') {
          socket.join('admin_room');
        }

        socket.emit('authenticated', { 
          message: 'Autenticado com sucesso',
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          }
        });

        console.log(`✅ Usuário ${user.email} autenticado via Socket.io`);

      } catch (error) {
        console.error('Erro na autenticação Socket.io:', error);
        socket.emit('auth_error', { message: 'Erro na autenticação' });
      }
    });

    // Entrar em sala de operação específica
    socket.on('join_operation', (data) => {
      const { operation_id } = data;
      socket.join(`operation_${operation_id}`);
      console.log(`📊 Socket ${socket.id} entrou na sala da operação ${operation_id}`);
    });

    // Sair de sala de operação
    socket.on('leave_operation', (data) => {
      const { operation_id } = data;
      socket.leave(`operation_${operation_id}`);
      console.log(`📊 Socket ${socket.id} saiu da sala da operação ${operation_id}`);
    });

    // Atualização de status de operação
    socket.on('operation_update', async (data) => {
      try {
        const { operation_id, status, balance, profit_loss } = data;

        // Atualizar no banco de dados
        await query(`
          UPDATE operations 
          SET status = $1, balance = $2, profit_loss = $3, updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
        `, [status, balance, profit_loss, operation_id]);

        // Enviar atualização para todos na sala da operação
        io.to(`operation_${operation_id}`).emit('operation_status_update', {
          operation_id,
          status,
          balance,
          profit_loss,
          timestamp: new Date().toISOString()
        });

        // Se for admin, enviar para sala de admin
        io.to('admin_room').emit('admin_operation_update', {
          operation_id,
          status,
          balance,
          profit_loss,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('Erro ao atualizar operação:', error);
      }
    });

    // Notificação de nova operação
    socket.on('new_operation', async (data) => {
      try {
        const { operation_id, user_id, bot_id } = data;

        // Buscar detalhes da operação
        const result = await query(`
          SELECT o.*, u.name as user_name, b.name as bot_name
          FROM operations o
          INNER JOIN users u ON o.user_id = u.id
          INNER JOIN bots b ON o.bot_id = b.id
          WHERE o.id = $1
        `, [operation_id]);

        if (result.rows.length > 0) {
          const operation = result.rows[0];

          // Enviar notificação para admin
          io.to('admin_room').emit('new_operation_notification', {
            operation_id,
            user_name: operation.user_name,
            bot_name: operation.bot_name,
            status: operation.status,
            timestamp: new Date().toISOString()
          });
        }

      } catch (error) {
        console.error('Erro ao notificar nova operação:', error);
      }
    });

    // Atualização de saldo da conta Deriv
    socket.on('balance_update', async (data) => {
      try {
        const { user_id, balance, currency } = data;

        // Atualizar saldo no banco
        await query(`
          UPDATE users 
          SET updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [user_id]);

        // Enviar atualização para o usuário específico
        io.to(`user_${user_id}`).emit('balance_updated', {
          balance,
          currency,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('Erro ao atualizar saldo:', error);
      }
    });

    // Notificação de erro
    socket.on('operation_error', async (data) => {
      try {
        const { operation_id, error_message, user_id } = data;

        // Registrar erro no histórico
        await query(`
          INSERT INTO operation_history (operation_id, action, details)
          VALUES ($1, $2, $3)
        `, [operation_id, 'error', JSON.stringify({ error: error_message, timestamp: new Date() })]);

        // Notificar usuário
        io.to(`user_${user_id}`).emit('operation_error_notification', {
          operation_id,
          error: error_message,
          timestamp: new Date().toISOString()
        });

        // Notificar admin
        io.to('admin_room').emit('admin_operation_error', {
          operation_id,
          error: error_message,
          user_id,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('Erro ao processar erro de operação:', error);
      }
    });

    // Ping/Pong para manter conexão ativa
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    // Desconexão
    socket.on('disconnect', () => {
      console.log('🔌 Desconexão Socket.io:', socket.id);

      if (socket.userId) {
        // Remover da lista de conexões ativas
        const userConnections = activeConnections.get(socket.userId);
        if (userConnections) {
          userConnections.delete(socket.id);
          if (userConnections.size === 0) {
            activeConnections.delete(socket.userId);
          }
        }
      }
    });
  });

  // Função para enviar notificação para um usuário específico
  const sendNotification = (userId, event, data) => {
    const userConnections = activeConnections.get(userId);
    if (userConnections) {
      userConnections.forEach(socketId => {
        io.to(socketId).emit(event, data);
      });
    }
  };

  // Função para enviar notificação para todos os admins
  const sendAdminNotification = (event, data) => {
    io.to('admin_room').emit(event, data);
  };

  // Função para enviar notificação para todos os usuários
  const sendBroadcast = (event, data) => {
    io.emit(event, data);
  };

  // Retornar funções úteis
  return {
    sendNotification,
    sendAdminNotification,
    sendBroadcast,
    getActiveConnections: () => activeConnections
  };
}; 