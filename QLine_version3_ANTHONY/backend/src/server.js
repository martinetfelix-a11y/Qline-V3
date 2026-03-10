const { initializeDatabase } = require("./db");
const { app } = require("./app");

const PORT = Number(process.env.PORT || 3000);

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => console.log(`QLine API listening on http://localhost:${PORT}`));
  })
  .catch((error) => {
    console.error("Failed to initialize database", error);
    process.exit(1);
  });
