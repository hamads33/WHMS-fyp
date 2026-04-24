const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');

const openApiSpec = require('./config/openapi');
const { globalRateLimiter } = require('./common/middleware/rateLimit.middleware');
const { requestId } = require('./common/middleware/requestId.middleware');
const { errorHandler } = require('./common/middleware/error.middleware');
const logger = require('./common/utils/logger');

const authRoutes      = require('./modules/auth/auth.routes');
const tenantRoutes    = require('./modules/tenant/tenant.routes');
const billingRoutes   = require('./modules/billing/billing.routes');
const installerRoutes = require('./modules/installer/installer.routes');
const agentRoutes     = require('./modules/agent/agent.routes');
const commandRoutes   = require('./modules/command/command.routes');

const API_VERSION = 'v1';
const API_PREFIX  = `/api/${API_VERSION}`;

const app = express();

// ── Global middleware ─────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(requestId);
app.use(globalRateLimiter);

// Stamp every response with the API version
app.use((_req, res, next) => {
  res.setHeader('X-API-Version', API_VERSION);
  next();
});

// ── Request logging ───────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  logger.http(`${req.method} ${req.path}`, { ip: req.ip, requestId: req.requestId });
  next();
});

// ── Docs ──────────────────────────────────────────────────────────────────────
app.use(
  `${API_PREFIX}/docs`,
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec, {
    customSiteTitle: 'WHMS Distlay API',
    swaggerOptions: { persistAuthorization: true },
  })
);

// Serve the raw spec for tooling (Postman, code-gen, etc.)
app.get(`${API_PREFIX}/openapi.json`, (_req, res) => res.json(openApiSpec));

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', version: API_VERSION, ts: new Date().toISOString() })
);

// ── Enforce Content-Type on mutation requests ─────────────────────────────────
app.use((req, res, next) => {
  const mutations = ['POST', 'PUT', 'PATCH'];
  if (mutations.includes(req.method) && !req.is('application/json')) {
    return res.status(415).json({
      success: false,
      error: 'Content-Type must be application/json',
    });
  }
  next();
});

// ── Versioned routes ──────────────────────────────────────────────────────────
app.use(`${API_PREFIX}/auth`,      authRoutes);
app.use(`${API_PREFIX}/tenant`,    tenantRoutes);
app.use(`${API_PREFIX}/billing`,   billingRoutes);
app.use(`${API_PREFIX}/installer`, installerRoutes);
app.use(`${API_PREFIX}/agent`,     agentRoutes);
app.use(`${API_PREFIX}/commands`,  commandRoutes);

// ── Fallbacks ─────────────────────────────────────────────────────────────────
app.use((_req, res) =>
  res.status(404).json({ success: false, error: 'Not found' })
);
app.use(errorHandler);

module.exports = app;
