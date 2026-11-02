import pg from 'pg';
import crypto from 'crypto';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://rolldeck:rolldeck_secure_pass_2026@localhost:5432/rolldeck_db',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

/**
 * Hash password securely using standard Node.js crypto scrypt (zero native compilation issues)
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verify password against stored salt:hash string
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const keyBuffer = Buffer.from(key, 'hex');
    return crypto.timingSafeEqual(derivedKey, keyBuffer);
  } catch {
    return false;
  }
}

/**
 * Hash API Key securely with SHA-256 for persistent database lookup
 */
export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

/**
 * Generate a new random API key for AI Agents
 */
export function generateApiKey(): { rawKey: string; keyPrefix: string; keyHash: string } {
  const token = crypto.randomBytes(24).toString('base64url');
  const rawKey = `rdk_live_${token}`;
  const keyPrefix = rawKey.substring(0, 12);
  const keyHash = hashApiKey(rawKey);
  return { rawKey, keyPrefix, keyHash };
}

/**
 * Initialize database schema and default admin user if tables do not exist
 */
export async function initDb(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Enable uuid-ossp or pgcrypto if needed
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

    // 1. Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'player',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 2. User Permissions Table (Granular RBAC)
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_permissions (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        can_roll_dice BOOLEAN NOT NULL DEFAULT TRUE,
        can_use_loot BOOLEAN NOT NULL DEFAULT TRUE,
        can_use_ai_loot BOOLEAN NOT NULL DEFAULT FALSE,
        can_manage_notes BOOLEAN NOT NULL DEFAULT TRUE,
        can_manage_packages BOOLEAN NOT NULL DEFAULT TRUE
      );
    `);

    // 3. Teams Table (Workspaces)
    await client.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 4. Team Members Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS team_members (
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL DEFAULT 'member',
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        PRIMARY KEY (team_id, user_id)
      );
    `);

    // 5. Notes Table (Wiki graph notes linked to teams)
    await client.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        tags TEXT[] DEFAULT '{}',
        color VARCHAR(20),
        x_pos REAL DEFAULT 0,
        y_pos REAL DEFAULT 0,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        last_modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 6. API Keys Table (for AI Agents)
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        key_name VARCHAR(100) NOT NULL,
        key_hash VARCHAR(255) NOT NULL,
        key_prefix VARCHAR(15) NOT NULL,
        scopes TEXT[] NOT NULL DEFAULT '{"notes:read", "notes:write"}',
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        expires_at TIMESTAMP WITH TIME ZONE,
        last_used_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Ensure default initial admin user exists
    const checkAdmin = await client.query(`SELECT id FROM users WHERE username = 'admin' LIMIT 1`);
    if (checkAdmin.rows.length === 0) {
      const initPassword = process.env.ADMIN_INIT_PASSWORD || 'admin123';
      const hashed = hashPassword(initPassword);

      const userRes = await client.query(`
        INSERT INTO users (username, password_hash, role)
        VALUES ('admin', $1, 'admin')
        RETURNING id
      `, [hashed]);

      const adminId = userRes.rows[0].id;

      // Full admin permissions
      await client.query(`
        INSERT INTO user_permissions (user_id, can_roll_dice, can_use_loot, can_use_ai_loot, can_manage_notes, can_manage_packages)
        VALUES ($1, TRUE, TRUE, TRUE, TRUE, TRUE)
      `, [adminId]);

      // Create default team: "Mesa Principal"
      const teamRes = await client.query(`
        INSERT INTO teams (name, description, created_by)
        VALUES ('Mesa Principal', 'Mesa de jogo principal compartilhada', $1)
        RETURNING id
      `, [adminId]);

      const teamId = teamRes.rows[0].id;

      await client.query(`
        INSERT INTO team_members (team_id, user_id, role)
        VALUES ($1, $2, 'owner')
      `, [teamId, adminId]);

      console.log(`[DB INIT] Usuário 'admin' inicial criado com sucesso (Mesa Principal criada: ${teamId}).`);
    }

    await client.query('COMMIT');
    console.log('[DB] Tabelas e migrações verificadas com sucesso.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[DB ERROR] Falha ao inicializar esquema do banco:', err);
    throw err;
  } finally {
    client.release();
  }
}

