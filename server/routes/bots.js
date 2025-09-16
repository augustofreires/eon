const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const { query } = require('../database/connection');
const { authenticateToken, requireAdmin, requireBotAccess } = require('../middleware/auth');

const router = express.Router();

// Configuração do Multer para upload de arquivos XML
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'bot-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'xml') {
      if (file.mimetype === 'application/xml' || file.originalname.endsWith('.xml')) {
        cb(null, true);
      } else {
        cb(new Error('Arquivo XML deve ter extensão .xml'), false);
      }
    } else if (file.fieldname === 'image') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Arquivo de imagem inválido'), false);
      }
    } else {
      cb(new Error('Campo de arquivo não reconhecido'), false);
    }
  }
});

// Listar todos os bots (admin) ou bots disponíveis (cliente)
router.get('/', authenticateToken, async (req, res) => {
  try {
    let result;
    
    if (req.user.role === 'admin') {
      // Admin vê todos os bots
      result = await query(`
        SELECT b.*, u.email as created_by_email 
        FROM bots b 
        LEFT JOIN users u ON b.created_by = u.id 
        ORDER BY b.created_at DESC
      `);
    } else {
      // Cliente vê todos os bots ativos (simplificado por enquanto)
      result = await query(`
        SELECT b.*
        FROM bots b
        WHERE b.is_active = true
        ORDER BY b.created_at DESC
      `);
    }

    // CORREÇÃO: Frontend espera array direto, não objeto
    console.log(`✅ Retornando ${result.rows.length} bots disponíveis`);
    res.json(result.rows);

  } catch (error) {
    console.error('Erro ao listar bots:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar bot via JSON (apenas admin)
router.post('/', authenticateToken, requireAdmin, [
  body('name').notEmpty().trim(),
  body('description').optional().trim(),
  body('xml_content').notEmpty(),
  body('xml_filename').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, xml_content, xml_filename } = req.body;

    // Validar se é um XML válido
    try {
      if (!xml_content.includes('<?xml') && !xml_content.includes('<block')) {
        throw new Error('Arquivo XML inválido');
      }
    } catch (xmlError) {
      return res.status(400).json({ error: 'Conteúdo XML inválido' });
    }

    // Inserir bot no banco
    const result = await query(`
      INSERT INTO bots (name, description, xml_content, xml_filename, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, description, created_at
    `, [name, description, xml_content, xml_filename || `${name}.xml`, req.user.id]);

    const bot = result.rows[0];

    res.status(201).json({
      message: 'Bot criado com sucesso',
      bot: {
        id: bot.id,
        name: bot.name,
        description: bot.description,
        created_at: bot.created_at
      }
    });

  } catch (error) {
    console.error('Erro ao criar bot:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Upload de bot XML com imagem opcional (apenas admin)  
router.post('/upload', authenticateToken, requireAdmin, upload.fields([
  { name: 'xml', maxCount: 1 },
  { name: 'image', maxCount: 1 }
]), [
  body('name').notEmpty().trim(),
  body('description').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.files || !req.files.xml) {
      return res.status(400).json({ error: 'Arquivo XML necessário' });
    }

    const { name, description } = req.body;
    const xmlFile = req.files.xml[0];
    const imageFile = req.files.image ? req.files.image[0] : null;
    
    const xmlContent = fs.readFileSync(xmlFile.path, 'utf8');
    let imageUrl = null;
    
    if (imageFile) {
      imageUrl = `/uploads/${imageFile.filename}`;
    }

    // Validar se é um XML válido
    try {
      // Verificação básica de XML
      if (!xmlContent.includes('<?xml') && !xmlContent.includes('<block')) {
        throw new Error('Arquivo XML inválido');
      }
    } catch (xmlError) {
      // Remover arquivos inválidos
      fs.unlinkSync(xmlFile.path);
      if (imageFile) fs.unlinkSync(imageFile.path);
      return res.status(400).json({ error: 'Arquivo XML inválido' });
    }

    // Inserir bot no banco
    const result = await query(`
      INSERT INTO bots (name, description, xml_content, xml_filename, image_url, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, description, created_at
    `, [name, description, xmlContent, xmlFile.filename, imageUrl, req.user.id]);

    const bot = result.rows[0];

    res.status(201).json({
      message: 'Bot criado com sucesso',
      bot: {
        id: bot.id,
        name: bot.name,
        description: bot.description,
        filename: xmlFile.filename,
        image_url: imageUrl,
        created_at: bot.created_at
      }
    });

  } catch (error) {
    console.error('Erro ao fazer upload do bot:', error);
    
    // Remover arquivos em caso de erro
    if (req.files) {
      if (req.files.xml && fs.existsSync(req.files.xml[0].path)) {
        fs.unlinkSync(req.files.xml[0].path);
      }
      if (req.files.image && fs.existsSync(req.files.image[0].path)) {
        fs.unlinkSync(req.files.image[0].path);
      }
    }
    
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Upload de imagem para bot existente (apenas admin)
router.post('/:id/image', authenticateToken, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'Imagem necessária' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    // Buscar bot existente para remover imagem antiga
    const existingBot = await query('SELECT image_url FROM bots WHERE id = $1', [id]);
    
    if (existingBot.rows.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Bot não encontrado' });
    }

    // Remover imagem antiga se existir
    const oldImageUrl = existingBot.rows[0].image_url;
    if (oldImageUrl) {
      const oldImagePath = path.join(__dirname, '..', oldImageUrl);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // Atualizar bot com nova imagem
    await query('UPDATE bots SET image_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [imageUrl, id]);

    res.json({
      message: 'Imagem do bot atualizada com sucesso',
      image_url: imageUrl
    });

  } catch (error) {
    console.error('Erro ao fazer upload da imagem do bot:', error);
    
    // Remover arquivo em caso de erro
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter detalhes de um bot específico
router.get('/:id', authenticateToken, requireBotAccess, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT b.*, u.name as created_by_name
      FROM bots b
      LEFT JOIN users u ON b.created_by = u.id
      WHERE b.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bot não encontrado' });
    }

    const bot = result.rows[0];

    // Cliente não pode ver o conteúdo XML
    if (req.user.role !== 'admin') {
      delete bot.xml_content;
    }

    res.json({ bot });

  } catch (error) {
    console.error('Erro ao buscar bot:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar bot (apenas admin)
router.put('/:id', authenticateToken, requireAdmin, [
  body('name').optional().notEmpty().trim(),
  body('description').optional().trim(),
  body('is_active').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, description, is_active } = req.body;

    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramCount++}`);
      values.push(name);
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      values.push(description);
    }

    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await query(`
      UPDATE bots 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, name, description, is_active, updated_at
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bot não encontrado' });
    }

    res.json({
      message: 'Bot atualizado com sucesso',
      bot: result.rows[0]
    });

  } catch (error) {
    console.error('Erro ao atualizar bot:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Remover bot (apenas admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar informações do bot para remover arquivo
    const botResult = await query('SELECT xml_filename FROM bots WHERE id = $1', [id]);
    
    if (botResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bot não encontrado' });
    }

    const bot = botResult.rows[0];

    // Remover permissões primeiro
    await query('DELETE FROM user_bot_permissions WHERE bot_id = $1', [id]);

    // Remover operações relacionadas
    await query('DELETE FROM operations WHERE bot_id = $1', [id]);

    // Remover bot
    await query('DELETE FROM bots WHERE id = $1', [id]);

    // Remover arquivo XML
    if (bot.xml_filename) {
      const filePath = path.join(process.env.UPLOAD_PATH || './uploads', bot.xml_filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.json({ message: 'Bot removido com sucesso' });

  } catch (error) {
    console.error('Erro ao remover bot:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Gerenciar permissões de usuários para bots (apenas admin)
router.post('/:id/permissions', authenticateToken, requireAdmin, [
  body('user_id').isInt(),
  body('can_access').isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id: botId } = req.params;
    const { user_id, can_access } = req.body;

    // Verificar se o bot existe
    const botExists = await query('SELECT id FROM bots WHERE id = $1', [botId]);
    if (botExists.rows.length === 0) {
      return res.status(404).json({ error: 'Bot não encontrado' });
    }

    // Verificar se o usuário existe
    const userExists = await query('SELECT id FROM users WHERE id = $1', [user_id]);
    if (userExists.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Inserir ou atualizar permissão
    await query(`
      INSERT INTO user_bot_permissions (user_id, bot_id, can_access)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, bot_id)
      DO UPDATE SET can_access = $3
    `, [user_id, botId, can_access]);

    res.json({
      message: `Permissão ${can_access ? 'concedida' : 'revogada'} com sucesso`
    });

  } catch (error) {
    console.error('Erro ao gerenciar permissões:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar permissões de um bot (apenas admin)
router.get('/:id/permissions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id: botId } = req.params;

    const result = await query(`
      SELECT ubp.*, u.name, u.email
      FROM user_bot_permissions ubp
      INNER JOIN users u ON ubp.user_id = u.id
      WHERE ubp.bot_id = $1
      ORDER BY u.name
    `, [botId]);

    res.json({
      permissions: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Erro ao listar permissões:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router; 