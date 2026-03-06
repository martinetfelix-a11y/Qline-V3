const { Router } = require("express");
const { requireAuth } = require("../auth");
const { hasCommerce, listEventsBetween, waitingCount } = require("../db");

const statsRouter = Router();

function startOfDayMs(dayStr) {
  const d = new Date(dayStr + "T00:00:00");
  return d.getTime();
}
function endOfDayMs(dayStr) {
  const d = new Date(dayStr + "T23:59:59");
  return d.getTime();
}
function fmtMin(sec) {
  return Math.round(sec / 60);
}

statsRouter.get("/kpis", requireAuth, (req, res) => {
  const commerceId = String(req.query.commerceId || "");
  const day = String(req.query.day || new Date().toISOString().slice(0, 10));
  if (!hasCommerce(commerceId)) return res.status(404).json({ error: "unknown_commerce" });

  if (req.user.role === "merchant" && req.user.commerceId !== commerceId) {
    return res.status(403).json({ error: "wrong_commerce" });
  }

  const from = startOfDayMs(day);
  const to = endOfDayMs(day);
  const events = listEventsBetween(commerceId, from, to);
  const served = events.filter(e => e.type === "served");
  const joins = events.filter(e => e.type === "join");

  const servedToday = served.length;
  const joinedToday = joins.length;

  const durations = served.map(s => s.durationSec).filter(n => typeof n === "number");
  const avgService = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null;

  const sorted = durations.slice().sort((a, b) => a - b);
  const p90 = sorted.length ? sorted[Math.floor(0.9 * (sorted.length - 1))] : null;

  res.json({
    commerceId,
    day,
    waitingNow: waitingCount(commerceId),
    joinedToday,
    servedToday,
    avgServiceMin: avgService ? fmtMin(avgService) : null,
    p90ServiceMin: p90 ? fmtMin(p90) : null
  });
});

statsRouter.get("/timeseries", requireAuth, (req, res) => {
  const commerceId = String(req.query.commerceId || "");
  const day = String(req.query.day || new Date().toISOString().slice(0, 10));
  if (!hasCommerce(commerceId)) return res.status(404).json({ error: "unknown_commerce" });

  if (req.user.role === "merchant" && req.user.commerceId !== commerceId) {
    return res.status(403).json({ error: "wrong_commerce" });
  }

  const from = startOfDayMs(day);
  const to = endOfDayMs(day);

  const bins = Array.from({ length: 24 }, (_, h) => ({ hour: h, join: 0, served: 0 }));
  const events = listEventsBetween(commerceId, from, to);

  for (const e of events) {
    const h = new Date(e.t).getHours();
    if (e.type === "join") bins[h].join += 1;
    if (e.type === "served") bins[h].served += 1;
  }

  res.json({ commerceId, day, series: bins });
});

statsRouter.get("/distribution", requireAuth, (req, res) => {
  const commerceId = String(req.query.commerceId || "");
  const day = String(req.query.day || new Date().toISOString().slice(0, 10));
  if (!hasCommerce(commerceId)) return res.status(404).json({ error: "unknown_commerce" });

  if (req.user.role === "merchant" && req.user.commerceId !== commerceId) {
    return res.status(403).json({ error: "wrong_commerce" });
  }

  const from = startOfDayMs(day);
  const to = endOfDayMs(day);
  const served = listEventsBetween(commerceId, from, to).filter(e => e.type === "served");

  const durations = served.map(s => s.durationSec).filter(n => typeof n === "number");
  const bins = [];
  for (let start = 0; start <= 60; start += 5) bins.push({ minFrom: start, minTo: start + 4, count: 0 });
  for (const dsec of durations) {
    const m = Math.min(60, Math.floor(dsec / 60));
    const idx = Math.min(bins.length - 1, Math.floor(m / 5));
    bins[idx].count += 1;
  }

  res.json({ commerceId, day, histogram: bins, samples: durations.slice(0, 200) });
});

module.exports = { statsRouter };
