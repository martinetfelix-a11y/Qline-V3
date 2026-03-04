const express = require("express");
const cors = require("cors");

const { authRouter } = require("./routes/auth");
const { commercesRouter } = require("./routes/commerces");
const { queueRouter } = require("./routes/queue");
const { statsRouter } = require("./routes/stats");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/auth", authRouter);
app.use("/commerces", commercesRouter);
app.use("/queue", queueRouter);
app.use("/stats", statsRouter);

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => console.log(`QLine API listening on http://localhost:${PORT}`));
