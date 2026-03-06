const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const envDbPath = process.env.DB_PATH ? path.resolve(process.env.DB_PATH) : null;
const dataDir = envDbPath ? path.dirname(envDbPath) : path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = envDbPath || path.join(dataDir, "qline.sqlite");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS commerces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  pass_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'merchant')),
  commerce_id TEXT REFERENCES commerces(id),
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_state (
  commerce_id TEXT PRIMARY KEY REFERENCES commerces(id) ON DELETE CASCADE,
  open INTEGER NOT NULL DEFAULT 1,
  paused INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS service_models (
  commerce_id TEXT PRIMARY KEY REFERENCES commerces(id) ON DELETE CASCADE,
  avg REAL NOT NULL,
  var REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  commerce_id TEXT NOT NULL REFERENCES commerces(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id),
  joined_at_ms INTEGER NOT NULL,
  joined_at_iso TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('waiting', 'served', 'cancelled')) DEFAULT 'waiting',
  served_at_ms INTEGER,
  duration_sec REAL
);

CREATE INDEX IF NOT EXISTS idx_tickets_waiting
  ON tickets(commerce_id, status, joined_at_ms);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  commerce_id TEXT NOT NULL REFERENCES commerces(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  t INTEGER NOT NULL,
  duration_sec REAL,
  avg_sec REAL
);

CREATE INDEX IF NOT EXISTS idx_events_commerce_time
  ON events(commerce_id, t);
`);

const seedCommerces = [
  { id: "c1", name: "Barbier Le Classique", avg: 11 * 60, var: (4 * 60) ** 2 },
  { id: "c2", name: "Garage Centre-Ville", avg: 12 * 60, var: (5 * 60) ** 2 },
  { id: "c3", name: "Cafe du Coin", avg: 6 * 60, var: (3 * 60) ** 2 }
];

const seedTx = db.transaction(() => {
  const insCommerce = db.prepare("INSERT OR IGNORE INTO commerces (id, name) VALUES (?, ?)");
  const insState = db.prepare("INSERT OR IGNORE INTO commerce_state (commerce_id, open, paused) VALUES (?, 1, 0)");
  const insModel = db.prepare("INSERT OR IGNORE INTO service_models (commerce_id, avg, var) VALUES (?, ?, ?)");

  for (const c of seedCommerces) {
    insCommerce.run(c.id, c.name);
    insState.run(c.id);
    insModel.run(c.id, c.avg, c.var);
  }
});
seedTx();

function boolToInt(v) {
  return v ? 1 : 0;
}
function intToBool(v) {
  return !!v;
}

function nextUserId() {
  const row = db.prepare(`
    SELECT MAX(CAST(SUBSTR(id, 2) AS INTEGER)) AS maxId
    FROM users
    WHERE id GLOB 'u[0-9]*'
  `).get();
  const max = Number(row?.maxId || 0);
  return `u${max + 1}`;
}

function hasCommerce(commerceId) {
  const row = db.prepare("SELECT 1 AS ok FROM commerces WHERE id = ?").get(commerceId);
  return !!row;
}

function listCommercesWithState() {
  const rows = db.prepare(`
    SELECT c.id, c.name, s.open, s.paused
    FROM commerces c
    JOIN commerce_state s ON s.commerce_id = c.id
    ORDER BY c.id
  `).all();
  return rows.map(r => ({ id: r.id, name: r.name, open: intToBool(r.open), paused: intToBool(r.paused) }));
}

function getCommerceWithState(commerceId) {
  const row = db.prepare(`
    SELECT c.id, c.name, s.open, s.paused
    FROM commerces c
    JOIN commerce_state s ON s.commerce_id = c.id
    WHERE c.id = ?
  `).get(commerceId);
  if (!row) return null;
  return { id: row.id, name: row.name, open: intToBool(row.open), paused: intToBool(row.paused) };
}

function getCommerceState(commerceId) {
  const row = db.prepare("SELECT open, paused FROM commerce_state WHERE commerce_id = ?").get(commerceId);
  if (!row) return null;
  return { open: intToBool(row.open), paused: intToBool(row.paused) };
}

function setCommerceState(commerceId, patch) {
  const cur = getCommerceState(commerceId);
  if (!cur) return null;
  const open = typeof patch.open === "boolean" ? patch.open : cur.open;
  const paused = typeof patch.paused === "boolean" ? patch.paused : cur.paused;
  db.prepare("UPDATE commerce_state SET open = ?, paused = ? WHERE commerce_id = ?")
    .run(boolToInt(open), boolToInt(paused), commerceId);
  return { open, paused };
}

function listQueue(commerceId) {
  return db.prepare(`
    SELECT id, joined_at_iso
    FROM tickets
    WHERE commerce_id = ? AND status = 'waiting'
    ORDER BY joined_at_ms ASC, rowid ASC
  `).all(commerceId).map(r => ({ id: r.id, joinedAt: r.joined_at_iso }));
}

function createTicketId() {
  for (let i = 0; i < 20; i += 1) {
    const id = `A${Math.floor(100 + Math.random() * 900)}`;
    const exists = db.prepare("SELECT 1 AS ok FROM tickets WHERE id = ?").get(id);
    if (!exists) return id;
  }
  return `A${Date.now().toString().slice(-6)}`;
}

function enqueueTicket(commerceId, userId) {
  const nowMs = Date.now();
  const ticketId = createTicketId();
  const joinedAt = new Date(nowMs).toISOString();

  db.prepare(`
    INSERT INTO tickets (id, commerce_id, user_id, joined_at_ms, joined_at_iso, status)
    VALUES (?, ?, ?, ?, ?, 'waiting')
  `).run(ticketId, commerceId, userId || null, nowMs, joinedAt);

  const row = db.prepare(`
    SELECT COUNT(*) AS c
    FROM tickets
    WHERE commerce_id = ? AND status = 'waiting' AND (
      joined_at_ms < ? OR (joined_at_ms = ? AND rowid <= (SELECT rowid FROM tickets WHERE id = ?))
    )
  `).get(commerceId, nowMs, nowMs, ticketId);

  return { ticketId, joinedAt, position: Number(row?.c || 1) };
}

function ticketPosition(commerceId, ticketId) {
  const row = db.prepare(`
    SELECT
      (SELECT COUNT(*)
       FROM tickets t2
       WHERE t2.commerce_id = t1.commerce_id
         AND t2.status = 'waiting'
         AND (
           t2.joined_at_ms < t1.joined_at_ms OR
           (t2.joined_at_ms = t1.joined_at_ms AND t2.rowid <= t1.rowid)
         )
      ) AS pos
    FROM tickets t1
    WHERE t1.commerce_id = ? AND t1.id = ? AND t1.status = 'waiting'
  `).get(commerceId, ticketId);
  return row ? Number(row.pos) : null;
}

function popNextTicket(commerceId, durationSec) {
  const next = db.prepare(`
    SELECT id, joined_at_iso
    FROM tickets
    WHERE commerce_id = ? AND status = 'waiting'
    ORDER BY joined_at_ms ASC, rowid ASC
    LIMIT 1
  `).get(commerceId);
  if (!next) return null;

  db.prepare(`
    UPDATE tickets
    SET status = 'served', served_at_ms = ?, duration_sec = ?
    WHERE id = ?
  `).run(Date.now(), typeof durationSec === "number" ? durationSec : null, next.id);

  return { id: next.id, joinedAt: next.joined_at_iso };
}

function cancelWaitingTickets(commerceId) {
  db.prepare("UPDATE tickets SET status = 'cancelled' WHERE commerce_id = ? AND status = 'waiting'")
    .run(commerceId);
}

function getModel(commerceId) {
  const row = db.prepare("SELECT avg, var FROM service_models WHERE commerce_id = ?").get(commerceId);
  if (!row) return null;
  return { avg: Number(row.avg), var: Number(row.var) };
}

function setModel(commerceId, model) {
  db.prepare("UPDATE service_models SET avg = ?, var = ? WHERE commerce_id = ?")
    .run(model.avg, model.var, commerceId);
  return getModel(commerceId);
}

function addEvent(commerceId, type, data) {
  db.prepare(`
    INSERT INTO events (commerce_id, type, t, duration_sec, avg_sec)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    commerceId,
    type,
    typeof data?.t === "number" ? data.t : Date.now(),
    typeof data?.durationSec === "number" ? data.durationSec : null,
    typeof data?.avgSec === "number" ? data.avgSec : null
  );
}

function listEventsBetween(commerceId, fromMs, toMs) {
  return db.prepare(`
    SELECT type, t, duration_sec
    FROM events
    WHERE commerce_id = ? AND t >= ? AND t <= ?
    ORDER BY t ASC, id ASC
  `).all(commerceId, fromMs, toMs).map(r => ({
    type: r.type,
    t: r.t,
    durationSec: typeof r.duration_sec === "number" ? r.duration_sec : null
  }));
}

function waitingCount(commerceId) {
  const row = db.prepare("SELECT COUNT(*) AS c FROM tickets WHERE commerce_id = ? AND status = 'waiting'")
    .get(commerceId);
  return Number(row?.c || 0);
}

function findUserByEmail(email) {
  const row = db.prepare(`
    SELECT id, email, pass_hash, role, commerce_id
    FROM users
    WHERE email = ?
  `).get(email);
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    passHash: row.pass_hash,
    role: row.role,
    commerceId: row.commerce_id || null
  };
}

function createUser({ email, passHash, role, commerceId }) {
  const id = nextUserId();
  db.prepare(`
    INSERT INTO users (id, email, pass_hash, role, commerce_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, email, passHash, role, commerceId || null, Date.now());
  return { id, email, role, commerceId: commerceId || null };
}

module.exports = {
  db,
  dbPath,
  hasCommerce,
  listCommercesWithState,
  getCommerceWithState,
  getCommerceState,
  setCommerceState,
  listQueue,
  enqueueTicket,
  ticketPosition,
  popNextTicket,
  cancelWaitingTickets,
  getModel,
  setModel,
  addEvent,
  listEventsBetween,
  waitingCount,
  findUserByEmail,
  createUser
};
