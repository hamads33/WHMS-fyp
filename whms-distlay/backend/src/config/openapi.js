const spec = {
  openapi: '3.0.3',
  info: {
    title: 'WHMS Distlay API',
    description: 'SaaS Distribution Layer — agent-based control plane for WHMS deployments.',
    version: '1.0.0',
    contact: { name: 'WHMS Platform Team' },
  },
  servers: [{ url: '/api/v1', description: 'v1' }],

  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      agentToken: { type: 'apiKey', in: 'header', name: 'x-agent-token' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error:   { type: 'string' },
          details: { type: 'array', items: { type: 'object' }, nullable: true },
        },
      },
      Meta: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          page:  { type: 'integer' },
          limit: { type: 'integer' },
          pages: { type: 'integer' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id:         { type: 'string', format: 'uuid' },
          email:      { type: 'string', format: 'email' },
          role:       { type: 'string', enum: ['user', 'admin'] },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Tenant: {
        type: 'object',
        properties: {
          id:         { type: 'string', format: 'uuid' },
          user_id:    { type: 'string', format: 'uuid' },
          plan_id:    { type: 'string', format: 'uuid', nullable: true },
          status:     { type: 'string', enum: ['pending', 'active', 'suspended'] },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
          plan_name:  { type: 'string', nullable: true },
          plan_price: { type: 'number', nullable: true },
        },
      },
      Plan: {
        type: 'object',
        properties: {
          id:            { type: 'string', format: 'uuid' },
          name:          { type: 'string' },
          price:         { type: 'number' },
          description:   { type: 'string', nullable: true },
          billing_cycle: { type: 'string', enum: ['monthly', 'yearly', 'one_time', 'custom'] },
          trial_days:    { type: 'integer' },
          sort_order:    { type: 'integer' },
          is_active:     { type: 'boolean' },
          features:      { type: 'object', additionalProperties: true },
          metadata:      { type: 'object', additionalProperties: true },
          created_at:    { type: 'string', format: 'date-time' },
          updated_at:    { type: 'string', format: 'date-time' },
        },
      },
      Subscription: {
        type: 'object',
        properties: {
          id:           { type: 'string', format: 'uuid' },
          tenant_id:    { type: 'string', format: 'uuid' },
          plan_id:      { type: 'string', format: 'uuid' },
          status:       { type: 'string', enum: ['active', 'cancelled', 'expired'] },
          renewal_date: { type: 'string', format: 'date-time' },
          plan_name:    { type: 'string' },
          price:        { type: 'number' },
          features:     { type: 'object', additionalProperties: true },
          created_at:   { type: 'string', format: 'date-time' },
        },
      },
      Command: {
        type: 'object',
        properties: {
          id:          { type: 'string', format: 'uuid' },
          tenant_id:   { type: 'string', format: 'uuid' },
          type:        { type: 'string', enum: ['suspend', 'resume', 'restart'] },
          status:      { type: 'string', enum: ['pending', 'dispatched', 'executed', 'failed'] },
          payload:     { type: 'object', additionalProperties: true },
          result:      { type: 'object', nullable: true },
          created_by:  { type: 'string', format: 'uuid', nullable: true },
          created_at:  { type: 'string', format: 'date-time' },
          executed_at: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      InstallToken: {
        type: 'object',
        properties: {
          id:         { type: 'string', format: 'uuid' },
          tenant_id:  { type: 'string', format: 'uuid' },
          token:      { type: 'string' },
          expires_at: { type: 'string', format: 'date-time' },
          used:       { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Missing or invalid authentication',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      Forbidden: {
        description: 'Insufficient permissions',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      NotFound: {
        description: 'Resource not found',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      ValidationError: {
        description: 'Validation failed',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
    },
    parameters: {
      PageParam: {
        name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 },
      },
      LimitParam: {
        name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
      },
    },
  },

  paths: {
    // ── Auth ────────────────────────────────────────────────────────────────
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user (creates tenant automatically)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email:    { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Registered',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        user:  { $ref: '#/components/schemas/User' },
                        token: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          409: { description: 'Email already registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          422: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Obtain a JWT',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email:    { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Authenticated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        user:  { $ref: '#/components/schemas/User' },
                        token: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          422: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get the authenticated user',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Current user', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/User' } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // ── Tenant ──────────────────────────────────────────────────────────────
    '/tenant/me': {
      get: {
        tags: ['Tenant'],
        summary: 'Get the current user\'s tenant',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Tenant', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Tenant' } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/tenant': {
      get: {
        tags: ['Tenant'],
        summary: 'List all tenants (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/PageParam' },
          { $ref: '#/components/parameters/LimitParam' },
        ],
        responses: {
          200: {
            description: 'Paginated tenant list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Tenant' } },
                    meta: { $ref: '#/components/schemas/Meta' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/tenant/{id}': {
      get: {
        tags: ['Tenant'],
        summary: 'Get a tenant by ID (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Tenant', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Tenant' } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/tenant/{id}/status': {
      patch: {
        tags: ['Tenant'],
        summary: 'Update tenant status (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: { status: { type: 'string', enum: ['pending', 'active', 'suspended'] } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Updated tenant' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ── Billing ─────────────────────────────────────────────────────────────
    '/billing/plans': {
      get: {
        tags: ['Billing'],
        summary: 'List active plans (public)',
        responses: {
          200: { description: 'Plan list', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/Plan' } } } } } } },
        },
      },
    },
    '/billing/plans/{id}': {
      get: {
        tags: ['Billing'],
        summary: 'Get a single plan (public)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Plan' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/billing/subscription': {
      get: {
        tags: ['Billing'],
        summary: 'Get the current user\'s active subscription',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Active subscription', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Subscription' } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/billing/subscribe': {
      post: {
        tags: ['Billing'],
        summary: 'Subscribe to a plan',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['plan_id'], properties: { plan_id: { type: 'string', format: 'uuid' } } } } },
        },
        responses: {
          201: { description: 'Subscribed' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
          410: { description: 'Plan no longer available' },
        },
      },
    },
    '/billing/admin/plans': {
      get: {
        tags: ['Billing – Admin'],
        summary: 'List all plans including inactive, with subscriber counts',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'All plans' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
      },
      post: {
        tags: ['Billing – Admin'],
        summary: 'Create a plan',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'price'],
                properties: {
                  name:          { type: 'string' },
                  price:         { type: 'number', minimum: 0 },
                  description:   { type: 'string' },
                  billing_cycle: { type: 'string', enum: ['monthly', 'yearly', 'one_time', 'custom'] },
                  trial_days:    { type: 'integer', minimum: 0 },
                  sort_order:    { type: 'integer', minimum: 0 },
                  features:      { type: 'object', additionalProperties: true },
                  metadata:      { type: 'object', additionalProperties: true },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Created plan' }, 409: { description: 'Name conflict' }, 422: { $ref: '#/components/responses/ValidationError' } },
      },
    },
    '/billing/admin/plans/{id}': {
      patch: {
        tags: ['Billing – Admin'],
        summary: 'Update any plan field',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' }, price: { type: 'number', minimum: 0 },
                  description: { type: 'string' }, billing_cycle: { type: 'string', enum: ['monthly', 'yearly', 'one_time', 'custom'] },
                  trial_days: { type: 'integer' }, sort_order: { type: 'integer' },
                  is_active: { type: 'boolean' }, features: { type: 'object' }, metadata: { type: 'object' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Updated plan' }, 404: { $ref: '#/components/responses/NotFound' }, 409: { description: 'Name conflict' } },
      },
      delete: {
        tags: ['Billing – Admin'],
        summary: 'Deactivate a plan (blocked if active subscribers exist)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Deactivated' }, 404: { $ref: '#/components/responses/NotFound' }, 409: { description: 'Active subscribers attached' } },
      },
    },

    // ── Installer ───────────────────────────────────────────────────────────
    '/installer/token/generate': {
      post: {
        tags: ['Installer'],
        summary: 'Generate a one-time install token for the authenticated user\'s tenant',
        security: [{ bearerAuth: [] }],
        responses: {
          201: { description: 'Install token', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/InstallToken' } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/installer/token/validate': {
      post: {
        tags: ['Installer'],
        summary: 'Validate a token and provision the agent (called by install.sh)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['token'], properties: { token: { type: 'string', minLength: 32 } } } } },
        },
        responses: {
          200: {
            description: 'Agent provisioned',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        agent_token: { type: 'string' },
                        tenant_id:   { type: 'string', format: 'uuid' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Invalid token' },
          403: { description: 'Tenant suspended' },
          410: { description: 'Token used or expired' },
        },
      },
    },

    // ── Agent ───────────────────────────────────────────────────────────────
    '/agent/heartbeat': {
      post: {
        tags: ['Agent'],
        summary: 'Report agent liveness',
        security: [{ agentToken: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status:   { type: 'string', enum: ['online', 'offline', 'degraded'] },
                  uptime:   { type: 'integer', minimum: 0 },
                  hostname: { type: 'string' },
                  metadata: { type: 'object' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'last_seen timestamp' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/agent/commands': {
      get: {
        tags: ['Agent'],
        summary: 'Poll pending commands (marks them dispatched)',
        security: [{ agentToken: [] }],
        responses: {
          200: { description: 'Pending commands', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/Command' } } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/agent/result': {
      post: {
        tags: ['Agent'],
        summary: 'Submit command execution result',
        security: [{ agentToken: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['command_id', 'success'],
                properties: {
                  command_id: { type: 'string', format: 'uuid' },
                  success:    { type: 'boolean' },
                  output:     { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Updated command' }, 401: { $ref: '#/components/responses/Unauthorized' }, 404: { $ref: '#/components/responses/NotFound' } },
      },
    },

    // ── Commands ─────────────────────────────────────────────────────────────
    '/commands': {
      post: {
        tags: ['Commands'],
        summary: 'Issue a lifecycle command to a tenant agent (admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['tenant_id', 'type'],
                properties: {
                  tenant_id: { type: 'string', format: 'uuid' },
                  type:      { type: 'string', enum: ['suspend', 'resume', 'restart'] },
                  payload:   { type: 'object' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Command queued' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' } },
      },
    },
    '/commands/tenant/{tenant_id}': {
      get: {
        tags: ['Commands'],
        summary: 'List commands for a tenant (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'tenant_id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { $ref: '#/components/parameters/PageParam' },
          { $ref: '#/components/parameters/LimitParam' },
        ],
        responses: { 200: { description: 'Paginated commands' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
      },
    },
    '/commands/{id}': {
      get: {
        tags: ['Commands'],
        summary: 'Get a single command (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Command' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' } },
      },
    },
  },
};

module.exports = spec;
