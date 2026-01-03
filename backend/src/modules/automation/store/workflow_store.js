/**
 * Workflow Store
 * ------------------------------------------------------------------
 * Data access layer for workflow operations.
 *
 * Responsibilities:
 *  - CRUD operations for workflows
 *  - Fetch with relations
 *  - Bulk operations
 *
 * Why separate store?
 *  - Keep business logic out of controllers
 *  - Reusable across services
 *  - Easy to test
 *  - Easy to swap implementations
 */

class WorkflowStore {
  constructor({ prisma, logger }) {
    this.prisma = prisma;
    this.logger = logger;
  }

  // ============================================================
  // CREATE
  // ============================================================

  async create(profileId, data) {
    return this.prisma.automationWorkflow.create({
      data: {
        profileId,
        name: data.name,
        description: data.description,
        definition: data.definition,
        enabled: data.enabled !== false,
        version: 1
      }
    });
  }

  // ============================================================
  // READ
  // ============================================================

  async getById(id) {
    return this.prisma.automationWorkflow.findUnique({
      where: { id },
      include: {
        profile: true,
        runs: {
          orderBy: { createdAt: "desc" },
          take: 10  // Latest 10 runs
        }
      }
    });
  }

  async getByIdSimple(id) {
    return this.prisma.automationWorkflow.findUnique({
      where: { id }
    });
  }

  async listForProfile(profileId, enabled = null) {
    const where = { profileId };
    if (enabled !== null) {
      where.enabled = enabled;
    }

    return this.prisma.automationWorkflow.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { runs: true }
        }
      }
    });
  }

  async listAll(enabled = null) {
    const where = {};
    if (enabled !== null) {
      where.enabled = enabled;
    }

    return this.prisma.automationWorkflow.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });
  }

  async listWithMeta() {
    return this.prisma.automationWorkflow.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        profile: {
          select: { id: true, name: true }
        },
        _count: {
          select: { runs: true }
        }
      }
    });
  }

  // ============================================================
  // UPDATE
  // ============================================================

  async update(id, data) {
    const { name, description, definition, enabled } = data;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (definition !== undefined) {
      updates.definition = definition;
      updates.version = { increment: 1 };  // Increment version on definition change
    }
    if (enabled !== undefined) updates.enabled = enabled;

    return this.prisma.automationWorkflow.update({
      where: { id },
      data: updates
    });
  }

  async setEnabled(id, enabled) {
    return this.prisma.automationWorkflow.update({
      where: { id },
      data: { enabled }
    });
  }

  // ============================================================
  // DELETE
  // ============================================================

  async delete(id) {
    return this.prisma.automationWorkflow.delete({
      where: { id }
    });
  }

  async deleteForProfile(profileId) {
    return this.prisma.automationWorkflow.deleteMany({
      where: { profileId }
    });
  }

  // ============================================================
  // RUNS (Execution History)
  // ============================================================

  async createRun(workflowId, profileId, data = {}) {
    return this.prisma.workflowRun.create({
      data: {
        workflowId,
        profileId,
        status: data.status || "pending",
        triggeredBy: data.triggeredBy || "manual",
        input: data.input || {},
        startedAt: data.startedAt,
        finishedAt: data.finishedAt
      }
    });
  }

  async getRun(runId) {
    return this.prisma.workflowRun.findUnique({
      where: { id: runId },
      include: {
        workflow: true,
        taskRuns: {
          orderBy: { createdAt: "asc" }
        }
      }
    });
  }

  async updateRun(runId, data) {
    const updates = {};
    if (data.status !== undefined) updates.status = data.status;
    if (data.output !== undefined) updates.output = data.output;
    if (data.errorMessage !== undefined) updates.errorMessage = data.errorMessage;
    if (data.totalDuration !== undefined) updates.totalDuration = data.totalDuration;
    if (data.finishedAt !== undefined) updates.finishedAt = data.finishedAt;
    if (data.successCount !== undefined) updates.successCount = data.successCount;
    if (data.failureCount !== undefined) updates.failureCount = data.failureCount;

    return this.prisma.workflowRun.update({
      where: { id: runId },
      data: updates
    });
  }

  async listRuns(workflowId, limit = 20, offset = 0) {
    return this.prisma.workflowRun.findMany({
      where: { workflowId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        taskRuns: {
          orderBy: { createdAt: "asc" }
        }
      }
    });
  }

  async countRuns(workflowId) {
    return this.prisma.workflowRun.count({
      where: { workflowId }
    });
  }

  // ============================================================
  // TASK RUNS (Execution Details)
  // ============================================================

  async createTaskRun(runId, taskId, data = {}) {
    return this.prisma.workflowTaskRun.create({
      data: {
        runId,
        taskId,
        status: data.status || "pending",
        retryCount: data.retryCount || 0,
        maxRetries: data.maxRetries || 0,
        startedAt: data.startedAt,
        finishedAt: data.finishedAt,
        duration: data.duration,
        output: data.output,
        errorMessage: data.errorMessage,
        errorStack: data.errorStack,
        conditionResult: data.conditionResult,
        selectedPath: data.selectedPath
      }
    });
  }

  async updateTaskRun(taskRunId, data) {
    const updates = {};
    if (data.status !== undefined) updates.status = data.status;
    if (data.output !== undefined) updates.output = data.output;
    if (data.errorMessage !== undefined) updates.errorMessage = data.errorMessage;
    if (data.duration !== undefined) updates.duration = data.duration;
    if (data.finishedAt !== undefined) updates.finishedAt = data.finishedAt;
    if (data.retryCount !== undefined) updates.retryCount = data.retryCount;
    if (data.nextRetryAt !== undefined) updates.nextRetryAt = data.nextRetryAt;

    return this.prisma.workflowTaskRun.update({
      where: { id: taskRunId },
      data: updates
    });
  }

  // ============================================================
  // METRICS
  // ============================================================

  async getMetrics(workflowId) {
    const runs = await this.prisma.workflowRun.findMany({
      where: { workflowId }
    });

    if (runs.length === 0) {
      return {
        totalRuns: 0,
        successCount: 0,
        failureCount: 0,
        successRate: 0,
        avgDuration: 0,
        status: "no_data"
      };
    }

    const successful = runs.filter(r => r.status === "success");
    const failed = runs.filter(r => r.status === "failed");
    const totalDuration = runs.reduce((sum, r) => sum + (r.totalDuration || 0), 0);

    return {
      totalRuns: runs.length,
      successCount: successful.length,
      failureCount: failed.length,
      successRate: (successful.length / runs.length * 100).toFixed(2),
      avgDuration: Math.round(totalDuration / runs.length),
      minDuration: Math.min(...runs.map(r => r.totalDuration || 0)),
      maxDuration: Math.max(...runs.map(r => r.totalDuration || 0)),
      lastRun: runs[0]?.createdAt,
      status: successful.length > failed.length ? "healthy" : "degraded"
    };
  }

  async getRecentMetrics(workflowId, days = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const runs = await this.prisma.workflowRun.findMany({
      where: {
        workflowId,
        createdAt: { gte: since }
      }
    });

    return {
      period: `${days} days`,
      totalRuns: runs.length,
      successCount: runs.filter(r => r.status === "success").length,
      failureCount: runs.filter(r => r.status === "failed").length,
      avgDuration: runs.length > 0 
        ? Math.round(runs.reduce((sum, r) => sum + (r.totalDuration || 0), 0) / runs.length)
        : 0
    };
  }
}

module.exports = WorkflowStore;