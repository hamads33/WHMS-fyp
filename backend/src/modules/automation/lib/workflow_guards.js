/**
 * Workflow Guards & Middleware
 * ------------------------------------------------------------------
 * Authorization and permission checks for workflow operations.
 *
 * IMPORTANT:
 * - Only middleware returned from createGuards() should be used in routes
 * - Low-level helpers are kept PRIVATE to avoid Express misuse
 */

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "NotFoundError";
    this.code = "workflow_not_found";
  }
}

class ForbiddenError extends Error {
  constructor(message) {
    super(message);
    this.name = "ForbiddenError";
    this.code = "workflow_forbidden";
  }
}

// ============================================================
// INTERNAL HELPERS (NOT EXPRESS MIDDLEWARE)
// ============================================================

async function _verifyWorkflowExists(prisma, req) {
  const workflowId = Number(req.params.workflowId);

  const workflow = await prisma.automationWorkflow.findUnique({
    where: { id: workflowId },
    select: { id: true }
  });

  if (!workflow) {
    throw new NotFoundError("Workflow not found");
  }

  req.workflow = workflow;
}

async function _checkWorkflowEnabled(prisma, req) {
  const workflowId = Number(req.params.workflowId);

  const workflow = await prisma.automationWorkflow.findUnique({
    where: { id: workflowId },
    select: { enabled: true }
  });

  if (!workflow) {
    throw new NotFoundError("Workflow not found");
  }

  if (!workflow.enabled) {
    throw new ForbiddenError("Workflow is disabled");
  }
}

async function _checkNoExecutionInProgress(prisma, req) {
  const workflowId = Number(req.params.workflowId);

  const runningCount = await prisma.workflowRun.count({
    where: { workflowId, status: "running" }
  });

  if (runningCount > 0) {
    throw new ForbiddenError("Workflow already executing");
  }
}

async function _checkCanModifyWorkflow(prisma, req) {
  const workflowId = Number(req.params.workflowId);

  const runningCount = await prisma.workflowRun.count({
    where: { workflowId, status: "running" }
  });

  if (runningCount > 0) {
    throw new ForbiddenError("Cannot modify workflow while it's executing");
  }
}

// ============================================================
// FACTORY - THIS IS WHAT ROUTES MUST USE
// ============================================================

function createGuards(prisma) {
  return {
    verifyWorkflowExists: async (req, res, next) => {
      try {
        await _verifyWorkflowExists(prisma, req);
        next();
      } catch (err) {
        next(err);
      }
    },

    checkWorkflowEnabled: async (req, res, next) => {
      try {
        await _checkWorkflowEnabled(prisma, req);
        next();
      } catch (err) {
        next(err);
      }
    },

    checkNoExecutionInProgress: async (req, res, next) => {
      try {
        await _checkNoExecutionInProgress(prisma, req);
        next();
      } catch (err) {
        next(err);
      }
    },

    checkCanModifyWorkflow: async (req, res, next) => {
      try {
        await _checkCanModifyWorkflow(prisma, req);
        next();
      } catch (err) {
        next(err);
      }
    },

    rateLimitDatabase: (maxPerMinute = 10) => {
      return async (req, res, next) => {
        try {
          const workflowId = Number(req.params.workflowId);
          const oneMinuteAgo = new Date(Date.now() - 60_000);

          const count = await prisma.workflowRun.count({
            where: {
              workflowId,
              createdAt: { gte: oneMinuteAgo }
            }
          });

          if (count >= maxPerMinute) {
            return res.fail(
              `Rate limit exceeded. Max ${maxPerMinute} executions per minute`,
              429,
              "rate_limit_exceeded"
            );
          }

          next();
        } catch (err) {
          next(err);
        }
      };
    }
  };
}

// ============================================================
// EXPORTS (SAFE)
// ============================================================

module.exports = createGuards;
module.exports.NotFoundError = NotFoundError;
module.exports.ForbiddenError = ForbiddenError;