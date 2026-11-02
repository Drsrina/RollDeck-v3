import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool, hashApiKey } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_roll_deck_v3_production';

export interface AuthUserPayload {
  userId: string;
  username: string;
  role: 'admin' | 'master' | 'player';
  permissions: {
    canRollDice: boolean;
    canUseLoot: boolean;
    canUseAiLoot: boolean;
    canManageNotes: boolean;
    canManagePackages: boolean;
  };
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
      agentTeamId?: string;
      agentScopes?: string[];
    }
  }
}

/**
 * Middleware: Verify user JWT token from HttpOnly cookie or Authorization Bearer header
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let token = req.cookies?.rolldeck_session;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({ error: 'Não autenticado. Faça login para continuar.' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Refresh permissions and active status from DB
    const userRes = await pool.query(`
      SELECT u.id, u.username, u.role, u.is_active,
             p.can_roll_dice, p.can_use_loot, p.can_use_ai_loot, p.can_manage_notes, p.can_manage_packages
      FROM users u
      LEFT JOIN user_permissions p ON p.user_id = u.id
      WHERE u.id = $1
    `, [decoded.userId]);

    if (userRes.rows.length === 0 || !userRes.rows[0].is_active) {
      res.status(403).json({ error: 'Usuário inativo ou não encontrado.' });
      return;
    }

    const row = userRes.rows[0];
    req.user = {
      userId: row.id,
      username: row.username,
      role: row.role,
      permissions: {
        canRollDice: row.can_roll_dice ?? true,
        canUseLoot: row.can_use_loot ?? true,
        canUseAiLoot: row.can_use_ai_loot ?? false,
        canManageNotes: row.can_manage_notes ?? true,
        canManagePackages: row.can_manage_packages ?? true,
      },
    };

    next();
  } catch (err) {
    res.status(401).json({ error: 'Sessão inválida ou expirada.' });
  }
}

/**
 * Middleware: Require Administrator role
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Acesso negado. Requer privilégios de Administrador.' });
    return;
  }
  next();
}

/**
 * Middleware: Require specific user module permission
 */
export function requirePermission(permissionKey: keyof AuthUserPayload['permissions']) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.user?.role === 'admin') {
      return next(); // Admin always has bypass
    }

    if (!req.user?.permissions[permissionKey]) {
      res.status(403).json({ error: `Acesso negado: sem permissão para '${permissionKey}'.` });
      return;
    }

    next();
  };
}

/**
 * Middleware: Authenticate External AI Agents via API Key header
 */
export async function requireAgentKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'API Key do Agente ausente. Use Authorization: Bearer rdk_live_...' });
    return;
  }

  const rawKey = authHeader.split(' ')[1];
  const hashed = hashApiKey(rawKey);

  try {
    const keyRes = await pool.query(`
      SELECT id, team_id, scopes, expires_at
      FROM api_keys
      WHERE key_hash = $1
    `, [hashed]);

    if (keyRes.rows.length === 0) {
      res.status(401).json({ error: 'API Key inválida ou revogada.' });
      return;
    }

    const key = keyRes.rows[0];

    if (key.expires_at && new Date(key.expires_at) < new Date()) {
      res.status(401).json({ error: 'Esta API Key está expirada.' });
      return;
    }

    // Update last_used_at timestamp asynchronously
    pool.query(`UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`, [key.id]).catch(() => {});

    req.agentTeamId = key.team_id;
    req.agentScopes = key.scopes || [];

    next();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao validar API Key do agente.' });
  }
}

/**
 * Middleware: Verify agent scope (e.g. 'notes:read', 'notes:write')
 */
export function requireAgentScope(scope: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.agentScopes || !req.agentScopes.includes(scope)) {
      res.status(403).json({ error: `Escopo insuficiente. Esta chave precisa de: '${scope}'.` });
      return;
    }
    next();
  };
}

