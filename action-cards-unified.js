const express = require('express');
const router = express.Router();
const { query } = require('../database/connection');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Middleware de autenticação (simplificado para desenvolvimento)
const authenticateToken = (req, res, next) => {
  next();
};

const requireAdmin = (req, res, next) => {
  next();
};

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/action-cards';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Inicialização da tabela
async function initializeActionCardsTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS action_cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        icon_url TEXT,
        action_url TEXT NOT NULL,
        color TEXT DEFAULT '#007bff',
        order_index INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        hide_title BOOLEAN DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Inserir cards padrão se não existirem
    const existingCards = await query('SELECT COUNT(*) as count FROM action_cards');
    if (existingCards.rows[0].count === 0) {
      const defaultCards = [
        {
          title: 'Dashboard',
          description: 'Acesse seu painel principal',
          action_url: '/dashboard',
          color: '#28a745',
          order_index: 1
        },
        {
          title: 'Trading',
          description: 'Operações de trading',
          action_url: '/operations',
          color: '#007bff',
          order_index: 2
        },
        {
          title: 'Configurações',
          description: 'Configurações da conta',
          action_url: '/profile',
          color: '#6c757d',
          order_index: 3
        },
        {
          title: 'Cursos',
          description: 'Cursos de trading',
          action_url: '/courses',
          color: '#fd7e14',
          order_index: 4
        }
      ];

      for (const card of defaultCards) {
        await query(`
          INSERT INTO action_cards (title, description, action_url, color, order_index)
          VALUES (?, ?, ?, ?, ?)
        `, [card.title, card.description, card.action_url, card.color, card.order_index]);
      }
      console.log('✅ Action cards padrão criados');
    }
  } catch (err) {
    console.error('❌ Erro ao inicializar tabela action_cards:', err);
  }
}

// Inicializar ao carregar o módulo
initializeActionCardsTable();

// GET /api/action-cards - Listar todos os action cards (público)
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM action_cards 
      WHERE is_active = 1 
      ORDER BY order_index ASC, created_at ASC
    `);

    res.json({
      success: true,
      action_cards: result.rows
    });
  } catch (err) {
    console.error('Erro ao buscar action cards:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/admin/action-cards - Listar todos os action cards para admin
router.get('/admin', requireAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM action_cards 
      ORDER BY order_index ASC, created_at ASC
    `);

    res.json({
      success: true,
      action_cards: result.rows
    });
  } catch (err) {
    console.error('Erro ao buscar action cards para admin:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/admin/action-cards - Criar novo action card
router.post('/admin', requireAdmin, async (req, res) => {
  try {
    const { title, description, action_url, color, order_index, hide_title } = req.body;

    if (!title || !action_url) {
      return res.status(400).json({ error: 'Título e URL da ação são obrigatórios' });
    }

    const result = await query(`
      INSERT INTO action_cards (title, description, action_url, color, order_index, hide_title)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      title, 
      description || '', 
      action_url, 
      color || '#007bff', 
      order_index || 0, 
      hide_title ? 1 : 0
    ]);

    // Buscar o card criado
    const newCard = await query('SELECT * FROM action_cards WHERE id = ?', [result.insertId]);

    res.json({
      success: true,
      message: 'Action card criado com sucesso',
      action_card: newCard.rows[0]
    });
  } catch (err) {
    console.error('Erro ao criar action card:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/admin/action-cards/:id - Atualizar action card
router.put('/admin/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, action_url, color, order_index, is_active, hide_title } = req.body;

    // Verificar se o card existe
    const existingCard = await query('SELECT * FROM action_cards WHERE id = ?', [id]);
    if (existingCard.rows.length === 0) {
      return res.status(404).json({ error: 'Action card não encontrado' });
    }

    // Atualizar o card
    await query(`
      UPDATE action_cards 
      SET title = ?, description = ?, action_url = ?, color = ?, order_index = ?, 
          is_active = ?, hide_title = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      title || existingCard.rows[0].title,
      description !== undefined ? description : existingCard.rows[0].description,
      action_url || existingCard.rows[0].action_url,
      color || existingCard.rows[0].color,
      order_index !== undefined ? order_index : existingCard.rows[0].order_index,
      is_active !== undefined ? (is_active ? 1 : 0) : existingCard.rows[0].is_active,
      hide_title !== undefined ? (hide_title ? 1 : 0) : existingCard.rows[0].hide_title,
      id
    ]);

    // Buscar o card atualizado
    const updatedCard = await query('SELECT * FROM action_cards WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Action card atualizado com sucesso',
      action_card: updatedCard.rows[0]
    });
  } catch (err) {
    console.error('Erro ao atualizar action card:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/admin/action-cards/:id - Deletar action card
router.delete('/admin/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o card existe
    const existingCard = await query('SELECT * FROM action_cards WHERE id = ?', [id]);
    if (existingCard.rows.length === 0) {
      return res.status(404).json({ error: 'Action card não encontrado' });
    }

    // Deletar o card
    await query('DELETE FROM action_cards WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Action card deletado com sucesso'
    });
  } catch (err) {
    console.error('Erro ao deletar action card:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/admin/action-cards/:id/upload-icon - Upload de ícone
router.post('/admin/:id/upload-icon', requireAdmin, upload.single('icon'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    // Verificar se o card existe
    const existingCard = await query('SELECT * FROM action_cards WHERE id = ?', [id]);
    if (existingCard.rows.length === 0) {
      return res.status(404).json({ error: 'Action card não encontrado' });
    }

    const iconUrl = `/${req.file.path.replace(/\\/g, '/')}`;

    // Atualizar URL do ícone
    await query(`
      UPDATE action_cards 
      SET icon_url = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [iconUrl, id]);

    res.json({
      success: true,
      message: 'Ícone enviado com sucesso',
      icon_url: iconUrl
    });
  } catch (err) {
    console.error('Erro ao fazer upload do ícone:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;