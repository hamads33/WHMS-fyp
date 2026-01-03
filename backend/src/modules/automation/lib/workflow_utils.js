/**
 * Workflow Utilities
 * ------------------------------------------------------------------
 * Helper functions for workflow operations.
 *
 * Utilities:
 *  - Deep cloning
 *  - Object merging
 *  - Path resolution
 *  - Timing utilities
 */

/**
 * Deep clone an object (safe JSON clone)
 */
function deepClone(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (err) {
    throw new Error(`Failed to clone object: ${err.message}`);
  }
}

/**
 * Merge two objects deeply
 */
function deepMerge(target, source) {
  const result = deepClone(target);

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (typeof source[key] === "object" && source[key] !== null && !Array.isArray(source[key])) {
        result[key] = deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }

  return result;
}

/**
 * Get value from nested path
 * Example: getPath({ a: { b: { c: 1 } } }, "a.b.c") => 1
 */
function getPath(obj, path) {
  const parts = path.split(".");
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

/**
 * Set value at nested path
 * Example: setPath({ a: {} }, "a.b.c", 1) => { a: { b: { c: 1 } } }
 */
function setPath(obj, path, value) {
  const result = deepClone(obj);
  const parts = path.split(".");
  const lastPart = parts.pop();

  let current = result;
  for (const part of parts) {
    if (!(part in current)) {
      current[part] = {};
    }
    current = current[part];
  }

  current[lastPart] = value;
  return result;
}

/**
 * Check if object has all required properties
 */
function hasRequired(obj, requiredFields) {
  for (const field of requiredFields) {
    if (!(field in obj)) {
      return false;
    }
  }
  return true;
}

/**
 * Convert milliseconds to human-readable duration
 * Example: formatDuration(65000) => "1m 5s"
 */
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;
    return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
  }

  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  return `${seconds}s`;
}

/**
 * Calculate backoff delay
 */
function calculateBackoff(attempt, baseDelay, maxDelay, backoff = "linear") {
  if (backoff === "exponential") {
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    return Math.min(exponentialDelay, maxDelay);
  }

  // linear
  return Math.min(baseDelay * (attempt + 1), maxDelay);
}

/**
 * Check if value is empty (null, undefined, empty string, empty object)
 */
function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

/**
 * Sanitize workflow definition for logging (remove sensitive data)
 */
function sanitizeWorkflow(workflow) {
  const sanitized = deepClone(workflow);

  // Remove sensitive input data
  if (sanitized.input && typeof sanitized.input === "object") {
    for (const key in sanitized.input) {
      if (key.toLowerCase().includes("password") || 
          key.toLowerCase().includes("token") ||
          key.toLowerCase().includes("secret")) {
        sanitized.input[key] = "***REDACTED***";
      }
    }
  }

  return sanitized;
}

/**
 * Generate workflow execution ID
 */
function generateRunId() {
  return `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate task ID
 */
function generateTaskId() {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get execution status badge
 */
function getStatusBadge(status) {
  const badges = {
    success: "✅",
    failed: "❌",
    running: "⏳",
    pending: "⏱️",
    cancelled: "⛔",
    paused: "⏸️",
    skipped: "⏭️"
  };

  return badges[status] || "❓";
}

/**
 * Format execution summary
 */
function formatExecutionSummary(run) {
  const duration = run.totalDuration ? formatDuration(run.totalDuration) : "N/A";
  const status = getStatusBadge(run.status);

  return {
    id: run.id,
    status: `${status} ${run.status}`,
    duration,
    tasks: {
      total: run.taskCount,
      success: run.successCount,
      failed: run.failureCount,
      skipped: run.skippedCount
    },
    startedAt: run.startedAt?.toISOString() || "Not started",
    finishedAt: run.finishedAt?.toISOString() || "In progress"
  };
}

/**
 * Validate workflow structure
 */
function validateWorkflowStructure(definition) {
  const errors = [];

  if (!definition.name) {
    errors.push("Workflow must have a name");
  }

  if (!Array.isArray(definition.tasks) || definition.tasks.length === 0) {
    errors.push("Workflow must have at least one task");
  }

  // Check task IDs are unique
  if (Array.isArray(definition.tasks)) {
    const taskIds = new Set();
    definition.tasks.forEach(task => {
      if (taskIds.has(task.id)) {
        errors.push(`Duplicate task ID: ${task.id}`);
      }
      taskIds.add(task.id);
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  deepClone,
  deepMerge,
  getPath,
  setPath,
  hasRequired,
  formatDuration,
  calculateBackoff,
  isEmpty,
  sanitizeWorkflow,
  generateRunId,
  generateTaskId,
  getStatusBadge,
  formatExecutionSummary,
  validateWorkflowStructure
};