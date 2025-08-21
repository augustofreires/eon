const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../database/connection');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Listar todos os cursos (apenas usuários logados)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM courses 
      WHERE is_active = true 
      ORDER BY module, order_index
    `);

    // Agrupar por módulo
    const coursesByModule = result.rows.reduce((acc, course) => {
      if (!acc[course.module]) {
        acc[course.module] = [];
      }
      acc[course.module].push(course);
      return acc;
    }, {});

    res.json({
      courses: coursesByModule,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Erro ao listar cursos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter detalhes de um curso específico
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT * FROM courses 
      WHERE id = $1 AND is_active = true
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    res.json({ course: result.rows[0] });

  } catch (error) {
    console.error('Erro ao buscar curso:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo curso (apenas admin)
router.post('/', authenticateToken, requireAdmin, [
  body('title').notEmpty().trim(),
  body('description').optional().trim(),
  body('module').notEmpty().trim(),
  body('youtube_url').isURL(),
  body('duration').optional().isInt({ min: 0 }),
  body('order_index').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, module, youtube_url, duration, order_index = 0 } = req.body;

    // Extrair ID do YouTube da URL
    const youtubeId = extractYouTubeId(youtube_url);
    if (!youtubeId) {
      return res.status(400).json({ error: 'URL do YouTube inválida' });
    }

    const result = await query(`
      INSERT INTO courses (title, description, module, youtube_url, duration, order_index)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, title, description, module, youtube_url, duration, order_index, created_at
    `, [title, description, module, youtube_url, duration, order_index]);

    const course = result.rows[0];

    res.status(201).json({
      message: 'Curso criado com sucesso',
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
        module: course.module,
        youtube_url: course.youtube_url,
        duration: course.duration,
        order_index: course.order_index,
        created_at: course.created_at
      }
    });

  } catch (error) {
    console.error('Erro ao criar curso:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar curso (apenas admin)
router.put('/:id', authenticateToken, requireAdmin, [
  body('title').optional().notEmpty().trim(),
  body('description').optional().trim(),
  body('module').optional().notEmpty().trim(),
  body('youtube_url').optional().isURL(),
  body('duration').optional().isInt({ min: 0 }),
  body('order_index').optional().isInt({ min: 0 }),
  body('is_active').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { title, description, module, youtube_url, duration, order_index, is_active } = req.body;

    // Verificar se o curso existe
    const courseExists = await query('SELECT id FROM courses WHERE id = $1', [id]);
    if (courseExists.rows.length === 0) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    // Validar URL do YouTube se fornecida
    if (youtube_url) {
      const youtubeId = extractYouTubeId(youtube_url);
      if (!youtubeId) {
        return res.status(400).json({ error: 'URL do YouTube inválida' });
      }
    }

    // Construir query de atualização
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (title !== undefined) {
      updateFields.push(`title = $${paramCount++}`);
      values.push(title);
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      values.push(description);
    }

    if (module !== undefined) {
      updateFields.push(`module = $${paramCount++}`);
      values.push(module);
    }

    if (youtube_url !== undefined) {
      updateFields.push(`youtube_url = $${paramCount++}`);
      values.push(youtube_url);
    }

    if (duration !== undefined) {
      updateFields.push(`duration = $${paramCount++}`);
      values.push(duration);
    }

    if (order_index !== undefined) {
      updateFields.push(`order_index = $${paramCount++}`);
      values.push(order_index);
    }

    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    values.push(id);

    const result = await query(`
      UPDATE courses 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, title, description, module, youtube_url, duration, order_index, is_active
    `, values);

    res.json({
      message: 'Curso atualizado com sucesso',
      course: result.rows[0]
    });

  } catch (error) {
    console.error('Erro ao atualizar curso:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Remover curso (apenas admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o curso existe
    const courseExists = await query('SELECT id FROM courses WHERE id = $1', [id]);
    if (courseExists.rows.length === 0) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    // Remover curso
    await query('DELETE FROM courses WHERE id = $1', [id]);

    res.json({ message: 'Curso removido com sucesso' });

  } catch (error) {
    console.error('Erro ao remover curso:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar módulos disponíveis
router.get('/modules/list', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT DISTINCT module 
      FROM courses 
      WHERE is_active = true 
      ORDER BY module
    `);

    const modules = result.rows.map(row => row.module);

    res.json({ modules });

  } catch (error) {
    console.error('Erro ao listar módulos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar cursos por módulo
router.get('/module/:module', authenticateToken, async (req, res) => {
  try {
    const { module } = req.params;

    const result = await query(`
      SELECT * FROM courses 
      WHERE module = $1 AND is_active = true 
      ORDER BY order_index
    `, [module]);

    res.json({
      module: module,
      courses: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Erro ao buscar cursos por módulo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Função para extrair ID do YouTube
function extractYouTubeId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

module.exports = router; 