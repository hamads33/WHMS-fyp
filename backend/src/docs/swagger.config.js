"use strict";

const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "WHMS API",
      version: "1.0.0",
      description:
        "Web Hosting Management System — complete SaaS backend API. Covers authentication, billing, orders, services, domains, provisioning, automation, plugins, and more.",
      contact: { name: "WHMS Support" },
    },
    servers: [
      { url: "http://localhost:4000", description: "Backend API (direct)" },
      { url: "http://localhost:3000", description: "Frontend proxy" },
    ],
    tags: [
      { name: "Auth", description: "Registration, login, token refresh, logout" },
      { name: "Session", description: "Session listing and revocation" },
      { name: "MFA", description: "Multi-factor authentication setup and verification" },
      { name: "Email", description: "Email verification and password reset" },
      { name: "Password", description: "Password reset flow" },
      { name: "API Keys", description: "Personal API key management" },
      { name: "Trusted Devices", description: "Trusted device management" },
      { name: "Impersonation", description: "Admin user impersonation" },
      { name: "Users", description: "Admin user management" },
      { name: "RBAC", description: "Role-based access control — roles and permissions" },
      { name: "IP Rules", description: "IP allow/block rules" },
      { name: "Clients", description: "Client account management" },
      { name: "Services", description: "Service catalog — services, plans, pricing, add-ons, features" },
      { name: "Orders", description: "Order lifecycle management" },
      { name: "Billing", description: "Invoices, payments, tax rules, revenue" },
      { name: "Domains", description: "Domain registration, transfer, DNS management" },
      { name: "Provisioning", description: "Hosting account provisioning" },
      { name: "Automation", description: "Cron profiles, tasks, workflows, events" },
      { name: "Plugins", description: "Installed plugin management" },
      { name: "Marketplace", description: "Plugin marketplace — browsing, publishing, installing" },
      { name: "Backup", description: "Backup jobs, storage configs, analytics" },
      { name: "Audit", description: "System-wide audit log access" },
      { name: "Email Service", description: "Transactional email sending" },
      { name: "Broadcast", description: "Admin broadcasts (notifications & documents) and client consumption" },
      { name: "Support", description: "Support tickets and live chat sessions" },
      { name: "Server Management", description: "Server CRUD, groups, provisioning accounts, metrics, logs" },
      { name: "Settings", description: "System-level settings (storage paths, etc.)" },
      { name: "System", description: "Health check" },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT access token obtained from POST /api/auth/login",
        },
      },
      schemas: {
        // ── Shared response wrappers ───────────────────────────────
        SuccessResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Success" },
            data: { type: "object" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string" },
            error: { type: "string" },
          },
        },
        // ── User / Auth ────────────────────────────────────────────
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            email: { type: "string", format: "email" },
            name: { type: "string" },
            role: { type: "string", enum: ["superadmin", "admin", "client", "developer"] },
            isActive: { type: "boolean" },
            emailVerified: { type: "boolean" },
            mfaEnabled: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Session: {
          type: "object",
          properties: {
            id: { type: "string" },
            userAgent: { type: "string" },
            ip: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
            expiresAt: { type: "string", format: "date-time" },
            isCurrent: { type: "boolean" },
          },
        },
        // ── Client ────────────────────────────────────────────────
        Client: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            email: { type: "string", format: "email" },
            phone: { type: "string" },
            company: { type: "string" },
            country: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        // ── Services ──────────────────────────────────────────────
        Service: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            slug: { type: "string" },
            description: { type: "string" },
            type: { type: "string" },
            isVisible: { type: "boolean" },
            isActive: { type: "boolean" },
            groupId: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        ServicePlan: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            serviceId: { type: "string" },
            name: { type: "string" },
            slug: { type: "string" },
            description: { type: "string" },
            isActive: { type: "boolean" },
            isVisible: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        ServicePricing: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            planId: { type: "string" },
            currency: { type: "string", example: "USD" },
            billingCycle: { type: "string", enum: ["monthly", "quarterly", "annually", "biennially"] },
            price: { type: "number", format: "float" },
            setupFee: { type: "number", format: "float" },
          },
        },
        // ── Order ─────────────────────────────────────────────────
        Order: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            clientId: { type: "string" },
            serviceId: { type: "string" },
            planId: { type: "string" },
            status: { type: "string", enum: ["pending", "active", "suspended", "terminated", "cancelled"] },
            billingCycle: { type: "string" },
            currency: { type: "string" },
            nextDueDate: { type: "string", format: "date-time", nullable: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        // ── Invoice / Billing ──────────────────────────────────────
        Invoice: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            clientId: { type: "string" },
            orderId: { type: "string", nullable: true },
            status: { type: "string", enum: ["draft", "sent", "paid", "overdue", "cancelled"] },
            subtotal: { type: "number" },
            taxAmount: { type: "number" },
            total: { type: "number" },
            currency: { type: "string" },
            dueDate: { type: "string", format: "date-time" },
            paidAt: { type: "string", format: "date-time", nullable: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Payment: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            invoiceId: { type: "string" },
            amount: { type: "number" },
            currency: { type: "string" },
            gateway: { type: "string" },
            status: { type: "string", enum: ["pending", "completed", "failed", "refunded"] },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        // ── Domain ────────────────────────────────────────────────
        Domain: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string", example: "example.com" },
            status: { type: "string", enum: ["active", "pending", "expired", "transferred", "deleted"] },
            registrar: { type: "string" },
            registeredAt: { type: "string", format: "date-time", nullable: true },
            expiresAt: { type: "string", format: "date-time", nullable: true },
            ownerId: { type: "string" },
          },
        },
        DnsRecord: {
          type: "object",
          properties: {
            id: { type: "string" },
            type: { type: "string", enum: ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV"] },
            name: { type: "string" },
            content: { type: "string" },
            ttl: { type: "integer" },
            priority: { type: "integer", nullable: true },
          },
        },
        // ── Plugin / Marketplace ───────────────────────────────────
        Plugin: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            slug: { type: "string" },
            description: { type: "string" },
            author: { type: "string" },
            status: { type: "string", enum: ["pending", "approved", "rejected"] },
            category: { type: "string" },
            tags: { type: "array", items: { type: "string" } },
            currentVersion: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        PluginVersion: {
          type: "object",
          properties: {
            id: { type: "string" },
            pluginId: { type: "string" },
            version: { type: "string" },
            changelog: { type: "string" },
            zipUrl: { type: "string" },
            status: { type: "string", enum: ["pending", "approved", "rejected"] },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        InstalledPlugin: {
          type: "object",
          properties: {
            name: { type: "string" },
            version: { type: "string" },
            enabled: { type: "boolean" },
            state: { type: "string", enum: ["enabled", "disabled"] },
          },
        },
        // ── Automation ────────────────────────────────────────────
        AutomationProfile: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            cronExpression: { type: "string", example: "0 * * * *" },
            isEnabled: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        AutomationTask: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            profileId: { type: "string" },
            actionType: { type: "string" },
            config: { type: "object" },
            order: { type: "integer" },
            isEnabled: { type: "boolean" },
          },
        },
        AutomationJob: {
          type: "object",
          properties: {
            id: { type: "string" },
            profileId: { type: "string" },
            status: { type: "string", enum: ["queued", "running", "completed", "failed"] },
            startedAt: { type: "string", format: "date-time", nullable: true },
            completedAt: { type: "string", format: "date-time", nullable: true },
            error: { type: "string", nullable: true },
          },
        },
        Workflow: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            slug: { type: "string" },
            description: { type: "string" },
            isActive: { type: "boolean" },
            trigger: { type: "object" },
            steps: { type: "array", items: { type: "object" } },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        // ── Backup ────────────────────────────────────────────────
        Backup: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            status: { type: "string", enum: ["pending", "running", "completed", "failed"] },
            type: { type: "string" },
            sizeBytes: { type: "integer", nullable: true },
            storageConfigId: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
    paths: {
      // ═══════════════════════════════════════════════════════════════
      // SYSTEM
      // ═══════════════════════════════════════════════════════════════
      "/health": {
        get: {
          tags: ["System"],
          summary: "Health check",
          responses: {
            200: { description: "Server is running", content: { "application/json": { schema: { type: "object", properties: { status: { type: "string" }, message: { type: "string" } } } } } },
          },
        },
      },

      // ═══════════════════════════════════════════════════════════════
      // AUTH
      // ═══════════════════════════════════════════════════════════════
      "/api/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Register a new client account",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password", "name"],
                  properties: {
                    name: { type: "string" },
                    email: { type: "string", format: "email" },
                    password: { type: "string", minLength: 8 },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "Account created", content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessResponse" } } } },
            400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          },
        },
      },
      "/api/auth/register/developer": {
        post: {
          tags: ["Auth"],
          summary: "Register a developer account",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password", "name"],
                  properties: {
                    name: { type: "string" },
                    email: { type: "string", format: "email" },
                    password: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "Developer account created" },
            400: { description: "Validation error" },
          },
        },
      },
      "/api/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Login and receive access + refresh tokens",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string" },
                  },
                },
                example: { email: "admin@example.com", password: "secret123" },
              },
            },
          },
          responses: {
            200: {
              description: "Login successful",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/SuccessResponse" },
                      { type: "object", properties: { data: { type: "object", properties: { accessToken: { type: "string" }, refreshToken: { type: "string" }, user: { $ref: "#/components/schemas/User" } } } } },
                    ],
                  },
                },
              },
            },
            401: { description: "Invalid credentials" },
          },
        },
      },
      "/api/auth/refresh": {
        post: {
          tags: ["Auth"],
          summary: "Refresh access token using refresh token",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { type: "object", properties: { refreshToken: { type: "string" } } } } },
          },
          responses: {
            200: { description: "New access token issued" },
            401: { description: "Invalid or expired refresh token" },
          },
        },
      },
      "/api/auth/logout": {
        post: {
          tags: ["Auth"],
          summary: "Logout and invalidate tokens",
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: "Logged out" },
          },
        },
      },
      "/api/auth/me": {
        get: {
          tags: ["Auth"],
          summary: "Get current authenticated user profile",
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: "Current user", content: { "application/json": { schema: { allOf: [{ $ref: "#/components/schemas/SuccessResponse" }, { type: "object", properties: { data: { $ref: "#/components/schemas/User" } } }] } } } },
            401: { description: "Unauthenticated" },
          },
        },
      },

      // ── Sessions ────────────────────────────────────────────────
      "/api/auth/sessions": {
        get: {
          tags: ["Session"],
          summary: "List all active sessions for the current user",
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: "Session list", content: { "application/json": { schema: { allOf: [{ $ref: "#/components/schemas/SuccessResponse" }, { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Session" } } } }] } } } },
          },
        },
      },
      "/api/auth/sessions/current": {
        get: {
          tags: ["Session"],
          summary: "Get current session details",
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: "Current session" } },
        },
      },
      "/api/auth/sessions/security/logs": {
        get: {
          tags: ["Session"],
          summary: "Get security event logs for current user",
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: "Security logs" } },
        },
      },
      "/api/auth/sessions/others/all": {
        delete: {
          tags: ["Session"],
          summary: "Revoke all sessions except the current one",
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: "All other sessions revoked" } },
        },
      },
      "/api/auth/sessions/{sessionId}": {
        delete: {
          tags: ["Session"],
          summary: "Revoke a specific session",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "sessionId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Session revoked" }, 404: { description: "Session not found" } },
        },
      },

      // ── MFA ─────────────────────────────────────────────────────
      "/api/auth/mfa/setup": {
        post: {
          tags: ["MFA"],
          summary: "Begin TOTP MFA setup (returns QR code secret)",
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: "MFA setup data" } },
        },
      },
      "/api/auth/mfa/verify": {
        post: {
          tags: ["MFA"],
          summary: "Verify TOTP token and enable MFA",
          security: [{ BearerAuth: [] }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { token: { type: "string", example: "123456" } } } } } },
          responses: { 200: { description: "MFA enabled" }, 400: { description: "Invalid token" } },
        },
      },
      "/api/auth/mfa/disable": {
        post: {
          tags: ["MFA"],
          summary: "Disable MFA for the current user",
          security: [{ BearerAuth: [] }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { token: { type: "string" } } } } } },
          responses: { 200: { description: "MFA disabled" } },
        },
      },
      "/api/auth/mfa/verify-login": {
        post: {
          tags: ["MFA"],
          summary: "Verify TOTP token during login (pre-auth)",
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { token: { type: "string" }, tempToken: { type: "string" } } } } } },
          responses: { 200: { description: "Login completed" } },
        },
      },
      "/api/auth/mfa/backup-codes": {
        post: {
          tags: ["MFA"],
          summary: "Generate new MFA backup codes",
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: "Backup codes" } },
        },
      },

      // ── Email verification ───────────────────────────────────────
      "/api/auth/email/verify": {
        get: {
          tags: ["Email"],
          summary: "Verify email via token from link",
          parameters: [{ name: "token", in: "query", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Email verified" }, 400: { description: "Invalid/expired token" } },
        },
      },
      "/api/auth/email/send": {
        post: {
          tags: ["Email"],
          summary: "Send email verification link",
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { email: { type: "string", format: "email" } } } } } },
          responses: { 200: { description: "Verification email sent" } },
        },
      },
      "/api/auth/email/request-password-reset": {
        post: {
          tags: ["Password"],
          summary: "Send password reset email",
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { email: { type: "string", format: "email" } } } } } },
          responses: { 200: { description: "Reset email sent if account exists" } },
        },
      },
      "/api/auth/email/reset-password": {
        post: {
          tags: ["Password"],
          summary: "Reset password using token from email",
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { token: { type: "string" }, newPassword: { type: "string" } } } } } },
          responses: { 200: { description: "Password reset" }, 400: { description: "Invalid/expired token" } },
        },
      },

      // ── API Keys ─────────────────────────────────────────────────
      "/api/auth/apikeys": {
        post: {
          tags: ["API Keys"],
          summary: "Create a new API key",
          security: [{ BearerAuth: [] }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, scopes: { type: "array", items: { type: "string" } } } } } } },
          responses: { 201: { description: "API key created (shown once)" } },
        },
        get: {
          tags: ["API Keys"],
          summary: "List API keys for current user",
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: "API key list" } },
        },
      },
      "/api/auth/apikeys/{keyId}": {
        delete: {
          tags: ["API Keys"],
          summary: "Revoke an API key",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "keyId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Key revoked" } },
        },
      },

      // ── Trusted Devices ──────────────────────────────────────────
      "/api/auth/trusted-devices": {
        post: {
          tags: ["Trusted Devices"],
          summary: "Register current device as trusted",
          security: [{ BearerAuth: [] }],
          responses: { 201: { description: "Device trusted" } },
        },
        get: {
          tags: ["Trusted Devices"],
          summary: "List trusted devices",
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: "Trusted device list" } },
        },
        delete: {
          tags: ["Trusted Devices"],
          summary: "Remove all trusted devices",
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: "All trusted devices removed" } },
        },
      },
      "/api/auth/trusted-devices/{deviceId}": {
        delete: {
          tags: ["Trusted Devices"],
          summary: "Remove a specific trusted device",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "deviceId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Device removed" } },
        },
      },

      // ═══════════════════════════════════════════════════════════════
      // IMPERSONATION
      // ═══════════════════════════════════════════════════════════════
      "/api/auth/impersonate/start": {
        post: {
          tags: ["Impersonation"],
          summary: "Start impersonating another user",
          security: [{ BearerAuth: [] }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { userId: { type: "string" } } } } } },
          responses: { 200: { description: "Impersonation started, returns new access token" } },
        },
      },
      "/api/auth/impersonate/stop": {
        post: {
          tags: ["Impersonation"],
          summary: "Stop impersonation and return to original account",
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: "Impersonation ended" } },
        },
      },
      "/api/auth/impersonate/list": {
        get: {
          tags: ["Impersonation"],
          summary: "List users available to impersonate",
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: "User list" } },
        },
      },
      "/api/admin/impersonation/logs": {
        get: {
          tags: ["Impersonation"],
          summary: "Get impersonation audit logs (admin)",
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: "Impersonation logs" } },
        },
      },

      // ═══════════════════════════════════════════════════════════════
      // ADMIN — USERS
      // ═══════════════════════════════════════════════════════════════
      "/api/admin/users": {
        get: {
          tags: ["Users"],
          summary: "List all users (admin)",
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
            { name: "search", in: "query", schema: { type: "string" } },
            { name: "role", in: "query", schema: { type: "string" } },
          ],
          responses: { 200: { description: "User list with pagination" } },
        },
      },
      "/api/admin/users/stats": {
        get: {
          tags: ["Users"],
          summary: "Get user statistics (admin)",
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: "User stats" } },
        },
      },
      "/api/admin/users/roles": {
        get: {
          tags: ["Users"],
          summary: "List available roles",
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: "Role list" } },
        },
      },
      "/api/admin/users/{id}": {
        get: {
          tags: ["Users"],
          summary: "Get a user by ID (admin)",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "User detail" }, 404: { description: "User not found" } },
        },
      },
      "/api/admin/users/{id}/roles": {
        post: {
          tags: ["Users"],
          summary: "Assign role(s) to user",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { roles: { type: "array", items: { type: "string" } } } } } } },
          responses: { 200: { description: "Roles assigned" } },
        },
      },
      "/api/admin/users/{id}/activate": {
        post: {
          tags: ["Users"],
          summary: "Activate a user account",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "User activated" } },
        },
      },
      "/api/admin/users/{id}/deactivate": {
        post: {
          tags: ["Users"],
          summary: "Deactivate a user account",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "User deactivated" } },
        },
      },
      "/api/admin/users/{id}/logout": {
        post: {
          tags: ["Users"],
          summary: "Force logout a user (revoke all sessions)",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "User logged out" } },
        },
      },

      // ═══════════════════════════════════════════════════════════════
      // RBAC
      // ═══════════════════════════════════════════════════════════════
      "/api/admin/rbac/roles": {
        get: {
          tags: ["RBAC"],
          summary: "List all roles",
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: "Role list" } },
        },
      },
      "/api/admin/rbac/permissions": {
        get: {
          tags: ["RBAC"],
          summary: "List all permissions",
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: "Permission list" } },
        },
      },
      "/api/admin/rbac/roles/{roleId}/permissions": {
        put: {
          tags: ["RBAC"],
          summary: "Replace all permissions for a role (superadmin only)",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "roleId", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { permissions: { type: "array", items: { type: "string" } } } } } } },
          responses: { 200: { description: "Permissions updated" } },
        },
      },
      "/api/admin/rbac/roles/{roleId}/permissions/{permissionKey}": {
        post: {
          tags: ["RBAC"],
          summary: "Add a single permission to a role",
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: "roleId", in: "path", required: true, schema: { type: "string" } },
            { name: "permissionKey", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { 200: { description: "Permission added" } },
        },
        delete: {
          tags: ["RBAC"],
          summary: "Remove a single permission from a role",
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: "roleId", in: "path", required: true, schema: { type: "string" } },
            { name: "permissionKey", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { 200: { description: "Permission removed" } },
        },
      },

      // ═══════════════════════════════════════════════════════════════
      // IP RULES
      // ═══════════════════════════════════════════════════════════════
      "/api/ip-rules": {
        post: {
          tags: ["IP Rules"],
          summary: "Create IP allow/block rule",
          security: [{ BearerAuth: [] }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { ip: { type: "string" }, type: { type: "string", enum: ["allow", "block"] }, reason: { type: "string" } } } } } },
          responses: { 201: { description: "Rule created" } },
        },
        get: {
          tags: ["IP Rules"],
          summary: "List all IP rules",
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: "IP rule list" } },
        },
      },
      "/api/ip-rules/{id}": {
        patch: {
          tags: ["IP Rules"],
          summary: "Update an IP rule",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { type: { type: "string" }, reason: { type: "string" } } } } } },
          responses: { 200: { description: "Rule updated" } },
        },
        delete: {
          tags: ["IP Rules"],
          summary: "Delete an IP rule",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Rule deleted" } },
        },
      },

      // ═══════════════════════════════════════════════════════════════
      // CLIENTS
      // ═══════════════════════════════════════════════════════════════
      "/api/v1/clients": {
        get: {
          tags: ["Clients"],
          summary: "List all clients",
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: "Client list" } },
        },
        post: {
          tags: ["Clients"],
          summary: "Create a new client",
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "email"],
                  properties: { name: { type: "string" }, email: { type: "string", format: "email" }, phone: { type: "string" }, company: { type: "string" }, country: { type: "string" } },
                },
              },
            },
          },
          responses: { 201: { description: "Client created", content: { "application/json": { schema: { allOf: [{ $ref: "#/components/schemas/SuccessResponse" }, { type: "object", properties: { data: { $ref: "#/components/schemas/Client" } } }] } } } } },
        },
      },
      "/api/v1/clients/{clientId}/reset-password": {
        post: {
          tags: ["Clients"],
          summary: "Trigger password reset for a client",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "clientId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Reset email sent" } },
        },
      },
      "/api/v1/clients/{clientId}/services": {
        post: {
          tags: ["Clients"],
          summary: "Assign a service to a client",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "clientId", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { serviceId: { type: "string" } } } } } },
          responses: { 201: { description: "Service assigned" } },
        },
      },

      // ═══════════════════════════════════════════════════════════════
      // SERVICES (Admin)
      // ═══════════════════════════════════════════════════════════════
      "/api/admin/services": {
        get: {
          tags: ["Services"],
          summary: "List all services (admin)",
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: "page", in: "query", schema: { type: "integer" } },
            { name: "limit", in: "query", schema: { type: "integer" } },
            { name: "groupId", in: "query", schema: { type: "string" } },
            { name: "isActive", in: "query", schema: { type: "boolean" } },
          ],
          responses: { 200: { description: "Service list", content: { "application/json": { schema: { allOf: [{ $ref: "#/components/schemas/SuccessResponse" }, { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Service" } } } }] } } } } },
        },
        post: {
          tags: ["Services"],
          summary: "Create a new service",
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "type"],
                  properties: { name: { type: "string" }, slug: { type: "string" }, description: { type: "string" }, type: { type: "string" }, groupId: { type: "string" }, isVisible: { type: "boolean" } },
                },
              },
            },
          },
          responses: { 201: { description: "Service created" } },
        },
      },
      "/api/admin/services/{id}": {
        get: {
          tags: ["Services"],
          summary: "Get service by ID",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Service detail" }, 404: { description: "Not found" } },
        },
        put: {
          tags: ["Services"],
          summary: "Update a service",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Service" } } } },
          responses: { 200: { description: "Service updated" } },
        },
        delete: {
          tags: ["Services"],
          summary: "Soft-delete a service",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Service deleted" } },
        },
      },
      "/api/admin/services/{id}/toggle-visibility": {
        post: {
          tags: ["Services"],
          summary: "Toggle service visibility",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Visibility toggled" } },
        },
      },
      "/api/admin/services/{id}/stats": {
        get: {
          tags: ["Services"],
          summary: "Get service stats",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Service stats" } },
        },
      },
      // Plans
      "/api/admin/services/{id}/plans": {
        get: {
          tags: ["Services"],
          summary: "List plans for a service",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Plan list" } },
        },
        post: {
          tags: ["Services"],
          summary: "Create a plan for a service",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, slug: { type: "string" }, description: { type: "string" } } } } } },
          responses: { 201: { description: "Plan created" } },
        },
      },
      "/api/admin/plans/{id}": {
        get: { tags: ["Services"], summary: "Get plan by ID", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Plan detail" } } },
        put: { tags: ["Services"], summary: "Update a plan", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ServicePlan" } } } }, responses: { 200: { description: "Plan updated" } } },
      },
      // Pricing
      "/api/admin/plans/{id}/pricing": {
        get: { tags: ["Services"], summary: "List pricing for a plan", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Pricing list" } } },
        post: {
          tags: ["Services"],
          summary: "Add pricing to a plan",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ServicePricing" } } } },
          responses: { 201: { description: "Pricing created" } },
        },
      },
      "/api/admin/pricing/{id}": {
        put: { tags: ["Services"], summary: "Update a pricing entry", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ServicePricing" } } } }, responses: { 200: { description: "Pricing updated" } } },
        delete: { tags: ["Services"], summary: "Delete a pricing entry", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Pricing deleted" } } },
      },
      // Service Groups
      "/api/admin/services/groups": {
        get: { tags: ["Services"], summary: "List service groups", security: [{ BearerAuth: [] }], responses: { 200: { description: "Group list" } } },
        post: {
          tags: ["Services"],
          summary: "Create a service group",
          security: [{ BearerAuth: [] }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, isVisible: { type: "boolean" } } } } } },
          responses: { 201: { description: "Group created" } },
        },
      },
      "/api/admin/services/groups/{id}": {
        get: { tags: ["Services"], summary: "Get service group", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Group detail" } } },
        put: { tags: ["Services"], summary: "Update service group", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } }, responses: { 200: { description: "Group updated" } } },
        delete: { tags: ["Services"], summary: "Delete service group", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Group deleted" } } },
      },
      // Client-facing Services
      "/api/client/services": {
        get: { tags: ["Services"], summary: "List active services (client)", security: [{ BearerAuth: [] }], responses: { 200: { description: "Active service list" } } },
      },
      "/api/client/services/{id}": {
        get: { tags: ["Services"], summary: "Get active service detail (client)", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Service detail" } } },
      },
      "/api/client/services/{id}/plans": {
        get: { tags: ["Services"], summary: "List active plans for a service (client)", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Active plan list" } } },
      },
      "/api/client/plans/{id}/pricing": {
        get: { tags: ["Services"], summary: "Get pricing for a plan (client)", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Pricing list" } } },
      },

      // ═══════════════════════════════════════════════════════════════
      // ORDERS
      // ═══════════════════════════════════════════════════════════════
      "/api/admin/orders": {
        get: {
          tags: ["Orders"],
          summary: "List all orders (admin)",
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
            { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
            { name: "status", in: "query", schema: { type: "string" } },
            { name: "clientId", in: "query", schema: { type: "string" } },
          ],
          responses: { 200: { description: "Order list" } },
        },
      },
      "/api/admin/orders/stats": {
        get: { tags: ["Orders"], summary: "Get order statistics", security: [{ BearerAuth: [] }], responses: { 200: { description: "Order stats" } } },
      },
      "/api/admin/orders/{id}": {
        get: { tags: ["Orders"], summary: "Get order by ID (admin)", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Order detail" } } },
      },
      "/api/admin/orders/{id}/activate": {
        post: { tags: ["Orders"], summary: "Activate an order", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Order activated" } } },
      },
      "/api/admin/orders/{id}/renew": {
        post: { tags: ["Orders"], summary: "Renew an order (admin)", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Order renewed" } } },
      },
      "/api/admin/orders/{id}/suspend": {
        post: { tags: ["Orders"], summary: "Suspend an order", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Order suspended" } } },
      },
      "/api/admin/orders/{id}/resume": {
        post: { tags: ["Orders"], summary: "Resume a suspended order", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Order resumed" } } },
      },
      "/api/admin/orders/{id}/terminate": {
        post: { tags: ["Orders"], summary: "Terminate an order", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Order terminated" } } },
      },
      "/api/client/orders": {
        get: { tags: ["Orders"], summary: "List client's own orders", security: [{ BearerAuth: [] }], responses: { 200: { description: "Order list" } } },
        post: {
          tags: ["Orders"],
          summary: "Place a new order",
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["planId", "billingCycle", "currency"],
                  properties: { planId: { type: "string" }, billingCycle: { type: "string" }, currency: { type: "string" }, addons: { type: "array", items: { type: "string" } } },
                },
                example: { planId: "uuid", billingCycle: "monthly", currency: "USD" },
              },
            },
          },
          responses: { 201: { description: "Order created", content: { "application/json": { schema: { allOf: [{ $ref: "#/components/schemas/SuccessResponse" }, { type: "object", properties: { data: { $ref: "#/components/schemas/Order" } } }] } } } } },
        },
      },
      "/api/client/orders/spend": {
        get: { tags: ["Orders"], summary: "Get total client spend", security: [{ BearerAuth: [] }], responses: { 200: { description: "Spend summary" } } },
      },
      "/api/client/orders/{id}": {
        get: { tags: ["Orders"], summary: "Get client order by ID", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Order detail" } } },
      },
      "/api/client/orders/{id}/cancel": {
        post: { tags: ["Orders"], summary: "Cancel an order (client)", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Order cancelled" } } },
      },
      "/api/client/orders/{id}/renew": {
        post: { tags: ["Orders"], summary: "Renew an order (client)", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Order renewed" } } },
      },

      // ═══════════════════════════════════════════════════════════════
      // BILLING — ADMIN
      // ═══════════════════════════════════════════════════════════════
      "/api/admin/billing/revenue": {
        get: { tags: ["Billing"], summary: "Get revenue statistics", security: [{ BearerAuth: [] }], responses: { 200: { description: "Revenue stats" } } },
      },
      "/api/admin/billing/invoices": {
        get: {
          tags: ["Billing"],
          summary: "List all invoices (admin)",
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: "status", in: "query", schema: { type: "string" } },
            { name: "clientId", in: "query", schema: { type: "string" } },
            { name: "page", in: "query", schema: { type: "integer" } },
          ],
          responses: { 200: { description: "Invoice list" } },
        },
      },
      "/api/admin/billing/invoices/stats": {
        get: { tags: ["Billing"], summary: "Get invoice statistics", security: [{ BearerAuth: [] }], responses: { 200: { description: "Invoice stats" } } },
      },
      "/api/admin/billing/invoices/manual": {
        post: {
          tags: ["Billing"],
          summary: "Create a manual invoice",
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["clientId", "items", "currency"],
                  properties: {
                    clientId: { type: "string" },
                    currency: { type: "string" },
                    dueDate: { type: "string", format: "date" },
                    items: { type: "array", items: { type: "object", properties: { description: { type: "string" }, quantity: { type: "integer" }, unitPrice: { type: "number" } } } },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "Invoice created", content: { "application/json": { schema: { allOf: [{ $ref: "#/components/schemas/SuccessResponse" }, { type: "object", properties: { data: { $ref: "#/components/schemas/Invoice" } } }] } } } } },
        },
      },
      "/api/admin/billing/invoices/{id}": {
        get: { tags: ["Billing"], summary: "Get invoice by ID (admin)", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Invoice detail" } } },
      },
      "/api/admin/billing/invoices/{id}/send": {
        post: { tags: ["Billing"], summary: "Send invoice to client", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Invoice sent" } } },
      },
      "/api/admin/billing/invoices/{id}/cancel": {
        post: { tags: ["Billing"], summary: "Cancel an invoice", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Invoice cancelled" } } },
      },
      "/api/admin/billing/invoices/{id}/mark-paid": {
        post: { tags: ["Billing"], summary: "Mark invoice as paid (admin)", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Invoice marked paid" } } },
      },
      "/api/admin/billing/invoices/{id}/discount": {
        post: {
          tags: ["Billing"],
          summary: "Apply discount to invoice",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { type: { type: "string", enum: ["flat", "percent"] }, value: { type: "number" } } } } } },
          responses: { 200: { description: "Discount applied" } },
        },
      },
      "/api/admin/billing/orders/{orderId}/invoice": {
        post: { tags: ["Billing"], summary: "Generate invoice for an order", security: [{ BearerAuth: [] }], parameters: [{ name: "orderId", in: "path", required: true, schema: { type: "string" } }], responses: { 201: { description: "Invoice generated" } } },
      },
      "/api/admin/billing/payments": {
        get: { tags: ["Billing"], summary: "List all payments (admin)", security: [{ BearerAuth: [] }], responses: { 200: { description: "Payment list" } } },
      },
      "/api/admin/billing/payments/stats": {
        get: { tags: ["Billing"], summary: "Get payment statistics", security: [{ BearerAuth: [] }], responses: { 200: { description: "Payment stats" } } },
      },
      "/api/admin/billing/payments/{id}": {
        get: { tags: ["Billing"], summary: "Get payment detail", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Payment detail" } } },
      },
      "/api/admin/billing/payments/{id}/refund": {
        post: {
          tags: ["Billing"],
          summary: "Issue a refund for a payment",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { amount: { type: "number" }, reason: { type: "string" } } } } } },
          responses: { 200: { description: "Refund issued" } },
        },
      },
      "/api/admin/billing/invoices/{invoiceId}/payments": {
        post: {
          tags: ["Billing"],
          summary: "Record a manual payment for an invoice",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "invoiceId", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { amount: { type: "number" }, gateway: { type: "string" }, reference: { type: "string" } } } } } },
          responses: { 201: { description: "Payment recorded" } },
        },
        get: { tags: ["Billing"], summary: "List payments for an invoice", security: [{ BearerAuth: [] }], parameters: [{ name: "invoiceId", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Payment list" } } },
      },
      "/api/admin/billing/tax-rules": {
        get: { tags: ["Billing"], summary: "List tax rules", security: [{ BearerAuth: [] }], responses: { 200: { description: "Tax rule list" } } },
        post: {
          tags: ["Billing"],
          summary: "Create a tax rule",
          security: [{ BearerAuth: [] }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { country: { type: "string" }, rate: { type: "number" }, label: { type: "string" } } } } } },
          responses: { 201: { description: "Tax rule created" } },
        },
      },
      "/api/admin/billing/tax-rules/{id}": {
        get: { tags: ["Billing"], summary: "Get tax rule", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Tax rule" } } },
        put: { tags: ["Billing"], summary: "Update tax rule", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } }, responses: { 200: { description: "Updated" } } },
        delete: { tags: ["Billing"], summary: "Delete tax rule", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Deleted" } } },
      },
      "/api/admin/billing/process-renewals": {
        post: { tags: ["Billing"], summary: "Trigger renewal billing batch", security: [{ BearerAuth: [] }], responses: { 200: { description: "Renewal batch triggered" } } },
      },
      "/api/admin/billing/process-overdue": {
        post: { tags: ["Billing"], summary: "Process overdue invoices", security: [{ BearerAuth: [] }], responses: { 200: { description: "Overdue processing triggered" } } },
      },
      // Client Billing
      "/api/client/billing/invoices": {
        get: { tags: ["Billing"], summary: "List client's invoices", security: [{ BearerAuth: [] }], responses: { 200: { description: "Invoice list" } } },
      },
      "/api/client/billing/invoices/{id}": {
        get: { tags: ["Billing"], summary: "Get a client invoice", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Invoice detail" } } },
      },
      "/api/client/billing/invoices/{invoiceId}/pay": {
        post: {
          tags: ["Billing"],
          summary: "Initiate payment for an invoice",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "invoiceId", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { gateway: { type: "string", example: "stripe" }, returnUrl: { type: "string" } } } } } },
          responses: { 200: { description: "Payment initiated, returns checkout URL or payment intent" } },
        },
      },
      "/api/client/billing/payments": {
        get: { tags: ["Billing"], summary: "List client payment history", security: [{ BearerAuth: [] }], responses: { 200: { description: "Payments" } } },
      },
      "/api/client/billing/summary": {
        get: { tags: ["Billing"], summary: "Get billing summary for client", security: [{ BearerAuth: [] }], responses: { 200: { description: "Summary" } } },
      },
      "/api/billing/webhooks/{gateway}": {
        post: {
          tags: ["Billing"],
          summary: "Payment gateway webhook receiver (Stripe, PayPal, etc.)",
          parameters: [{ name: "gateway", in: "path", required: true, schema: { type: "string", enum: ["stripe", "paypal"] } }],
          requestBody: { description: "Raw webhook payload — validated via gateway signature header", required: true, content: { "application/json": { schema: { type: "object" } } } },
          responses: { 200: { description: "Webhook handled" } },
        },
      },

      // ═══════════════════════════════════════════════════════════════
      // DOMAINS
      // ═══════════════════════════════════════════════════════════════
      "/api/domains": {
        get: {
          tags: ["Domains"],
          summary: "List domains for authenticated user",
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: "ownerId", in: "query", schema: { type: "string" } },
            { name: "status", in: "query", schema: { type: "string" } },
          ],
          responses: { 200: { description: "Domain list", content: { "application/json": { schema: { allOf: [{ $ref: "#/components/schemas/SuccessResponse" }, { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Domain" } } } }] } } } } },
        },
      },
      "/api/domains/{id}": {
        get: { tags: ["Domains"], summary: "Get domain by ID", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Domain detail" } } },
      },
      "/api/domains/check": {
        post: {
          tags: ["Domains"],
          summary: "Check domain availability",
          security: [{ BearerAuth: [] }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { domain: { type: "string", example: "mysite.com" } } } } } },
          responses: { 200: { description: "Availability result" } },
        },
      },
      "/api/domains/register": {
        post: {
          tags: ["Domains"],
          summary: "Register a new domain",
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["domain", "currency"],
                  properties: { domain: { type: "string" }, currency: { type: "string" }, years: { type: "integer", default: 1 }, nameservers: { type: "array", items: { type: "string" } } },
                },
              },
            },
          },
          responses: { 201: { description: "Domain registered" } },
        },
      },
      "/api/domains/transfer": {
        post: {
          tags: ["Domains"],
          summary: "Initiate domain transfer",
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["domain", "authCode", "currency"],
                  properties: { domain: { type: "string" }, authCode: { type: "string" }, currency: { type: "string" } },
                },
              },
            },
          },
          responses: { 201: { description: "Transfer initiated" } },
        },
      },
      "/api/domains/{domainId}/dns": {
        get: { tags: ["Domains"], summary: "List DNS records for a domain", security: [{ BearerAuth: [] }], parameters: [{ name: "domainId", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "DNS records" } } },
        post: {
          tags: ["Domains"],
          summary: "Create a DNS record",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "domainId", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/DnsRecord" } } } },
          responses: { 201: { description: "DNS record created" } },
        },
      },
      "/api/domains/{domainId}/dns/{recordId}": {
        put: {
          tags: ["Domains"],
          summary: "Update a DNS record",
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: "domainId", in: "path", required: true, schema: { type: "string" } },
            { name: "recordId", in: "path", required: true, schema: { type: "string" } },
          ],
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/DnsRecord" } } } },
          responses: { 200: { description: "DNS record updated" } },
        },
        delete: {
          tags: ["Domains"],
          summary: "Delete a DNS record",
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: "domainId", in: "path", required: true, schema: { type: "string" } },
            { name: "recordId", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { 200: { description: "DNS record deleted" } },
        },
      },
      "/api/admin/domains": {
        get: {
          tags: ["Domains"],
          summary: "List all domains (admin)",
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: "status", in: "query", schema: { type: "string" } },
            { name: "registrar", in: "query", schema: { type: "string" } },
            { name: "search", in: "query", schema: { type: "string" } },
          ],
          responses: { 200: { description: "Domain list" } },
        },
      },
      "/api/admin/domains/stats": {
        get: { tags: ["Domains"], summary: "Get domain statistics (admin)", security: [{ BearerAuth: [] }], responses: { 200: { description: "Domain stats" } } },
      },
      "/api/admin/domains/{id}": {
        get: { tags: ["Domains"], summary: "Get domain by ID (admin)", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Domain detail" } } },
      },
      "/api/admin/domains/{id}/renew": {
        post: { tags: ["Domains"], summary: "Renew a domain (admin)", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { years: { type: "integer" } } } } } }, responses: { 200: { description: "Domain renewed" } } },
      },
      "/api/admin/domains/{id}/sync": {
        post: { tags: ["Domains"], summary: "Sync domain with registrar", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Domain synced" } } },
      },

      // ═══════════════════════════════════════════════════════════════
      // PROVISIONING
      // ═══════════════════════════════════════════════════════════════
      "/api/client/provisioning/accounts": {
        get: { tags: ["Provisioning"], summary: "List provisioned hosting accounts (client)", security: [{ BearerAuth: [] }], responses: { 200: { description: "Account list" } } },
      },
      "/api/client/provisioning/accounts/order/{orderId}": {
        get: { tags: ["Provisioning"], summary: "Get provisioning account for an order", security: [{ BearerAuth: [] }], parameters: [{ name: "orderId", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Account detail" } } },
      },
      "/api/client/provisioning/accounts/{username}": {
        get: { tags: ["Provisioning"], summary: "Get provisioning account by username", security: [{ BearerAuth: [] }], parameters: [{ name: "username", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Account detail" } } },
      },
      "/api/client/provisioning/accounts/{username}/stats": {
        get: { tags: ["Provisioning"], summary: "Get account resource usage stats", security: [{ BearerAuth: [] }], parameters: [{ name: "username", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Usage stats" } } },
      },
      "/api/admin/provisioning/accounts": {
        get: { tags: ["Provisioning"], summary: "List all provisioned accounts (admin)", security: [{ BearerAuth: [] }], responses: { 200: { description: "Account list" } } },
      },
      "/api/admin/provisioning/orders/{orderId}/provision": {
        post: { tags: ["Provisioning"], summary: "Manually trigger provisioning for an order", security: [{ BearerAuth: [] }], parameters: [{ name: "orderId", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Provisioning triggered" } } },
      },
      "/api/admin/provisioning/accounts/{username}/suspend": {
        post: { tags: ["Provisioning"], summary: "Suspend a hosting account", security: [{ BearerAuth: [] }], parameters: [{ name: "username", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Account suspended" } } },
      },
      "/api/admin/provisioning/accounts/{username}/unsuspend": {
        post: { tags: ["Provisioning"], summary: "Unsuspend a hosting account", security: [{ BearerAuth: [] }], parameters: [{ name: "username", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Account unsuspended" } } },
      },
      "/api/admin/provisioning/accounts/{username}/sync": {
        post: { tags: ["Provisioning"], summary: "Sync account with server", security: [{ BearerAuth: [] }], parameters: [{ name: "username", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Account synced" } } },
      },
      "/api/admin/provisioning/sync-all": {
        post: { tags: ["Provisioning"], summary: "Sync all provisioned accounts", security: [{ BearerAuth: [] }], responses: { 200: { description: "All accounts synced" } } },
      },

      // ═══════════════════════════════════════════════════════════════
      // AUTOMATION — PROFILES & TASKS
      // ═══════════════════════════════════════════════════════════════
      "/api/automation/profiles": {
        get: { tags: ["Automation"], summary: "List automation profiles (cron jobs)", security: [{ BearerAuth: [] }], responses: { 200: { description: "Profile list", content: { "application/json": { schema: { allOf: [{ $ref: "#/components/schemas/SuccessResponse" }, { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/AutomationProfile" } } } }] } } } } } },
        post: {
          tags: ["Automation"],
          summary: "Create an automation profile",
          security: [{ BearerAuth: [] }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name", "cronExpression"], properties: { name: { type: "string" }, cronExpression: { type: "string", example: "0 * * * *" }, description: { type: "string" } } } } } },
          responses: { 201: { description: "Profile created" } },
        },
      },
      "/api/automation/profiles/{profileId}": {
        get: { tags: ["Automation"], summary: "Get profile", security: [{ BearerAuth: [] }], parameters: [{ name: "profileId", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Profile detail" } } },
        put: { tags: ["Automation"], summary: "Update profile", security: [{ BearerAuth: [] }], parameters: [{ name: "profileId", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AutomationProfile" } } } }, responses: { 200: { description: "Profile updated" } } },
        delete: { tags: ["Automation"], summary: "Delete profile", security: [{ BearerAuth: [] }], parameters: [{ name: "profileId", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Profile deleted" } } },
      },
      "/api/automation/profiles/{profileId}/enable": {
        post: { tags: ["Automation"], summary: "Enable an automation profile", security: [{ BearerAuth: [] }], parameters: [{ name: "profileId", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Enabled" } } },
      },
      "/api/automation/profiles/{profileId}/disable": {
        post: { tags: ["Automation"], summary: "Disable an automation profile", security: [{ BearerAuth: [] }], parameters: [{ name: "profileId", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Disabled" } } },
      },
      "/api/automation/profiles/{profileId}/run": {
        post: { tags: ["Automation"], summary: "Manually trigger a profile run", security: [{ BearerAuth: [] }], parameters: [{ name: "profileId", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Run queued", content: { "application/json": { schema: { allOf: [{ $ref: "#/components/schemas/SuccessResponse" }, { type: "object", properties: { data: { $ref: "#/components/schemas/AutomationJob" } } }] } } } } } },
      },
      "/api/automation/profiles/{profileId}/runs": {
        get: { tags: ["Automation"], summary: "Get run history for a profile", security: [{ BearerAuth: [] }], parameters: [{ name: "profileId", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Run list" } } },
      },
      "/api/automation/profiles/{profileId}/tasks": {
        get: { tags: ["Automation"], summary: "List tasks in a profile", security: [{ BearerAuth: [] }], parameters: [{ name: "profileId", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Task list" } } },
        post: {
          tags: ["Automation"],
          summary: "Add a task to a profile",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "profileId", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["actionType"], properties: { actionType: { type: "string" }, config: { type: "object" }, order: { type: "integer" } } } } } },
          responses: { 201: { description: "Task added" } },
        },
      },
      "/api/automation/profiles/{profileId}/tasks/{taskId}": {
        get: { tags: ["Automation"], summary: "Get task detail", security: [{ BearerAuth: [] }], parameters: [{ name: "profileId", in: "path", required: true, schema: { type: "string" } }, { name: "taskId", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Task detail" } } },
        put: { tags: ["Automation"], summary: "Update a task", security: [{ BearerAuth: [] }], parameters: [{ name: "profileId", in: "path", required: true, schema: { type: "string" } }, { name: "taskId", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AutomationTask" } } } }, responses: { 200: { description: "Task updated" } } },
        delete: { tags: ["Automation"], summary: "Remove a task", security: [{ BearerAuth: [] }], parameters: [{ name: "profileId", in: "path", required: true, schema: { type: "string" } }, { name: "taskId", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Task removed" } } },
      },
      "/api/automation/tasks/{taskId}/run": {
        post: { tags: ["Automation"], summary: "Run a single task immediately", security: [{ BearerAuth: [] }], parameters: [{ name: "taskId", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Task executed" } } },
      },
      "/api/automation/actions": {
        get: { tags: ["Automation"], summary: "List all available action types", security: [{ BearerAuth: [] }], responses: { 200: { description: "Action type list" } } },
      },
      "/api/automation/actions/{actionType}": {
        get: { tags: ["Automation"], summary: "Get action type schema/definition", security: [{ BearerAuth: [] }], parameters: [{ name: "actionType", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Action definition" } } },
      },
      "/api/automation/registry": {
        get: { tags: ["Automation"], summary: "Get full automation registry (actions + events)", security: [{ BearerAuth: [] }], responses: { 200: { description: "Registry" } } },
      },
      "/api/automation/registry/events": {
        get: { tags: ["Automation"], summary: "List all registered event types", security: [{ BearerAuth: [] }], responses: { 200: { description: "Event list" } } },
      },
      // Automation — Workflows
      "/api/automation/workflows": {
        get: { tags: ["Automation"], summary: "List workflows", security: [{ BearerAuth: [] }], responses: { 200: { description: "Workflow list", content: { "application/json": { schema: { allOf: [{ $ref: "#/components/schemas/SuccessResponse" }, { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Workflow" } } } }] } } } } } },
        post: {
          tags: ["Automation"],
          summary: "Create a workflow",
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "trigger", "steps"],
                  properties: { name: { type: "string" }, description: { type: "string" }, trigger: { type: "object" }, steps: { type: "array", items: { type: "object" } } },
                },
                example: { name: "Send welcome email", trigger: { type: "event", event: "order.activated" }, steps: [{ action: "notify.email", config: { template: "welcome" } }] },
              },
            },
          },
          responses: { 201: { description: "Workflow created" } },
        },
      },
      "/api/automation/workflows/{workflowId}": {
        get: { tags: ["Automation"], summary: "Get workflow", security: [{ BearerAuth: [] }], parameters: [{ name: "workflowId", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Workflow detail" } } },
        put: { tags: ["Automation"], summary: "Update workflow", security: [{ BearerAuth: [] }], parameters: [{ name: "workflowId", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Workflow" } } } }, responses: { 200: { description: "Workflow updated" } } },
        delete: { tags: ["Automation"], summary: "Delete workflow", security: [{ BearerAuth: [] }], parameters: [{ name: "workflowId", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Workflow deleted" } } },
      },
      "/api/automation/workflows/{workflowId}/run": {
        post: {
          tags: ["Automation"],
          summary: "Manually execute a workflow",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "workflowId", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: false, content: { "application/json": { schema: { type: "object", description: "Optional input data" } } } },
          responses: { 200: { description: "Execution started" } },
        },
      },
      "/api/automation/workflows/{workflowId}/history": {
        get: { tags: ["Automation"], summary: "Get workflow execution history", security: [{ BearerAuth: [] }], parameters: [{ name: "workflowId", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Run history" } } },
      },
      "/api/automation/workflows/{workflowId}/metrics": {
        get: { tags: ["Automation"], summary: "Get workflow metrics", security: [{ BearerAuth: [] }], parameters: [{ name: "workflowId", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Metrics" } } },
      },
      "/api/automation/workflows/validate": {
        post: {
          tags: ["Automation"],
          summary: "Validate a workflow definition without saving",
          security: [{ BearerAuth: [] }],
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Workflow" } } } },
          responses: { 200: { description: "Validation result" } },
        },
      },
      "/api/automation/audit/logs": {
        get: { tags: ["Automation"], summary: "List automation audit logs", security: [{ BearerAuth: [] }], responses: { 200: { description: "Log list" } } },
      },

      // ═══════════════════════════════════════════════════════════════
      // INSTALLED PLUGINS
      // ═══════════════════════════════════════════════════════════════
      "/api/admin/installed-plugins": {
        get: {
          tags: ["Plugins"],
          summary: "List all installed plugins and their state",
          security: [{ BearerAuth: [] }],
          responses: {
            200: {
              description: "Installed plugin list",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/SuccessResponse" },
                      { type: "object", properties: { count: { type: "integer" }, data: { type: "array", items: { $ref: "#/components/schemas/InstalledPlugin" } } } },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      "/api/admin/installed-plugins/{name}/enable": {
        post: {
          tags: ["Plugins"],
          summary: "Enable an installed plugin",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "name", in: "path", required: true, schema: { type: "string" }, description: "Plugin folder name" }],
          responses: { 200: { description: "Plugin enabled" }, 503: { description: "Plugin system not ready" } },
        },
      },
      "/api/admin/installed-plugins/{name}/disable": {
        post: {
          tags: ["Plugins"],
          summary: "Disable an installed plugin",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "name", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Plugin disabled" } },
        },
      },

      // ═══════════════════════════════════════════════════════════════
      // PLUGIN MARKETPLACE
      // ═══════════════════════════════════════════════════════════════
      "/api/marketplace/plugins": {
        get: {
          tags: ["Marketplace"],
          summary: "Browse marketplace plugins",
          parameters: [
            { name: "category", in: "query", schema: { type: "string" } },
            { name: "search", in: "query", schema: { type: "string" } },
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          ],
          responses: { 200: { description: "Marketplace plugin list", content: { "application/json": { schema: { allOf: [{ $ref: "#/components/schemas/SuccessResponse" }, { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Plugin" } } } }] } } } } },
        },
      },
      "/api/marketplace/plugins/{slug}": {
        get: {
          tags: ["Marketplace"],
          summary: "Get plugin by slug",
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Plugin detail", content: { "application/json": { schema: { allOf: [{ $ref: "#/components/schemas/SuccessResponse" }, { type: "object", properties: { data: { $ref: "#/components/schemas/Plugin" } } }] } } } }, 404: { description: "Plugin not found" } },
        },
      },
      "/api/marketplace/plugins/{slug}/rate": {
        post: {
          tags: ["Marketplace"],
          summary: "Rate a marketplace plugin",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { rating: { type: "integer", minimum: 1, maximum: 5 }, review: { type: "string" } } } } } },
          responses: { 200: { description: "Rating submitted" } },
        },
      },
      "/api/marketplace/stats/top": {
        get: { tags: ["Marketplace"], summary: "Get top-rated marketplace plugins", responses: { 200: { description: "Top plugins" } } },
      },
      "/api/marketplace/stats/most-installed": {
        get: { tags: ["Marketplace"], summary: "Get most installed plugins", responses: { 200: { description: "Most installed" } } },
      },
      "/api/plugins/install/{slug}": {
        post: {
          tags: ["Marketplace"],
          summary: "Install a marketplace plugin",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Plugin installed" } },
        },
      },
      "/api/plugins/check-update/{slug}": {
        get: {
          tags: ["Marketplace"],
          summary: "Check if a plugin has an update available",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Update status" } },
        },
      },
      "/api/plugins/update/{slug}": {
        post: {
          tags: ["Marketplace"],
          summary: "Update an installed plugin to latest version",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Plugin updated" } },
        },
      },
      // Developer plugin publishing
      "/api/developer/plugins": {
        post: {
          tags: ["Marketplace"],
          summary: "Create a new plugin listing (developer)",
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "slug", "description"],
                  properties: { name: { type: "string" }, slug: { type: "string" }, description: { type: "string" }, category: { type: "string" }, tags: { type: "array", items: { type: "string" } } },
                },
              },
            },
          },
          responses: { 201: { description: "Plugin listing created", content: { "application/json": { schema: { allOf: [{ $ref: "#/components/schemas/SuccessResponse" }, { type: "object", properties: { data: { $ref: "#/components/schemas/Plugin" } } }] } } } } },
        },
        get: {
          tags: ["Marketplace"],
          summary: "List developer's own plugins",
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: "Developer plugin list" } },
        },
      },
      "/api/developer/plugins/{id}/version": {
        post: {
          tags: ["Marketplace"],
          summary: "Submit a new plugin version for review",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { version: { type: "string" }, changelog: { type: "string" } } } } } },
          responses: { 201: { description: "Version submitted for review", content: { "application/json": { schema: { allOf: [{ $ref: "#/components/schemas/SuccessResponse" }, { type: "object", properties: { data: { $ref: "#/components/schemas/PluginVersion" } } }] } } } } },
        },
      },
      "/api/admin/plugins": {
        get: { tags: ["Marketplace"], summary: "List plugins pending review (admin)", security: [{ BearerAuth: [] }], responses: { 200: { description: "Pending plugin list" } } },
      },
      "/api/admin/plugins/{id}/approve": {
        post: { tags: ["Marketplace"], summary: "Approve a submitted plugin (superadmin)", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Plugin approved" } } },
      },
      "/api/admin/plugins/{id}/reject": {
        post: {
          tags: ["Marketplace"],
          summary: "Reject a submitted plugin (superadmin)",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { reason: { type: "string" } } } } } },
          responses: { 200: { description: "Plugin rejected" } },
        },
      },

      // ═══════════════════════════════════════════════════════════════
      // BACKUP
      // ═══════════════════════════════════════════════════════════════
      "/api/backups": {
        get: { tags: ["Backup"], summary: "List backups", security: [{ BearerAuth: [] }], responses: { 200: { description: "Backup list", content: { "application/json": { schema: { allOf: [{ $ref: "#/components/schemas/SuccessResponse" }, { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Backup" } } } }] } } } } } },
        post: {
          tags: ["Backup"],
          summary: "Create / trigger a backup",
          security: [{ BearerAuth: [] }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { type: { type: "string", enum: ["full", "database", "files"] }, storageConfigId: { type: "string" } } } } } },
          responses: { 201: { description: "Backup job queued" } },
        },
      },
      "/api/backups/stats": {
        get: { tags: ["Backup"], summary: "Get backup statistics", security: [{ BearerAuth: [] }], responses: { 200: { description: "Backup stats" } } },
      },
      "/api/backups/analytics": {
        get: { tags: ["Backup"], summary: "Get backup analytics (trends, sizes)", security: [{ BearerAuth: [] }], responses: { 200: { description: "Analytics data" } } },
      },
      "/api/backups/bulk-delete": {
        post: { tags: ["Backup"], summary: "Bulk delete backup records", security: [{ BearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { ids: { type: "array", items: { type: "string" } } } } } } }, responses: { 200: { description: "Backups deleted" } } },
      },
      "/api/backups/{id}/logs": {
        get: { tags: ["Backup"], summary: "Get logs for a backup job", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Backup logs" } } },
      },
      "/api/backups/{id}/retention-info": {
        get: { tags: ["Backup"], summary: "Get retention policy info for a backup", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Retention info" } } },
      },
      "/api/storage-configs": {
        get: { tags: ["Backup"], summary: "List storage configurations", security: [{ BearerAuth: [] }], responses: { 200: { description: "Storage config list" } } },
        post: {
          tags: ["Backup"],
          summary: "Create a storage configuration",
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { name: { type: "string" }, provider: { type: "string", enum: ["s3", "gcs", "local", "ftp"] }, credentials: { type: "object" }, bucket: { type: "string" } },
                },
              },
            },
          },
          responses: { 201: { description: "Storage config created" } },
        },
      },

      // ═══════════════════════════════════════════════════════════════
      // EMAIL SERVICE
      // ═══════════════════════════════════════════════════════════════
      "/api/v1/email/send": {
        post: {
          tags: ["Email Service"],
          summary: "Send a transactional email",
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["to", "subject"],
                  properties: { to: { type: "string", format: "email" }, subject: { type: "string" }, template: { type: "string" }, data: { type: "object" }, html: { type: "string" } },
                },
              },
            },
          },
          responses: { 200: { description: "Email queued" } },
        },
      },
      "/api/v1/email/job/{id}": {
        get: { tags: ["Email Service"], summary: "Get email job status", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Job status" } } },
      },

      // ═══════════════════════════════════════════════════════════════
      // BROADCAST
      // ═══════════════════════════════════════════════════════════════
      "/api/admin/broadcasts": {
        get: {
          tags: ["Broadcast"],
          summary: "List all broadcasts (admin)",
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: "type", in: "query", schema: { type: "string", enum: ["notification", "document"] } },
            { name: "status", in: "query", schema: { type: "string", enum: ["draft", "published", "archived"] } },
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          ],
          responses: { 200: { description: "Broadcast list" } },
        },
        post: {
          tags: ["Broadcast"],
          summary: "Create a broadcast (admin) — multipart/form-data for file uploads",
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["title", "type"],
                  properties: {
                    title: { type: "string" },
                    body: { type: "string", description: "Notification message body" },
                    type: { type: "string", enum: ["notification", "document"] },
                    targetRoles: { type: "string", description: "JSON array of roles, e.g. [\"client\"]" },
                    status: { type: "string", enum: ["draft", "published"], default: "published" },
                    file: { type: "string", format: "binary", description: "Attachment (PDF, DOCX, XLSX, ZIP, image)" },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "Broadcast created" } },
        },
      },
      "/api/admin/broadcasts/{id}": {
        get: {
          tags: ["Broadcast"],
          summary: "Get a single broadcast (admin)",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Broadcast detail" }, 404: { description: "Not found" } },
        },
        put: {
          tags: ["Broadcast"],
          summary: "Update a broadcast (admin)",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { title: { type: "string" }, body: { type: "string" }, status: { type: "string" }, targetRoles: { type: "array", items: { type: "string" } } } } } } },
          responses: { 200: { description: "Broadcast updated" } },
        },
        delete: {
          tags: ["Broadcast"],
          summary: "Delete a broadcast (admin)",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Broadcast deleted" } },
        },
      },
      "/api/admin/broadcasts/{id}/engagement": {
        get: {
          tags: ["Broadcast"],
          summary: "Get engagement stats for a broadcast (admin)",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Engagement data (views, dismissals, downloads)" } },
        },
      },
      "/api/client/broadcasts/notifications": {
        get: {
          tags: ["Broadcast"],
          summary: "Get active notification broadcasts for the current client",
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: "Notification list" } },
        },
      },
      "/api/client/broadcasts/documents": {
        get: {
          tags: ["Broadcast"],
          summary: "Get published document broadcasts for the current client",
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: "Document list" } },
        },
      },
      "/api/client/broadcasts/{id}/dismiss": {
        post: {
          tags: ["Broadcast"],
          summary: "Dismiss a notification broadcast",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Notification dismissed" } },
        },
      },
      "/api/client/broadcasts/{id}/download": {
        get: {
          tags: ["Broadcast"],
          summary: "Download a document broadcast file",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "File stream" } },
        },
      },

      // ═══════════════════════════════════════════════════════════════
      // SUPPORT — TICKETS
      // ═══════════════════════════════════════════════════════════════
      "/api/support/departments": {
        get: {
          tags: ["Support"],
          summary: "List active support departments",
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: "Department list" } },
        },
      },
      "/api/support/tickets": {
        get: {
          tags: ["Support"],
          summary: "List tickets — clients see own tickets; staff see all",
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: "status", in: "query", schema: { type: "string", enum: ["open", "pending", "resolved", "closed"] } },
            { name: "priority", in: "query", schema: { type: "string", enum: ["low", "normal", "high", "urgent"] } },
            { name: "departmentId", in: "query", schema: { type: "string" } },
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          ],
          responses: { 200: { description: "Ticket list" } },
        },
        post: {
          tags: ["Support"],
          summary: "Create a new support ticket",
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["subject", "body", "departmentId"],
                  properties: {
                    subject: { type: "string" },
                    body: { type: "string" },
                    departmentId: { type: "string" },
                    priority: { type: "string", enum: ["low", "normal", "high", "urgent"], default: "normal" },
                    relatedOrderId: { type: "string", nullable: true },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "Ticket created" } },
        },
      },
      "/api/support/tickets/stats": {
        get: {
          tags: ["Support"],
          summary: "Get ticket statistics (staff only)",
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: "Stats: open, pending, resolved, avg response time" } },
        },
      },
      "/api/support/tickets/{id}": {
        get: {
          tags: ["Support"],
          summary: "Get ticket detail",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Ticket with replies" }, 403: { description: "Not authorized" }, 404: { description: "Not found" } },
        },
      },
      "/api/support/tickets/{id}/reply": {
        post: {
          tags: ["Support"],
          summary: "Add a reply to a ticket",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["body"], properties: { body: { type: "string" }, type: { type: "string", enum: ["public", "internal"], default: "public" } } } } } },
          responses: { 201: { description: "Reply added" } },
        },
      },
      "/api/support/tickets/{id}/close": {
        post: {
          tags: ["Support"],
          summary: "Close a ticket",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { content: { "application/json": { schema: { type: "object", properties: { note: { type: "string" } } } } } },
          responses: { 200: { description: "Ticket closed" } },
        },
      },
      "/api/support/tickets/{id}/reopen": {
        post: {
          tags: ["Support"],
          summary: "Reopen a closed ticket",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Ticket reopened" } },
        },
      },
      "/api/support/tickets/{id}/assign": {
        put: {
          tags: ["Support"],
          summary: "Assign ticket to a staff member (staff only)",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["assigneeId"], properties: { assigneeId: { type: "string" } } } } } },
          responses: { 200: { description: "Ticket assigned" } },
        },
      },
      "/api/support/tickets/{id}/status": {
        put: {
          tags: ["Support"],
          summary: "Change ticket status (staff only)",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["status"], properties: { status: { type: "string", enum: ["open", "pending", "resolved", "closed"] }, note: { type: "string" } } } } } },
          responses: { 200: { description: "Status updated" } },
        },
      },
      "/api/support/tickets/{id}/priority": {
        put: {
          tags: ["Support"],
          summary: "Change ticket priority (staff only)",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["priority"], properties: { priority: { type: "string", enum: ["low", "normal", "high", "urgent"] } } } } } },
          responses: { 200: { description: "Priority updated" } },
        },
      },
      "/api/support/tickets/{id}/transfer": {
        put: {
          tags: ["Support"],
          summary: "Transfer ticket to another department (staff only)",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["departmentId"], properties: { departmentId: { type: "string" }, note: { type: "string" } } } } } },
          responses: { 200: { description: "Ticket transferred" } },
        },
      },

      // ── Support — Live Chat ──────────────────────────────────────
      "/api/support/chat/sessions": {
        post: {
          tags: ["Support"],
          summary: "Start a live chat session",
          security: [{ BearerAuth: [] }],
          requestBody: { content: { "application/json": { schema: { type: "object", properties: { departmentId: { type: "string" } } } } } },
          responses: { 201: { description: "Chat session created" } },
        },
      },
      "/api/support/chat/queue": {
        get: {
          tags: ["Support"],
          summary: "Get waiting chat queue (staff only)",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "departmentId", in: "query", schema: { type: "string" } }],
          responses: { 200: { description: "Waiting sessions" } },
        },
      },
      "/api/support/chat/my-sessions": {
        get: {
          tags: ["Support"],
          summary: "Get agent's active chat sessions (staff only)",
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: "Active sessions" } },
        },
      },
      "/api/support/chat/availability": {
        put: {
          tags: ["Support"],
          summary: "Set agent chat availability (staff only)",
          security: [{ BearerAuth: [] }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["available"], properties: { available: { type: "boolean" } } } } } },
          responses: { 200: { description: "Availability updated" } },
        },
      },
      "/api/support/chat/sessions/{sessionId}": {
        get: {
          tags: ["Support"],
          summary: "Get chat session detail",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "sessionId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Session detail" } },
        },
      },
      "/api/support/chat/sessions/{sessionId}/transcript": {
        get: {
          tags: ["Support"],
          summary: "Get full chat transcript",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "sessionId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Message transcript" } },
        },
      },
      "/api/support/chat/sessions/{sessionId}/message": {
        post: {
          tags: ["Support"],
          summary: "Send a chat message (REST fallback — prefer WebSocket)",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "sessionId", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["text"], properties: { text: { type: "string" } } } } } },
          responses: { 201: { description: "Message sent" } },
        },
      },
      "/api/support/chat/sessions/{sessionId}/end": {
        post: {
          tags: ["Support"],
          summary: "End a chat session",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "sessionId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Session ended" } },
        },
      },
      "/api/support/chat/sessions/{sessionId}/rate": {
        post: {
          tags: ["Support"],
          summary: "Rate a completed chat session",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "sessionId", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["rating"], properties: { rating: { type: "integer", minimum: 1, maximum: 5 }, comment: { type: "string" } } } } } },
          responses: { 200: { description: "Session rated" } },
        },
      },
      "/api/support/chat/sessions/{sessionId}/convert": {
        post: {
          tags: ["Support"],
          summary: "Convert chat session to a ticket (staff only)",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "sessionId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 201: { description: "Ticket created from chat" } },
        },
      },
      "/api/support/chat/sessions/{sessionId}/join": {
        post: {
          tags: ["Support"],
          summary: "Agent joins a chat session (staff only)",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "sessionId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Agent joined" } },
        },
      },
      "/api/support/chat/sessions/{sessionId}/leave": {
        post: {
          tags: ["Support"],
          summary: "Agent leaves a chat session (staff only)",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "sessionId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Agent left" } },
        },
      },

      // ═══════════════════════════════════════════════════════════════
      // SERVER MANAGEMENT
      // ═══════════════════════════════════════════════════════════════
      "/api/admin/server-management/servers": {
        get: {
          tags: ["Server Management"],
          summary: "List all servers",
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: "type", in: "query", schema: { type: "string", enum: ["cpanel", "vps", "cloud"] } },
            { name: "groupId", in: "query", schema: { type: "string" } },
            { name: "status", in: "query", schema: { type: "string" } },
          ],
          responses: { 200: { description: "Server list" } },
        },
        post: {
          tags: ["Server Management"],
          summary: "Create a server",
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "hostname", "type"],
                  properties: {
                    name: { type: "string" },
                    hostname: { type: "string" },
                    type: { type: "string", enum: ["cpanel", "vps", "cloud"] },
                    ipAddress: { type: "string" },
                    port: { type: "integer", default: 2087 },
                    username: { type: "string" },
                    apiToken: { type: "string" },
                    maxAccounts: { type: "integer" },
                    groupId: { type: "string", nullable: true },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "Server created" } },
        },
      },
      "/api/admin/server-management/servers/{id}": {
        get: {
          tags: ["Server Management"],
          summary: "Get server detail",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Server detail" }, 404: { description: "Not found" } },
        },
        patch: {
          tags: ["Server Management"],
          summary: "Update a server",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, hostname: { type: "string" }, maxAccounts: { type: "integer" }, groupId: { type: "string", nullable: true } } } } } },
          responses: { 200: { description: "Server updated" } },
        },
        delete: {
          tags: ["Server Management"],
          summary: "Delete a server",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Server deleted" } },
        },
      },
      "/api/admin/server-management/servers/{id}/test": {
        post: {
          tags: ["Server Management"],
          summary: "Test server connectivity",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Connection test result" } },
        },
      },
      "/api/admin/server-management/servers/{id}/metrics": {
        get: {
          tags: ["Server Management"],
          summary: "Get live server metrics (CPU, RAM, disk)",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Live metrics" } },
        },
      },
      "/api/admin/server-management/servers/{id}/metrics/history": {
        get: {
          tags: ["Server Management"],
          summary: "Get historical metrics",
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
            { name: "range", in: "query", schema: { type: "string", enum: ["1h", "6h", "24h", "7d", "30d"], default: "24h" } },
          ],
          responses: { 200: { description: "Metrics history" } },
        },
      },
      "/api/admin/server-management/servers/{id}/maintenance": {
        patch: {
          tags: ["Server Management"],
          summary: "Toggle server maintenance mode",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["enabled"], properties: { enabled: { type: "boolean" } } } } } },
          responses: { 200: { description: "Maintenance mode updated" } },
        },
      },
      "/api/admin/server-management/servers/{id}/capabilities": {
        get: {
          tags: ["Server Management"],
          summary: "Get server capabilities (supported features)",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Capabilities list" } },
        },
      },
      "/api/admin/server-management/servers/{id}/accounts": {
        get: {
          tags: ["Server Management"],
          summary: "List provisioned accounts on a server",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Account list" } },
        },
        post: {
          tags: ["Server Management"],
          summary: "Create / provision an account on a server",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["username", "domain", "packageName"], properties: { username: { type: "string" }, domain: { type: "string" }, packageName: { type: "string" }, email: { type: "string" }, orderId: { type: "string", nullable: true } } } } } },
          responses: { 202: { description: "Provisioning job queued" } },
        },
      },
      "/api/admin/server-management/servers/accounts/{accountId}/suspend": {
        patch: {
          tags: ["Server Management"],
          summary: "Suspend a provisioned account",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "accountId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Account suspended" } },
        },
      },
      "/api/admin/server-management/servers/accounts/{accountId}/terminate": {
        patch: {
          tags: ["Server Management"],
          summary: "Terminate a provisioned account",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "accountId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Account terminated" } },
        },
      },
      "/api/admin/server-management/servers/accounts/{accountId}/usage": {
        get: {
          tags: ["Server Management"],
          summary: "Get resource usage for a provisioned account",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "accountId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Usage data (disk, bandwidth, email accounts)" } },
        },
      },
      "/api/admin/server-management/servers/accounts/{accountId}/quotas": {
        patch: {
          tags: ["Server Management"],
          summary: "Update resource quotas for a provisioned account",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "accountId", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { content: { "application/json": { schema: { type: "object", properties: { diskQuotaMb: { type: "integer" }, bandwidthQuotaMb: { type: "integer" } } } } } },
          responses: { 200: { description: "Quotas updated" } },
        },
      },
      "/api/admin/server-management/servers/{id}/logs": {
        get: {
          tags: ["Server Management"],
          summary: "Get provisioning logs for a server",
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
            { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
            { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
          ],
          responses: { 200: { description: "Log entries" } },
        },
      },
      "/api/admin/server-management/servers/{id}/activity": {
        get: {
          tags: ["Server Management"],
          summary: "Get activity timeline for a server",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Timeline events" } },
        },
      },

      // ── Server Groups ────────────────────────────────────────────
      "/api/admin/server-management/server-groups": {
        get: {
          tags: ["Server Management"],
          summary: "List all server groups",
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: "Group list" } },
        },
        post: {
          tags: ["Server Management"],
          summary: "Create a server group",
          security: [{ BearerAuth: [] }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name"], properties: { name: { type: "string" }, description: { type: "string" }, fillType: { type: "string", enum: ["roundrobin", "least_used", "default"] } } } } } },
          responses: { 201: { description: "Group created" } },
        },
      },
      "/api/admin/server-management/server-groups/{id}": {
        get: {
          tags: ["Server Management"],
          summary: "Get server group detail",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Group detail" } },
        },
        patch: {
          tags: ["Server Management"],
          summary: "Update a server group",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, fillType: { type: "string" } } } } } },
          responses: { 200: { description: "Group updated" } },
        },
        delete: {
          tags: ["Server Management"],
          summary: "Delete a server group",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Group deleted" } },
        },
      },
      "/api/admin/server-management/server-groups/{id}/assign": {
        post: {
          tags: ["Server Management"],
          summary: "Assign a server to a group",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["serverId"], properties: { serverId: { type: "string" } } } } } },
          responses: { 200: { description: "Server assigned" } },
        },
      },
      "/api/admin/server-management/server-groups/{id}/default": {
        post: {
          tags: ["Server Management"],
          summary: "Set the default server for a group",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["serverId"], properties: { serverId: { type: "string" } } } } } },
          responses: { 200: { description: "Default server set" } },
        },
      },

      // ── Server Logs (cross-server) ───────────────────────────────
      "/api/admin/server-management/server-logs": {
        get: {
          tags: ["Server Management"],
          summary: "Get all server logs across all servers",
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: "serverId", in: "query", schema: { type: "string" } },
            { name: "action", in: "query", schema: { type: "string" } },
            { name: "limit", in: "query", schema: { type: "integer", default: 100 } },
            { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
          ],
          responses: { 200: { description: "Log entries" } },
        },
      },

      // ═══════════════════════════════════════════════════════════════
      // SETTINGS
      // ═══════════════════════════════════════════════════════════════
      "/api/admin/settings/storage-paths": {
        get: {
          tags: ["Settings"],
          summary: "Get configured storage paths",
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: "Storage path configuration (uploads, backups, plugins, broadcasts)" } },
        },
        put: {
          tags: ["Settings"],
          summary: "Update storage paths",
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    uploadsPath: { type: "string" },
                    backupsPath: { type: "string" },
                    pluginsPath: { type: "string" },
                    broadcastsPath: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "Paths updated" } },
        },
      },
    },
  },
  apis: [],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
