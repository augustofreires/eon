const express = require('express');
const router = express.Router();
const { query } = require('../database/connection');

// Middleware de autenticação (simplificado para desenvolvimento)
const authenticateToken = (req, res, next) => {
  next();
};

const requireAdmin = (req, res, next) => {
  next();
};

// GET /api/useful-links - Listar todos os links úteis (público)
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM useful_links 
      WHERE is_active = 1 
      ORDER BY order_index ASC, created_at ASC
    `);

    res.json({
      success: true,
      useful_links: result.rows
    });
  } catch (err) {
    console.error('Erro ao buscar links úteis:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/useful-links/category/:category - Buscar links por categoria
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;

    const result = await query(`
      SELECT * FROM useful_links 
      WHERE category = ? AND is_active = 1 
      ORDER BY order_index ASC, created_at ASC
    `, [category]);

    res.json({
      success: true,
      useful_links: result.rows,
      category
    });
  } catch (err) {
    console.error('Erro ao buscar links por categoria:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/admin/useful-links - Listar todos os links para admin
router.get('/admin', requireAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM useful_links 
      ORDER BY order_index ASC, created_at ASC
    `);

    res.json({
      success: true,
      useful_links: result.rows
    });
  } catch (err) {
    console.error('Erro ao buscar links para admin:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/admin/useful-links/:id - Buscar link específico para edição
router.get('/admin/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query('SELECT * FROM useful_links WHERE id = ?', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Link não encontrado' });
    }

    res.json({
      success: true,
      useful_link: result.rows[0]
    });
  } catch (err) {
    console.error('Erro ao buscar link para edição:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/admin/useful-links - Criar novo link
router.post('/admin', requireAdmin, async (req, res) => {
  try {
    const { title, description, url, category, icon, order_index } = req.body;

    if (!title || !url) {
      return res.status(400).json({ error: 'Título e URL são obrigatórios' });
    }

    await query(`
      INSERT INTO useful_links (title, description, url, category, icon, order_index)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      title, 
      description || '', 
      url, 
      category || 'geral', 
      icon || 'fas fa-link', 
      order_index || 0
    ]);

    // Buscar o último link inserido usando método compatível com SQLite
    const newLink = await query('SELECT * FROM useful_links ORDER BY id DESC LIMIT 1');

    res.json({
      success: true,
      message: 'Link criado com sucesso',
      useful_link: newLink.rows[0]
    });
  } catch (err) {
    console.error('Erro ao criar link:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/admin/useful-links/:id - Atualizar link
router.put('/admin/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, url, category, icon, order_index, is_active } = req.body;

    // Verificar se o link existe
    const existingLink = await query('SELECT * FROM useful_links WHERE id = ?', [id]);
    if (existingLink.rows.length === 0) {
      return res.status(404).json({ error: 'Link não encontrado' });
    }

    // Atualizar o link
    await query(`
      UPDATE useful_links 
      SET title = ?, description = ?, url = ?, category = ?, icon = ?, 
          order_index = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      title || existingLink.rows[0].title,
      description !== undefined ? description : existingLink.rows[0].description,
      url || existingLink.rows[0].url,
      category || existingLink.rows[0].category,
      icon || existingLink.rows[0].icon,
      order_index !== undefined ? order_index : existingLink.rows[0].order_index,
      is_active !== undefined ? (is_active ? 1 : 0) : existingLink.rows[0].is_active,
      id
    ]);

    // Buscar o link atualizado
    const updatedLink = await query('SELECT * FROM useful_links WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Link atualizado com sucesso',
      useful_link: updatedLink.rows[0]
    });
  } catch (err) {
    console.error('Erro ao atualizar link:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/admin/useful-links/:id - Deletar link
router.delete('/admin/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o link existe
    const existingLink = await query('SELECT * FROM useful_links WHERE id = ?', [id]);
    if (existingLink.rows.length === 0) {
      return res.status(404).json({ error: 'Link não encontrado' });
    }

    // Deletar o link
    await query('DELETE FROM useful_links WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Link deletado com sucesso'
    });
  } catch (err) {
    console.error('Erro ao deletar link:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;