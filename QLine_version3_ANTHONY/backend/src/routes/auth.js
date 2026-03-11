const { Router } = require("express");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const { db } = require("../db");
const { signToken } = require("../auth");

const authRouter = Router();

function hasCommerce(id) {
  return db.commerces.some((c) => c.id === id);
}

(function seed() {
  const ensure = (email, password, role, commerceId) => {
    if (db.users.some((u) => u.email === email)) return;
    const passHash = bcrypt.hashSync(password, 10);
    db.users.push({
      id: "u" + (db.users.length + 1),
      email,
      passHash,
      role,
      ...(commerceId ? { commerceId } : {}),
    });
  };

  ensure("c1@qline.dev", "merchant123", "merchant", "c1");
  ensure("c2@qline.dev", "merchant123", "merchant", "c2");
  ensure("c3@qline.dev", "merchant123", "merchant", "c3");
  ensure("user@qline.dev", "user1234", "user");
})();

authRouter.post("/signup", (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(["user", "merchant"]),
    commerceId: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "bad_request", details: parsed.error.flatten() });

  const { email, password, role, commerceId } = parsed.data;
  if (db.users.some((u) => u.email === email)) return res.status(409).json({ error: "email_taken" });

  if (role === "merchant" && (!commerceId || !hasCommerce(commerceId))) {
    return res.status(400).json({ error: "invalid_commerceId" });
  }

  const id = "u" + (db.users.length + 1);
  const passHash = bcrypt.hashSync(password, 10);
  db.users.push({ id, email, passHash, role, ...(role === "merchant" ? { commerceId } : {}) });

  const token = signToken({ sub: id, email, role, ...(role === "merchant" ? { commerceId } : {}) });
  res.json({ token, role, email, commerceId: role === "merchant" ? commerceId : null });
});

authRouter.post("/login", (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "bad_request" });

  const { email, password } = parsed.data;
  const user = db.users.find((u) => u.email === email);
  if (!user) return res.status(401).json({ error: "invalid_credentials" });

  const ok = bcrypt.compareSync(password, user.passHash);
  if (!ok) return res.status(401).json({ error: "invalid_credentials" });

  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    ...(user.role === "merchant" ? { commerceId: user.commerceId } : {}),
  });

  res.json({ token, role: user.role, email: user.email, commerceId: user.role === "merchant" ? user.commerceId : null });
});

module.exports = { authRouter };
