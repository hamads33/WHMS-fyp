const { z } = require("zod");

/* ============================================================
   Shared session schema (matches prisma.session)
============================================================ */
const ImpersonationSessionSchema = z.object({
  id: z.string().openapi({ example: "sess_abc123" }),
  userId: z.string().openapi({ example: "user_123" }),
  token: z.string().openapi({ example: "refresh_token_here" }),
  userAgent: z.string().nullable().openapi({ example: "Mozilla/5.0" }),
  ip: z.string().nullable().openapi({ example: "192.168.1.1" }),
  expiresAt: z.string().openapi({ example: "2025-01-01T00:00:00.000Z" }),
  isImpersonation: z.boolean(),
  impersonatorId: z.string().nullable().openapi({ example: "admin_899" }),
  impersonationReason: z.string().nullable().openapi({ example: "Debug issue" }),
  createdAt: z.string().openapi({ example: "2025-01-01T00:00:00.000Z" }),
  updatedAt: z.string().openapi({ example: "2025-01-01T00:00:00.000Z" }),
}).openapi("ImpersonationSession");

/* ============================================================
   Start Impersonation
============================================================ */
const ImpersonationStartInput = z.object({
  targetUserId: z.string().openapi({ example: "user_567" }),
  reason: z.string().optional().openapi({ example: "Customer support debugging" }),
}).openapi("ImpersonationStartInput");

const ImpersonationStartResponse = z.object({
  success: z.boolean(),
  accessToken: z.string().openapi({ example: "access_token_here" }),
  refreshToken: z.string().openapi({ example: "refresh_token_here" }),
  sessionId: z.string().openapi({ example: "sess_123" }),
  targetUser: z.object({
    id: z.string().openapi({ example: "user_567" }),
    email: z.string().email().openapi({ example: "client@example.com" }),
  }),
}).openapi("ImpersonationStartResponse");

/* ============================================================
   Stop Impersonation
============================================================ */
const ImpersonationStopInput = z.object({
  sessionId: z.string().openapi({ example: "sess_123" }),
}).openapi("ImpersonationStopInput");

const ImpersonationStopResponse = z.object({
  success: z.boolean(),
}).openapi("ImpersonationStopResponse");

/* ============================================================
   List Impersonations
============================================================ */
const ImpersonationListResponse = z.object({
  items: z.array(ImpersonationSessionSchema),
}).openapi("ImpersonationListResponse");

/* ============================================================
   EXPORTS
============================================================ */
module.exports = {
  ImpersonationSessionSchema,
  ImpersonationStartInput,
  ImpersonationStartResponse,
  ImpersonationStopInput,
  ImpersonationStopResponse,
  ImpersonationListResponse,
};
