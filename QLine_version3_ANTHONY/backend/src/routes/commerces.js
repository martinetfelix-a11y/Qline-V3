const { Router } = require("express");
const { query } = require("../db");
const { requireAuth } = require("../auth");

const commercesRouter = Router();

async function fetchCommerces(commerceId) {
  const params = [];
  let sql = `
    SELECT id, name, open, paused
    FROM commerces
  `;

  if (commerceId) {
    params.push(commerceId);
    sql += ` WHERE id = $1`;
  }

  sql += ` ORDER BY id`;
  const result = await query(sql, params);
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    open: row.open,
    paused: row.paused,
  }));
}

commercesRouter.get("/public", async (req, res, next) => {
  try {
    const commerces = await fetchCommerces();
    res.json({ commerces });
  } catch (error) {
    next(error);
  }
});

commercesRouter.get("/:id/public", async (req, res, next) => {
  try {
    const id = String(req.params.id || "");
    const commerces = await fetchCommerces(id);
    if (!commerces[0]) return res.status(404).json({ error: "unknown_commerce" });
    res.json({ commerce: commerces[0] });
  } catch (error) {
    next(error);
  }
});

commercesRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const commerces = req.user.role === "merchant" ? await fetchCommerces(req.user.commerceId) : await fetchCommerces();
    res.json({ commerces });
  } catch (error) {
    next(error);
  }
});

module.exports = { commercesRouter };
