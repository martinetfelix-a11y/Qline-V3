const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false },
});

let initPromise = null;

async function query(text, params = []) {
  return pool.query(text, params);
}

async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function initializeDatabase() {
  if (initPromise) return initPromise;

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  initPromise = (async () => {
    await query(`
      CREATE TABLE IF NOT EXISTS commerces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        open BOOLEAN NOT NULL DEFAULT TRUE,
        paused BOOLEAN NOT NULL DEFAULT FALSE,
        model_avg_sec INTEGER NOT NULL DEFAULT 660,
        model_var_sec DOUBLE PRECISION NOT NULL DEFAULT 57600
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        pass_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'merchant')),
        commerce_id TEXT REFERENCES commerces(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY,
        commerce_id TEXT NOT NULL REFERENCES commerces(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_email TEXT,
        joined_at TIMESTAMPTZ NOT NULL,
        called_at TIMESTAMPTZ,
        served_at TIMESTAMPTZ,
        cancelled_at TIMESTAMPTZ,
        status TEXT NOT NULL CHECK (status IN ('active', 'called', 'served', 'cancelled')),
        duration_sec INTEGER,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_tickets_commerce_status_joined
      ON tickets (commerce_id, status, joined_at);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_tickets_user_status
      ON tickets (user_id, status, updated_at DESC);
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS events (
        id BIGSERIAL PRIMARY KEY,
        commerce_id TEXT NOT NULL REFERENCES commerces(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        t TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ticket_id TEXT,
        user_id TEXT,
        duration_sec INTEGER,
        reason TEXT,
        avg_sec INTEGER
      );
    `);

    await seedCommerces();
    await seedAccounts();
  })().catch((error) => {
    initPromise = null;
    throw error;
  });

  return initPromise;
}

async function seedCommerces() {
  const commerces = [
    ["c1", "Barbier Le Classique", true, false, 11 * 60, (4 * 60) ** 2],
    ["c2", "Garage Centre-Ville", true, false, 12 * 60, (5 * 60) ** 2],
    ["c3", "Cafe du Coin", true, false, 6 * 60, (3 * 60) ** 2],
  ];

  for (const [id, name, open, paused, avg, variance] of commerces) {
    await query(
      `
        INSERT INTO commerces (id, name, open, paused, model_avg_sec, model_var_sec)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name
      `,
      [id, name, open, paused, avg, variance]
    );
  }
}

async function seedAccounts() {
  const accounts = [
    ["u1", "c1@qline.dev", "merchant123", "merchant", "c1"],
    ["u2", "c2@qline.dev", "merchant123", "merchant", "c2"],
    ["u3", "c3@qline.dev", "merchant123", "merchant", "c3"],
    ["u4", "user@qline.dev", "user1234", "user", null],
  ];

  for (const [id, email, password, role, commerceId] of accounts) {
    const passHash = bcrypt.hashSync(password, 10);
    await query(
      `
        INSERT INTO users (id, email, pass_hash, role, commerce_id)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (email) DO NOTHING
      `,
      [id, email, passHash, role, commerceId]
    );
  }
}

module.exports = {
  pool,
  query,
  withTransaction,
  initializeDatabase,
};
