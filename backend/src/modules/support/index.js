// src/modules/support/index.js
// Registers the support module — no DI container, just plain requires.
// This matches how auth and other modules are integrated in the project.
//
// Usage in app.js / server.js:
//
//   const http    = require("http");
//   const { Server } = require("socket.io");
//   const registerSupport = require("./modules/support");
//
//   const server = http.createServer(app);
//   const io     = new Server(server, { cors: { origin: "*" } });
//
//   registerSupport(app, io, { authenticate, authorizeRoles });
//   server.listen(PORT);

const createSupportRouter = require("./support.routes");
const ChatGateway          = require("./chats/chat.gateway");
const prisma               = require("../../../prisma/index");
const { registerEmailTriggers } = require("./support.events.js");

const DEFAULT_DEPARTMENTS = [
  { name: "General Support",   slug: "general",   description: "General inquiries and support",         slaResponseTime: 480,  slaResolutionTime: 2880 },
  { name: "Billing",           slug: "billing",   description: "Payment, invoices and billing issues",  slaResponseTime: 240,  slaResolutionTime: 1440 },
  { name: "Technical Support", slug: "technical", description: "Technical issues and troubleshooting",  slaResponseTime: 120,  slaResolutionTime: 720  },
  { name: "Sales",             slug: "sales",     description: "Pre-sales questions and upgrades",      slaResponseTime: 480,  slaResolutionTime: 2880 },
];

async function seedDepartments() {
  try {
    // Ensure the ticket number sequence exists
    await prisma.$executeRawUnsafe(
      `CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1 INCREMENT 1`
    );

    for (const dept of DEFAULT_DEPARTMENTS) {
      await prisma.ticketDepartment.upsert({
        where:  { slug: dept.slug },
        update: {},
        create: dept,
      });
    }
    console.log("[Support Module] Default departments seeded");
  } catch (err) {
    console.warn("[Support Module] Department seed failed:", err.message);
  }
}

/**
 * @param {import("express").Application} app
 * @param {import("socket.io").Server}    io
 * @param {{ authenticate: Function, authorizeRoles: Function }} middleware
 */
function registerSupport(app, io, { authenticate, authorizeRoles }) {
  // 1. Seed default departments (idempotent)
  seedDepartments();

  // 2. Mount REST routes at /api/support
  const router = createSupportRouter(authenticate, authorizeRoles);
  app.use("/api/support", router);

  // 3. Attach Socket.io gateway at /support/chat namespace
  ChatGateway.attach(io);

  // 4. Register email trigger listeners to event bus
  try {
    const eventBus = require("../../core/plugin-system/event.bus");
    registerEmailTriggers(eventBus);
    console.log("[Support Module] Email trigger listeners registered");
  } catch (err) {
    console.warn("[Support Module] Failed to register email triggers:", err.message);
  }

  console.log("[Support Module] REST routes mounted at /api/support");
  console.log("[Support Module] WebSocket gateway active at /support/chat");
}

module.exports = registerSupport;
