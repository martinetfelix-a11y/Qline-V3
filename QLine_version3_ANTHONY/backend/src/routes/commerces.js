const { Router } = require("express");
const { requireAuth } = require("../auth");
const { listCommercesWithState, getCommerceWithState } = require("../db");

const commercesRouter = Router();

commercesRouter.get("/public", (req, res) => {
  res.json({ commerces: listCommercesWithState() });
});

commercesRouter.get("/:id/public", (req, res) => {
  const id = String(req.params.id || "");
  const commerce = getCommerceWithState(id);
  if (!commerce) return res.status(404).json({ error: "unknown_commerce" });
  res.json({ commerce });
});

commercesRouter.get("/", requireAuth, (req, res) => {
  if (req.user.role === "merchant") {
    const commerce = getCommerceWithState(req.user.commerceId);
    return res.json({ commerces: commerce ? [commerce] : [] });
  }
  res.json({ commerces: listCommercesWithState() });
});

module.exports = { commercesRouter };
