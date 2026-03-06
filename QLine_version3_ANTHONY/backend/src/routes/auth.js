const { Router } = require("express");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const { hasCommerce, findUserByEmail, createUser } = require("../db");
const { signToken } = require("../auth");

const authRouter = Router();

(function seed() {
  const ensure = (email, password, role, commerceId) => {
    if (findUserByEmail(email)) return;
    const passHash = bcrypt.hashSync(password, 10);
    createUser({ email, passHash, role, commerceId });
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
    commerceId: z.string().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "bad_request", details: parsed.error.flatten() });

  const { email, password, role, commerceId } = parsed.data;
  if (findUserByEmail(email)) return res.status(409).json({ error: "email_taken" });

  if (role === "merchant") {
    if (!commerceId || !hasCommerce(commerceId)) return res.status(400).json({ error: "invalid_commerceId" });
  }

  const passHash = bcrypt.hashSync(password, 10);
  const user = createUser({ email, passHash, role, commerceId: role === "merchant" ? commerceId : null });

  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    ...(user.role === "merchant" ? { commerceId: user.commerceId } : {})
  });

  res.json({ token, role: user.role, email: user.email, commerceId: user.commerceId });
});

authRouter.post("/login", (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1)
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "bad_request" });

  const { email, password } = parsed.data;
  const user = findUserByEmail(email);
  if (!user) return res.status(401).json({ error: "invalid_credentials" });

  const ok = bcrypt.compareSync(password, user.passHash);
  if (!ok) return res.status(401).json({ error: "invalid_credentials" });

  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    ...(user.role === "merchant" ? { commerceId: user.commerceId } : {})
  });

  res.json({ token, role: user.role, email: user.email, commerceId: user.role === "merchant" ? user.commerceId : null });
});

module.exports = { authRouter };
