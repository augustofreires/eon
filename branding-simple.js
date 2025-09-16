const express = require('express');
const router = express.Router();
const { query } = require("../database/connection");
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
    const uploadDir = 'uploads/branding';
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

// Inicialização da tabela e dados padrão
async function initializeBrandingTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS branding_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform_name TEXT DEFAULT 'EON PRO',
        platform_subtitle TEXT DEFAULT 'Plataforma de Trading Inteligente',
        logo_url TEXT,
        favicon_url TEXT,
        online_users_count INTEGER DEFAULT 2105,
        courses_banner_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const existingConfig = await query('SELECT COUNT(*) as count FROM branding_config');
    if (existingConfig.rows[0].count === 0) {
      await query(`
        INSERT INTO branding_config (platform_name, platform_subtitle, online_users_count)
        VALUES (?, ?, ?)
      `, ['EON PRO', 'Plataforma de Trading Inteligente', 2105]);
      console.log('✅ Configuração padrão de branding criada');
    }
  } catch (err) {
    console.error('❌ Erro ao inicializar tabela branding:', err);
  }
}

// Inicializar ao carregar o módulo
initializeBrandingTable();

// GET /api/branding/config - Buscar configuração atual (público)
router.get('/config', async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM branding_config 
      ORDER BY updated_at DESC 
      LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Configuração de branding não encontrada' });
    }

    const config = result.rows[0];
    res.json({
      success: true,
      config: {
        platform_name: config.platform_name || 'EON PRO',
        platform_subtitle: config.platform_subtitle || 'Plataforma de Trading Inteligente',
        logo_url: config.logo_url,
        favicon_url: config.favicon_url,
        online_users_count: config.online_users_count || 2105,
        courses_banner_url: config.courses_banner_url
      }
    });
  } catch (err) {
    console.error('Erro ao buscar configuração de branding:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/admin/branding/config - Buscar configuração para admin
router.get('/admin/config', requireAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM branding_config 
      ORDER BY updated_at DESC 
      LIMIT 1
    `);
    
    const config = result.rows[0] || {
      platform_name: 'EON PRO',
      platform_subtitle: 'Plataforma de Trading Inteligente',
      online_users_count: 2105
    };

    res.json({
      success: true,
      config
    });
  } catch (err) {
    console.error('Erro ao buscar configuração de branding para admin:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/admin/branding/config - Atualizar configuração básica
router.post('/admin/config', requireAdmin, async (req, res) => {
  try {
    const { platform_name, platform_subtitle, online_users_count } = req.body;

    if (!platform_name || !platform_subtitle) {
      return res.status(400).json({ error: 'Nome da plataforma e subtítulo são obrigatórios' });
    }

    // Verificar se existe configuração
    const existingResult = await query('SELECT id FROM branding_config ORDER BY updated_at DESC LIMIT 1');
    
    let result;
    if (existingResult.rows.length > 0) {
      // Atualizar existente
      await query(`
        UPDATE branding_config 
        SET platform_name = ?, platform_subtitle = ?, online_users_count = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [platform_name, platform_subtitle, online_users_count || 2105, existingResult.rows[0].id]);
      
      result = await query('SELECT * FROM branding_config WHERE id = ?', [existingResult.rows[0].id]);
    } else {
      // Criar nova
      await query(`
        INSERT INTO branding_config (platform_name, platform_subtitle, online_users_count)
        VALUES (?, ?, ?)
      `, [platform_name, platform_subtitle, online_users_count || 2105]);
      
      result = await query('SELECT * FROM branding_config ORDER BY id DESC LIMIT 1');
    }

    res.json({
      success: true,
      message: 'Configuração atualizada com sucesso',
      config: result.rows[0]
    });
  } catch (err) {
    console.error('Erro ao atualizar configuração de branding:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/admin/branding/upload-logo - Upload de logo
router.post('/admin/upload-logo', requireAdmin, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const logoUrl = `/${req.file.path.replace(/\\/g, '/')}`;

    // Atualizar URL do logo na configuração
    const configResult = await query('SELECT id FROM branding_config ORDER BY updated_at DESC LIMIT 1');
    
    if (configResult.rows.length > 0) {
      await query(`
        UPDATE branding_config 
        SET logo_url = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [logoUrl, configResult.rows[0].id]);
    } else {
      await query(`
        INSERT INTO branding_config (logo_url, platform_name, platform_subtitle, online_users_count)
        VALUES (?, 'EON PRO', 'Plataforma de Trading Inteligente', 2105)
      `, [logoUrl]);
    }

    res.json({
      success: true,
      message: 'Logo enviado com sucesso',
      logo_url: logoUrl
    });
  } catch (err) {
    console.error('Erro ao fazer upload do logo:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;