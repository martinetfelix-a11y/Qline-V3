const { Router } = require("express");
const { requireAuth } = require("../auth");
const { db, hasCommerce, listEventsBetween, waitingCount } = require("../db");

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
function round1(n) {
  return Math.round(n * 10) / 10;
}
function isToday(day) {
  const d = new Date();
  const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return day === local;
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
  const waitingNow = waitingCount(commerceId);

  const durations = served.map(s => s.durationSec).filter(n => typeof n === "number");
  const avgService = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null;

  const waitRow = db.prepare(`
    SELECT AVG(served_at_ms - joined_at_ms) AS avg_wait_ms
    FROM tickets
    WHERE commerce_id = ?
      AND status = 'served'
      AND served_at_ms IS NOT NULL
      AND served_at_ms >= ?
      AND served_at_ms <= ?
  `).get(commerceId, from, to);
  const avgWaitSec = typeof waitRow?.avg_wait_ms === "number" ? Number(waitRow.avg_wait_ms) / 1000 : null;

  const cancelledRow = db.prepare(`
    SELECT COUNT(*) AS c
    FROM tickets
    WHERE commerce_id = ?
      AND status = 'cancelled'
      AND joined_at_ms >= ?
      AND joined_at_ms <= ?
  `).get(commerceId, from, to);
  const cancelledToday = Number(cancelledRow?.c || 0);

  const abandonRatePct = joinedToday > 0 ? round1((cancelledToday / joinedToday) * 100) : null;

  const sorted = durations.slice().sort((a, b) => a - b);
  const p90 = sorted.length ? sorted[Math.floor(0.9 * (sorted.length - 1))] : null;

  let forecastJoinedToday = joinedToday;
  let forecastServedToday = servedToday;
  let forecastEndWaiting = waitingNow;

  if (isToday(day)) {
    const now = new Date();
    const elapsedHours = Math.max(1, now.getHours() + now.getMinutes() / 60);
    const projectedJoin = Math.round((joinedToday / elapsedHours) * 24);
    const projectedServed = Math.round((servedToday / elapsedHours) * 24);
    forecastJoinedToday = Math.max(joinedToday, projectedJoin);
    forecastServedToday = Math.max(servedToday, projectedServed);
    forecastEndWaiting = Math.max(0, waitingNow + (forecastJoinedToday - joinedToday) - (forecastServedToday - servedToday));
  }

  res.json({
    commerceId,
    day,
    waitingNow,
    joinedToday,
    servedToday,
    cancelledToday,
    avgWaitMin: avgWaitSec === null ? null : round1(avgWaitSec / 60),
    avgServiceMin: avgService ? fmtMin(avgService) : null,
    p90ServiceMin: p90 ? fmtMin(p90) : null,
    abandonRatePct,
    forecastJoinedToday,
    forecastServedToday,
    forecastEndWaiting
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
