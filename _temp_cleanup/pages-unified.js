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

// Inicialização da tabela
async function initializeEditablePagesTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS editable_pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        page_key TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        meta_description TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Inserir páginas padrão se não existirem
    const existingPages = await query('SELECT COUNT(*) as count FROM editable_pages');
    if (existingPages.rows[0].count === 0) {
      const defaultPages = [
        {
          page_key: 'home',
          title: 'Página Inicial',
          content: '<h1>Bem-vindo ao EON PRO</h1><p>Sua plataforma de trading inteligente.</p>',
          meta_description: 'Página inicial da plataforma EON PRO'
        },
        {
          page_key: 'about',
          title: 'Sobre Nós',
          content: '<h1>Sobre o EON PRO</h1><p>Somos uma plataforma inovadora de trading.</p>',
          meta_description: 'Conheça mais sobre a plataforma EON PRO'
        }
      ];

      for (const page of defaultPages) {
        await query(`
          INSERT INTO editable_pages (page_key, title, content, meta_description)
          VALUES (?, ?, ?, ?)
        `, [page.page_key, page.title, page.content, page.meta_description]);
      }
      console.log('✅ Páginas padrão criadas');
    }
  } catch (err) {
    console.error('❌ Erro ao inicializar tabela editable_pages:', err);
  }
}

// Inicializar ao carregar o módulo
initializeEditablePagesTable();

// GET /api/pages - Listar todas as páginas ativas (público)
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT page_key, title, content, meta_description 
      FROM editable_pages 
      WHERE is_active = 1 
      ORDER BY page_key ASC
    `);

    res.json({
      success: true,
      pages: result.rows
    });
  } catch (err) {
    console.error('Erro ao buscar páginas:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/pages/:pageKey - Buscar página específica (público)
router.get('/:pageKey', async (req, res) => {
  try {
    const { pageKey } = req.params;

    const result = await query(`
      SELECT page_key, title, content, meta_description 
      FROM editable_pages 
      WHERE page_key = ? AND is_active = 1
    `, [pageKey]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Página não encontrada' });
    }

    res.json({
      success: true,
      page: result.rows[0]
    });
  } catch (err) {
    console.error('Erro ao buscar página:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/admin/pages - Listar todas as páginas para admin
router.get('/admin', requireAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM editable_pages 
      ORDER BY page_key ASC
    `);

    res.json({
      success: true,
      pages: result.rows
    });
  } catch (err) {
    console.error('Erro ao buscar páginas para admin:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/admin/pages/:id - Buscar página específica para edição
router.get('/admin/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query('SELECT * FROM editable_pages WHERE id = ?', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Página não encontrada' });
    }

    res.json({
      success: true,
      page: result.rows[0]
    });
  } catch (err) {
    console.error('Erro ao buscar página para edição:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/admin/pages - Criar nova página
router.post('/admin', requireAdmin, async (req, res) => {
  try {
    const { page_key, title, content, meta_description } = req.body;

    if (!page_key || !title) {
      return res.status(400).json({ error: 'Chave da página e título são obrigatórios' });
    }

    // Verificar se a chave já existe
    const existingPage = await query('SELECT id FROM editable_pages WHERE page_key = ?', [page_key]);
    if (existingPage.rows.length > 0) {
      return res.status(400).json({ error: 'Já existe uma página com essa chave' });
    }

    const result = await query(`
      INSERT INTO editable_pages (page_key, title, content, meta_description)
      VALUES (?, ?, ?, ?)
    `, [page_key, title, content || '', meta_description || '']);

    // Buscar a página criada
    const newPage = await query('SELECT * FROM editable_pages WHERE id = ?', [result.insertId]);

    res.json({
      success: true,
      message: 'Página criada com sucesso',
      page: newPage.rows[0]
    });
  } catch (err) {
    console.error('Erro ao criar página:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/admin/pages/:id - Atualizar página
router.put('/admin/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { page_key, title, content, meta_description, is_active } = req.body;

    // Verificar se a página existe
    const existingPage = await query('SELECT * FROM editable_pages WHERE id = ?', [id]);
    if (existingPage.rows.length === 0) {
      return res.status(404).json({ error: 'Página não encontrada' });
    }

    // Se mudou a chave, verificar se a nova chave já existe
    if (page_key && page_key !== existingPage.rows[0].page_key) {
      const keyExists = await query('SELECT id FROM editable_pages WHERE page_key = ? AND id != ?', [page_key, id]);
      if (keyExists.rows.length > 0) {
        return res.status(400).json({ error: 'Já existe uma página com essa chave' });
      }
    }

    // Atualizar a página
    await query(`
      UPDATE editable_pages 
      SET page_key = ?, title = ?, content = ?, meta_description = ?, 
          is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      page_key || existingPage.rows[0].page_key,
      title || existingPage.rows[0].title,
      content !== undefined ? content : existingPage.rows[0].content,
      meta_description !== undefined ? meta_description : existingPage.rows[0].meta_description,
      is_active !== undefined ? (is_active ? 1 : 0) : existingPage.rows[0].is_active,
      id
    ]);

    // Buscar a página atualizada
    const updatedPage = await query('SELECT * FROM editable_pages WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Página atualizada com sucesso',
      page: updatedPage.rows[0]
    });
  } catch (err) {
    console.error('Erro ao atualizar página:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/admin/pages/:id - Deletar página
router.delete('/admin/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se a página existe
    const existingPage = await query('SELECT * FROM editable_pages WHERE id = ?', [id]);
    if (existingPage.rows.length === 0) {
      return res.status(404).json({ error: 'Página não encontrada' });
    }

    // Deletar a página
    await query('DELETE FROM editable_pages WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Página deletada com sucesso'
    });
  } catch (err) {
    console.error('Erro ao deletar página:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;