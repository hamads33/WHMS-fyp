const { z } = require("zod");
const { extendZodWithOpenApi } = require("@asteasolutions/zod-to-openapi");

extendZodWithOpenApi(z);

/* ============================================================
   BASE USER SHAPE RETURNED IN LIST
============================================================ */
const AdminUserSummarySchema = z
  .object({
    id: z.string().openapi({ example: "user_123" }),
    email: z.string().email(),
    emailVerified: z.boolean().optional(),
    disabled: z.boolean(),
    roles: z.array(z.string()).default([]),
    createdAt: z.string(),
    lastLogin: z.string().nullable().optional(),
    profileSummary: z.object({
      client: z.boolean(),
      admin: z.boolean(),
      reseller: z.boolean(),
      developer: z.boolean(),
    }),
  })
  .openapi("AdminUserSummary");

/* ============================================================
   LIST USERS RESPONSE
============================================================ */
const AdminUserListResponseSchema = z
  .object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    users: z.array(AdminUserSummarySchema),
  })
  .openapi("AdminUserListResponse");

/* ============================================================
   FULL USER DETAILS
============================================================ */
const AdminUserFullSchema = z
  .object({
    user: z.object({
      id: z.string(),
      email: z.string().email(),
      emailVerified: z.boolean().optional(),
      disabled: z.boolean().optional(),

      roles: z.array(
        z.object({
          role: z.object({
            name: z.string(),
            permissions: z.array(
              z.object({
                permission: z.object({
                  name: z.string(),
                }),
              })
            ),
          }),
        })
      ),

      clientProfile: z.any().nullable().optional(),
      adminProfile: z.any().nullable().optional(),
      resellerProfile: z.any().nullable().optional(),
      developerProfile: z.any().nullable().optional(),

      sessions: z.array(
        z.object({
          id: z.string(),
          userId: z.string(),
          token: z.string(),
          ip: z.string().nullable(),
          userAgent: z.string().nullable(),
          expiresAt: z.string(),
          isImpersonation: z.boolean().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional(),
        })
      ),
    }),
  })
  .openapi("AdminUserFullResponse");

/* ============================================================
   UPDATE ROLES
============================================================ */
const AdminUserUpdateRolesInputSchema = z
  .object({
    roles: z.array(z.string()).min(1),
  })
  .openapi("AdminUserUpdateRolesInput");

const AdminUserUpdateRolesResponseSchema = z
  .object({
    success: z.boolean(),
    roles: z.array(z.string()),
  })
  .openapi("AdminUserUpdateRolesResponse");

/* ============================================================
   DEACTIVATE USER
============================================================ */
const AdminUserDeactivateInputSchema = z
  .object({
    reason: z.string().optional(),
  })
  .openapi("AdminUserDeactivateInput");

const AdminUserDeactivateResponseSchema = z
  .object({
    success: z.boolean(),
  })
  .openapi("AdminUserDeactivateResponse");

/* ============================================================
   FORCE LOGOUT USER
============================================================ */
const AdminUserForceLogoutResponseSchema = z
  .object({
    success: z.boolean(),
  })
  .openapi("AdminUserForceLogoutResponse");

/* ============================================================
   IMPERSONATE USER
============================================================ */
const AdminUserImpersonateInputSchema = z
  .object({
    reason: z.string().optional(),
  })
  .openapi("AdminUserImpersonateInput");

const AdminUserImpersonateResponseSchema = z
  .object({
    success: z.boolean(),
    accessToken: z.string(),
    refreshToken: z.string(),
    sessionId: z.string(),
    targetUser: z.object({
      id: z.string(),
      email: z.string().email(),
    }),
  })
  .openapi("AdminUserImpersonateResponse");

/* ============================================================
   EXPORT ALL
============================================================ */
module.exports = {
  AdminUserSummarySchema,
  AdminUserListResponseSchema,

  AdminUserFullSchema,

  AdminUserUpdateRolesInputSchema,
  AdminUserUpdateRolesResponseSchema,

  AdminUserDeactivateInputSchema,
  AdminUserDeactivateResponseSchema,

  AdminUserForceLogoutResponseSchema,

  AdminUserImpersonateInputSchema,
  AdminUserImpersonateResponseSchema,
};
