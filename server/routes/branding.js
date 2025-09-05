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

// Configurar multer para upload de arquivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/branding');
    
    // Criar diretório se não existir
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Gerar nome único mantendo a extensão original
    const uniqueName = `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`;
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
  CREATE TABLE IF NOT EXISTS branding_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform_name TEXT DEFAULT 'EON PRO',
    platform_subtitle TEXT DEFAULT 'Plataforma de Trading Inteligente',
    logo_url TEXT,
    favicon_url TEXT,
    courses_banner_url TEXT,
    online_users_count INTEGER DEFAULT 2105,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`, (err) => {
  if (err) {
    console.error('❌ Erro ao criar tabela branding_config:', err);
  } else {
    console.log('✅ Tabela branding_config criada/verificada');
    
    // Adicionar coluna online_users_count se não existir
    db.run(`ALTER TABLE branding_config ADD COLUMN online_users_count INTEGER DEFAULT 2105`, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('❌ Erro ao adicionar coluna online_users_count:', err);
      } else {
        console.log('✅ Coluna online_users_count verificada/adicionada');
      }
    });

    // Adicionar coluna courses_banner_url se não existir
    db.run(`ALTER TABLE branding_config ADD COLUMN courses_banner_url TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('❌ Erro ao adicionar coluna courses_banner_url:', err);
      } else {
        console.log('✅ Coluna courses_banner_url verificada/adicionada');
      }
    });
    
    // Inserir configuração padrão se não existir
    db.get('SELECT COUNT(*) as count FROM branding_config', [], (err, row) => {
      if (!err && row.count === 0) {
        db.run(`
          INSERT INTO branding_config (platform_name, platform_subtitle, online_users_count)
          VALUES (?, ?, ?)
        `, ['EON PRO', 'Plataforma de Trading Inteligente', 2105], (err) => {
          if (!err) {
            console.log('✅ Configuração padrão de branding criada');
          }
        });
      }
    });
  }
});

// GET /api/branding/config - Buscar configuração atual (público)
router.get('/config', (req, res) => {
  db.get(`
    SELECT * FROM branding_config 
    ORDER BY updated_at DESC 
    LIMIT 1
  `, [], (err, config) => {
    if (err) {
      console.error('Erro ao buscar configuração de branding:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    
    if (!config) {
      // Retornar configuração padrão se não existir
      return res.json({
        platform_name: 'EON PRO',
        platform_subtitle: 'Plataforma de Trading Inteligente',
        logo_url: null,
        favicon_url: null,
        courses_banner_url: null,
        online_users_count: 2105
      });
    }
    
    res.json(config);
  });
});

// GET /api/admin/branding/config - Buscar configuração para admin
router.get('/admin/config', requireAdmin, (req, res) => {
  db.get(`
    SELECT * FROM branding_config 
    ORDER BY updated_at DESC 
    LIMIT 1
  `, [], (err, config) => {
    if (err) {
      console.error('Erro ao buscar configuração de branding para admin:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    
    if (!config) {
      // Retornar configuração padrão se não existir
      return res.json({
        id: null,
        platform_name: 'EON PRO',
        platform_subtitle: 'Plataforma de Trading Inteligente',
        logo_url: null,
        favicon_url: null,
        courses_banner_url: null,
        online_users_count: 2105
      });
    }
    
    res.json(config);
  });
});

// PUT /api/admin/branding/config - Atualizar configuração
router.put('/admin/config', requireAdmin, (req, res) => {
  const { platform_name, platform_subtitle, online_users_count } = req.body;

  if (!platform_name || !platform_subtitle) {
    return res.status(400).json({ error: 'Nome e subtítulo da plataforma são obrigatórios' });
  }

  // Primeiro, verificar se existe uma configuração
  db.get('SELECT id FROM branding_config ORDER BY updated_at DESC LIMIT 1', [], (err, existingConfig) => {
    if (err) {
      console.error('Erro ao verificar configuração existente:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    if (existingConfig) {
      // Atualizar configuração existente
      db.run(`
        UPDATE branding_config 
        SET platform_name = ?, platform_subtitle = ?, online_users_count = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [platform_name, platform_subtitle, online_users_count || 2105, existingConfig.id], function(err) {
        if (err) {
          console.error('Erro ao atualizar configuração de branding:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }

        // Buscar configuração atualizada
        db.get('SELECT * FROM branding_config WHERE id = ?', [existingConfig.id], (err, updatedConfig) => {
          if (err) {
            console.error('Erro ao buscar configuração atualizada:', err);
            return res.status(500).json({ error: 'Erro interno do servidor' });
          }
          
          console.log(`✅ Configuração de branding atualizada: ${updatedConfig.platform_name}`);
          res.json(updatedConfig);
        });
      });
    } else {
      // Criar nova configuração
      db.run(`
        INSERT INTO branding_config (platform_name, platform_subtitle, online_users_count)
        VALUES (?, ?, ?)
      `, [platform_name, platform_subtitle, online_users_count || 2105], function(err) {
        if (err) {
          console.error('Erro ao criar configuração de branding:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }

        // Buscar configuração criada
        db.get('SELECT * FROM branding_config WHERE id = ?', [this.lastID], (err, newConfig) => {
          if (err) {
            console.error('Erro ao buscar nova configuração:', err);
            return res.status(500).json({ error: 'Erro interno do servidor' });
          }
          
          console.log(`✅ Nova configuração de branding criada: ${newConfig.platform_name}`);
          res.status(201).json(newConfig);
        });
      });
    }
  });
});

// POST /api/admin/branding/upload-logo - Upload de logo
router.post('/admin/upload-logo', requireAdmin, upload.single('logo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const logoUrl = `/uploads/branding/${req.file.filename}`;

  // Atualizar URL do logo na configuração
  db.get('SELECT id FROM branding_config ORDER BY updated_at DESC LIMIT 1', [], (err, config) => {
    if (err) {
      console.error('Erro ao buscar configuração para atualizar logo:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    if (config) {
      db.run(`
        UPDATE branding_config 
        SET logo_url = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [logoUrl, config.id], function(err) {
        if (err) {
          console.error('Erro ao atualizar URL do logo:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }

        console.log(`✅ Logo atualizado: ${logoUrl}`);
        res.json({ 
          message: 'Logo enviado com sucesso',
          logo_url: logoUrl
        });
      });
    } else {
      // Criar nova configuração com logo
      db.run(`
        INSERT INTO branding_config (logo_url, platform_name, platform_subtitle, online_users_count)
        VALUES (?, 'EON PRO', 'Plataforma de Trading Inteligente', 2105)
      `, [logoUrl], function(err) {
        if (err) {
          console.error('Erro ao criar configuração com logo:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }

        console.log(`✅ Configuração criada com logo: ${logoUrl}`);
        res.json({ 
          message: 'Logo enviado com sucesso',
          logo_url: logoUrl
        });
      });
    }
  });
});

// POST /api/admin/branding/upload-favicon - Upload de favicon
router.post('/admin/upload-favicon', requireAdmin, upload.single('favicon'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const faviconUrl = `/uploads/branding/${req.file.filename}`;

  // Atualizar URL do favicon na configuração
  db.get('SELECT id FROM branding_config ORDER BY updated_at DESC LIMIT 1', [], (err, config) => {
    if (err) {
      console.error('Erro ao buscar configuração para atualizar favicon:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    if (config) {
      db.run(`
        UPDATE branding_config 
        SET favicon_url = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [faviconUrl, config.id], function(err) {
        if (err) {
          console.error('Erro ao atualizar URL do favicon:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }

        console.log(`✅ Favicon atualizado: ${faviconUrl}`);
        res.json({ 
          message: 'Favicon enviado com sucesso',
          favicon_url: faviconUrl
        });
      });
    } else {
      // Criar nova configuração com favicon
      db.run(`
        INSERT INTO branding_config (favicon_url, platform_name, platform_subtitle, online_users_count)
        VALUES (?, 'EON PRO', 'Plataforma de Trading Inteligente', 2105)
      `, [faviconUrl], function(err) {
        if (err) {
          console.error('Erro ao criar configuração com favicon:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }

        console.log(`✅ Configuração criada com favicon: ${faviconUrl}`);
        res.json({ 
          message: 'Favicon enviado com sucesso',
          favicon_url: faviconUrl
        });
      });
    }
  });
});

// POST /api/admin/branding/upload-courses-banner - Upload de banner para página de cursos
router.post('/admin/upload-courses-banner', requireAdmin, upload.single('banner'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const bannerUrl = `/uploads/branding/${req.file.filename}`;

  // Atualizar URL do banner de cursos na configuração
  db.get('SELECT id FROM branding_config ORDER BY updated_at DESC LIMIT 1', [], (err, config) => {
    if (err) {
      console.error('Erro ao buscar configuração para atualizar banner de cursos:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    if (config) {
      db.run(`
        UPDATE branding_config 
        SET courses_banner_url = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [bannerUrl, config.id], function(err) {
        if (err) {
          console.error('Erro ao atualizar URL do banner de cursos:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }

        console.log(`✅ Banner de cursos atualizado: ${bannerUrl}`);
        res.json({ 
          message: 'Banner de cursos enviado com sucesso',
          courses_banner_url: bannerUrl
        });
      });
    } else {
      // Criar nova configuração com banner
      db.run(`
        INSERT INTO branding_config (courses_banner_url, platform_name, platform_subtitle, online_users_count)
        VALUES (?, 'EON PRO', 'Plataforma de Trading Inteligente', 2105)
      `, [bannerUrl], function(err) {
        if (err) {
          console.error('Erro ao criar configuração com banner de cursos:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }

        console.log(`✅ Configuração criada com banner de cursos: ${bannerUrl}`);
        res.json({ 
          message: 'Banner de cursos enviado com sucesso',
          courses_banner_url: bannerUrl
        });
      });
    }
  });
});

// DELETE /api/admin/branding/remove-courses-banner - Remover banner da página de cursos
router.delete('/admin/remove-courses-banner', requireAdmin, (req, res) => {
  db.get('SELECT id, courses_banner_url FROM branding_config ORDER BY updated_at DESC LIMIT 1', [], (err, config) => {
    if (err) {
      console.error('Erro ao buscar configuração para remover banner:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    if (config && config.courses_banner_url) {
      // Remover arquivo físico
      const filePath = path.join(__dirname, '..', config.courses_banner_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Atualizar banco de dados
      db.run(`
        UPDATE branding_config 
        SET courses_banner_url = NULL, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [config.id], function(err) {
        if (err) {
          console.error('Erro ao remover banner de cursos:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }

        console.log('✅ Banner de cursos removido');
        res.json({ message: 'Banner removido com sucesso' });
      });
    } else {
      res.json({ message: 'Nenhum banner para remover' });
    }
  });
});

module.exports = router;