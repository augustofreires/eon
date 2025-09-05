const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

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

// Criar tabela se não existir
db.run(`
  CREATE TABLE IF NOT EXISTS useful_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    icon TEXT DEFAULT 'link',
    active INTEGER DEFAULT 1,
    order_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`, (err) => {
  if (err) {
    console.error('❌ Erro ao criar tabela useful_links:', err);
  } else {
    console.log('✅ Tabela useful_links criada/verificada');
  }
});

// GET /api/useful-links - Listar links (para clientes - apenas ativos)
router.get('/useful-links', (req, res) => {
  db.all(`
    SELECT * FROM useful_links 
    WHERE active = 1 
    ORDER BY order_index ASC, created_at ASC
  `, [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar links úteis:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    res.json(rows || []);
  });
});

// GET /api/admin/useful-links - Listar todos os links (para admin)
router.get('/admin/useful-links', requireAdmin, (req, res) => {
  db.all(`
    SELECT * FROM useful_links 
    ORDER BY order_index ASC, created_at ASC
  `, [], (err, links) => {
    if (err) {
      console.error('Erro ao buscar links para admin:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    
    // Estatísticas
    const stats = {
      total: links.length,
      active: links.filter(l => l.active === 1).length,
      inactive: links.filter(l => l.active === 0).length,
      byType: links.reduce((acc, link) => {
        acc[link.type] = (acc[link.type] || 0) + 1;
        return acc;
      }, {})
    };

    res.json({ links, stats });
  });
});

// POST /api/admin/useful-links - Criar novo link
router.post('/admin/useful-links', requireAdmin, (req, res) => {
  const { title, url, description, type, icon = 'link', active = 1, order_index = 0 } = req.body;

  if (!title || !url || !type) {
    return res.status(400).json({ error: 'Campos obrigatórios: title, url, type' });
  }

  db.run(`
    INSERT INTO useful_links (title, url, description, type, icon, active, order_index, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `, [title, url, description, type, icon, active ? 1 : 0, order_index], function(err) {
    if (err) {
      console.error('Erro ao criar link:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    db.get('SELECT * FROM useful_links WHERE id = ?', [this.lastID], (err, row) => {
      if (err) {
        console.error('Erro ao buscar link criado:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
      
      console.log(`✅ Link criado: ${title} (${type})`);
      res.status(201).json(row);
    });
  });
});

// PUT /api/admin/useful-links/:id - Atualizar link
router.put('/admin/useful-links/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { title, url, description, type, icon, active, order_index } = req.body;

  // Verificar se o link existe
  db.get('SELECT * FROM useful_links WHERE id = ?', [id], (err, existingLink) => {
    if (err) {
      console.error('Erro ao buscar link:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    
    if (!existingLink) {
      return res.status(404).json({ error: 'Link não encontrado' });
    }

    db.run(`
      UPDATE useful_links 
      SET title = ?, url = ?, description = ?, type = ?, icon = ?, active = ?, order_index = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      title || existingLink.title,
      url || existingLink.url,
      description !== undefined ? description : existingLink.description,
      type || existingLink.type,
      icon || existingLink.icon,
      active !== undefined ? (active ? 1 : 0) : existingLink.active,
      order_index !== undefined ? order_index : existingLink.order_index,
      id
    ], (err) => {
      if (err) {
        console.error('Erro ao atualizar link:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      db.get('SELECT * FROM useful_links WHERE id = ?', [id], (err, updatedLink) => {
        if (err) {
          console.error('Erro ao buscar link atualizado:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        console.log(`✅ Link atualizado: ${updatedLink.title}`);
        res.json(updatedLink);
      });
    });
  });
});

// DELETE /api/admin/useful-links/:id - Excluir link
router.delete('/admin/useful-links/:id', requireAdmin, (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM useful_links WHERE id = ?', [id], (err, existingLink) => {
    if (err) {
      console.error('Erro ao buscar link:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    
    if (!existingLink) {
      return res.status(404).json({ error: 'Link não encontrado' });
    }

    db.run('DELETE FROM useful_links WHERE id = ?', [id], (err) => {
      if (err) {
        console.error('Erro ao excluir link:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
      
      console.log(`🗑️ Link excluído: ${existingLink.title}`);
      res.json({ message: 'Link excluído com sucesso' });
    });
  });
});

// PATCH /api/admin/useful-links/:id/toggle - Alternar status ativo/inativo
router.patch('/admin/useful-links/:id/toggle', requireAdmin, (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM useful_links WHERE id = ?', [id], (err, existingLink) => {
    if (err) {
      console.error('Erro ao buscar link:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    
    if (!existingLink) {
      return res.status(404).json({ error: 'Link não encontrado' });
    }

    const newStatus = existingLink.active === 1 ? 0 : 1;
    db.run('UPDATE useful_links SET active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newStatus, id], (err) => {
      if (err) {
        console.error('Erro ao alternar status do link:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      db.get('SELECT * FROM useful_links WHERE id = ?', [id], (err, updatedLink) => {
        if (err) {
          console.error('Erro ao buscar link atualizado:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        console.log(`🔄 Status do link alterado: ${updatedLink.title} - ${newStatus ? 'Ativo' : 'Inativo'}`);
        res.json(updatedLink);
      });
    });
  });
});

// POST /api/admin/useful-links/reorder - Reordenar links
router.post('/admin/useful-links/reorder', requireAdmin, (req, res) => {
  const { links } = req.body;

  if (!Array.isArray(links)) {
    return res.status(400).json({ error: 'Links deve ser um array' });
  }

  // Processar todos os updates sequencialmente
  let completed = 0;
  const total = links.length;
  let hasError = false;

  if (total === 0) {
    return res.json({ message: 'Nenhum link para reordenar' });
  }

  links.forEach((link, index) => {
    if (hasError) return;
    
    db.run('UPDATE useful_links SET order_index = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [index, link.id], (err) => {
      if (err && !hasError) {
        hasError = true;
        console.error('Erro ao reordenar links:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
      
      completed++;
      if (completed === total && !hasError) {
        console.log(`🔄 ${links.length} links reordenados`);
        res.json({ message: 'Links reordenados com sucesso' });
      }
    });
  });
});

module.exports = router;