import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import { GoogleGenAI } from '@google/genai';
import {
  initDb,
  pool,
  hashPassword,
  verifyPassword,
  generateApiKey,
  hashApiKey,
} from './server/db.js';
import {
  requireAuth,
  requireAdmin,
  requirePermission,
  requireAgentKey,
  requireAgentScope,
} from './server/authMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_roll_deck_v3_production';
const IS_PROD = process.env.NODE_ENV === 'production';

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Permitir visualização de mídia e scripts do Vite/React
    crossOriginEmbedderPolicy: false,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));

// Anti Brute-Force Rate Limiting for Login
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // 10 tentativas por minuto
  message: { error: 'Muitas tentativas de login. Aguarde 1 minuto e tente novamente.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Shared Gemini AI client with telemetry header
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// ============================================================================
// 1. ROTAS DE AUTENTICAÇÃO (Sessão & Usuários)
// ============================================================================

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
    }

    const cleanUser = username.trim().toLowerCase();
    const userRes = await pool.query(`
      SELECT u.id, u.username, u.password_hash, u.role, u.is_active,
             p.can_roll_dice, p.can_use_loot, p.can_use_ai_loot, p.can_manage_notes, p.can_manage_packages
      FROM users u
      LEFT JOIN user_permissions p ON p.user_id = u.id
      WHERE LOWER(u.username) = $1
    `, [cleanUser]);

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const user = userRes.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Conta desativada pelo administrador.' });
    }

    const isValid = verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Salvar token em Cookie HttpOnly Seguro
    res.cookie('rolldeck_session', token, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    });

    return res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        permissions: {
          canRollDice: user.can_roll_dice ?? true,
          canUseLoot: user.can_use_loot ?? true,
          canUseAiLoot: user.can_use_ai_loot ?? false,
          canManageNotes: user.can_manage_notes ?? true,
          canManagePackages: user.can_manage_packages ?? true,
        },
      },
    });
  } catch (err: any) {
    console.error('Erro no login:', err);
    return res.status(500).json({ error: 'Erro interno ao autenticar usuário.' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('rolldeck_session');
  return res.json({ success: true, message: 'Logout efetuado.' });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  return res.json({ user: req.user });
});

// ============================================================================
// 2. ADMINISTRAÇÃO DE USUÁRIOS E PERMISSÕES (RBAC)
// ============================================================================

app.get('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const usersRes = await pool.query(`
      SELECT u.id, u.username, u.role, u.is_active, u.created_at,
             p.can_roll_dice, p.can_use_loot, p.can_use_ai_loot, p.can_manage_notes, p.can_manage_packages
      FROM users u
      LEFT JOIN user_permissions p ON p.user_id = u.id
      ORDER BY u.created_at ASC
    `);

    const users = usersRes.rows.map((row) => ({
      id: row.id,
      username: row.username,
      role: row.role,
      isActive: row.is_active,
      createdAt: row.created_at,
      permissions: {
        canRollDice: row.can_roll_dice ?? true,
        canUseLoot: row.can_use_loot ?? true,
        canUseAiLoot: row.can_use_ai_loot ?? false,
        canManageNotes: row.can_manage_notes ?? true,
        canManagePackages: row.can_manage_packages ?? true,
      },
    }));

    return res.json({ users });
  } catch (err: any) {
    console.error('Erro ao listar usuários:', err);
    return res.status(500).json({ error: 'Erro ao listar usuários.' });
  }
});

app.post('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { username, password, role = 'player', permissions } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Nome de usuário e senha são obrigatórios.' });
    }

    const cleanUser = username.trim().toLowerCase();
    const existing = await pool.query('SELECT id FROM users WHERE LOWER(username) = $1', [cleanUser]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Nome de usuário já está em uso.' });
    }

    const hashed = hashPassword(password);
    const userRes = await pool.query(`
      INSERT INTO users (username, password_hash, role)
      VALUES ($1, $2, $3)
      RETURNING id, username, role, created_at
    `, [cleanUser, hashed, role]);

    const newUserId = userRes.rows[0].id;

    // Inserir permissões
    await pool.query(`
      INSERT INTO user_permissions (user_id, can_roll_dice, can_use_loot, can_use_ai_loot, can_manage_notes, can_manage_packages)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      newUserId,
      permissions?.canRollDice ?? true,
      permissions?.canUseLoot ?? true,
      permissions?.canUseAiLoot ?? false,
      permissions?.canManageNotes ?? true,
      permissions?.canManagePackages ?? true,
    ]);

    // Associar automaticamente à Mesa Principal se existir
    const mainTeam = await pool.query(`SELECT id FROM teams ORDER BY created_at ASC LIMIT 1`);
    if (mainTeam.rows.length > 0) {
      await pool.query(`
        INSERT INTO team_members (team_id, user_id, role)
        VALUES ($1, $2, 'member')
        ON CONFLICT DO NOTHING
      `, [mainTeam.rows[0].id, newUserId]);
    }

    return res.status(201).json({
      success: true,
      user: {
        id: newUserId,
        username: cleanUser,
        role,
        permissions: permissions || {},
      },
    });
  } catch (err: any) {
    console.error('Erro ao criar usuário:', err);
    return res.status(500).json({ error: 'Erro ao criar usuário.' });
  }
});

app.put('/api/admin/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { role, isActive, password, permissions } = req.body;

    if (password && password.trim().length > 0) {
      const hashed = hashPassword(password.trim());
      await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hashed, userId]);
    }

    if (role !== undefined || isActive !== undefined) {
      await pool.query(`
        UPDATE users
        SET role = COALESCE($1, role),
            is_active = COALESCE($2, is_active),
            updated_at = NOW()
        WHERE id = $3
      `, [role, isActive, userId]);
    }

    if (permissions) {
      await pool.query(`
        UPDATE user_permissions
        SET can_roll_dice = COALESCE($1, can_roll_dice),
            can_use_loot = COALESCE($2, can_use_loot),
            can_use_ai_loot = COALESCE($3, can_use_ai_loot),
            can_manage_notes = COALESCE($4, can_manage_notes),
            can_manage_packages = COALESCE($5, can_manage_packages)
        WHERE user_id = $6
      `, [
        permissions.canRollDice,
        permissions.canUseLoot,
        permissions.canUseAiLoot,
        permissions.canManageNotes,
        permissions.canManagePackages,
        userId,
      ]);
    }

    return res.json({ success: true, message: 'Usuário atualizado com sucesso.' });
  } catch (err: any) {
    console.error('Erro ao atualizar usuário:', err);
    return res.status(500).json({ error: 'Erro ao atualizar usuário.' });
  }
});

// ============================================================================
// 3. EQUIPES & WORKSPACES COMPARTILHADOS (Mesa de Jogo)
// ============================================================================

app.get('/api/teams', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const isAdmin = req.user!.role === 'admin';

    let teamsRes;
    if (isAdmin) {
      teamsRes = await pool.query(`
        SELECT t.id, t.name, t.description, t.created_at,
               (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count,
               (SELECT COUNT(*) FROM notes WHERE team_id = t.id) as note_count
        FROM teams t
        ORDER BY t.created_at ASC
      `);
    } else {
      teamsRes = await pool.query(`
        SELECT t.id, t.name, t.description, t.created_at, tm.role as my_role,
               (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count,
               (SELECT COUNT(*) FROM notes WHERE team_id = t.id) as note_count
        FROM teams t
        JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = $1
        ORDER BY t.created_at ASC
      `, [userId]);
    }

    return res.json({ teams: teamsRes.rows });
  } catch (err: any) {
    console.error('Erro ao listar equipes:', err);
    return res.status(500).json({ error: 'Erro ao listar equipes.' });
  }
});

app.post('/api/teams', requireAuth, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Nome da equipe é obrigatório.' });
    }

    const teamRes = await pool.query(`
      INSERT INTO teams (name, description, created_by)
      VALUES ($1, $2, $3)
      RETURNING id, name, description, created_at
    `, [name.trim(), description || '', req.user!.userId]);

    const newTeam = teamRes.rows[0];

    // Criador é owner
    await pool.query(`
      INSERT INTO team_members (team_id, user_id, role)
      VALUES ($1, $2, 'owner')
    `, [newTeam.id, req.user!.userId]);

    return res.status(201).json({ team: newTeam });
  } catch (err: any) {
    console.error('Erro ao criar equipe:', err);
    return res.status(500).json({ error: 'Erro ao criar equipe.' });
  }
});

// ============================================================================
// 4. NOTAS DO GRAFO COMPARTILHADAS (Equipes)
// ============================================================================

app.get('/api/teams/:teamId/notes', requireAuth, requirePermission('canManageNotes'), async (req, res) => {
  try {
    const { teamId } = req.params;
    const notesRes = await pool.query(`
      SELECT n.id, n.team_id, n.title, n.content, n.tags, n.color, n.x_pos, n.y_pos,
             n.created_at, n.updated_at, u.username as author
      FROM notes n
      LEFT JOIN users u ON u.id = n.created_by
      WHERE n.team_id = $1
      ORDER BY n.updated_at DESC
    `, [teamId]);

    return res.json({ notes: notesRes.rows });
  } catch (err: any) {
    console.error('Erro ao buscar notas:', err);
    return res.status(500).json({ error: 'Erro ao buscar notas da equipe.' });
  }
});

app.post('/api/teams/:teamId/notes', requireAuth, requirePermission('canManageNotes'), async (req, res) => {
  try {
    const { teamId } = req.params;
    const { title, content = '', tags = [], color = '#06b6d4', x = 0, y = 0 } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Título da nota é obrigatório.' });
    }

    const noteRes = await pool.query(`
      INSERT INTO notes (team_id, title, content, tags, color, x_pos, y_pos, created_by, last_modified_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
      RETURNING *
    `, [teamId, title.trim(), content, tags, color, x, y, req.user!.userId]);

    return res.status(201).json({ note: noteRes.rows[0] });
  } catch (err: any) {
    console.error('Erro ao criar nota:', err);
    return res.status(500).json({ error: 'Erro ao criar nota.' });
  }
});

app.put('/api/teams/:teamId/notes/:noteId', requireAuth, requirePermission('canManageNotes'), async (req, res) => {
  try {
    const { teamId, noteId } = req.params;
    const { title, content, tags, color, x, y } = req.body;

    const noteRes = await pool.query(`
      UPDATE notes
      SET title = COALESCE($1, title),
          content = COALESCE($2, content),
          tags = COALESCE($3, tags),
          color = COALESCE($4, color),
          x_pos = COALESCE($5, x_pos),
          y_pos = COALESCE($6, y_pos),
          last_modified_by = $7,
          updated_at = NOW()
      WHERE id = $8 AND team_id = $9
      RETURNING *
    `, [title, content, tags, color, x, y, req.user!.userId, noteId, teamId]);

    if (noteRes.rows.length === 0) {
      return res.status(404).json({ error: 'Nota não encontrada nesta equipe.' });
    }

    return res.json({ note: noteRes.rows[0] });
  } catch (err: any) {
    console.error('Erro ao atualizar nota:', err);
    return res.status(500).json({ error: 'Erro ao atualizar nota.' });
  }
});

app.delete('/api/teams/:teamId/notes/:noteId', requireAuth, requirePermission('canManageNotes'), async (req, res) => {
  try {
    const { teamId, noteId } = req.params;
    const delRes = await pool.query(`
      DELETE FROM notes
      WHERE id = $1 AND team_id = $2
      RETURNING id
    `, [noteId, teamId]);

    if (delRes.rows.length === 0) {
      return res.status(404).json({ error: 'Nota não encontrada nesta equipe.' });
    }

    return res.json({ success: true, message: 'Nota removida com sucesso.' });
  } catch (err: any) {
    console.error('Erro ao deletar nota:', err);
    return res.status(500).json({ error: 'Erro ao deletar nota.' });
  }
});

// ============================================================================
// 5. GESTÃO DE API KEYS PARA AGENTES DE IA (Por Equipe)
// ============================================================================

app.get('/api/teams/:teamId/api-keys', requireAuth, async (req, res) => {
  try {
    const { teamId } = req.params;
    const keysRes = await pool.query(`
      SELECT id, team_id, key_name, key_prefix, scopes, created_at, last_used_at, expires_at
      FROM api_keys
      WHERE team_id = $1
      ORDER BY created_at DESC
    `, [teamId]);

    return res.json({ apiKeys: keysRes.rows });
  } catch (err: any) {
    console.error('Erro ao listar chaves de API:', err);
    return res.status(500).json({ error: 'Erro ao listar chaves de API.' });
  }
});

app.post('/api/teams/:teamId/api-keys', requireAuth, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { keyName, scopes = ['notes:read', 'notes:write'] } = req.body;

    if (!keyName || keyName.trim().length === 0) {
      return res.status(400).json({ error: 'Nome descritivo para o agente é obrigatório.' });
    }

    const { rawKey, keyPrefix, keyHash } = generateApiKey();

    const newKey = await pool.query(`
      INSERT INTO api_keys (team_id, key_name, key_hash, key_prefix, scopes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, key_name, key_prefix, scopes, created_at
    `, [teamId, keyName.trim(), keyHash, keyPrefix, scopes, req.user!.userId]);

    return res.status(201).json({
      apiKey: newKey.rows[0],
      rawKey, // Exibido apenas UMA vez para cópia
      warning: 'Copie e salve esta chave de API agora. Ela não poderá ser visualizada novamente.',
    });
  } catch (err: any) {
    console.error('Erro ao criar chave de API:', err);
    return res.status(500).json({ error: 'Erro ao gerar chave de API.' });
  }
});

app.delete('/api/teams/:teamId/api-keys/:keyId', requireAuth, async (req, res) => {
  try {
    const { teamId, keyId } = req.params;
    await pool.query(`DELETE FROM api_keys WHERE id = $1 AND team_id = $2`, [keyId, teamId]);
    return res.json({ success: true, message: 'Chave de API revogada com sucesso.' });
  } catch (err: any) {
    console.error('Erro ao revogar chave de API:', err);
    return res.status(500).json({ error: 'Erro ao revogar chave de API.' });
  }
});

// ============================================================================
// 6. ENDPOINTS PARA AGENTES EXTERNOS DE IA (/api/v1/agent/*)
// ============================================================================

app.get('/api/v1/agent/notes', requireAgentKey, requireAgentScope('notes:read'), async (req, res) => {
  try {
    const teamId = req.agentTeamId!;
    const { tag, search } = req.query;

    let query = `
      SELECT id, title, content, tags, color, x_pos, y_pos, updated_at
      FROM notes
      WHERE team_id = $1
    `;
    const params: any[] = [teamId];

    if (tag) {
      params.push(tag);
      query += ` AND $${params.length} = ANY(tags)`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (title ILIKE $${params.length} OR content ILIKE $${params.length})`;
    }

    query += ` ORDER BY updated_at DESC`;

    const notesRes = await pool.query(query, params);
    return res.json({
      count: notesRes.rows.length,
      notes: notesRes.rows,
    });
  } catch (err: any) {
    console.error('Erro agente buscando notas:', err);
    return res.status(500).json({ error: 'Erro ao buscar notas via agente.' });
  }
});

app.get('/api/v1/agent/notes/:id', requireAgentKey, requireAgentScope('notes:read'), async (req, res) => {
  try {
    const { id } = req.params;
    const noteRes = await pool.query(`
      SELECT id, title, content, tags, color, x_pos, y_pos, created_at, updated_at
      FROM notes
      WHERE id = $1 AND team_id = $2
    `, [id, req.agentTeamId]);

    if (noteRes.rows.length === 0) {
      return res.status(404).json({ error: 'Nota não encontrada nesta equipe.' });
    }

    return res.json({ note: noteRes.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao consultar nota.' });
  }
});

app.post('/api/v1/agent/notes', requireAgentKey, requireAgentScope('notes:write'), async (req, res) => {
  try {
    const { title, content = '', tags = [], color = '#10b981', x = 0, y = 0 } = req.body;
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Campo title é obrigatório.' });
    }

    const noteRes = await pool.query(`
      INSERT INTO notes (team_id, title, content, tags, color, x_pos, y_pos)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [req.agentTeamId, title.trim(), content, tags, color, x, y]);

    return res.status(201).json({
      success: true,
      message: 'Nota criada com sucesso pelo Agente de IA.',
      note: noteRes.rows[0],
    });
  } catch (err: any) {
    console.error('Erro agente criando nota:', err);
    return res.status(500).json({ error: 'Erro ao criar nota via agente.' });
  }
});

app.put('/api/v1/agent/notes/:id', requireAgentKey, requireAgentScope('notes:write'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, tags, color, x, y } = req.body;

    const noteRes = await pool.query(`
      UPDATE notes
      SET title = COALESCE($1, title),
          content = COALESCE($2, content),
          tags = COALESCE($3, tags),
          color = COALESCE($4, color),
          x_pos = COALESCE($5, x_pos),
          y_pos = COALESCE($6, y_pos),
          updated_at = NOW()
      WHERE id = $7 AND team_id = $8
      RETURNING *
    `, [title, content, tags, color, x, y, id, req.agentTeamId]);

    if (noteRes.rows.length === 0) {
      return res.status(404).json({ error: 'Nota não encontrada para atualização.' });
    }

    return res.json({
      success: true,
      message: 'Nota atualizada com sucesso pelo Agente de IA.',
      note: noteRes.rows[0],
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao atualizar nota via agente.' });
  }
});

// ============================================================================
// 7. MOTOR DE IA PARA LOOT (Google Gemini) COM VALIDAÇÃO DE PERMISSÃO
// ============================================================================

app.post('/api/ai/generate', requireAuth, requirePermission('canUseAiLoot'), async (req, res) => {
  try {
    const { prompt, model = 'gemini-3.8-flash', temperature = 0.7 } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt é obrigatório.' });
    }

    if (!aiClient) {
      if (process.env.GEMINI_API_KEY) {
        aiClient = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });
      } else {
        return res.status(503).json({
          error: 'GEMINI_API_KEY não configurada no servidor. Ativando fallback procedural.',
        });
      }
    }

    let text = '';
    try {
      const response = await aiClient.models.generateContent({
        model: model || 'gemini-3.8-flash',
        contents: prompt,
        config: {
          temperature: Number(temperature) || 0.7,
          responseMimeType: 'application/json',
        },
      });
      text = response.text || '';
    } catch (primaryErr: any) {
      if (primaryErr?.message?.includes('503') || primaryErr?.status === 503) {
        console.warn('503 on primary model, attempting fallback...');
        const retryRes = await aiClient.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: prompt,
          config: {
            temperature: Number(temperature) || 0.7,
            responseMimeType: 'application/json',
          },
        });
        text = retryRes.text || '';
      } else {
        throw primaryErr;
      }
    }

    return res.json({ text });
  } catch (err: any) {
    console.error('AI Generation error:', err);
    return res.status(500).json({
      error: err.message || 'Erro ao comunicar com a API do Gemini.',
    });
  }
});

// ============================================================================
// 8. HEALTHCHECK & ARQUIVOS ESTÁTICOS
// ============================================================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '3.0.0',
    timestamp: new Date().toISOString(),
    postgres: pool.totalCount > 0 ? 'connected' : 'idle',
  });
});

// Servir frontend compilado em produção
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  const indexFile = path.join(distPath, 'index.html');
  res.sendFile(indexFile, (err) => {
    if (err) {
      res.status(200).send('RollDeck V3 Server está ativo. Compile o frontend com npm run build para visualização completa.');
    }
  });
});

// ============================================================================
// 9. INICIALIZAÇÃO DO SERVIDOR COM CONEXÃO AO BANCO
// ============================================================================

async function startServer() {
  try {
    console.log('[INIT] Conectando ao banco de dados PostgreSQL...');
    await initDb();
    console.log('[INIT] Banco de dados pronto para requisições.');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 RollDeck V3 Server rodando na porta ${PORT}`);
      console.log(`🌐 Ambiente: ${IS_PROD ? 'Produção' : 'Desenvolvimento'}`);
      console.log(`🤖 Gateway de Agentes de IA ativo em: /api/v1/agent/*`);
    });
  } catch (err) {
    console.error('[FATAL] Não foi possível iniciar o servidor:', err);
    process.exit(1);
  }
}

startServer();
