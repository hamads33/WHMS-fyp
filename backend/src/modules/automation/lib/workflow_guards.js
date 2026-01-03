/**
 * Workflow Guards & Middleware
 * ------------------------------------------------------------------
 * Authorization and permission checks for workflow operations.
 *
 * Guards:
 *  - Workflow ownership verification
 *  - Profile access check
 *  - Execution permission check
 */

const { NotFoundError, ForbiddenError } = require("../lib/errors");

/**
 * Verify workflow exists and belongs to profile
 */
async function verifyWorkflowOwnership(req, res, next, prisma) {
  try {
    const workflowId = Number(req.params.workflowId);
    const profileId = req.params.profileId ? Number(req.params.profileId) : null;

    const workflow = await prisma.automationWorkflow.findUnique({
      where: { id: workflowId },
      select: { id: true, profileId: true }
    });

    if (!workflow) {
      throw new NotFoundError("Workflow not found");
    }

    // If profileId provided, verify it matches
    if (profileId && workflow.profileId !== profileId) {
      throw new ForbiddenError("Workflow does not belong to this profile");
    }

    // Attach to request for use in controller
    req.workflow = workflow;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Verify profile exists
 */
async function verifyProfileExists(req, res, next, prisma) {
  try {
    const profileId = Number(req.params.profileId);

    const profile = await prisma.automationProfile.findUnique({
      where: { id: profileId },
      select: { id: true, name: true }
    });

    if (!profile) {
      throw new NotFoundError("Profile not found");
    }

    req.profile = profile;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Check if workflow is enabled
 */
async function checkWorkflowEnabled(req, res, next, prisma) {
  try {
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

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Check if execution is already in progress
 */
async function checkNoExecutionInProgress(req, res, next, prisma) {
  try {
    const workflowId = Number(req.params.workflowId);

    const runningCount = await prisma.workflowRun.count({
      where: {
        workflowId,
        status: "running"
      }
    });

    if (runningCount > 0) {
      throw new ForbiddenError("Workflow already executing");
    }

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Rate limit workflow executions
 */
function rateLimit(maxPerMinute = 10) {
  const executions = new Map();

  return (req, res, next) => {
    const workflowId = Number(req.params.workflowId);
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const key = `${workflowId}:${minute}`;

    if (!executions.has(key)) {
      executions.set(key, 0);
    }

    const count = executions.get(key);

    if (count >= maxPerMinute) {
      return res.fail(
        `Rate limit exceeded. Max ${maxPerMinute} executions per minute`,
        429,
        "rate_limit_exceeded"
      );
    }

    executions.set(key, count + 1);

    // Clean old entries
    if (executions.size > 1000) {
      executions.clear();
    }

    next();
  };
}

/**
 * Validate workflow can be modified
 */
async function checkCanModifyWorkflow(req, res, next, prisma) {
  try {
    const workflowId = Number(req.params.workflowId);

    // Check if workflow has running executions
    const runningCount = await prisma.workflowRun.count({
      where: {
        workflowId,
        status: "running"
      }
    });

    if (runningCount > 0) {
      throw new ForbiddenError("Cannot modify workflow while it's executing");
    }

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Validate workflow definition is valid JSON
 */
function validateDefinitionJson(req, res, next) {
  try {
    const { definition } = req.body;

    if (!definition) {
      return res.fail("Definition is required", 400);
    }

    // Check if it's valid JSON-serializable object
    try {
      JSON.stringify(definition);
    } catch (err) {
      return res.fail("Definition must be valid JSON", 400);
    }

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Create guard middleware factory
 */
function createGuards(prisma) {
  return {
    verifyWorkflowOwnership: (req, res, next) => verifyWorkflowOwnership(req, res, next, prisma),
    verifyProfileExists: (req, res, next) => verifyProfileExists(req, res, next, prisma),
    checkWorkflowEnabled: (req, res, next) => checkWorkflowEnabled(req, res, next, prisma),
    checkNoExecutionInProgress: (req, res, next) => checkNoExecutionInProgress(req, res, next, prisma),
    checkCanModifyWorkflow: (req, res, next) => checkCanModifyWorkflow(req, res, next, prisma)
  };
}

module.exports = {
  verifyWorkflowOwnership,
  verifyProfileExists,
  checkWorkflowEnabled,
  checkNoExecutionInProgress,
  checkCanModifyWorkflow,
  validateDefinitionJson,
  rateLimit,
  createGuards
};