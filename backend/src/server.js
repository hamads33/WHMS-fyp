require("dotenv").config();

const app = require("./app"); // app.js already runs init()
const PORT = process.env.PORT || 4000;

async function start() {
  console.log("⏳ Waiting for system initialization...");

  try {
    // ❌ DO NOT CALL init() here
    // app.js already ran init() at the bottom of the file

    console.log("🚀 Backend initialized. Starting server...");
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

  } catch (err) {
    console.error("❌ INIT FAILED:", err);
  }
}

start();
