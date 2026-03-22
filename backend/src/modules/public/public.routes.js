/**
 * Public API Routes  —  /public/v1/
 *
 * All routes require a valid API key (x-api-key header or Authorization: Bearer).
 * Per-route scope enforcement is applied by requireScope().
 * Client-facing actions (orders, invoices) additionally require
 * a client JWT via publicClientAuth.
 */
const { Router } = require("express");
const cors = require("cors");
const { apiKeyGuard } = require("../auth/middlewares/apiKey.guard");
const { requireScope } = require("./middleware/requireScope");
const { publicClientAuth } = require("./middleware/publicClientAuth");

const PlansController     = require("./controllers/plans.controller");
const ClientsController   = require("./controllers/clients.controller");
const OrdersController    = require("./controllers/orders.controller");
const AuthController      = require("./controllers/auth.controller");
const InvoicesController  = require("./controllers/invoices.controller");

const router = Router();

// Public embeddable API — allow any origin.
// Security is enforced by the API key, not by origin.
router.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization", "x-api-key", "x-client-token"],
}));

// All public endpoints require an API key
router.use(apiKeyGuard);

/* ------------------------------------------------------------------ */
/* Plans                                                                */
/* ------------------------------------------------------------------ */
router.get("/plans",          requireScope("plans.read"), PlansController.list);
router.get("/plans/:planId",  requireScope("plans.read"), PlansController.getById);

/* ------------------------------------------------------------------ */
/* Clients (registration)                                              */
/* ------------------------------------------------------------------ */
router.post("/clients", requireScope("clients.create"), ClientsController.create);

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */
router.post("/auth/login", requireScope("auth.login"), AuthController.login);
router.get("/auth/me",     requireScope("auth.login"), AuthController.me);

/* ------------------------------------------------------------------ */
/* Orders  (client token required)                                     */
/* ------------------------------------------------------------------ */
router.post(
  "/orders",
  requireScope("orders.create"),
  publicClientAuth,
  OrdersController.create
);

router.get(
  "/orders/:id/invoice",
  requireScope("invoices.read"),
  publicClientAuth,
  OrdersController.getInvoice
);

/* ------------------------------------------------------------------ */
/* Invoices  (client token required)                                   */
/* ------------------------------------------------------------------ */
router.get(
  "/invoices/:id",
  requireScope("invoices.read"),
  publicClientAuth,
  InvoicesController.getById
);

router.post(
  "/invoices/:id/pay",
  requireScope("invoices.pay"),
  publicClientAuth,
  InvoicesController.pay
);

module.exports = router;
