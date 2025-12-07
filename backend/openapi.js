// backend/openapi.js
// Generates openapi.json using @asteasolutions/zod-to-openapi (Zod v4)

const fs = require("fs");
const { z } = require("zod");
const {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} = require("@asteasolutions/zod-to-openapi");

extendZodWithOpenApi(z);

/* ============================================================
   LOAD AUTH SCHEMAS
============================================================ */
const {
  RegisterInputSchema,
  RegisterResponseSchema,
  LoginInputSchema,
  LoginResponseSchema,
  RefreshInputSchema,
  GenericSuccessSchema,
  LogoutInputSchema,
  EmailSendInputSchema,
  EmailVerifyResponseSchema,
  ImpersonateStartInputSchema,
  ImpersonateStopInputSchema,
  ImpersonationListResponseSchema,
  RateLimitResponseSchema,
  UserBaseSchema,
} = require("./src/schemas/auth");

/* ============================================================
   LOAD IP RULE SCHEMAS
============================================================ */
const {
  IpRuleSchema,
  IpRuleCreateInput,
  IpRuleUpdateInput,
} = require("./src/schemas/ipRules");

/* ============================================================
   LOAD IMPERSONATION SCHEMAS
============================================================ */
const {
  ImpersonationStartInput,
  ImpersonationStartResponse,
  ImpersonationStopInput,
  ImpersonationStopResponse,
  ImpersonationListResponse,
} = require("./src/schemas/impersonation");

/* ============================================================
   LOAD ADMIN USERS SCHEMAS
============================================================ */
const {
  AdminUserListResponseSchema,
  AdminUserFullSchema,
  AdminUserUpdateRolesInputSchema,
  AdminUserUpdateRolesResponseSchema,
  AdminUserDeactivateInputSchema,
  AdminUserDeactivateResponseSchema,
  AdminUserForceLogoutResponseSchema,
  AdminUserImpersonateInputSchema,
  AdminUserImpersonateResponseSchema,
} = require("./src/schemas/adminUsers");

/* ============================================================
   REGISTRY
============================================================ */
const registry = new OpenAPIRegistry();

/* ============================================================
   AUTH PATHS
============================================================ */

registry.registerPath({
  method: "post",
  path: "/api/auth/register",
  summary: "Register a new user",
  request: {
    body: { content: { "application/json": { schema: RegisterInputSchema } } },
  },
  responses: {
    201: {
      description: "User created",
      content: { "application/json": { schema: RegisterResponseSchema } },
    },
    400: { description: "Validation error" },
    429: {
      description: "Rate limit",
      content: { "application/json": { schema: RateLimitResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/login",
  summary: "Login user (returns tokens)",
  request: {
    body: { content: { "application/json": { schema: LoginInputSchema } } },
  },
  responses: {
    200: {
      description: "Login success",
      content: { "application/json": { schema: LoginResponseSchema } },
    },
    401: { description: "Invalid credentials" },
    429: {
      description: "Rate limit",
      content: { "application/json": { schema: RateLimitResponseSchema } },
    },
  },
});

/* ========================== REFRESH / LOGOUT ========================== */

registry.registerPath({
  method: "post",
  path: "/api/auth/refresh",
  summary: "Refresh & rotate token",
  request: {
    body: { content: { "application/json": { schema: RefreshInputSchema } } },
  },
  responses: {
    200: {
      description: "Tokens rotated",
      content: { "application/json": { schema: LoginResponseSchema } },
    },
    401: { description: "Invalid refresh token" },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/logout",
  summary: "Logout and terminate session",
  request: {
    body: { content: { "application/json": { schema: LogoutInputSchema } } },
  },
  responses: {
    200: {
      description: "Logged out",
      content: { "application/json": { schema: GenericSuccessSchema } },
    },
  },
});

/* ========================== EMAIL VERIFICATION ========================== */

registry.registerPath({
  method: "post",
  path: "/api/auth/email/send",
  summary: "Send verification email",
  request: {
    body: { content: { "application/json": { schema: EmailSendInputSchema } } },
  },
  responses: {
    200: {
      description: "Verification sent",
      content: { "application/json": { schema: GenericSuccessSchema } },
    },
    429: {
      description: "Rate limit",
      content: { "application/json": { schema: RateLimitResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/auth/email/verify",
  summary: "Verify email using token",
  request: {
    query: z.object({
      token: z.string(),
    }),
  },
  responses: {
    200: {
      description: "Email verified",
      content: { "application/json": { schema: EmailVerifyResponseSchema } },
    },
    400: { description: "Invalid token" },
  },
});

/* ========================== IMPERSONATION ========================== */

registry.registerPath({
  method: "post",
  path: "/api/auth/impersonate/start",
  summary: "Start impersonation (admin only)",
  request: {
    body: { content: { "application/json": { schema: ImpersonationStartInput } } },
  },
  responses: {
    200: {
      description: "Impersonation started",
      content: { "application/json": { schema: ImpersonationStartResponse } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/impersonate/stop",
  summary: "Stop impersonation",
  request: {
    body: { content: { "application/json": { schema: ImpersonationStopInput } } },
  },
  responses: {
    200: {
      description: "Stopped",
      content: { "application/json": { schema: ImpersonationStopResponse } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/auth/impersonate/list",
  summary: "List impersonation sessions",
  responses: {
    200: {
      description: "List",
      content: { "application/json": { schema: ImpersonationListResponse } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/auth/impersonation-status",
  summary: "Check impersonation status",
  responses: {
    200: {
      description: "Status",
      content: {
        "application/json": {
          schema: z
            .object({
              isImpersonation: z.boolean(),
              impersonatorId: z.string().optional(),
            })
            .openapi("ImpersonationStatus"),
        },
      },
    },
  },
});

/* ========================== IP RULES ========================== */

registry.registerPath({
  method: "get",
  path: "/api/ip-rules",
  summary: "List IP access rules",
  responses: {
    200: {
      description: "Rules returned",
      content: {
        "application/json": {
          schema: z
            .object({
              success: z.boolean(),
              rules: z.array(IpRuleSchema),
            })
            .openapi("IpRuleListResponse"),
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/ip-rules",
  summary: "Create IP access rule",
  request: {
    body: { content: { "application/json": { schema: IpRuleCreateInput } } },
  },
  responses: {
    200: {
      description: "Rule created",
      content: {
        "application/json": {
          schema: z
            .object({
              success: z.boolean(),
              rule: IpRuleSchema,
            })
            .openapi("IpRuleCreateResponse"),
        },
      },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/ip-rules/{id}",
  summary: "Update an IP rule",
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: IpRuleUpdateInput } } },
  },
  responses: {
    200: {
      description: "Rule updated",
      content: {
        "application/json": {
          schema: z
            .object({
              success: z.boolean(),
              rule: IpRuleSchema,
            })
            .openapi("IpRuleUpdateResponse"),
        },
      },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/ip-rules/{id}",
  summary: "Delete IP rule",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "Deleted",
      content: { "application/json": { schema: GenericSuccessSchema } },
    },
  },
});

/* ========================== ADMIN USERS ========================== */

registry.registerPath({
  method: "get",
  path: "/api/admin/users",
  summary: "List users (admin only)",
  request: {
    query: z.object({
      q: z.string().optional(),
      page: z.string().optional(),
      limit: z.string().optional(),
      role: z.string().optional(),
      status: z.enum(["active", "inactive"]).optional(),
    }),
  },
  responses: {
    200: {
      description: "User list",
      content: {
        "application/json": { schema: AdminUserListResponseSchema },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/users/{id}",
  summary: "Get full user details",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "User details",
      content: { "application/json": { schema: AdminUserFullSchema } },
    },
    404: { description: "User not found" },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/admin/users/{id}/roles",
  summary: "Replace user roles",
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: AdminUserUpdateRolesInputSchema } } },
  },
  responses: {
    200: {
      description: "Roles updated",
      content: {
        "application/json": { schema: AdminUserUpdateRolesResponseSchema },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/admin/users/{id}/deactivate",
  summary: "Deactivate user",
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: { "application/json": { schema: AdminUserDeactivateInputSchema } },
    },
  },
  responses: {
    200: {
      description: "User deactivated",
      content: {
        "application/json": { schema: AdminUserDeactivateResponseSchema },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/admin/users/{id}/logout",
  summary: "Force logout user",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "User logged out",
      content: {
        "application/json": { schema: AdminUserForceLogoutResponseSchema },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/admin/users/{id}/impersonate",
  summary: "Start impersonation (admin → user)",
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: { "application/json": { schema: AdminUserImpersonateInputSchema } },
    },
  },
  responses: {
    200: {
      description: "Impersonation started",
      content: {
        "application/json": { schema: AdminUserImpersonateResponseSchema },
      },
    },
  },
});

/* ============================================================
   GENERATE DOCUMENT
============================================================ */
const generator = new OpenApiGeneratorV3(registry.definitions);

const doc = generator.generateDocument({
  openapi: "3.0.0",
  info: {
    title: "WHMS Backend API",
    version: "1.0.0",
  },
  servers: [{ url: "http://localhost:4000" }],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  security: [{ BearerAuth: [] }],
});

fs.writeFileSync("./openapi.json", JSON.stringify(doc, null, 2));
console.log("openapi.json generated successfully!");
