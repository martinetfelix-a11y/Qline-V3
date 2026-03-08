const { Router } = require("express");
const { z } = require("zod");
const { db } = require("../db");
const { requireAuth, requireMerchantForCommerce } = require("../auth");
const { etaSeconds, updateServiceModel } = require("../aiEta");

const queueRouter = Router();

function nowISO() {
  return new Date().toISOString();
}

function nowHHMM() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function waitSecondsSince(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 1000));
}

function getState(commerceId) {
  if (!db.commerceState[commerceId]) db.commerceState[commerceId] = { open: true, paused: false };
  return db.commerceState[commerceId];
}

function getNowServing(commerceId) {
  if (!Object.prototype.hasOwnProperty.call(db.nowServing, commerceId)) db.nowServing[commerceId] = null;
  return db.nowServing[commerceId];
}

function setNowServing(commerceId, value) {
  db.nowServing[commerceId] = value;
}

function upsertLedger(ticket, commerceId, status, extra = {}) {
  if (!ticket?.id) return;
  const prev = db.ticketLedger[ticket.id] || {};
  db.ticketLedger[ticket.id] = {
    ticketId: ticket.id,
    commerceId,
    userId: ticket.userId || prev.userId || null,
    userEmail: ticket.userEmail || prev.userEmail || null,
    joinedAt: ticket.joinedAt || prev.joinedAt || null,
    status,
    updatedAt: nowISO(),
    ...extra,
  };
}

function ticketIdExists(id) {
  if (db.ticketLedger[id]) return true;
  if (Object.values(db.nowServing).some((t) => t && t.id === id)) return true;
  return Object.values(db.queues).some((q) => q.some((t) => t.id === id));
}

function generateTicketId() {
  let id = "";
  do {
    id = "R" + Math.floor(100000 + Math.random() * 900000);
  } while (ticketIdExists(id));
  return id;
}

function findUserActive(userId) {
  for (const [commerceId, q] of Object.entries(db.queues)) {
    const idx = q.findIndex((t) => t.userId === userId);
    if (idx >= 0) return { commerceId, ticket: q[idx], position: idx + 1, inQueue: true };
  }
  for (const [commerceId, t] of Object.entries(db.nowServing)) {
    if (t && t.userId === userId) return { commerceId, ticket: t, position: null, inQueue: false };
  }
  return null;
}

function queueView(q, role) {
  if (role === "merchant") {
    return q.map((t) => ({
      id: t.id,
      joinedAt: t.joinedAt,
      userEmail: t.userEmail || null,
      waitSec: waitSecondsSince(t.joinedAt),
    }));
  }
  return q.map((t) => ({
    id: t.id,
    joinedAt: t.joinedAt,
    waitSec: waitSecondsSince(t.joinedAt),
  }));
}

queueRouter.get("/status", (req, res) => {
  const commerceId = String(req.query.commerceId || "");
  if (!db.queues[commerceId]) return res.status(404).json({ error: "unknown_commerce" });
  const s = getState(commerceId);
  const ns = getNowServing(commerceId);
  res.json({
    commerceId,
    ...s,
    nowServing: ns ? { id: ns.id, calledAt: ns.calledAt || null } : null,
  });
});

queueRouter.get("/state", requireAuth, (req, res) => {
  const commerceId = String(req.query.commerceId || "");
  const ticketIdQuery = req.query.ticketId ? String(req.query.ticketId) : null;

  const q = db.queues[commerceId];
  if (!q) return res.status(404).json({ error: "unknown_commerce" });

  if (req.user.role === "merchant" && req.user.commerceId !== commerceId) {
    return res.status(403).json({ error: "wrong_commerce" });
  }

  const state = getState(commerceId);
  const nowServing = getNowServing(commerceId);
  const now = nowISO();

  let idx = -1;
  let activeTicket = null;

  if (ticketIdQuery) {
    idx = q.findIndex((t) => t.id === ticketIdQuery);
    if (idx >= 0) activeTicket = q[idx];
  }

  if (!activeTicket && req.user.role === "user") {
    idx = q.findIndex((t) => t.userId === req.user.sub);
    if (idx >= 0) activeTicket = q[idx];
  }

  let my = null;
  if (activeTicket && idx >= 0) {
    const myEta = etaSeconds({ model: db.models[commerceId], aheadCount: idx });
    my = {
      ticketId: activeTicket.id,
      status: "active",
      position: idx + 1,
      joinedAt: activeTicket.joinedAt,
      updatedAt: now,
      eta: myEta,
    };
  } else {
    const lookupId =
      ticketIdQuery ||
      (req.user.role === "user" && nowServing && nowServing.userId === req.user.sub ? nowServing.id : null);
    const ledger = lookupId ? db.ticketLedger[lookupId] : null;
    if (ledger && ledger.commerceId === commerceId) {
      my = {
        ticketId: ledger.ticketId,
        status: ledger.status || "unknown",
        position: null,
        joinedAt: ledger.joinedAt || null,
        updatedAt: ledger.updatedAt || null,
        calledAt: ledger.calledAt || null,
        servedAt: ledger.servedAt || null,
        cancelledAt: ledger.cancelledAt || null,
        eta: null,
      };
    }
  }

  const queueEta = etaSeconds({ model: db.models[commerceId], aheadCount: q.length });
  const visibleNowServing =
    nowServing == null
      ? null
      : req.user.role === "merchant"
        ? {
            id: nowServing.id,
            calledAt: nowServing.calledAt || null,
            joinedAt: nowServing.joinedAt || null,
            userEmail: nowServing.userEmail || null,
            waitSec: nowServing.calledAt ? waitSecondsSince(nowServing.calledAt) : 0,
          }
        : {
            id: nowServing.id,
            calledAt: nowServing.calledAt || null,
            joinedAt: nowServing.joinedAt || null,
          };

  res.json({
    commerceId,
    state,
    queue: queueView(q, req.user.role),
    nowServing: visibleNowServing,
    my,
    eta: queueEta,
    serverTime: nowHHMM(),
  });
});

queueRouter.post("/join", requireAuth, (req, res) => {
  const schema = z.object({ commerceId: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "bad_request" });

  if (req.user.role !== "user") return res.status(403).json({ error: "only_user_can_join" });

  const { commerceId } = parsed.data;
  const q = db.queues[commerceId];
  if (!q) return res.status(404).json({ error: "unknown_commerce" });

  const s = getState(commerceId);
  if (!s.open) return res.status(409).json({ error: "queue_closed" });
  if (s.paused) return res.status(409).json({ error: "queue_paused" });

  const existing = findUserActive(req.user.sub);
  if (existing) {
    if (existing.commerceId !== commerceId) {
      return res.status(409).json({
        error: "already_has_ticket",
        commerceId: existing.commerceId,
        ticketId: existing.ticket.id,
      });
    }
    const idx = q.findIndex((t) => t.id === existing.ticket.id);
    const position = idx >= 0 ? idx + 1 : null;
    const eta = idx >= 0 ? etaSeconds({ model: db.models[commerceId], aheadCount: idx }) : null;
    return res.json({
      alreadyInQueue: true,
      ticketId: existing.ticket.id,
      status: idx >= 0 ? "active" : "called",
      joinedAt: existing.ticket.joinedAt,
      position,
      eta,
      state: s,
      serverTime: nowHHMM(),
    });
  }
  

  const ticket = {
    id: generateTicketId(),
    joinedAt: nowISO(),
    userId: req.user.sub,
    userEmail: req.user.email,
  };
  q.push(ticket);
  upsertLedger(ticket, commerceId, "active");

  db.events[commerceId].push({ type: "join", t: Date.now(), ticketId: ticket.id, userId: ticket.userId });

  const position = q.length;
  const eta = etaSeconds({ model: db.models[commerceId], aheadCount: position - 1 });
  res.json({
    alreadyInQueue: false,
    ticketId: ticket.id,
    status: "active",
    joinedAt: ticket.joinedAt,
    position,
    eta,
    state: s,
    serverTime: nowHHMM(),
  });
});

queueRouter.post("/cancel", requireAuth, (req, res) => {
  const schema = z.object({
    commerceId: z.string().min(1),
    ticketId: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "bad_request" });

  const { commerceId, ticketId } = parsed.data;
  const q = db.queues[commerceId];
  if (!q) return res.status(404).json({ error: "unknown_commerce" });

  if (req.user.role === "merchant" && req.user.commerceId !== commerceId) {
    return res.status(403).json({ error: "wrong_commerce" });
  }

  let idx = -1;
  if (ticketId) idx = q.findIndex((t) => t.id === ticketId);
  else if (req.user.role === "user") idx = q.findIndex((t) => t.userId === req.user.sub);

  if (idx < 0) return res.status(404).json({ error: "ticket_not_found" });

  const ticket = q[idx];
  if (req.user.role === "user" && ticket.userId !== req.user.sub) {
    return res.status(403).json({ error: "forbidden" });
  }

  q.splice(idx, 1);
  const cancelledAt = nowISO();
  upsertLedger(ticket, commerceId, "cancelled", { cancelledAt });
  db.events[commerceId].push({ type: "cancel", t: Date.now(), ticketId: ticket.id, userId: ticket.userId });

  res.json({
    ok: true,
    cancelled: {
      ticketId: ticket.id,
      joinedAt: ticket.joinedAt,
      cancelledAt,
    },
    queue: queueView(q, req.user.role),
    state: getState(commerceId),
    serverTime: nowHHMM(),
  });
});

queueRouter.post("/next", requireAuth, requireMerchantForCommerce, (req, res) => {
  const schema = z.object({
    commerceId: z.string().min(1),
    durationSec: z.number().min(10).max(60 * 60).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "bad_request" });

  const { commerceId, durationSec } = parsed.data;
  const q = db.queues[commerceId];
  if (!q) return res.status(404).json({ error: "unknown_commerce" });

  const nowServingBefore = getNowServing(commerceId);
  let served = null;

  if (nowServingBefore) {
    const servedAt = nowISO();
    served = { ...nowServingBefore, servedAt };
    upsertLedger(nowServingBefore, commerceId, "served", { servedAt, durationSec: durationSec ?? null });

    if (typeof durationSec === "number") {
      db.models[commerceId] = updateServiceModel(db.models[commerceId], durationSec);
    }
    db.events[commerceId].push({
      type: "served",
      t: Date.now(),
      durationSec: typeof durationSec === "number" ? durationSec : null,
      ticketId: nowServingBefore.id,
      userId: nowServingBefore.userId,
    });
  }

  const nextTicket = q.shift() || null;
  let called = null;
  if (nextTicket) {
    called = { ...nextTicket, calledAt: nowISO() };
    setNowServing(commerceId, called);
    upsertLedger(nextTicket, commerceId, "called", { calledAt: called.calledAt });
    db.events[commerceId].push({ type: "call", t: Date.now(), ticketId: nextTicket.id, userId: nextTicket.userId });
  } else {
    setNowServing(commerceId, null);
  }

  res.json({
    served,
    called,
    queue: queueView(q, "merchant"),
    model: db.models[commerceId],
    state: getState(commerceId),
    nowServing: getNowServing(commerceId),
    serverTime: nowHHMM(),
  });
});

queueRouter.post("/close", requireAuth, requireMerchantForCommerce, (req, res) => {
  const schema = z.object({ commerceId: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "bad_request" });

  const { commerceId } = parsed.data;
  if (!db.queues[commerceId]) return res.status(404).json({ error: "unknown_commerce" });

  const cancelledAt = nowISO();
  for (const t of db.queues[commerceId]) {
    upsertLedger(t, commerceId, "cancelled", { cancelledAt });
    db.events[commerceId].push({ type: "cancel", t: Date.now(), ticketId: t.id, userId: t.userId, reason: "close" });
  }

  const serving = getNowServing(commerceId);
  if (serving) {
    upsertLedger(serving, commerceId, "cancelled", { cancelledAt });
    db.events[commerceId].push({ type: "cancel", t: Date.now(), ticketId: serving.id, userId: serving.userId, reason: "close" });
  }

  db.queues[commerceId] = [];
  setNowServing(commerceId, null);
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

queueRouter.post("/model", requireAuth, requireMerchantForCommerce, (req, res) => {
  const schema = z.object({
    commerceId: z.string().min(1),
    avgMin: z.number().min(1).max(120).optional(),
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
