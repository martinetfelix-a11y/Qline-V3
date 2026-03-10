const express = require("express");
const cors = require("cors");

const { initializeDatabase } = require("./db");
const { authRouter } = require("./routes/auth");
const { commercesRouter } = require("./routes/commerces");
const { queueRouter } = require("./routes/queue");
const { statsRouter } = require("./routes/stats");

const app = express();
app.use(cors());
app.use(express.json());

app.use(async (req, res, next) => {
  try {
    await initializeDatabase();
    next();
  } catch (error) {
    next(error);
  }
});

app.get("/", (req, res) =>
  res.json({
    ok: true,
    service: "qline-api",
    endpoints: ["/health", "/auth/login", "/auth/signup", "/commerces/public"],
  })
);

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/auth", authRouter);
app.use("/commerces", commercesRouter);
app.use("/queue", queueRouter);
app.use("/stats", statsRouter);

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: "internal_error" });
});

module.exports = { app };
