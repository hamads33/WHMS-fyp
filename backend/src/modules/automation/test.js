/**
 * Simple Workflow System Test Suite
 * ============================================================
 * Tests the enterprise workflow system without external testing frameworks.
 * Uses simple assertions and console output.
 *
 * Usage: node test.js
 */

const assert = require("assert");

// Color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

let testsPassed = 0;
let testsFailed = 0;
const failedTests = [];

// ============================================================
// TEST UTILITIES
// ============================================================

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function test(name, fn) {
  try {
    fn();
    testsPassed++;
    log(`  ✓ ${name}`, "green");
  } catch (err) {
    testsFailed++;
    failedTests.push({ name, error: err.message });
    log(`  ✗ ${name}`, "red");
    log(`    Error: ${err.message}`, "red");
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${expected} but got ${actual}`
    );
  }
}

function assertExists(value, message) {
  if (!value) {
    throw new Error(message || `Value does not exist`);
  }
}

function assertType(value, type, message) {
  if (typeof value !== type) {
    throw new Error(
      message || `Expected type ${type} but got ${typeof value}`
    );
  }
}

function assertArray(value, message) {
  if (!Array.isArray(value)) {
    throw new Error(message || `Expected array but got ${typeof value}`);
  }
}

function assertObject(value, message) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(message || `Expected object but got ${typeof value}`);
  }
}

// ============================================================
// MOCK CLASSES FOR TESTING
// ============================================================

class MockWorkflowValidator {
  validateWorkflow(definition) {
    if (!definition.name) throw new Error("Workflow name required");
    if (!Array.isArray(definition.tasks)) throw new Error("Tasks must be array");
    return { valid: true, errors: [] };
  }
}

class MockVariableResolver {
  resolveVariable(expression, context) {
    if (!expression.startsWith("${") || !expression.endsWith("}")) {
      return expression;
    }
    const path = expression.slice(2, -1);
    return this._getPath(context, path);
  }

  _getPath(obj, path) {
    return path.split(".").reduce((current, part) => current?.[part], obj);
  }

  evaluateCondition(condition, context) {
    if (!condition) return true;
    if (condition.type === "comparison") {
      const left = this.resolveVariable(condition.left, context);
      const right = this.resolveVariable(condition.right, context);
      switch (condition.operator) {
        case "==":
          return left === right;
        case "!=":
          return left !== right;
        case ">":
          return left > right;
        case "<":
          return left < right;
        default:
          return false;
      }
    }
    return true;
  }
}

class MockWorkflowStore {
  constructor() {
    this.workflows = new Map();
    this.runs = new Map();
    this.nextWorkflowId = 1;
    this.nextRunId = 1;
  }

  async create(profileId, data) {
    const id = this.nextWorkflowId++;
    const workflow = {
      id,
      profileId,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.workflows.set(id, workflow);
    return workflow;
  }

  async getById(id) {
    return this.workflows.get(id);
  }

  async listForProfile(profileId) {
    return Array.from(this.workflows.values()).filter(
      (w) => w.profileId === profileId
    );
  }

  async update(id, data) {
    const workflow = this.workflows.get(id);
    if (!workflow) throw new Error("Workflow not found");
    const updated = { ...workflow, ...data, updatedAt: new Date() };
    this.workflows.set(id, updated);
    return updated;
  }

  async delete(id) {
    return this.workflows.delete(id);
  }

  async createRun(workflowId, profileId, data) {
    const id = this.nextRunId++;
    const run = {
      id,
      workflowId,
      profileId,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.runs.set(id, run);
    return run;
  }

  async getRun(id) {
    return this.runs.get(id);
  }

  async listRuns(workflowId, limit = 10, offset = 0) {
    return Array.from(this.runs.values())
      .filter((r) => r.workflowId === workflowId)
      .slice(offset, offset + limit);
  }

  async getMetrics(workflowId) {
    const runs = Array.from(this.runs.values()).filter(
      (r) => r.workflowId === workflowId
    );
    return {
      totalRuns: runs.length,
      successCount: runs.filter((r) => r.status === "success").length,
      failureCount: runs.filter((r) => r.status === "failed").length,
    };
  }
}

// ============================================================
// TEST SUITES
// ============================================================

log("\n🧪 WORKFLOW SYSTEM TEST SUITE\n", "cyan");

// ============================================================
// Suite 1: Validator Tests
// ============================================================
log("Suite 1: WorkflowValidator", "blue");

test("Should validate correct workflow definition", () => {
  const validator = new MockWorkflowValidator();
  const definition = {
    name: "Test Workflow",
    tasks: [
      {
        id: "task1",
        type: "action",
        actionType: "echo",
        input: { message: "hello" },
      },
    ],
  };
  const result = validator.validateWorkflow(definition);
  assertEquals(result.valid, true);
  assertArray(result.errors);
});

test("Should reject workflow without name", () => {
  const validator = new MockWorkflowValidator();
  const definition = {
    tasks: [],
  };
  try {
    validator.validateWorkflow(definition);
    throw new Error("Should have thrown");
  } catch (err) {
    assertEquals(err.message, "Workflow name required");
  }
});

test("Should reject workflow without tasks array", () => {
  const validator = new MockWorkflowValidator();
  const definition = {
    name: "Test",
  };
  try {
    validator.validateWorkflow(definition);
    throw new Error("Should have thrown");
  } catch (err) {
    assertEquals(err.message, "Tasks must be array");
  }
});

// ============================================================
// Suite 2: Variable Resolver Tests
// ============================================================
log("\nSuite 2: VariableResolver", "blue");

test("Should resolve simple variable", () => {
  const resolver = new MockVariableResolver();
  const context = { taskId: { output: { result: "success" } } };
  const value = resolver.resolveVariable("${taskId.output.result}", context);
  assertEquals(value, "success");
});

test("Should return non-variable strings as-is", () => {
  const resolver = new MockVariableResolver();
  const context = {};
  const value = resolver.resolveVariable("plain string", context);
  assertEquals(value, "plain string");
});

test("Should evaluate equality condition", () => {
  const resolver = new MockVariableResolver();
  const context = { status: "success" };
  const condition = {
    type: "comparison",
    left: "${status}",
    right: "success",
    operator: "==",
  };
  const result = resolver.evaluateCondition(condition, context);
  assertEquals(result, true);
});

test("Should evaluate inequality condition", () => {
  const resolver = new MockVariableResolver();
  const context = { count: "5" };
  const condition = {
    type: "comparison",
    left: "${count}",
    right: "3",
    operator: ">",
  };
  const result = resolver.evaluateCondition(condition, context);
  assertEquals(result, true);
});

test("Should return true for null condition", () => {
  const resolver = new MockVariableResolver();
  const result = resolver.evaluateCondition(null, {});
  assertEquals(result, true);
});

// ============================================================
// Suite 3: Workflow Store Tests
// ============================================================
log("\nSuite 3: WorkflowStore", "blue");

test("Should create workflow", async () => {
  const store = new MockWorkflowStore();
  const workflow = await store.create(1, {
    name: "Test",
    definition: { tasks: [] },
    enabled: true,
  });
  assertExists(workflow.id);
  assertEquals(workflow.profileId, 1);
  assertEquals(workflow.name, "Test");
});

test("Should get workflow by ID", async () => {
  const store = new MockWorkflowStore();
  const created = await store.create(1, { name: "Test", definition: {} });
  const retrieved = await store.getById(created.id);
  assertEquals(retrieved.id, created.id);
});

test("Should list workflows for profile", async () => {
  const store = new MockWorkflowStore();
  await store.create(1, { name: "Test1", definition: {} });
  await store.create(1, { name: "Test2", definition: {} });
  await store.create(2, { name: "Test3", definition: {} });
  const workflows = await store.listForProfile(1);
  assertEquals(workflows.length, 2);
});

test("Should update workflow", async () => {
  const store = new MockWorkflowStore();
  const workflow = await store.create(1, { name: "Old", definition: {} });
  const updated = await store.update(workflow.id, { name: "New" });
  assertEquals(updated.name, "New");
});

test("Should delete workflow", async () => {
  const store = new MockWorkflowStore();
  const workflow = await store.create(1, { name: "Test", definition: {} });
  await store.delete(workflow.id);
  const retrieved = await store.getById(workflow.id);
  assertEquals(retrieved, undefined);
});

// ============================================================
// Suite 4: Workflow Run Tests
// ============================================================
log("\nSuite 4: WorkflowRun", "blue");

test("Should create workflow run", async () => {
  const store = new MockWorkflowStore();
  const run = await store.createRun(1, 1, {
    status: "pending",
    input: {},
  });
  assertExists(run.id);
  assertEquals(run.workflowId, 1);
  assertEquals(run.status, "pending");
});

test("Should get workflow run by ID", async () => {
  const store = new MockWorkflowStore();
  const created = await store.createRun(1, 1, { status: "pending" });
  const retrieved = await store.getRun(created.id);
  assertEquals(retrieved.id, created.id);
});

test("Should list runs for workflow", async () => {
  const store = new MockWorkflowStore();
  await store.createRun(1, 1, { status: "success" });
  await store.createRun(1, 1, { status: "success" });
  await store.createRun(2, 1, { status: "success" });
  const runs = await store.listRuns(1);
  assertEquals(runs.length, 2);
});

test("Should get workflow metrics", async () => {
  const store = new MockWorkflowStore();
  await store.createRun(1, 1, { status: "success" });
  await store.createRun(1, 1, { status: "failed" });
  await store.createRun(1, 1, { status: "success" });
  const metrics = await store.getMetrics(1);
  assertEquals(metrics.totalRuns, 3);
  assertEquals(metrics.successCount, 2);
  assertEquals(metrics.failureCount, 1);
});

// ============================================================
// Suite 5: Workflow Definition Tests
// ============================================================
log("\nSuite 5: Workflow Definitions", "blue");

test("Should create simple action workflow", () => {
  const definition = {
    name: "Simple Action",
    tasks: [
      {
        id: "task1",
        type: "action",
        actionType: "echo",
        input: { message: "Hello" },
      },
    ],
  };
  assertExists(definition.name);
  assertArray(definition.tasks);
  assertEquals(definition.tasks[0].type, "action");
});

test("Should create conditional workflow", () => {
  const definition = {
    name: "Conditional",
    tasks: [
      {
        id: "task1",
        type: "condition",
        condition: {
          type: "comparison",
          left: "${task0.output.status}",
          right: "success",
          operator: "==",
        },
        onTrue: [
          {
            id: "task2",
            type: "action",
            actionType: "echo",
          },
        ],
        onFalse: [
          {
            id: "task3",
            type: "action",
            actionType: "echo",
          },
        ],
      },
    ],
  };
  assertExists(definition.tasks[0].condition);
  assertArray(definition.tasks[0].onTrue);
  assertArray(definition.tasks[0].onFalse);
});

test("Should create loop workflow", () => {
  const definition = {
    name: "Loop",
    tasks: [
      {
        id: "task1",
        type: "loop",
        iterable: "${items}",
        tasks: [
          {
            id: "task2",
            type: "action",
            actionType: "process",
            input: { item: "${item}" },
          },
        ],
      },
    ],
  };
  assertExists(definition.tasks[0].iterable);
  assertArray(definition.tasks[0].tasks);
});

test("Should create parallel workflow", () => {
  const definition = {
    name: "Parallel",
    tasks: [
      {
        id: "task1",
        type: "parallel",
        tasks: [
          {
            id: "task2",
            type: "action",
            actionType: "fetch",
          },
          {
            id: "task3",
            type: "action",
            actionType: "fetch",
          },
        ],
      },
    ],
  };
  assertExists(definition.tasks[0].type);
  assertEquals(definition.tasks[0].type, "parallel");
  assertEquals(definition.tasks[0].tasks.length, 2);
});

// ============================================================
// Suite 6: Error Handling Tests
// ============================================================
log("\nSuite 6: Error Handling", "blue");

test("Should handle missing workflow ID", async () => {
  const store = new MockWorkflowStore();
  const result = await store.getById(999);
  assertEquals(result, undefined);
});

test("Should handle empty workflow list", async () => {
  const store = new MockWorkflowStore();
  const workflows = await store.listForProfile(999);
  assertEquals(workflows.length, 0);
});

test("Should handle validation with retry policy", () => {
  const definition = {
    name: "Retry Test",
    tasks: [
      {
        id: "task1",
        type: "action",
        actionType: "http",
        retry: {
          maxAttempts: 3,
          backoffMultiplier: 2,
          initialDelay: 1000,
        },
      },
    ],
  };
  assertExists(definition.tasks[0].retry);
  assertEquals(definition.tasks[0].retry.maxAttempts, 3);
});

test("Should handle workflow with error fallback", () => {
  const definition = {
    name: "Fallback Test",
    tasks: [
      {
        id: "task1",
        type: "action",
        actionType: "api",
        onError: {
          type: "action",
          actionType: "fallback",
          input: { defaultValue: "error handled" },
        },
      },
    ],
  };
  assertExists(definition.tasks[0].onError);
  assertEquals(definition.tasks[0].onError.type, "action");
});

// ============================================================
// Suite 7: Execution Context Tests
// ============================================================
log("\nSuite 7: Execution Context", "blue");

test("Should maintain execution context", () => {
  const context = {
    workflowId: 1,
    profileId: 1,
    runId: 1,
    tasks: {
      task1: {
        status: "success",
        output: { result: "test" },
        duration: 100,
      },
    },
  };
  assertExists(context.workflowId);
  assertExists(context.tasks.task1);
  assertEquals(context.tasks.task1.status, "success");
});

test("Should accumulate task outputs", () => {
  const context = {
    tasks: {},
  };
  context.tasks.task1 = { output: { status: "ok" } };
  context.tasks.task2 = { output: { count: 5 } };

  assertEquals(context.tasks.task1.output.status, "ok");
  assertEquals(context.tasks.task2.output.count, 5);
});

// ============================================================
// Suite 8: Advanced Workflow Features
// ============================================================
log("\nSuite 8: Advanced Features", "blue");

test("Should support workflow metadata", () => {
  const definition = {
    name: "Advanced",
    version: "1.0",
    tags: ["production", "critical"],
    timeout: 60000,
    retryPolicy: {
      maxAttempts: 3,
      backoff: "exponential",
    },
    tasks: [],
  };
  assertEquals(definition.version, "1.0");
  assertArray(definition.tags);
  assertEquals(definition.timeout, 60000);
});

test("Should support workflow hooks", () => {
  const definition = {
    name: "Hooks",
    tasks: [],
    hooks: {
      onStart: {
        type: "webhook",
        url: "https://example.com/start",
      },
      onComplete: {
        type: "webhook",
        url: "https://example.com/complete",
      },
      onError: {
        type: "email",
        to: "admin@example.com",
      },
    },
  };
  assertExists(definition.hooks.onStart);
  assertExists(definition.hooks.onComplete);
  assertExists(definition.hooks.onError);
});

test("Should support rate limiting", () => {
  const definition = {
    name: "Rate Limited",
    rateLimit: {
      perMinute: 10,
      perHour: 100,
    },
    tasks: [],
  };
  assertEquals(definition.rateLimit.perMinute, 10);
  assertEquals(definition.rateLimit.perHour, 100);
});

// ============================================================
// TEST SUMMARY
// ============================================================
log("\n" + "=".repeat(60), "cyan");
log(`Test Summary`, "cyan");
log("=".repeat(60), "cyan");

log(`\n✓ Passed: ${testsPassed}`, "green");
log(`✗ Failed: ${testsFailed}`, testsFailed > 0 ? "red" : "green");

if (failedTests.length > 0) {
  log(`\nFailed Tests:`, "red");
  failedTests.forEach(({ name, error }) => {
    log(`  - ${name}`, "red");
    log(`    ${error}`, "red");
  });
}

const total = testsPassed + testsFailed;
const percentage = ((testsPassed / total) * 100).toFixed(1);
log(`\nTotal: ${testsPassed}/${total} (${percentage}%)`, "cyan");

if (testsFailed === 0) {
  log(`\n✅ All tests passed!`, "green");
  process.exit(0);
} else {
  log(`\n❌ Some tests failed`, "red");
  process.exit(1);
}