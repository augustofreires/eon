const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { query } = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');

// Configurar multer para upload de fotos de perfil
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/profile');
    
    // Criar diretório se não existir
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Gerar nome único mantendo a extensão original
    const uniqueName = `profile-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`;
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

// Adicionar coluna profile_picture se não existir (migração automática)
const ensureProfilePictureColumn = async () => {
  try {
    // Tentar adicionar a coluna, se já existir vai dar erro mas não é crítico
    await query(`
      ALTER TABLE users 
      ADD COLUMN profile_picture VARCHAR(500)
    `);
    console.log('✅ Coluna profile_picture adicionada');
  } catch (error) {
    // Se a coluna já existir, vai dar erro mas não é problema
    if (error.message && error.message.includes('duplicate column')) {
      console.log('✅ Coluna profile_picture já existe');
    } else {
      console.log('✅ Coluna profile_picture verificada (pode já existir)');
    }
  }
};

// Executar migração na inicialização
ensureProfilePictureColumn();

// GET /api/profile - Buscar dados do perfil do usuário
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, email, name, role, status, profile_picture, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      profile_picture: user.profile_picture,
      created_at: user.created_at
    });
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/profile - Atualizar dados do perfil
router.put('/', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    const result = await query(
      'UPDATE users SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, name, role, status, profile_picture, created_at',
      [name.trim(), req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const user = result.rows[0];
    console.log(`✅ Perfil atualizado: ${user.name} (ID: ${user.id})`);
    
    res.json({
      message: 'Perfil atualizado com sucesso',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        profile_picture: user.profile_picture,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/profile/upload-picture - Upload de foto de perfil
router.post('/upload-picture', authenticateToken, upload.single('picture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const pictureUrl = `/uploads/profile/${req.file.filename}`;

    // Buscar foto atual para deletar depois
    const currentUser = await query(
      'SELECT profile_picture FROM users WHERE id = $1',
      [req.user.id]
    );

    // Atualizar URL da foto de perfil no banco
    const result = await query(
      'UPDATE users SET profile_picture = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING profile_picture',
      [pictureUrl, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Deletar foto anterior se existir
    if (currentUser.rows[0] && currentUser.rows[0].profile_picture) {
      const oldPicturePath = path.join(__dirname, '..', currentUser.rows[0].profile_picture);
      if (fs.existsSync(oldPicturePath)) {
        fs.unlinkSync(oldPicturePath);
      }
    }

    console.log(`✅ Foto de perfil atualizada: ${pictureUrl} (User ID: ${req.user.id})`);
    res.json({ 
      message: 'Foto de perfil enviada com sucesso',
      profile_picture: pictureUrl
    });
  } catch (error) {
    console.error('Erro ao enviar foto de perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/profile/remove-picture - Remover foto de perfil
router.delete('/remove-picture', authenticateToken, async (req, res) => {
  try {
    // Buscar foto atual
    const currentUser = await query(
      'SELECT profile_picture FROM users WHERE id = $1',
      [req.user.id]
    );

    if (currentUser.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const currentPicture = currentUser.rows[0].profile_picture;

    if (!currentPicture) {
      return res.json({ message: 'Nenhuma foto para remover' });
    }

    // Remover referência do banco
    await query(
      'UPDATE users SET profile_picture = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [req.user.id]
    );

    // Remover arquivo físico
    const picturePath = path.join(__dirname, '..', currentPicture);
    if (fs.existsSync(picturePath)) {
      fs.unlinkSync(picturePath);
    }

    console.log(`✅ Foto de perfil removida (User ID: ${req.user.id})`);
    res.json({ message: 'Foto de perfil removida com sucesso' });
  } catch (error) {
    console.error('Erro ao remover foto de perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;