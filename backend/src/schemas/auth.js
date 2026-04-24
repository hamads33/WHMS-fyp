// backend/src/schemas/auth.js
// Zod v4 schemas for AUTH module, annotated for @asteasolutions/zod-to-openapi

const { z } = require("zod");
const { extendZodWithOpenApi } = require("@asteasolutions/zod-to-openapi");

// Enable .openapi() on zod schemas
extendZodWithOpenApi(z);

/**
 * Input Schemas
 */
exports.RegisterInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
}).openapi("RegisterInput");

exports.LoginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.string().optional(),
}).openapi("LoginInput");

exports.RefreshInputSchema = z.object({
  refreshToken: z.string().optional(),
}).openapi("RefreshInput");

exports.LogoutInputSchema = z.object({
  sessionId: z.string().optional(),
}).openapi("LogoutInput");

exports.EmailSendInputSchema = z.object({
  email: z.string().email(),
}).openapi("EmailSendInput");

exports.ImpersonateStartInputSchema = z.object({
  targetUserId: z.string(),
  reason: z.string().optional(),
}).openapi("ImpersonateStartInput");

exports.ImpersonateStopInputSchema = z.object({
  sessionId: z.string().optional(),
}).openapi("ImpersonateStopInput");

/**
 * Core types
 */
exports.UserBaseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: z.string(),
  emailVerified: z.boolean().optional(),
}).openapi("UserBase");

exports.SessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  token: z.string(),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
  // ISO 8601 datetime
  expiresAt: z.string().datetime(),
  isImpersonation: z.boolean().optional(),
  impersonatorId: z.string().optional(),
}).openapi("Session");

/**
 * Response Schemas
 */
exports.RegisterResponseSchema = z.object({
  user: exports.UserBaseSchema,
  message: z.string().optional(),
}).openapi("RegisterResponse");

exports.LoginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: exports.UserBaseSchema,
  session: exports.SessionSchema.optional(),
}).openapi("LoginResponse");

exports.EmailVerifyResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
}).openapi("EmailVerifyResponse");

exports.ImpersonationListResponseSchema = z.object({
  sessions: z.array(exports.SessionSchema),
}).openapi("ImpersonationListResponse");

exports.GenericSuccessSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
}).openapi("GenericSuccess");

exports.RateLimitResponseSchema = z.object({
  status: z.literal(429),
  message: z.string(),
  retryAfter: z.number().optional(),
}).openapi("RateLimitResponse");
