require("dotenv").config();

const http           = require("http");
const { Server }     = require("socket.io");
const app            = require("./app"); // app.js already runs init()
const PORT           = process.env.PORT || 4000;

/* ================================================================
   CORS — same origins the Express app allows
================================================================ */
const ip             = require("ip");
const FRONTEND_ORIGIN = process.env.FRONTEND_URL || "http://localhost:3000";

const allowedOrigins = [
  ...FRONTEND_ORIGIN.split(",").map(o => o.trim()).filter(Boolean),
  "http://127.0.0.1:3000",
  `http://${ip.address()}:3000`,
  "http://localhost:3000",
];

async function start() {
  console.log("⏳ Waiting for system initialization...");

  try {
    /* ----------------------------------------------------------------
       Create an HTTP server wrapping the Express app so that
       Socket.io can share the same port.
    ---------------------------------------------------------------- */
    const server = http.createServer(app);

    const io = new Server(server, {
      cors: {
        origin: allowedOrigins,
        credentials: true,
        methods: ["GET", "POST"],
      },
      path: "/socket.io",
    });

    /* ----------------------------------------------------------------
       Register the Support module (REST routes + WebSocket gateway)
    ---------------------------------------------------------------- */
    try {
      const registerSupport  = require("./modules/support");
      const authGuard        = require("./modules/auth/middlewares/auth.guard");

      // Simple RBAC factory: returns middleware that allows the given roles
      function authorizeRoles(...roles) {
        return (req, res, next) => {
          const userRoles = req.user?.roles || [];
          const allowed = roles.some(r => userRoles.includes(r));
          if (!allowed) {
            return res.status(403).json({ error: "Forbidden", message: "Insufficient role" });
          }
          next();
        };
      }

      registerSupport(app, io, {
        authenticate   : authGuard,
        authorizeRoles : authorizeRoles,
      });
      console.log("✅ Support module registered");
    } catch (err) {
      console.error("❌ Support module failed to register:", err.message);
      console.warn("⚠️  Continuing without support module");
    }

    /* ----------------------------------------------------------------
       Start listening
    ---------------------------------------------------------------- */
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

    /* ----------------------------------------------------------------
       Graceful shutdown — give plugins + sockets a chance to clean up
    ---------------------------------------------------------------- */
    async function shutdown(signal) {
      console.log(`\n[server] ${signal} received — shutting down gracefully`);

      const pluginManager = app.locals.pluginManager;
      if (pluginManager) {
        await pluginManager.shutdownAll().catch((err) =>
          console.error("[server] Plugin shutdown error:", err.message)
        );
      }

      io.close(() => console.log("[server] Socket.io closed"));

      server.close(() => {
        console.log("[server] HTTP server closed");
        process.exit(0);
      });

      // Force exit after 10 seconds if server doesn't close
      setTimeout(() => {
        console.error("[server] Forced exit after timeout");
        process.exit(1);
      }, 10000);
    }

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT",  () => shutdown("SIGINT"));

  } catch (err) {
    console.error("❌ INIT FAILED:", err);
  }
}

start();
