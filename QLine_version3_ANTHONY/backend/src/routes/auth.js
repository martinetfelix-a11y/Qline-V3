const { Router } = require("express");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const { query } = require("../db");
const { signToken } = require("../auth");

const authRouter = Router();

function nextUserId() {
  return `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

authRouter.post("/signup", async (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      role: z.enum(["user", "merchant"]),
      commerceId: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "bad_request", details: parsed.error.flatten() });

    const { email, password, role, commerceId } = parsed.data;
    const existingUser = await query("SELECT id FROM users WHERE email = $1", [email]);
    if (existingUser.rowCount > 0) return res.status(409).json({ error: "email_taken" });

    if (role === "merchant") {
      const commerce = await query("SELECT id FROM commerces WHERE id = $1", [commerceId]);
      if (!commerceId || commerce.rowCount === 0) return res.status(400).json({ error: "invalid_commerceId" });
    }

    const id = nextUserId();
    const passHash = bcrypt.hashSync(password, 10);
    await query(
      `
        INSERT INTO users (id, email, pass_hash, role, commerce_id)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [id, email, passHash, role, role === "merchant" ? commerceId : null]
    );

    const token = signToken({ sub: id, email, role, ...(role === "merchant" ? { commerceId } : {}) });
    return res.json({ token, role, email, commerceId: role === "merchant" ? commerceId : null });
  } catch (error) {
    return next(error);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(1),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "bad_request" });

    const { email, password } = parsed.data;
    const result = await query(
      `
        SELECT id, email, pass_hash, role, commerce_id
        FROM users
        WHERE email = $1
      `,
      [email]
    );
    if (result.rowCount === 0) return res.status(401).json({ error: "invalid_credentials" });

    const user = result.rows[0];
    const ok = bcrypt.compareSync(password, user.pass_hash);
    if (!ok) return res.status(401).json({ error: "invalid_credentials" });

    const token = signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      ...(user.role === "merchant" ? { commerceId: user.commerce_id } : {}),
    });

    return res.json({
      token,
      role: user.role,
      email: user.email,
      commerceId: user.role === "merchant" ? user.commerce_id : null,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = { authRouter };
