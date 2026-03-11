const { Router } = require("express");
const { db } = require("../db");
const { requireAuth } = require("../auth");

const commercesRouter = Router();

function withState(c) {
  const s = db.commerceState[c.id] || { open: true, paused: false };
  return { ...c, ...s };
}

commercesRouter.get("/public", (req, res) => {
  res.json({ commerces: db.commerces.map(withState) });
});

commercesRouter.get("/:id/public", (req, res) => {
  const id = String(req.params.id || "");
  const c = db.commerces.find((x) => x.id === id);
  if (!c) return res.status(404).json({ error: "unknown_commerce" });
  res.json({ commerce: withState(c) });
});

commercesRouter.get("/", requireAuth, (req, res) => {
  if (req.user.role === "merchant") {
    const c = db.commerces.find((x) => x.id === req.user.commerceId);
    return res.json({ commerces: c ? [withState(c)] : [] });
  }
  res.json({ commerces: db.commerces.map(withState) });
});

module.exports = { commercesRouter };
