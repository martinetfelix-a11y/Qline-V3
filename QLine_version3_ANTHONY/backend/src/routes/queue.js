const { Router } = require("express");
const { z } = require("zod");
const {
  hasCommerce,
  getCommerceState,
  setCommerceState,
  listQueue,
  enqueueTicket,
  ticketPosition,
  popNextTicket,
  cancelWaitingTickets,
  getModel,
  setModel,
  addEvent
} = require("../db");
const { requireAuth, requireMerchantForCommerce } = require("../auth");
const { etaSeconds, updateServiceModel } = require("../aiEta");

const queueRouter = Router();

function nowHHMM() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function getStateOr404(res, commerceId) {
  if (!hasCommerce(commerceId)) {
    res.status(404).json({ error: "unknown_commerce" });
    return null;
  }
  return getCommerceState(commerceId);
}

queueRouter.get("/status", (req, res) => {
  const commerceId = String(req.query.commerceId || "");
  const state = getStateOr404(res, commerceId);
  if (!state) return;
  res.json({ commerceId, ...state });
});

queueRouter.get("/state", requireAuth, (req, res) => {
  const commerceId = String(req.query.commerceId || "");
  const ticketId = req.query.ticketId ? String(req.query.ticketId) : null;

  if (!hasCommerce(commerceId)) return res.status(404).json({ error: "unknown_commerce" });

  if (req.user.role === "merchant" && req.user.commerceId !== commerceId) {
    return res.status(403).json({ error: "wrong_commerce" });
  }

  const queue = listQueue(commerceId);
  const position = ticketId ? ticketPosition(commerceId, ticketId) : null;
  const ahead = position ? position - 1 : queue.length;
  const model = getModel(commerceId);
  const eta = etaSeconds({ model, aheadCount: ahead });

  res.json({
    commerceId,
    state: getCommerceState(commerceId),
    queue,
    my: position ? { ticketId, position } : null,
    eta,
    serverTime: nowHHMM()
  });
});

queueRouter.post("/join", requireAuth, (req, res) => {
  const schema = z.object({ commerceId: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "bad_request" });

  const { commerceId } = parsed.data;
  if (!hasCommerce(commerceId)) return res.status(404).json({ error: "unknown_commerce" });

  const state = getCommerceState(commerceId);
  if (!state.open) return res.status(409).json({ error: "queue_closed" });
  if (state.paused) return res.status(409).json({ error: "queue_paused" });

  const inserted = enqueueTicket(commerceId, req.user?.sub || null);
  addEvent(commerceId, "join", { t: Date.now() });

  const model = getModel(commerceId);
  const eta = etaSeconds({ model, aheadCount: inserted.position - 1 });

  res.json({
    ticketId: inserted.ticketId,
    position: inserted.position,
    eta,
    serverTime: nowHHMM(),
    state
  });
});

queueRouter.post("/next", requireAuth, requireMerchantForCommerce, (req, res) => {
  const schema = z.object({
    commerceId: z.string().min(1),
    durationSec: z.number().min(10).max(60 * 60).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "bad_request" });

  const { commerceId, durationSec } = parsed.data;
  if (!hasCommerce(commerceId)) return res.status(404).json({ error: "unknown_commerce" });

  const served = popNextTicket(commerceId, durationSec);

  if (served && typeof durationSec === "number") {
    const nextModel = updateServiceModel(getModel(commerceId), durationSec);
    setModel(commerceId, nextModel);
    addEvent(commerceId, "served", { t: Date.now(), durationSec });
  }

  res.json({
    served,
    queue: listQueue(commerceId),
    model: getModel(commerceId),
    state: getCommerceState(commerceId),
    serverTime: nowHHMM()
  });
});

queueRouter.post("/close", requireAuth, requireMerchantForCommerce, (req, res) => {
  const schema = z.object({ commerceId: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "bad_request" });

  const { commerceId } = parsed.data;
  if (!hasCommerce(commerceId)) return res.status(404).json({ error: "unknown_commerce" });

  cancelWaitingTickets(commerceId);
  const state = setCommerceState(commerceId, { open: false, paused: false });
  addEvent(commerceId, "close", { t: Date.now() });

  res.json({ ok: true, state, serverTime: nowHHMM() });
});

queueRouter.post("/open", requireAuth, requireMerchantForCommerce, (req, res) => {
  const schema = z.object({ commerceId: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "bad_request" });

  const { commerceId } = parsed.data;
  if (!hasCommerce(commerceId)) return res.status(404).json({ error: "unknown_commerce" });

  const state = setCommerceState(commerceId, { open: true });
  addEvent(commerceId, "open", { t: Date.now() });

  res.json({ ok: true, state, serverTime: nowHHMM() });
});

queueRouter.post("/pause", requireAuth, requireMerchantForCommerce, (req, res) => {
  const schema = z.object({ commerceId: z.string().min(1), paused: z.boolean() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "bad_request" });

  const { commerceId, paused } = parsed.data;
  if (!hasCommerce(commerceId)) return res.status(404).json({ error: "unknown_commerce" });

  const state = setCommerceState(commerceId, { paused });
  addEvent(commerceId, paused ? "pause" : "resume", { t: Date.now() });

  res.json({ ok: true, state, serverTime: nowHHMM() });
});

queueRouter.post("/model", requireAuth, requireMerchantForCommerce, (req, res) => {
  const schema = z.object({
    commerceId: z.string().min(1),
    avgMin: z.number().min(1).max(120).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "bad_request" });

  const { commerceId, avgMin } = parsed.data;
  if (!hasCommerce(commerceId)) return res.status(404).json({ error: "unknown_commerce" });

  if (typeof avgMin === "number") {
    const cur = getModel(commerceId);
    const avg = avgMin * 60;
    setModel(commerceId, { ...cur, avg });
    addEvent(commerceId, "model_update", { t: Date.now(), avgSec: avg });
  }

  res.json({ ok: true, model: getModel(commerceId) });
});

module.exports = { queueRouter };
