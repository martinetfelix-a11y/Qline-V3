const { Router } = require("express");
const { z } = require("zod");
const { withTransaction, query } = require("../db");
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

function mapModel(row) {
  return { avg: row.model_avg_sec, var: row.model_var_sec };
}

function mapQueueTicket(ticket, role) {
  const base = {
    id: ticket.id,
    joinedAt: ticket.joined_at,
    waitSec: waitSecondsSince(ticket.joined_at),
  };
  if (role === "merchant") return { ...base, userEmail: ticket.user_email || null };
  return base;
}

function mapCalledTicket(ticket, role) {
  if (!ticket) return null;
  if (role === "merchant") {
    return {
      id: ticket.id,
      calledAt: ticket.called_at,
      joinedAt: ticket.joined_at,
      userEmail: ticket.user_email || null,
      waitSec: ticket.called_at ? waitSecondsSince(ticket.called_at) : 0,
    };
  }
  return {
    id: ticket.id,
    calledAt: ticket.called_at,
    joinedAt: ticket.joined_at,
  };
}

function nextTicketId() {
  return `R${Math.floor(100000 + Math.random() * 900000)}`;
}

async function insertEvent(client, event) {
  await client.query(
    `
      INSERT INTO events (commerce_id, type, t, ticket_id, user_id, duration_sec, reason, avg_sec)
      VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7)
    `,
    [
      event.commerceId,
      event.type,
      event.ticketId || null,
      event.userId || null,
      event.durationSec ?? null,
      event.reason || null,
      event.avgSec ?? null,
    ]
  );
}

async function getCommerce(client, commerceId) {
  const result = await client.query(
    `
      SELECT id, name, open, paused, model_avg_sec, model_var_sec
      FROM commerces
      WHERE id = $1
    `,
    [commerceId]
  );
  return result.rows[0] || null;
}

async function getQueue(client, commerceId) {
  const result = await client.query(
    `
      SELECT id, joined_at, user_id, user_email
      FROM tickets
      WHERE commerce_id = $1 AND status = 'active'
      ORDER BY joined_at ASC
    `,
    [commerceId]
  );
  return result.rows;
}

async function getCurrentCalled(client, commerceId, forUpdate = false) {
  const result = await client.query(
    `
      SELECT id, joined_at, called_at, user_id, user_email, status
      FROM tickets
      WHERE commerce_id = $1 AND status = 'called'
      ORDER BY called_at ASC
      LIMIT 1
      ${forUpdate ? "FOR UPDATE" : ""}
    `,
    [commerceId]
  );
  return result.rows[0] || null;
}

async function getUserActiveTicket(client, userId) {
  const result = await client.query(
    `
      SELECT id, commerce_id, joined_at, called_at, status
      FROM tickets
      WHERE user_id = $1 AND status IN ('active', 'called')
      ORDER BY CASE WHEN status = 'called' THEN 0 ELSE 1 END, updated_at DESC
      LIMIT 1
    `,
    [userId]
  );
  return result.rows[0] || null;
}

async function getTicketById(client, ticketId) {
  const result = await client.query(
    `
      SELECT id, commerce_id, joined_at, called_at, served_at, cancelled_at, updated_at, status
      FROM tickets
      WHERE id = $1
    `,
    [ticketId]
  );
  return result.rows[0] || null;
}

async function generateUniqueTicketId(client) {
  for (;;) {
    const id = nextTicketId();
    const found = await client.query("SELECT 1 FROM tickets WHERE id = $1", [id]);
    if (found.rowCount === 0) return id;
  }
}

queueRouter.get("/status", async (req, res, next) => {
  try {
    const commerceId = String(req.query.commerceId || "");
    const commerce = await withTransaction((client) => getCommerce(client, commerceId));
    if (!commerce) return res.status(404).json({ error: "unknown_commerce" });

    const nowServing = await withTransaction((client) => getCurrentCalled(client, commerceId));
    return res.json({
      commerceId,
      open: commerce.open,
      paused: commerce.paused,
      nowServing: nowServing ? { id: nowServing.id, calledAt: nowServing.called_at || null } : null,
    });
  } catch (error) {
    next(error);
  }
});

queueRouter.get("/state", requireAuth, async (req, res, next) => {
  try {
    const commerceId = String(req.query.commerceId || "");
    const ticketIdQuery = req.query.ticketId ? String(req.query.ticketId) : null;

    const payload = await withTransaction(async (client) => {
      const commerce = await getCommerce(client, commerceId);
      if (!commerce) return { error: { status: 404, body: { error: "unknown_commerce" } } };

      if (req.user.role === "merchant" && req.user.commerceId !== commerceId) {
        return { error: { status: 403, body: { error: "wrong_commerce" } } };
      }

      const queue = await getQueue(client, commerceId);
      const nowServing = await getCurrentCalled(client, commerceId);
      const model = mapModel(commerce);

      let my = null;
      let activeIdx = -1;
      let activeTicket = null;

      if (ticketIdQuery) {
        activeIdx = queue.findIndex((ticket) => ticket.id === ticketIdQuery);
        if (activeIdx >= 0) activeTicket = queue[activeIdx];
      }

      if (!activeTicket && req.user.role === "user") {
        activeIdx = queue.findIndex((ticket) => ticket.user_id === req.user.sub);
        if (activeIdx >= 0) activeTicket = queue[activeIdx];
      }

      if (activeTicket && activeIdx >= 0) {
        my = {
          ticketId: activeTicket.id,
          status: "active",
          position: activeIdx + 1,
          joinedAt: activeTicket.joined_at,
          updatedAt: nowISO(),
          eta: etaSeconds({ model, aheadCount: activeIdx }),
        };
      } else {
        const lookupId =
          ticketIdQuery ||
          (req.user.role === "user" && nowServing && nowServing.user_id === req.user.sub ? nowServing.id : null);

        if (lookupId) {
          const ticket = await getTicketById(client, lookupId);
          if (ticket && ticket.commerce_id === commerceId) {
            my = {
              ticketId: ticket.id,
              status: ticket.status || "unknown",
              position: null,
              joinedAt: ticket.joined_at || null,
              updatedAt: ticket.updated_at || null,
              calledAt: ticket.called_at || null,
              servedAt: ticket.served_at || null,
              cancelledAt: ticket.cancelled_at || null,
              eta: null,
            };
          }
        }
      }

      return {
        commerceId,
        state: { open: commerce.open, paused: commerce.paused },
        queue: queue.map((ticket) => mapQueueTicket(ticket, req.user.role)),
        nowServing: mapCalledTicket(nowServing, req.user.role),
        my,
        eta: etaSeconds({ model, aheadCount: queue.length }),
        serverTime: nowHHMM(),
      };
    });

    if (payload.error) return res.status(payload.error.status).json(payload.error.body);
    return res.json(payload);
  } catch (error) {
    next(error);
  }
});

queueRouter.post("/join", requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({ commerceId: z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "bad_request" });
    if (req.user.role !== "user") return res.status(403).json({ error: "only_user_can_join" });

    const payload = await withTransaction(async (client) => {
      const { commerceId } = parsed.data;
      const commerce = await getCommerce(client, commerceId);
      if (!commerce) return { error: { status: 404, body: { error: "unknown_commerce" } } };
      if (!commerce.open) return { error: { status: 409, body: { error: "queue_closed" } } };
      if (commerce.paused) return { error: { status: 409, body: { error: "queue_paused" } } };

      const existing = await getUserActiveTicket(client, req.user.sub);
      if (existing) {
        if (existing.commerce_id !== commerceId) {
          return {
            error: {
              status: 409,
              body: {
                error: "already_has_ticket",
                commerceId: existing.commerce_id,
                ticketId: existing.id,
              },
            },
          };
        }

        const queue = await getQueue(client, commerceId);
        const idx = queue.findIndex((ticket) => ticket.id === existing.id);
        return {
          alreadyInQueue: true,
          ticketId: existing.id,
          status: idx >= 0 ? "active" : "called",
          joinedAt: existing.joined_at,
          position: idx >= 0 ? idx + 1 : null,
          eta: idx >= 0 ? etaSeconds({ model: mapModel(commerce), aheadCount: idx }) : null,
          state: { open: commerce.open, paused: commerce.paused },
          serverTime: nowHHMM(),
        };
      }

      const ticketId = await generateUniqueTicketId(client);
      const joinedAt = nowISO();
      await client.query(
        `
          INSERT INTO tickets (id, commerce_id, user_id, user_email, joined_at, status, updated_at)
          VALUES ($1, $2, $3, $4, $5, 'active', NOW())
        `,
        [ticketId, commerceId, req.user.sub, req.user.email, joinedAt]
      );
      await insertEvent(client, { commerceId, type: "join", ticketId, userId: req.user.sub });

      const queue = await getQueue(client, commerceId);
      const position = queue.findIndex((ticket) => ticket.id === ticketId) + 1;
      return {
        alreadyInQueue: false,
        ticketId,
        status: "active",
        joinedAt,
        position,
        eta: etaSeconds({ model: mapModel(commerce), aheadCount: Math.max(0, position - 1) }),
        state: { open: commerce.open, paused: commerce.paused },
        serverTime: nowHHMM(),
      };
    });

    if (payload.error) return res.status(payload.error.status).json(payload.error.body);
    return res.json(payload);
  } catch (error) {
    next(error);
  }
});

queueRouter.post("/cancel", requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      commerceId: z.string().min(1),
      ticketId: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "bad_request" });

    const payload = await withTransaction(async (client) => {
      const { commerceId, ticketId } = parsed.data;
      const commerce = await getCommerce(client, commerceId);
      if (!commerce) return { error: { status: 404, body: { error: "unknown_commerce" } } };

      if (req.user.role === "merchant" && req.user.commerceId !== commerceId) {
        return { error: { status: 403, body: { error: "wrong_commerce" } } };
      }

      const ticketResult = await client.query(
        `
          SELECT id, user_id, joined_at, user_email
          FROM tickets
          WHERE commerce_id = $1
            AND status = 'active'
            AND (
              ($2::TEXT IS NOT NULL AND id = $2)
              OR ($2::TEXT IS NULL AND $3 = 'user' AND user_id = $4)
            )
          ORDER BY joined_at ASC
          LIMIT 1
          FOR UPDATE
        `,
        [commerceId, ticketId || null, req.user.role, req.user.sub]
      );

      if (ticketResult.rowCount === 0) return { error: { status: 404, body: { error: "ticket_not_found" } } };
      const ticket = ticketResult.rows[0];
      if (req.user.role === "user" && ticket.user_id !== req.user.sub) {
        return { error: { status: 403, body: { error: "forbidden" } } };
      }

      const cancelledAt = nowISO();
      await client.query(
        `
          UPDATE tickets
          SET status = 'cancelled', cancelled_at = $2, updated_at = NOW()
          WHERE id = $1
        `,
        [ticket.id, cancelledAt]
      );
      await insertEvent(client, { commerceId, type: "cancel", ticketId: ticket.id, userId: ticket.user_id });

      const queue = await getQueue(client, commerceId);
      return {
        ok: true,
        cancelled: { ticketId: ticket.id, joinedAt: ticket.joined_at, cancelledAt },
        queue: queue.map((item) => mapQueueTicket(item, req.user.role)),
        state: { open: commerce.open, paused: commerce.paused },
        serverTime: nowHHMM(),
      };
    });

    if (payload.error) return res.status(payload.error.status).json(payload.error.body);
    return res.json(payload);
  } catch (error) {
    next(error);
  }
});

queueRouter.post("/next", requireAuth, requireMerchantForCommerce, async (req, res, next) => {
  try {
    const schema = z.object({
      commerceId: z.string().min(1),
      durationSec: z.number().min(10).max(60 * 60).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "bad_request" });

    const payload = await withTransaction(async (client) => {
      const { commerceId, durationSec } = parsed.data;
      const commerce = await getCommerce(client, commerceId);
      if (!commerce) return { error: { status: 404, body: { error: "unknown_commerce" } } };

      const nowServingBefore = await getCurrentCalled(client, commerceId, true);
      let served = null;
      let nextModel = mapModel(commerce);

      if (nowServingBefore) {
        const servedAt = nowISO();
        await client.query(
          `
            UPDATE tickets
            SET status = 'served', served_at = $2, duration_sec = $3, updated_at = NOW()
            WHERE id = $1
          `,
          [nowServingBefore.id, servedAt, typeof durationSec === "number" ? durationSec : null]
        );

        if (typeof durationSec === "number") {
          nextModel = updateServiceModel(nextModel, durationSec);
          await client.query(
            `
              UPDATE commerces
              SET model_avg_sec = $2, model_var_sec = $3
              WHERE id = $1
            `,
            [commerceId, Math.round(nextModel.avg), nextModel.var]
          );
        }

        await insertEvent(client, {
          commerceId,
          type: "served",
          ticketId: nowServingBefore.id,
          userId: nowServingBefore.user_id,
          durationSec: typeof durationSec === "number" ? durationSec : null,
        });

        served = { ...nowServingBefore, servedAt };
      }

      const nextTicketResult = await client.query(
        `
          SELECT id, joined_at, user_id, user_email
          FROM tickets
          WHERE commerce_id = $1 AND status = 'active'
          ORDER BY joined_at ASC
          LIMIT 1
          FOR UPDATE
        `,
        [commerceId]
      );

      let called = null;
      if (nextTicketResult.rowCount > 0) {
        const nextTicket = nextTicketResult.rows[0];
        const calledAt = nowISO();
        await client.query(
          `
            UPDATE tickets
            SET status = 'called', called_at = $2, updated_at = NOW()
            WHERE id = $1
          `,
          [nextTicket.id, calledAt]
        );
        await insertEvent(client, {
          commerceId,
          type: "call",
          ticketId: nextTicket.id,
          userId: nextTicket.user_id,
        });
        called = { ...nextTicket, called_at: calledAt };
      }

      const queue = await getQueue(client, commerceId);
      return {
        served,
        called,
        queue: queue.map((ticket) => mapQueueTicket(ticket, "merchant")),
        model: nextModel,
        state: { open: commerce.open, paused: commerce.paused },
        nowServing: mapCalledTicket(called, "merchant"),
        serverTime: nowHHMM(),
      };
    });

    if (payload.error) return res.status(payload.error.status).json(payload.error.body);
    return res.json(payload);
  } catch (error) {
    next(error);
  }
});

queueRouter.post("/close", requireAuth, requireMerchantForCommerce, async (req, res, next) => {
  try {
    const schema = z.object({ commerceId: z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "bad_request" });

    const payload = await withTransaction(async (client) => {
      const { commerceId } = parsed.data;
      const commerce = await getCommerce(client, commerceId);
      if (!commerce) return { error: { status: 404, body: { error: "unknown_commerce" } } };

      const cancelledAt = nowISO();
      const ticketRows = await client.query(
        `
          SELECT id, user_id
          FROM tickets
          WHERE commerce_id = $1 AND status IN ('active', 'called')
          FOR UPDATE
        `,
        [commerceId]
      );

      for (const ticket of ticketRows.rows) {
        await client.query(
          `
            UPDATE tickets
            SET status = 'cancelled', cancelled_at = $2, updated_at = NOW()
            WHERE id = $1
          `,
          [ticket.id, cancelledAt]
        );
        await insertEvent(client, {
          commerceId,
          type: "cancel",
          ticketId: ticket.id,
          userId: ticket.user_id,
          reason: "close",
        });
      }

      await client.query(
        `
          UPDATE commerces
          SET open = FALSE, paused = FALSE
          WHERE id = $1
        `,
        [commerceId]
      );
      await insertEvent(client, { commerceId, type: "close" });
      return { ok: true, state: { open: false, paused: false }, serverTime: nowHHMM() };
    });

    if (payload.error) return res.status(payload.error.status).json(payload.error.body);
    return res.json(payload);
  } catch (error) {
    next(error);
  }
});

queueRouter.post("/open", requireAuth, requireMerchantForCommerce, async (req, res, next) => {
  try {
    const schema = z.object({ commerceId: z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "bad_request" });

    const payload = await withTransaction(async (client) => {
      const { commerceId } = parsed.data;
      const commerce = await getCommerce(client, commerceId);
      if (!commerce) return { error: { status: 404, body: { error: "unknown_commerce" } } };

      await client.query("UPDATE commerces SET open = TRUE WHERE id = $1", [commerceId]);
      await insertEvent(client, { commerceId, type: "open" });
      return { ok: true, state: { open: true, paused: commerce.paused }, serverTime: nowHHMM() };
    });

    if (payload.error) return res.status(payload.error.status).json(payload.error.body);
    return res.json(payload);
  } catch (error) {
    next(error);
  }
});

queueRouter.post("/pause", requireAuth, requireMerchantForCommerce, async (req, res, next) => {
  try {
    const schema = z.object({ commerceId: z.string().min(1), paused: z.boolean() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "bad_request" });

    const payload = await withTransaction(async (client) => {
      const { commerceId, paused } = parsed.data;
      const commerce = await getCommerce(client, commerceId);
      if (!commerce) return { error: { status: 404, body: { error: "unknown_commerce" } } };

      await client.query("UPDATE commerces SET paused = $2 WHERE id = $1", [commerceId, paused]);
      await insertEvent(client, { commerceId, type: paused ? "pause" : "resume" });
      return { ok: true, state: { open: commerce.open, paused }, serverTime: nowHHMM() };
    });

    if (payload.error) return res.status(payload.error.status).json(payload.error.body);
    return res.json(payload);
  } catch (error) {
    next(error);
  }
});

queueRouter.post("/model", requireAuth, requireMerchantForCommerce, async (req, res, next) => {
  try {
    const schema = z.object({
      commerceId: z.string().min(1),
      avgMin: z.number().min(1).max(120).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "bad_request" });

    const payload = await withTransaction(async (client) => {
      const { commerceId, avgMin } = parsed.data;
      const commerce = await getCommerce(client, commerceId);
      if (!commerce) return { error: { status: 404, body: { error: "unknown_commerce" } } };

      let model = mapModel(commerce);
      if (typeof avgMin === "number") {
        model = { ...model, avg: avgMin * 60 };
        await client.query(
          `
            UPDATE commerces
            SET model_avg_sec = $2
            WHERE id = $1
          `,
          [commerceId, model.avg]
        );
        await insertEvent(client, { commerceId, type: "model_update", avgSec: model.avg });
      }

      return { ok: true, model };
    });

    if (payload.error) return res.status(payload.error.status).json(payload.error.body);
    return res.json(payload);
  } catch (error) {
    next(error);
  }
});

module.exports = { queueRouter };
