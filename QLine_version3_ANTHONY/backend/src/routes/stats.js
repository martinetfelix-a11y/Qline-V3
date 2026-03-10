const { Router } = require("express");
const { query } = require("../db");
const { requireAuth } = require("../auth");

const statsRouter = Router();

function startOfDayIso(dayStr) {
  return new Date(`${dayStr}T00:00:00.000Z`).toISOString();
}

function endOfDayIso(dayStr) {
  return new Date(`${dayStr}T23:59:59.999Z`).toISOString();
}

function fmtMin(sec) {
  return Math.round(sec / 60);
}

async function assertCommerceAccess(req, commerceId) {
  const commerce = await query("SELECT id FROM commerces WHERE id = $1", [commerceId]);
  if (commerce.rowCount === 0) return { status: 404, body: { error: "unknown_commerce" } };
  if (req.user.role === "merchant" && req.user.commerceId !== commerceId) {
    return { status: 403, body: { error: "wrong_commerce" } };
  }
  return null;
}

statsRouter.get("/kpis", requireAuth, async (req, res, next) => {
  try {
    const commerceId = String(req.query.commerceId || "");
    const day = String(req.query.day || new Date().toISOString().slice(0, 10));
    const denied = await assertCommerceAccess(req, commerceId);
    if (denied) return res.status(denied.status).json(denied.body);

    const from = startOfDayIso(day);
    const to = endOfDayIso(day);

    const joinedResult = await query(
      `
        SELECT COUNT(*)::INT AS count
        FROM events
        WHERE commerce_id = $1 AND type = 'join' AND t >= $2 AND t <= $3
      `,
      [commerceId, from, to]
    );
    const cancelledResult = await query(
      `
        SELECT COUNT(*)::INT AS count
        FROM events
        WHERE commerce_id = $1 AND type = 'cancel' AND t >= $2 AND t <= $3
      `,
      [commerceId, from, to]
    );
    const waitingResult = await query(
      `
        SELECT COUNT(*)::INT AS count
        FROM tickets
        WHERE commerce_id = $1 AND status = 'active'
      `,
      [commerceId]
    );
    const serviceResult = await query(
      `
        SELECT
          COUNT(*)::INT AS served_today,
          AVG(duration_sec)::FLOAT AS avg_service_sec,
          PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY duration_sec)::FLOAT AS p90_service_sec
        FROM tickets
        WHERE commerce_id = $1
          AND status = 'served'
          AND served_at >= $2
          AND served_at <= $3
      `,
      [commerceId, from, to]
    );
    const waitResult = await query(
      `
        SELECT AVG(EXTRACT(EPOCH FROM (called_at - joined_at)))::FLOAT AS avg_wait_sec
        FROM tickets
        WHERE commerce_id = $1
          AND status = 'served'
          AND served_at >= $2
          AND served_at <= $3
          AND called_at IS NOT NULL
      `,
      [commerceId, from, to]
    );

    const joinedToday = joinedResult.rows[0]?.count ?? 0;
    const cancelledToday = cancelledResult.rows[0]?.count ?? 0;
    const waitingNow = waitingResult.rows[0]?.count ?? 0;
    const servedToday = serviceResult.rows[0]?.served_today ?? 0;
    const avgServiceSec = serviceResult.rows[0]?.avg_service_sec;
    const p90ServiceSec = serviceResult.rows[0]?.p90_service_sec;
    const avgWaitSec = waitResult.rows[0]?.avg_wait_sec;

    res.json({
      commerceId,
      day,
      avgWaitMin: avgWaitSec ? fmtMin(avgWaitSec) : null,
      waitingNow,
      joinedToday,
      servedToday,
      cancelledToday,
      avgServiceMin: avgServiceSec ? fmtMin(avgServiceSec) : null,
      p90ServiceMin: p90ServiceSec ? fmtMin(p90ServiceSec) : null,
      abandonmentRatePct: joinedToday > 0 ? Math.round((cancelledToday / joinedToday) * 100) : 0,
    });
  } catch (error) {
    next(error);
  }
});

statsRouter.get("/timeseries", requireAuth, async (req, res, next) => {
  try {
    const commerceId = String(req.query.commerceId || "");
    const day = String(req.query.day || new Date().toISOString().slice(0, 10));
    const denied = await assertCommerceAccess(req, commerceId);
    if (denied) return res.status(denied.status).json(denied.body);

    const from = startOfDayIso(day);
    const to = endOfDayIso(day);
    const result = await query(
      `
        SELECT
          EXTRACT(HOUR FROM t)::INT AS hour,
          COUNT(*) FILTER (WHERE type = 'join')::INT AS join,
          COUNT(*) FILTER (WHERE type = 'served')::INT AS served
        FROM events
        WHERE commerce_id = $1
          AND t >= $2
          AND t <= $3
        GROUP BY EXTRACT(HOUR FROM t)
        ORDER BY hour ASC
      `,
      [commerceId, from, to]
    );

    const series = Array.from({ length: 24 }, (_, hour) => ({ hour, join: 0, served: 0 }));
    for (const row of result.rows) {
      series[row.hour] = { hour: row.hour, join: row.join, served: row.served };
    }

    res.json({ commerceId, day, series });
  } catch (error) {
    next(error);
  }
});

statsRouter.get("/distribution", requireAuth, async (req, res, next) => {
  try {
    const commerceId = String(req.query.commerceId || "");
    const day = String(req.query.day || new Date().toISOString().slice(0, 10));
    const denied = await assertCommerceAccess(req, commerceId);
    if (denied) return res.status(denied.status).json(denied.body);

    const from = startOfDayIso(day);
    const to = endOfDayIso(day);
    const result = await query(
      `
        SELECT duration_sec
        FROM tickets
        WHERE commerce_id = $1
          AND status = 'served'
          AND served_at >= $2
          AND served_at <= $3
          AND duration_sec IS NOT NULL
      `,
      [commerceId, from, to]
    );

    const bins = [];
    for (let start = 0; start <= 60; start += 5) bins.push({ minFrom: start, minTo: start + 4, count: 0 });
    for (const row of result.rows) {
      const minute = Math.min(60, Math.floor(row.duration_sec / 60));
      const idx = Math.min(bins.length - 1, Math.floor(minute / 5));
      bins[idx].count += 1;
    }

    res.json({
      commerceId,
      day,
      histogram: bins,
      samples: result.rows.slice(0, 200).map((row) => row.duration_sec),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = { statsRouter };
