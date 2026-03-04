const jwt = require("jsonwebtoken");

function signToken(payload) {
  const secret = process.env.JWT_SECRET || "dev_secret";
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "missing_token" });

  const secret = process.env.JWT_SECRET || "dev_secret";
  try {
    req.user = jwt.verify(token, secret);
    next();
  } catch (e) {
    return res.status(401).json({ error: "invalid_token" });
  }
}

// Merchant can only act on their own commerce
function requireMerchantForCommerce(req, res, next) {
  const commerceId = req.body?.commerceId || req.query?.commerceId;
  if (!commerceId) return res.status(400).json({ error: "missing_commerceId" });
  if (req.user?.role !== "merchant") return res.status(403).json({ error: "forbidden" });
  if (req.user?.commerceId !== commerceId) return res.status(403).json({ error: "wrong_commerce" });
  next();
}

module.exports = { signToken, requireAuth, requireMerchantForCommerce };
