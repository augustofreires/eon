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
async function initializePagesTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS editable_pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        meta_description TEXT,
        is_published INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Inserir páginas padrão se não existirem
    const existingPages = await query('SELECT COUNT(*) as count FROM editable_pages');
    if (existingPages.rows[0].count === 0) {
      const defaultPages = [
        {
          slug: 'about',
          title: 'Quem Somos',
          content: `# Quem Somos

## Nossa Missão

Somos uma empresa especializada em soluções de trading automatizado para a plataforma Deriv. Nossa missão é democratizar o acesso a estratégias de trading avançadas através de bots inteligentes e seguros.

## Nossa Visão

Ser a principal referência em automação de trading no mercado brasileiro, oferecendo tecnologia de ponta e suporte especializado para traders de todos os níveis.

## Nossos Valores

- **Transparência**: Operamos com total clareza sobre nossos métodos e resultados
- **Inovação**: Sempre buscamos as melhores tecnologias do mercado
- **Segurança**: Priorizamos a proteção dos investimentos de nossos clientes
- **Suporte**: Oferecemos acompanhamento completo durante toda a jornada

## Experiência e Expertise

Com anos de experiência no mercado financeiro e desenvolvimento de software, nossa equipe combina conhecimento técnico e expertise em trading para criar soluções que realmente funcionam.

## Compromisso com Resultados

Nossos bots são desenvolvidos e testados exaustivamente para garantir performance consistente e gerenciamento de risco adequado.`,
          meta_description: 'Conheça nossa empresa especializada em bots de trading automatizado para Deriv. Missão, visão, valores e compromisso com resultados.'
        },
        {
          slug: 'terms',
          title: 'Termos e Condições',
          content: `# Termos e Condições de Uso

**Última atualização:** ${new Date().toLocaleDateString('pt-BR')}

## 1. Aceitação dos Termos

Ao acessar e usar nossa plataforma de bots de trading, você concorda integralmente com estes Termos e Condições. Se você não concorda com algum destes termos, não deve utilizar nossos serviços.

## 2. Descrição dos Serviços

Nossa plataforma oferece:
- Acesso a bots de trading automatizado
- Ferramentas de análise e configuração
- Suporte técnico especializado
- Material educativo sobre trading

## 3. Responsabilidades do Usuário

### 3.1 Idade Mínima
Você deve ter pelo menos 18 anos para usar nossos serviços.

### 3.2 Informações Precisas
Você deve fornecer informações precisas e atualizadas durante o cadastro.

### 3.3 Segurança da Conta
Você é responsável por manter a confidencialidade de suas credenciais de acesso.

## 4. Riscos do Trading

### 4.1 Aviso Importante
Trading envolve riscos significativos de perda financeira. Você pode perder parte ou todo o capital investido.

### 4.2 Não Garantimos Lucros
Nossos bots são ferramentas de automação, mas não garantimos lucros ou resultados específicos.

### 4.3 Responsabilidade Limitada
A empresa não se responsabiliza por perdas decorrentes do uso dos bots ou decisões de trading.

## 5. Propriedade Intelectual

Todos os bots, algoritmos e materiais são propriedade exclusiva da empresa e protegidos por direitos autorais.

## 6. Política de Reembolso

Os reembolsos são analisados caso a caso, conforme nossa política específica disponível no suporte.

## 7. Suspensão de Conta

Reservamo-nos o direito de suspender contas que violem estes termos ou apresentem uso inadequado da plataforma.

## 8. Modificações nos Termos

Podemos alterar estes termos a qualquer momento. As alterações entram em vigor imediatamente após a publicação.

## 9. Lei Aplicável

Estes termos são regidos pelas leis brasileiras.

## 10. Contato

Para dúvidas sobre estes termos, entre em contato através dos canais disponíveis na plataforma.

---

**IMPORTANTE:** Este documento é parte integrante do contrato de prestação de serviços. Leia cuidadosamente antes de usar nossa plataforma.`,
          meta_description: 'Termos e Condições de uso da nossa plataforma de bots de trading. Leia os termos antes de utilizar nossos serviços.'
        }
      ];

      for (const page of defaultPages) {
        await query(`
          INSERT OR IGNORE INTO editable_pages (slug, title, content, meta_description)
          VALUES (?, ?, ?, ?)
        `, [page.slug, page.title, page.content, page.meta_description]);
        console.log(`✅ Página padrão criada: ${page.title}`);
      }
    }
  } catch (err) {
    console.error('❌ Erro ao inicializar tabela editable_pages:', err);
  }
}

// Inicializar ao carregar o módulo
initializePagesTable();

// GET /api/pages/:slug - Buscar página específica (público)
router.get('/pages/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const result = await query(`
      SELECT * FROM editable_pages 
      WHERE slug = ? AND is_published = 1
    `, [slug]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Página não encontrada' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar página:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/admin/pages - Listar todas as páginas (admin)
router.get('/admin/pages', requireAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM editable_pages 
      ORDER BY created_at ASC
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar páginas para admin:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/admin/pages/:id - Buscar página específica para edição (admin)
router.get('/admin/pages/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query('SELECT * FROM editable_pages WHERE id = ?', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Página não encontrada' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar página:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/admin/pages/:id - Atualizar página (admin)
router.put('/admin/pages/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, meta_description, is_published } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Título e conteúdo são obrigatórios' });
    }

    await query(`
      UPDATE editable_pages 
      SET title = ?, content = ?, meta_description = ?, is_published = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [title, content, meta_description || '', is_published ? 1 : 0, id]);

    // Buscar página atualizada
    const updatedPage = await query('SELECT * FROM editable_pages WHERE id = ?', [id]);
    
    if (updatedPage.rows.length === 0) {
      return res.status(404).json({ error: 'Página não encontrada' });
    }
    
    console.log(`✅ Página atualizada: ${updatedPage.rows[0].title}`);
    res.json(updatedPage.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar página:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/admin/pages - Criar nova página (admin) - CORRIGIDO SEM insertId
router.post('/admin/pages', requireAdmin, async (req, res) => {
  try {
    const { slug, title, content, meta_description, is_published = 1 } = req.body;

    if (!slug || !title || !content) {
      return res.status(400).json({ error: 'Slug, título e conteúdo são obrigatórios' });
    }

    await query(`
      INSERT INTO editable_pages (slug, title, content, meta_description, is_published)
      VALUES (?, ?, ?, ?, ?)
    `, [slug, title, content, meta_description || '', is_published ? 1 : 0]);

    // Buscar página criada usando método compatível com SQLite
    const newPage = await query('SELECT * FROM editable_pages WHERE slug = ? ORDER BY id DESC LIMIT 1', [slug]);
    
    if (newPage.rows.length === 0) {
      return res.status(500).json({ error: 'Erro ao buscar página criada' });
    }
    
    console.log(`✅ Nova página criada: ${newPage.rows[0].title}`);
    res.status(201).json(newPage.rows[0]);
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Já existe uma página com este slug' });
    }
    console.error('Erro ao criar página:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PATCH /api/admin/pages/:id/toggle - Alternar publicação (admin)
router.patch('/admin/pages/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const pageResult = await query('SELECT is_published FROM editable_pages WHERE id = ?', [id]);
    
    if (pageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Página não encontrada' });
    }

    const newStatus = pageResult.rows[0].is_published === 1 ? 0 : 1;
    
    await query(`
      UPDATE editable_pages 
      SET is_published = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [newStatus, id]);

    // Buscar página atualizada
    const updatedPage = await query('SELECT * FROM editable_pages WHERE id = ?', [id]);
    
    console.log(`🔄 Status da página alterado: ${updatedPage.rows[0].title} - ${newStatus ? 'Publicado' : 'Rascunho'}`);
    res.json(updatedPage.rows[0]);
  } catch (err) {
    console.error('Erro ao alternar status da página:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;