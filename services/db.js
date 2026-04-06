const { Pool } = require('pg');
const databaseConfig = require('../config/database');

let pool = null;
let initialized = false;

function isConfigured() {
  return !!(databaseConfig.connectionString || databaseConfig.host);
}

function getPool() {
  if (!isConfigured()) {
    throw new Error('Database is not configured. Set DATABASE_URL or PGHOST/PGDATABASE/PGUSER/PGPASSWORD.');
  }

  if (!pool) {
    const config = databaseConfig.connectionString
      ? { connectionString: databaseConfig.connectionString }
      : {
          host: databaseConfig.host,
          port: databaseConfig.port,
          database: databaseConfig.database,
          user: databaseConfig.user,
          password: databaseConfig.password
        };

    if (databaseConfig.ssl) {
      config.ssl = { rejectUnauthorized: false };
    }

    pool = new Pool(config);
  }

  return pool;
}

async function query(text, params = []) {
  const activePool = getPool();
  return activePool.query(text, params);
}

async function withTransaction(work) {
  const activePool = getPool();
  const client = await activePool.connect();

  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function initializeDatabase() {
  if (initialized || !isConfigured()) {
    return;
  }

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      openid TEXT PRIMARY KEY,
      unionid TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id UUID PRIMARY KEY,
      owner_openid TEXT NOT NULL REFERENCES users(openid) ON DELETE CASCADE,
      source TEXT NOT NULL DEFAULT 'self',
      birth_date DATE NOT NULL,
      birth_time VARCHAR(5),
      time_known BOOLEAN NOT NULL DEFAULT TRUE,
      time_uncertainty TEXT,
      location_name TEXT NOT NULL,
      lat DOUBLE PRECISION NOT NULL,
      lng DOUBLE PRECISION NOT NULL,
      time_zone INTEGER NOT NULL DEFAULT 8,
      chart_snapshot JSONB NOT NULL,
      preview_json JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS synastry_invites (
      id UUID PRIMARY KEY,
      invite_code TEXT NOT NULL UNIQUE,
      inviter_openid TEXT NOT NULL REFERENCES users(openid) ON DELETE CASCADE,
      inviter_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      relation_type TEXT NOT NULL,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      expires_at TIMESTAMPTZ,
      accepted_openid TEXT REFERENCES users(openid) ON DELETE SET NULL,
      accepted_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
      accepted_at TIMESTAMPTZ,
      report_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS synastry_reports (
      id UUID PRIMARY KEY,
      invite_id UUID NOT NULL REFERENCES synastry_invites(id) ON DELETE CASCADE,
      person_a_openid TEXT NOT NULL REFERENCES users(openid) ON DELETE CASCADE,
      person_b_openid TEXT NOT NULL REFERENCES users(openid) ON DELETE CASCADE,
      person_a_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      person_b_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      relation_type TEXT NOT NULL,
      score_total INTEGER NOT NULL,
      report_json JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_profiles_owner_openid ON profiles(owner_openid, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_synastry_invites_inviter ON synastry_invites(inviter_openid, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_synastry_invites_accepted ON synastry_invites(accepted_openid, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_synastry_reports_person_a ON synastry_reports(person_a_openid, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_synastry_reports_person_b ON synastry_reports(person_b_openid, created_at DESC);
  `);

  initialized = true;
}

module.exports = {
  isConfigured,
  getPool,
  query,
  withTransaction,
  initializeDatabase
};
