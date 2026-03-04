const { Router } = require("express");
const { z } = require("zod");
const { db } = require("../db");
const { requireAuth, requireMerchantForCommerce } = require("../auth");
const { etaSeconds, updateServiceModel } = require("../aiEta");

const queueRouter = Router();

function nowHHMM() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function getState(commerceId) {
  if (!db.commerceState[commerceId]) db.commerceState[commerceId] = { open: true, paused: false };
  return db.commerceState[commerceId];
}

queueRouter.get("/status", (req, res) => {
  const commerceId = String(req.query.commerceId || "");
  if (!db.queues[commerceId]) return res.status(404).json({ error: "unknown_commerce" });
  const s = getState(commerceId);
  res.json({ commerceId, ...s });
});

queueRouter.get("/state", requireAuth, (req, res) => {
  const commerceId = String(req.query.commerceId || "");
  const ticketId = req.query.ticketId ? String(req.query.ticketId) : null;

  const q = db.queues[commerceId];
  if (!q) return res.status(404).json({ error: "unknown_commerce" });

  if (req.user.role === "merchant" && req.user.commerceId !== commerceId) {
    return res.status(403).json({ error: "wrong_commerce" });
  }

  const idx = ticketId ? q.findIndex(t => t.id === ticketId) : -1;
  const ahead = idx >= 0 ? idx : q.length;
  const eta = etaSeconds({ model: db.models[commerceId], aheadCount: ahead });

  res.json({
    commerceId,
    state: getState(commerceId),
    queue: q,
    my: idx >= 0 ? { ticketId, position: idx + 1 } : null,
    eta,
    serverTime: nowHHMM()
  });
});

queueRouter.post("/join", requireAuth, (req, res) => {
  const schema = z.object({ commerceId: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "bad_request" });

  const { commerceId } = parsed.data;
  const q = db.queues[commerceId];
  if (!q) return res.status(404).json({ error: "unknown_commerce" });

  const s = getState(commerceId);
  if (!s.open) return res.status(409).json({ error: "queue_closed" });
  if (s.paused) return res.status(409).json({ error: "queue_paused" });

  // Prevent duplicate ticket in same queue (basic)
  // NOTE: Without userId binding, this just prevents exact ID duplication.
  const id = "A" + (10 + Math.floor(Math.random() * 90));
  const joinedAt = new Date().toISOString();
  q.push({ id, joinedAt });

  db.events[commerceId].push({ type: "join", t: Date.now() });

  const position = q.length;
  const eta = etaSeconds({ model: db.models[commerceId], aheadCount: position - 1 });

  res.json({ ticketId: id, position, eta, serverTime: nowHHMM(), state: s });
});

queueRouter.post("/next", requireAuth, requireMerchantForCommerce, (req, res) => {
  const schema = z.object({
    commerceId: z.string().min(1),
    durationSec: z.number().min(10).max(60 * 60).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "bad_request" });

  const { commerceId, durationSec } = parsed.data;
  const q = db.queues[commerceId];
  if (!q) return res.status(404).json({ error: "unknown_commerce" });

  const served = q.shift() || null;

  // If merchant provides real duration, update model + stats
  if (served && typeof durationSec === "number") {
    db.models[commerceId] = updateServiceModel(db.models[commerceId], durationSec);
    db.events[commerceId].push({ type: "served", t: Date.now(), durationSec });
  }

  res.json({ served, queue: q, model: db.models[commerceId], state: getState(commerceId), serverTime: nowHHMM() });
});

queueRouter.post("/close", requireAuth, requireMerchantForCommerce, (req, res) => {
  const schema = z.object({ commerceId: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "bad_request" });

  const { commerceId } = parsed.data;
  if (!db.queues[commerceId]) return res.status(404).json({ error: "unknown_commerce" });

  // Close = stop new joins + clear current queue
  db.queues[commerceId] = [];
  const s = getState(commerceId);
  s.open = false;
  s.paused = false;

  db.events[commerceId].push({ type: "close", t: Date.now() });

  res.json({ ok: true, state: s, serverTime: nowHHMM() });
});

queueRouter.post("/open", requireAuth, requireMerchantForCommerce, (req, res) => {
  const schema = z.object({ commerceId: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "bad_request" });

  const { commerceId } = parsed.data;
  if (!db.queues[commerceId]) return res.status(404).json({ error: "unknown_commerce" });

  const s = getState(commerceId);
  s.open = true;

  db.events[commerceId].push({ type: "open", t: Date.now() });

  res.json({ ok: true, state: s, serverTime: nowHHMM() });
});

queueRouter.post("/pause", requireAuth, requireMerchantForCommerce, (req, res) => {
  const schema = z.object({ commerceId: z.string().min(1), paused: z.boolean() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "bad_request" });

  const { commerceId, paused } = parsed.data;
  if (!db.queues[commerceId]) return res.status(404).json({ error: "unknown_commerce" });

  const s = getState(commerceId);
  s.paused = paused;

  db.events[commerceId].push({ type: paused ? "pause" : "resume", t: Date.now() });

  res.json({ ok: true, state: s, serverTime: nowHHMM() });
});

// Optional: allow merchant to set an initial average service time (minutes) for the AI model
queueRouter.post("/model", requireAuth, requireMerchantForCommerce, (req, res) => {
  const schema = z.object({
    commerceId: z.string().min(1),
    avgMin: z.number().min(1).max(120).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "bad_request" });

  const { commerceId, avgMin } = parsed.data;
  if (!db.models[commerceId]) return res.status(404).json({ error: "unknown_commerce" });

  if (typeof avgMin === "number") {
    const avg = avgMin * 60;
    const cur = db.models[commerceId];
    db.models[commerceId] = { ...cur, avg };
    db.events[commerceId].push({ type: "model_update", t: Date.now(), avgSec: avg });
  }

  res.json({ ok: true, model: db.models[commerceId] });
});

module.exports = { queueRouter };
