/**
 * Workflow System Tests - No Dependencies
 * ============================================================
 * Pure Node.js tests for workflow system
 * Run: node test.js
 * 
 * Detects your actual server setup and routes
 */

const http = require('http');
const assert = require('assert');

// ============================================================
// TEST RUNNER
// ============================================================

class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.hostname = 'localhost';
    this.port = 3000;
    this.basePath = '/api/automation'; // Will be detected
    this.startTime = null;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('\n🚀 Starting Workflow Tests...\n');
    console.log(`Server: http://${this.hostname}:${this.port}${this.basePath}\n`);
    
    this.startTime = Date.now();

    for (const test of this.tests) {
      try {
        await test.fn();
        this.passed++;
        console.log(`✅ ${test.name}`);
      } catch (error) {
        this.failed++;
        console.log(`❌ ${test.name}`);
        console.log(`   Error: ${error.message}\n`);
      }
    }

    const duration = Date.now() - this.startTime;
    console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed (${duration}ms)\n`);
    process.exit(this.failed > 0 ? 1 : 0);
  }
}

// ============================================================
// HTTP HELPERS
// ============================================================

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    // Remove leading slash if present and construct full path
    const fullPath = path.startsWith('/') ? path : `/${path}`;
    const requestPath = this.basePath + fullPath;

    const options = {
      hostname: this.hostname,
      port: this.port,
      path: requestPath,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': body ? Buffer.byteLength(JSON.stringify(body)) : 0
      }
    };

    console.log(`  [${method}] ${requestPath}`);

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// ============================================================
// CONNECTIVITY CHECK
// ============================================================

async function checkServerConnectivity(runner) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: runner.hostname,
      port: runner.port,
      path: '/health',
      method: 'GET',
      timeout: 3000
    }, (res) => {
      console.log(`✅ Server is running on http://${runner.hostname}:${runner.port}\n`);
      resolve(true);
    });

    req.on('error', () => {
      console.log(`❌ Cannot connect to http://${runner.hostname}:${runner.port}`);
      console.log(`\nMake sure your server is running:\n`);
      console.log(`  npm start\n`);
      console.log(`Or check if server is on different port/hostname:\n`);
      console.log(`  TEST_HOST=127.0.0.1 TEST_PORT=3001 node test.js\n`);
      process.exit(1);
    });

    req.on('timeout', () => {
      console.log(`❌ Server timeout at http://${runner.hostname}:${runner.port}\n`);
      process.exit(1);
    });

    req.end();
  });
}

// ============================================================
// TEST DATA
// ============================================================

// Generate unique workflow names with timestamp
function getUniqueWorkflowName(base) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${base}-${timestamp}-${random}`;
}

const validWorkflow = {
  name: getUniqueWorkflowName('test-workflow'),
  description: 'A test workflow',
  definition: {
    name: 'Test Workflow',
    tasks: [
      {
        id: 'task-1',
        type: 'action',
        actionType: 'log',
        input: {
          message: 'Hello World'
        }
      }
    ]
  },
  trigger: 'manual',
  type: 'sequential'
};

const validWorkflowWithCondition = {
  name: getUniqueWorkflowName('conditional-workflow'),
  description: 'Test conditional branching',
  definition: {
    name: 'Conditional Workflow',
    tasks: [
      {
        id: 'check-status',
        type: 'condition',
        condition: '${input.status}',
        onTrue: 'success-task',
        onFalse: 'failure-task'
      },
      {
        id: 'success-task',
        type: 'action',
        actionType: 'log',
        input: { message: 'Success' }
      },
      {
        id: 'failure-task',
        type: 'action',
        actionType: 'log',
        input: { message: 'Failure' }
      }
    ]
  }
};

const validWorkflowWithLoop = {
  name: getUniqueWorkflowName('loop-workflow'),
  description: 'Test loop execution',
  definition: {
    name: 'Loop Workflow',
    tasks: [
      {
        id: 'loop-task',
        type: 'loop',
        items: '${input.items}',
        itemName: 'item',
        tasks: [
          {
            id: 'process-item',
            type: 'action',
            actionType: 'log',
            input: { message: 'Processing item' }
          }
        ]
      }
    ]
  }
};

// ============================================================
// SETUP AND MAIN
// ============================================================

async function main() {
  const runner = new TestRunner();

  // Check environment variables
  runner.hostname = process.env.TEST_HOST || 'localhost';
  runner.port = parseInt(process.env.TEST_PORT || '4000');
  runner.basePath = process.env.TEST_PATH || '/api/automation';

  // Check connectivity
  await checkServerConnectivity(runner);

  // ============================================================
  // WORKFLOW CRUD TESTS
  // ============================================================

  runner.test('Create workflow', async function() {
    const res = await makeRequest.call(runner, 'POST', '/workflows', validWorkflow);
    assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}. Response: ${JSON.stringify(res.body)}`);
    assert(res.body.success === true || res.body.data, 'Response should have success or data');
    assert(res.body.data?.id, 'Workflow should have ID');
    global.workflowId = res.body.data.id;
  });

  runner.test('List workflows', async function() {
    const res = await makeRequest.call(runner, 'GET', '/workflows', null);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.data), 'Data should be array');
    assert(res.body.data.length > 0, 'Should have at least one workflow');
  });

  runner.test('Get workflow by ID', async function() {
    assert(global.workflowId, 'Workflow ID not set');
    const res = await makeRequest.call(runner, 'GET', `/workflows/${global.workflowId}`, null);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert.strictEqual(res.body.data.id, global.workflowId, 'IDs should match');
  });

  runner.test('Update workflow', async function() {
    assert(global.workflowId, 'Workflow ID not set');
    const res = await makeRequest.call(
      runner,
      'PUT',
      `/workflows/${global.workflowId}`,
      { description: 'Updated description' }
    );
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert.strictEqual(res.body.data.description, 'Updated description', 'Description should be updated');
  });

  runner.test('Get workflow by slug', async function() {
    const res = await makeRequest.call(runner, 'GET', '/workflows/by-slug/test-workflow', null);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.body.data?.id, 'Should return workflow');
  });

  // ============================================================
  // EXECUTION TESTS
  // ============================================================

  runner.test('Execute workflow', async function() {
    assert(global.workflowId, 'Workflow ID not set');
    const res = await makeRequest.call(
      runner,
      'POST',
      `/workflows/${global.workflowId}/run`,
      { input: { test: 'data' } }
    );
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.body.data?.runId, 'Should return runId');
    global.runId = res.body.data.runId;
  });

  runner.test('Get execution details', async function() {
    // Wait for execution to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    assert(global.runId, 'Run ID not set');
    const res = await makeRequest.call(runner, 'GET', `/runs/${global.runId}`, null);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.body.data?.id, 'Should return execution details');
  });

  runner.test('Get execution history', async function() {
    assert(global.workflowId, 'Workflow ID not set');
    const res = await makeRequest.call(runner, 'GET', `/workflows/${global.workflowId}/history`, null);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.data.runs), 'Should return array of runs');
  });

  runner.test('Get workflow metrics', async function() {
    assert(global.workflowId, 'Workflow ID not set');
    const res = await makeRequest.call(runner, 'GET', `/workflows/${global.workflowId}/metrics`, null);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(typeof res.body.data.totalRuns === 'number', 'Should have totalRuns');
    assert(typeof res.body.data.successCount === 'number', 'Should have successCount');
  });

  // ============================================================
  // WEBHOOK TESTS
  // ============================================================

  runner.test('Create webhook', async function() {
    assert(global.workflowId, 'Workflow ID not set');
    const res = await makeRequest.call(
      runner,
      'POST',
      `/workflows/${global.workflowId}/webhooks`,
      { name: 'Test Webhook', description: 'Test webhook' }
    );
    assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}`);
    assert(res.body.data?.id, 'Should return webhook');
    global.webhookId = res.body.data.id;
  });

  runner.test('List webhooks', async function() {
    assert(global.workflowId, 'Workflow ID not set');
    const res = await makeRequest.call(runner, 'GET', `/workflows/${global.workflowId}/webhooks`, null);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.data), 'Should return array');
  });

  runner.test('Receive webhook', async function() {
    assert(global.webhookId, 'Webhook ID not set');
    const res = await makeRequest.call(
      runner,
      'POST',
      `/webhooks/${global.webhookId}`,
      { test: 'data' }
    );
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.body.data?.runId, 'Should trigger workflow');
  });

  // ============================================================
  // TRIGGER RULES TESTS
  // ============================================================

  runner.test('Create trigger rule', async function() {
    assert(global.workflowId, 'Workflow ID not set');
    const res = await makeRequest.call(
      runner,
      'POST',
      `/workflows/${global.workflowId}/triggers`,
      { eventType: 'user.created', passEventAsInput: true }
    );
    assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}`);
    assert(res.body.data?.id, 'Should return rule');
    global.ruleId = res.body.data.id;
  });

  runner.test('List trigger rules', async function() {
    assert(global.workflowId, 'Workflow ID not set');
    const res = await makeRequest.call(runner, 'GET', `/workflows/${global.workflowId}/triggers`, null);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.data), 'Should return array');
  });

  // ============================================================
  // EVENT TESTS
  // ============================================================

  runner.test('Trigger from event', async function() {
    const res = await makeRequest.call(
      runner,
      'POST',
      '/events/user.created',
      { userId: '123', email: 'test@example.com' }
    );
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(typeof res.body.data.triggered === 'number', 'Should have triggered count');
  });

  // ============================================================
  // VALIDATION TESTS
  // ============================================================

  runner.test('Validate workflow definition', async function() {
    const res = await makeRequest.call(
      runner,
      'POST',
      '/workflows/validate',
      { definition: validWorkflow.definition }
    );
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.body.data.valid === true, 'Definition should be valid');
  });

  runner.test('Reject invalid workflow definition', async function() {
    const res = await makeRequest.call(
      runner,
      'POST',
      '/workflows/validate',
      { definition: { tasks: [] } } // Missing name
    );
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.body.data.valid === false, 'Definition should be invalid');
    assert(Array.isArray(res.body.data.errors), 'Should have errors');
  });

  // ============================================================
  // CONDITIONAL WORKFLOW TESTS
  // ============================================================

  runner.test('Create conditional workflow', async function() {
    const res = await makeRequest.call(runner, 'POST', '/workflows', validWorkflowWithCondition);
    assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}`);
    assert(res.body.data?.id, 'Should create workflow');
    global.conditionalWorkflowId = res.body.data.id;
  });

  runner.test('Execute conditional workflow', async function() {
    assert(global.conditionalWorkflowId, 'Conditional workflow ID not set');
    const res = await makeRequest.call(
      runner,
      'POST',
      `/workflows/${global.conditionalWorkflowId}/run`,
      { input: { status: true } }
    );
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.body.data?.runId, 'Should execute workflow');
  });

  // ============================================================
  // LOOP WORKFLOW TESTS
  // ============================================================

  runner.test('Create loop workflow', async function() {
    const res = await makeRequest.call(runner, 'POST', '/workflows', validWorkflowWithLoop);
    if (res.status !== 201) {
      console.log(`    Debug: ${JSON.stringify(res.body)}`);
    }
    assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}`);
    assert(res.body.data?.id, 'Should create workflow');
    global.loopWorkflowId = res.body.data.id;
  });

  runner.test('Execute loop workflow', async function() {
    assert(global.loopWorkflowId, 'Loop workflow ID not set');
    const res = await makeRequest.call(
      runner,
      'POST',
      `/workflows/${global.loopWorkflowId}/run`,
      { input: { items: ['item1', 'item2', 'item3'] } }
    );
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.body.data?.runId, 'Should execute workflow');
  });

  // ============================================================
  // DELETE TESTS
  // ============================================================

  runner.test('Delete webhook', async function() {
    assert(global.webhookId, 'Webhook ID not set');
    const res = await makeRequest.call(runner, 'DELETE', `/webhooks/${global.webhookId}`, null);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
  });

  runner.test('Delete trigger rule', async function() {
    assert(global.ruleId, 'Rule ID not set');
    const res = await makeRequest.call(runner, 'DELETE', `/triggers/${global.ruleId}`, null);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
  });

  runner.test('Delete workflow', async function() {
    assert(global.workflowId, 'Workflow ID not set');
    const res = await makeRequest.call(runner, 'DELETE', `/workflows/${global.workflowId}`, null);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
  });

  runner.test('Restore workflow', async function() {
    assert(global.workflowId, 'Workflow ID not set');
    const res = await makeRequest.call(runner, 'POST', `/workflows/${global.workflowId}/restore`, null);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
  });

  // ============================================================
  // ERROR HANDLING TESTS
  // ============================================================

  runner.test('Handle invalid workflow ID', async function() {
    const res = await makeRequest.call(runner, 'GET', '/workflows/invalid', null);
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
  });

  runner.test('Handle non-existent workflow', async function() {
    const res = await makeRequest.call(runner, 'GET', '/workflows/999999', null);
    assert.strictEqual(res.status, 404, `Expected 404, got ${res.status}`);
  });

  runner.test('Handle missing required fields', async function() {
    const res = await makeRequest.call(runner, 'POST', '/workflows', { description: 'Missing name' });
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
  });

  // ============================================================
  // RUN TESTS
  // ============================================================

  await runner.run();
}

main().catch(console.error);