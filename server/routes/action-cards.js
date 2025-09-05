const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const dbPath = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

// Middleware de autenticação (simplificado para desenvolvimento)
const authenticateToken = (req, res, next) => {
  // Por enquanto, simplificar autenticação
  next();
};

const requireAdmin = (req, res, next) => {
  // Verificação de admin simplificada
  next();
};

// Configurar multer para upload de imagens
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/action-cards');
    
    // Criar diretório se não existir
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Gerar nome único mantendo a extensão original
    const uniqueName = `card-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  // Aceitar apenas imagens
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Apenas arquivos de imagem são permitidos'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limite
  }
});

// Criar tabela se não existir
db.run(`
  CREATE TABLE IF NOT EXISTS action_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    subtitle TEXT,
    image_url TEXT,
    action_type TEXT NOT NULL DEFAULT 'internal',
    action_url TEXT NOT NULL,
    background_color TEXT DEFAULT '#00d4aa',
    text_color TEXT DEFAULT '#ffffff',
    is_active BOOLEAN DEFAULT 1,
    hide_title BOOLEAN DEFAULT 0,
    order_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`, (err) => {
  if (err) {
    console.error('❌ Erro ao criar tabela action_cards:', err);
  } else {
    console.log('✅ Tabela action_cards criada/verificada');
    
    // Adicionar coluna hide_title se não existir
    db.run(`ALTER TABLE action_cards ADD COLUMN hide_title BOOLEAN DEFAULT 0`, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('❌ Erro ao adicionar coluna hide_title:', err);
      } else {
        console.log('✅ Coluna hide_title verificada/adicionada');
      }
    });
    
    // Inserir cards padrão se não existir nenhum
    db.get('SELECT COUNT(*) as count FROM action_cards', [], (err, row) => {
      if (!err && row.count === 0) {
        const defaultCards = [
          {
            title: 'VÍDEO-AULAS',
            action_type: 'internal',
            action_url: '/courses',
            background_color: '#00d4aa',
            order_index: 1
          },
          {
            title: 'COMECE A OPERAR',
            action_type: 'internal',
            action_url: '/operations',
            background_color: '#00b894',
            order_index: 2
          },
          {
            title: 'CRIAR CONTA NA CORRETORA',
            action_type: 'external',
            action_url: 'https://app.deriv.com/signup',
            background_color: '#00a085',
            order_index: 3
          },
          {
            title: 'SUPORTE',
            action_type: 'internal',
            action_url: '/useful-links',
            background_color: '#008f76',
            order_index: 4
          }
        ];

        defaultCards.forEach((card, index) => {
          db.run(`
            INSERT INTO action_cards (title, action_type, action_url, background_color, text_color, order_index, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [card.title, card.action_type, card.action_url, card.background_color, '#ffffff', card.order_index, 1], (err) => {
            if (!err && index === defaultCards.length - 1) {
              console.log('✅ Cards de ação padrão criados');
            }
          });
        });
      }
    });
  }
});

// GET /api/admin/action-cards - Listar todos os cards (admin)
router.get('/admin/action-cards', authenticateToken, requireAdmin, (req, res) => {
  db.all(`
    SELECT * FROM action_cards 
    ORDER BY order_index ASC, created_at ASC
  `, [], (err, cards) => {
    if (err) {
      console.error('Erro ao buscar cards de ação:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    
    res.json(cards);
  });
});

// GET /api/action-cards - Listar cards ativos (público)
router.get('/action-cards', (req, res) => {
  db.all(`
    SELECT * FROM action_cards 
    WHERE is_active = 1
    ORDER BY order_index ASC, created_at ASC
  `, [], (err, cards) => {
    if (err) {
      console.error('Erro ao buscar cards de ação ativos:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    
    res.json(cards);
  });
});

// POST /api/admin/action-cards - Criar novo card
router.post('/admin/action-cards', authenticateToken, requireAdmin, upload.single('image'), (req, res) => {
  const { title, subtitle, action_type, action_url, background_color, text_color, is_active, hide_title, order_index } = req.body;

  if (!title || !action_type || !action_url) {
    return res.status(400).json({ error: 'Título, tipo de ação e URL são obrigatórios' });
  }

  let imageUrl = null;
  if (req.file) {
    imageUrl = `/uploads/action-cards/${req.file.filename}`;
  }

  db.run(`
    INSERT INTO action_cards (
      title, subtitle, image_url, action_type, action_url, 
      background_color, text_color, is_active, hide_title, order_index
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    title, 
    subtitle || null, 
    imageUrl, 
    action_type, 
    action_url, 
    background_color || '#00d4aa', 
    text_color || '#ffffff', 
    is_active === 'true' ? 1 : 0, 
    hide_title === 'true' ? 1 : 0,
    parseInt(order_index) || 0
  ], function(err) {
    if (err) {
      console.error('Erro ao criar card de ação:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    // Buscar card criado
    db.get('SELECT * FROM action_cards WHERE id = ?', [this.lastID], (err, card) => {
      if (err) {
        console.error('Erro ao buscar card criado:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
      
      console.log(`✅ Card de ação criado: ${card.title}`);
      res.status(201).json(card);
    });
  });
});

// PUT /api/admin/action-cards/:id - Atualizar card
router.put('/admin/action-cards/:id', authenticateToken, requireAdmin, upload.single('image'), (req, res) => {
  const { id } = req.params;
  const { title, subtitle, action_type, action_url, background_color, text_color, is_active, hide_title, order_index } = req.body;

  if (!title || !action_type || !action_url) {
    return res.status(400).json({ error: 'Título, tipo de ação e URL são obrigatórios' });
  }

  // Verificar se card existe
  db.get('SELECT * FROM action_cards WHERE id = ?', [id], (err, existingCard) => {
    if (err) {
      console.error('Erro ao buscar card:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    if (!existingCard) {
      return res.status(404).json({ error: 'Card não encontrado' });
    }

    let imageUrl = existingCard.image_url;
    if (req.file) {
      // Deletar imagem antiga se existir
      if (existingCard.image_url) {
        const oldImagePath = path.join(__dirname, '..', existingCard.image_url);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      imageUrl = `/uploads/action-cards/${req.file.filename}`;
    }

    db.run(`
      UPDATE action_cards SET 
        title = ?, subtitle = ?, image_url = ?, action_type = ?, action_url = ?,
        background_color = ?, text_color = ?, is_active = ?, hide_title = ?, order_index = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      title, 
      subtitle || null, 
      imageUrl, 
      action_type, 
      action_url, 
      background_color || '#00d4aa', 
      text_color || '#ffffff', 
      is_active === 'true' ? 1 : 0, 
      hide_title === 'true' ? 1 : 0,
      parseInt(order_index) || 0,
      id
    ], function(err) {
      if (err) {
        console.error('Erro ao atualizar card:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      // Buscar card atualizado
      db.get('SELECT * FROM action_cards WHERE id = ?', [id], (err, card) => {
        if (err) {
          console.error('Erro ao buscar card atualizado:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        console.log(`✅ Card atualizado: ${card.title}`);
        res.json(card);
      });
    });
  });
});

// DELETE /api/admin/action-cards/:id - Excluir card
router.delete('/admin/action-cards/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;

  // Buscar card para deletar imagem
  db.get('SELECT * FROM action_cards WHERE id = ?', [id], (err, card) => {
    if (err) {
      console.error('Erro ao buscar card para exclusão:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    if (!card) {
      return res.status(404).json({ error: 'Card não encontrado' });
    }

    // Deletar imagem se existir
    if (card.image_url) {
      const imagePath = path.join(__dirname, '..', card.image_url);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Deletar card
    db.run('DELETE FROM action_cards WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('Erro ao deletar card:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      console.log(`✅ Card deletado: ${card.title}`);
      res.json({ message: 'Card excluído com sucesso', title: card.title });
    });
  });
});

// PATCH /api/admin/action-cards/:id/toggle - Alternar status ativo/inativo
router.patch('/admin/action-cards/:id/toggle', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;

  db.get('SELECT is_active FROM action_cards WHERE id = ?', [id], (err, card) => {
    if (err) {
      console.error('Erro ao buscar status do card:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    if (!card) {
      return res.status(404).json({ error: 'Card não encontrado' });
    }

    const newStatus = card.is_active ? 0 : 1;
    
    db.run('UPDATE action_cards SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newStatus, id], function(err) {
      if (err) {
        console.error('Erro ao alterar status do card:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      res.json({ 
        message: `Card ${newStatus ? 'ativado' : 'desativado'} com sucesso`,
        is_active: newStatus
      });
    });
  });
});

module.exports = router;