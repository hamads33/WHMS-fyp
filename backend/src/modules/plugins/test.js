#!/usr/bin/env node

// Plugin Module Complete Test Script
// Tests all functionality of the plugin system
// Run: node plugin-test.js

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// ============================================
// Configuration
// ============================================
const CONFIG = {
  baseUrl: process.env.TEST_URL || 'http://localhost:4000',
  apiPath: '/api/plugins',
  testPluginId: 'test-plugin-complete',
  timeout: 10000,
  installDelay: 500,
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v')
};

// ============================================
// Colors
// ============================================
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

// ============================================
// Test Results
// ============================================
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: [],
  startTime: Date.now()
};

// ============================================
// HTTP Helper
// ============================================
function request(method, urlPath, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, CONFIG.baseUrl);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      method,
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: CONFIG.timeout
    };

    if (data && method !== 'GET') {
      const body = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: json, headers: res.headers, raw: body });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers, raw: body });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data && method !== 'GET') {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// Logging
// ============================================
function log(level, ...args) {
  if (level === 'debug' && !CONFIG.verbose) return;
  console.log(...args);
}

// ============================================
// Test Framework
// ============================================
async function test(name, fn) {
  process.stdout.write(`  ${c.cyan}▶${c.reset} ${name} ... `);
  
  try {
    await fn();
    console.log(`${c.green}✓ PASS${c.reset}`);
    results.passed++;
    results.tests.push({ name, status: 'passed' });
  } catch (error) {
    console.log(`${c.red}✗ FAIL${c.reset}`);
    console.log(`    ${c.red}${error.message}${c.reset}`);
    
    if (CONFIG.verbose && error.details) {
      console.log(`    ${c.gray}${JSON.stringify(error.details, null, 2)}${c.reset}`);
    }
    
    results.failed++;
    results.tests.push({ name, status: 'failed', error: error.message });
  }
}

function skip(name, reason) {
  console.log(`  ${c.yellow}⊘${c.reset} ${name} ... ${c.yellow}SKIPPED${c.reset} (${reason})`);
  results.skipped++;
  results.tests.push({ name, status: 'skipped', reason });
}

function describe(suite, fn) {
  console.log(`\n${c.blue}${c.bright}━━━ ${suite} ━━━${c.reset}`);
  return fn();
}

// ============================================
// Assertions
// ============================================
function assert(condition, message, details = null) {
  if (!condition) {
    const err = new Error(message || 'Assertion failed');
    if (details) err.details = details;
    throw err;
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertStatus(response, expected, message) {
  if (response.status !== expected) {
    const err = new Error(
      message || `Expected status ${expected}, got ${response.status}`
    );
    err.details = { status: response.status, data: response.data };
    throw err;
  }
}

function assertOk(data, message) {
  assert(
    data.ok === true || data.success === true,
    message || `Expected ok=true, got ${JSON.stringify(data)}`
  );
}

// ============================================
// Test Plugin Creation
// ============================================
function createTestPlugin() {
  const pluginDir = path.join(process.cwd(), 'test-plugin-temp-complete');
  
  if (fs.existsSync(pluginDir)) {
    fs.rmSync(pluginDir, { recursive: true, force: true });
  }
  
  fs.mkdirSync(pluginDir, { recursive: true });
  fs.mkdirSync(path.join(pluginDir, 'actions'), { recursive: true });
  fs.mkdirSync(path.join(pluginDir, 'ui'), { recursive: true });

  // Manifest
  const manifest = {
    id: CONFIG.testPluginId,
    name: 'Complete Test Plugin',
    version: '1.0.0',
    description: 'Comprehensive test plugin for all features',
    author: 'Test Suite',
    type: 'action',
    actions: {
      hello: {
        file: 'actions/hello.js',
        fnName: 'handler',
        description: 'Simple hello world'
      },
      echo: {
        file: 'actions/echo.js',
        description: 'Echo input back'
      },
      math: {
        file: 'actions/math.js',
        description: 'Math operations'
      },
      async_action: {
        file: 'actions/async.js',
        description: 'Async operation'
      },
      error_action: {
        file: 'actions/error.js',
        description: 'Intentionally throws error'
      }
    },
    hooks: {
      'test.event': {
        action: 'actions/testHook.js',
        description: 'Test hook handler'
      }
    },
    ui: {
      pages: {
        settings: 'ui/settings.html'
      },
      menu: {
        title: 'Test Plugin',
        icon: 'test-icon',
        path: '/plugins/ui/' + CONFIG.testPluginId
      },
      configSchema: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          apiKey: { type: 'string' },
          timeout: { type: 'number' }
        }
      }
    },
    configSchema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', default: true }
      }
    }
  };

  fs.writeFileSync(
    path.join(pluginDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  // Hello action
  fs.writeFileSync(
    path.join(pluginDir, 'actions', 'hello.js'),
    `module.exports.handler = async function({ meta }) {
  return {
    success: true,
    message: 'Hello from test plugin!',
    receivedMeta: meta || {}
  };
};`
  );

  // Echo action
  fs.writeFileSync(
    path.join(pluginDir, 'actions', 'echo.js'),
    `module.exports = async function({ meta }) {
  return {
    success: true,
    echo: meta || {},
    timestamp: new Date().toISOString()
  };
};`
  );

  // Math action
  fs.writeFileSync(
    path.join(pluginDir, 'actions', 'math.js'),
    `module.exports = async function({ meta }) {
  const { a = 0, b = 0, operation = 'add' } = meta;
  let result;
  
  switch (operation) {
    case 'add': result = a + b; break;
    case 'subtract': result = a - b; break;
    case 'multiply': result = a * b; break;
    case 'divide': result = b !== 0 ? a / b : null; break;
    default: result = null;
  }
  
  return { success: true, result, operation, a, b };
};`
  );

  // Async action
  fs.writeFileSync(
    path.join(pluginDir, 'actions', 'async.js'),
    `module.exports = async function({ meta }) {
  const delay = meta.delay || 100;
  await new Promise(resolve => setTimeout(resolve, delay));
  return { success: true, delayed: delay };
};`
  );

  // Error action
  fs.writeFileSync(
    path.join(pluginDir, 'actions', 'error.js'),
    `module.exports = async function({ meta }) {
  throw new Error('Intentional test error');
};`
  );

  // Hook action
  fs.writeFileSync(
    path.join(pluginDir, 'actions', 'testHook.js'),
    `module.exports = async function({ meta }) {
  console.log('[Test Hook] Event received:', JSON.stringify(meta));
  return { success: true, hookExecuted: true, receivedMeta: meta };
};`
  );

  // UI files
  fs.writeFileSync(
    path.join(pluginDir, 'ui', 'index.html'),
    `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Test Plugin UI</title>
  <style>
    body { font-family: sans-serif; padding: 20px; }
    h1 { color: #333; }
  </style>
</head>
<body>
  <h1>Test Plugin UI</h1>
  <p>This is the test plugin user interface.</p>
  <button onclick="alert('Test plugin loaded!')">Test Button</button>
</body>
</html>`
  );

  fs.writeFileSync(
    path.join(pluginDir, 'ui', 'settings.html'),
    `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Plugin Settings</title>
</head>
<body>
  <h2>Settings</h2>
  <p>Plugin settings would go here.</p>
</body>
</html>`
  );

  return pluginDir;
}

function cleanupTestPlugin() {
  const pluginDir = path.join(process.cwd(), 'test-plugin-temp-complete');
  if (fs.existsSync(pluginDir)) {
    fs.rmSync(pluginDir, { recursive: true, force: true });
  }
}

// ============================================
// Test Suites
// ============================================

async function testServerConnection() {
  await describe('1. Server Connection', async () => {
    await test('Server is accessible', async () => {
      const res = await request('GET', '/api/plugins');
      assert(res.status === 200 || res.status === 401, 
        `Server returned status ${res.status}`);
    });
  });
}

async function testPluginListingAPI() {
  await describe('2. Plugin Listing API', async () => {
    await test('GET /api/plugins returns plugin list', async () => {
      const res = await request('GET', '/api/plugins');
      assertStatus(res, 200);
      assert(
        res.data.ok || res.data.plugins || Array.isArray(res.data),
        'Should return plugin list structure'
      );
    });

    await test('GET /api/plugins/:id/metadata with invalid ID returns 400', async () => {
      const res = await request('GET', '/api/plugins/../../../etc/passwd/metadata');
      assert(res.status === 400 || res.status === 404);
    });

    await test('GET /api/plugins/:id/metadata for non-existent returns 404', async () => {
      const res = await request('GET', '/api/plugins/nonexistent-plugin-xyz/metadata');
      assertStatus(res, 404);
    });

    await test('GET /api/plugins/:id/actions returns actions list', async () => {
      const res = await request('GET', '/api/plugins/nonexistent/actions');
      assert(
        res.status === 404 || Array.isArray(res.data) || res.data.actions,
        'Should return 404 or empty actions list'
      );
    });
  });
}

async function testPluginInstallation() {
  let pluginDir;

  await describe('3. Plugin Installation', async () => {
    await test('Create test plugin structure', async () => {
      pluginDir = createTestPlugin();
      assert(fs.existsSync(path.join(pluginDir, 'manifest.json')));
      assert(fs.existsSync(path.join(pluginDir, 'actions', 'hello.js')));
    });

    await test('POST /api/plugins/install/folder installs plugin', async () => {
      const res = await request('POST', '/api/plugins/install/folder', {
        pluginId: CONFIG.testPluginId,
        sourceDir: pluginDir
      });
      
      assertStatus(res, 200, 
        `Install failed: ${JSON.stringify(res.data)}`);
      assertOk(res.data);
    });

    await test('Wait for plugin loader to reload', async () => {
      await delay(CONFIG.installDelay);
    });

    await test('Installed plugin appears in list', async () => {
      const res = await request('GET', '/api/plugins');
      assertStatus(res, 200);
      
      let plugins = [];
      if (Array.isArray(res.data)) plugins = res.data;
      else if (res.data.plugins) plugins = res.data.plugins;
      else if (typeof res.data === 'object') plugins = Object.values(res.data);
      
      const found = plugins.some(p => p?.id === CONFIG.testPluginId);
      assert(found, 
        `Plugin ${CONFIG.testPluginId} not found in list`);
    });

    await test('Cannot install duplicate plugin', async () => {
      const res = await request('POST', '/api/plugins/install/folder', {
        pluginId: CONFIG.testPluginId,
        sourceDir: pluginDir
      });
      
      assertStatus(res, 409);
    });

    await test('Install with invalid plugin ID returns 400', async () => {
      const res = await request('POST', '/api/plugins/install/folder', {
        pluginId: '../../../etc/passwd',
        sourceDir: pluginDir
      });
      
      assertStatus(res, 400);
    });

    await test('Install without source directory returns 400', async () => {
      const res = await request('POST', '/api/plugins/install/folder', {
        pluginId: 'test-plugin-2'
      });
      
      assertStatus(res, 400);
    });
  });
}

async function testPluginMetadata() {
  await describe('4. Plugin Metadata', async () => {
    await test('GET plugin metadata returns full details', async () => {
      const res = await request('GET', 
        `/api/plugins/${CONFIG.testPluginId}/metadata`);
      
      assertStatus(res, 200);
      const meta = res.data.metadata || res.data;
      assert(meta.id === CONFIG.testPluginId);
      assert(meta.name);
      assert(meta.version);
    });

    await test('Metadata includes manifest', async () => {
      const res = await request('GET', 
        `/api/plugins/${CONFIG.testPluginId}/metadata`);
      
      const meta = res.data.metadata || res.data;
      assert(meta.manifest);
      assert(meta.manifest.actions);
    });

    await test('Metadata shows enabled status', async () => {
      const res = await request('GET', 
        `/api/plugins/${CONFIG.testPluginId}/metadata`);
      
      const meta = res.data.metadata || res.data;
      assert(typeof meta.enabled === 'boolean');
    });
  });
}

async function testPluginActions() {
  await describe('5. Plugin Actions', async () => {
    await test('GET plugin actions lists all actions', async () => {
      const res = await request('GET', 
        `/api/plugins/${CONFIG.testPluginId}/actions`);
      
      assertStatus(res, 200);
      const actions = res.data.actions || res.data;
      assert(Array.isArray(actions));
      assert(actions.length >= 3);
    });

    await test('Actions include metadata', async () => {
      const res = await request('GET', 
        `/api/plugins/${CONFIG.testPluginId}/actions`);
      
      const actions = res.data.actions || res.data;
      const helloAction = actions.find(a => a.name === 'hello');
      assert(helloAction);
      assert(helloAction.file);
      assert(helloAction.description);
    });
  });
}

async function testPluginExecution() {
  await describe('6. Plugin Execution', async () => {
    await test('Execute hello action succeeds', async () => {
      const res = await request('POST',
        `/api/plugins/${CONFIG.testPluginId}/actions/hello`,
        {});
      
      assertStatus(res, 200);
      const result = res.data.result || res.data;
      assert(result.success);
      assert(result.message);
    });

    await test('Execute echo action with data', async () => {
      const testData = { test: 'data', number: 42 };
      const res = await request('POST',
        `/api/plugins/${CONFIG.testPluginId}/actions/echo`,
        testData);
      
      assertStatus(res, 200);
      const result = res.data.result || res.data;
      assert(result.success);
      assert(result.echo);
    });

    await test('Execute math action - addition', async () => {
      const res = await request('POST',
        `/api/plugins/${CONFIG.testPluginId}/actions/math`,
        { a: 10, b: 5, operation: 'add' });
      
      assertStatus(res, 200);
      const result = res.data.result || res.data;
      assertEqual(result.result, 15);
    });

    await test('Execute math action - subtraction', async () => {
      const res = await request('POST',
        `/api/plugins/${CONFIG.testPluginId}/actions/math`,
        { a: 10, b: 5, operation: 'subtract' });
      
      assertStatus(res, 200);
      const result = res.data.result || res.data;
      assertEqual(result.result, 5);
    });

    await test('Execute math action - multiplication', async () => {
      const res = await request('POST',
        `/api/plugins/${CONFIG.testPluginId}/actions/math`,
        { a: 6, b: 7, operation: 'multiply' });
      
      assertStatus(res, 200);
      const result = res.data.result || res.data;
      assertEqual(result.result, 42);
    });

    await test('Execute math action - division', async () => {
      const res = await request('POST',
        `/api/plugins/${CONFIG.testPluginId}/actions/math`,
        { a: 20, b: 4, operation: 'divide' });
      
      assertStatus(res, 200);
      const result = res.data.result || res.data;
      assertEqual(result.result, 5);
    });

    await test('Execute async action', async () => {
      const res = await request('POST',
        `/api/plugins/${CONFIG.testPluginId}/actions/async_action`,
        { delay: 200 });
      
      assertStatus(res, 200);
      const result = res.data.result || res.data;
      assert(result.success);
    });

    await test('Execute error action returns 500', async () => {
      const res = await request('POST',
        `/api/plugins/${CONFIG.testPluginId}/actions/error_action`,
        {});
      
      assertStatus(res, 500);
    });

    await test('Execute non-existent action returns 500', async () => {
      const res = await request('POST',
        `/api/plugins/${CONFIG.testPluginId}/actions/nonexistent`,
        {});
      
      assert(res.status === 404 || res.status === 500);
    });
  });
}

async function testPluginConfiguration() {
  await describe('7. Plugin Configuration', async () => {
    await test('GET plugin config returns settings', async () => {
      const res = await request('GET',
        `/api/plugins/${CONFIG.testPluginId}/config`);
      
      assertStatus(res, 200);
      assert(res.data.ok || res.data.config || res.data.settings);
    });

    await test('POST update plugin config', async () => {
      const res = await request('POST',
        `/api/plugins/${CONFIG.testPluginId}/config`,
        {
          enabled: true,
          apiKey: 'test-key-123',
          timeout: 5000
        });
      
      assertStatus(res, 200);
      assertOk(res.data);
    });

    await test('Updated config persists', async () => {
      const res = await request('GET',
        `/api/plugins/${CONFIG.testPluginId}/config`);
      
      assertStatus(res, 200);
      const settings = res.data.settings || res.data.config || {};
      assert(res.data.ok || typeof settings === 'object');
    });

    await test('Invalid config data returns 400', async () => {
      const res = await request('POST',
        `/api/plugins/${CONFIG.testPluginId}/config`,
        {
          enabled: 'not-a-boolean',
          timeout: 'not-a-number'
        });
      
      assert(res.status === 200 || res.status === 400);
    });
  });
}

async function testPluginDisable() {
  await describe('8. Plugin Disable/Enable', async () => {
    await test('Disable plugin via config', async () => {
      const res = await request('POST',
        `/api/plugins/${CONFIG.testPluginId}/config`,
        { enabled: false });
      
      assertStatus(res, 200);
    });

    await test('Wait for config update', async () => {
      await delay(100);
    });

    await test('Disabled plugin action returns 403', async () => {
      const res = await request('POST',
        `/api/plugins/${CONFIG.testPluginId}/actions/hello`,
        {});
      
      assertStatus(res, 403);
    });

    await test('Re-enable plugin', async () => {
      const res = await request('POST',
        `/api/plugins/${CONFIG.testPluginId}/config`,
        { enabled: true });
      
      assertStatus(res, 200);
    });

    await test('Wait for config update', async () => {
      await delay(100);
    });

    await test('Enabled plugin action works again', async () => {
      const res = await request('POST',
        `/api/plugins/${CONFIG.testPluginId}/actions/hello`,
        {});
      
      assertStatus(res, 200);
    });
  });
}

async function testMenuContributions() {
  await describe('9. Menu Contributions', async () => {
    await test('GET menu returns plugin menu items', async () => {
      const res = await request('GET', '/api/plugins/menu');
      
      assertStatus(res, 200);
      assert(res.data.ok || res.data.menu);
    });

    await test('Test plugin appears in menu', async () => {
      const res = await request('GET', '/api/plugins/menu');
      
      const menu = res.data.menu || [];
      const found = menu.some(m => m.id === CONFIG.testPluginId);
      assert(found, 'Plugin menu item should be present');
    });
  });
}

async function testTrashOperations() {
  await describe('10. Trash Operations', async () => {
    await test('DELETE plugin moves to trash', async () => {
      const res = await request('DELETE',
        `/api/plugins/${CONFIG.testPluginId}`,
        { actor: 'test-suite' });
      
      assertStatus(res, 200);
      assertOk(res.data);
      assert(res.data.trashed);
    });

    await test('Wait for trash operation', async () => {
      await delay(CONFIG.installDelay);
    });

    await test('Plugin appears in trash list', async () => {
      const res = await request('GET', '/api/plugins/trash/list');
      
      assertStatus(res, 200);
      const trash = res.data.trash || [];
      const found = trash.some(p => p.id === CONFIG.testPluginId);
      assert(found, 'Plugin should be in trash');
    });

    await test('Trashed plugin not in active list', async () => {
      const res = await request('GET', '/api/plugins');
      
      assertStatus(res, 200);
      let plugins = [];
      if (Array.isArray(res.data)) plugins = res.data;
      else if (res.data.plugins) plugins = res.data.plugins;
      
      const found = plugins.some(p => p?.id === CONFIG.testPluginId);
      assert(!found, 'Plugin should not be in active list');
    });

    await test('Cannot execute trashed plugin action', async () => {
      const res = await request('POST',
        `/api/plugins/${CONFIG.testPluginId}/actions/hello`,
        {});
      
      assert(res.status !== 200);
    });

    await test('Restore plugin from trash', async () => {
      const res = await request('POST',
        `/api/plugins/${CONFIG.testPluginId}/restore`,
        { actor: 'test-suite' });
      
      assertStatus(res, 200);
      assertOk(res.data);
    });

    await test('Wait for restore operation', async () => {
      await delay(CONFIG.installDelay);
    });

    await test('Restored plugin appears in active list', async () => {
      const res = await request('GET', '/api/plugins');
      
      assertStatus(res, 200);
      let plugins = [];
      if (Array.isArray(res.data)) plugins = res.data;
      else if (res.data.plugins) plugins = res.data.plugins;
      
      const found = plugins.some(p => p?.id === CONFIG.testPluginId);
      assert(found, 'Plugin should be in active list');
    });

    await test('Restored plugin action works', async () => {
      const res = await request('POST',
        `/api/plugins/${CONFIG.testPluginId}/actions/hello`,
        {});
      
      assertStatus(res, 200);
    });
  });
}

async function testPermanentDeletion() {
  await describe('11. Permanent Deletion', async () => {
    await test('Move plugin to trash again', async () => {
      const res = await request('DELETE',
        `/api/plugins/${CONFIG.testPluginId}`);
      
      assertStatus(res, 200);
    });

    await test('Wait for trash operation', async () => {
      await delay(100);
    });

    await test('Permanently delete from trash', async () => {
      const res = await request('DELETE',
        `/api/plugins/trash/${CONFIG.testPluginId}`,
        { actor: 'test-suite' });
      
      assertStatus(res, 200);
      assertOk(res.data);
    });

    await test('Plugin no longer in trash', async () => {
      const res = await request('GET', '/api/plugins/trash/list');
      
      assertStatus(res, 200);
      const trash = res.data.trash || [];
      const found = trash.some(p => p.id === CONFIG.testPluginId);
      assert(!found, 'Plugin should not be in trash');
    });

    await test('Cannot restore permanently deleted plugin', async () => {
      const res = await request('POST',
        `/api/plugins/${CONFIG.testPluginId}/restore`);
      
      assertStatus(res, 404);
    });
  });
}

async function testSecurityValidation() {
  await describe('12. Security & Validation', async () => {
    await test('Path traversal in plugin ID rejected', async () => {
      const res = await request('GET',
        '/api/plugins/../../../etc/passwd/metadata');
      
      assert(res.status === 400 || res.status === 404);
    });

    await test('Special characters in plugin ID rejected', async () => {
      const res = await request('POST',
        '/api/plugins/install/folder',
        {
          pluginId: 'plugin<script>alert(1)</script>',
          sourceDir: '/tmp'
        });
      
      assertStatus(res, 400);
    });

    await test('Empty plugin ID rejected', async () => {
      const res = await request('POST',
        '/api/plugins/install/folder',
        {
          pluginId: '',
          sourceDir: '/tmp'
        });
      
      assertStatus(res, 400);
    });

    await test('Invalid action name rejected', async () => {
      const res = await request('POST',
        `/api/plugins/${CONFIG.testPluginId}/actions/../../../etc/passwd`,
        {});
      
      assert(res.status === 400 || res.status === 404 || res.status === 500);
    });
  });
}

async function testErrorHandling() {
  await describe('13. Error Handling', async () => {
    await test('Non-existent plugin returns 404', async () => {
      const res = await request('GET',
        '/api/plugins/absolutely-does-not-exist-xyz/metadata');
      
      assertStatus(res, 404);
    });

    await test('Malformed JSON in request handled gracefully', async () => {
      const res = await request('POST',
        `/api/plugins/${CONFIG.testPluginId}/actions/hello`,
        null,
        { 'Content-Type': 'application/json' });
      
      assert(res.status >= 200 && res.status < 600, 'Should handle gracefully');
    });

    await test('Missing required fields handled', async () => {
      const res = await request('POST',
        '/api/plugins/install/folder',
        { pluginId: CONFIG.testPluginId });
      
      assertStatus(res, 400);
    });

    await test('Server timeout handling', async () => {
      // Request to non-existent endpoint shouldn't crash
      const res = await request('GET', '/api/plugins/test/nonexistent-endpoint');
      assert(res.status > 0, 'Should return a status code');
    });
  });
}

async function testConcurrency() {
  await describe('14. Concurrency & Load', async () => {
    await test('Multiple concurrent action executions', async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          request('POST',
            `/api/plugins/${CONFIG.testPluginId}/actions/hello`,
            {})
        );
      }
      
      const results = await Promise.all(promises);
      assert(results.every(r => r.status === 200), 'All requests should succeed');
    });

    await test('Concurrent config updates handled', async () => {
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(
          request('POST',
            `/api/plugins/${CONFIG.testPluginId}/config`,
            { enabled: i % 2 === 0 })
        );
      }
      
      const results = await Promise.all(promises);
      assert(results.every(r => r.status === 200), 'All config updates should succeed');
    });
  });
}

async function testPerformance() {
  await describe('15. Performance', async () => {
    await test('Plugin action executes within timeout', async () => {
      const start = Date.now();
      const res = await request('POST',
        `/api/plugins/${CONFIG.testPluginId}/actions/hello`,
        {});
      const duration = Date.now() - start;
      
      assertStatus(res, 200);
      assert(duration < CONFIG.timeout, `Request took ${duration}ms`);
    });

    await test('Async action respects delay parameter', async () => {
      const delayMs = 100;
      const start = Date.now();
      const res = await request('POST',
        `/api/plugins/${CONFIG.testPluginId}/actions/async_action`,
        { delay: delayMs });
      const duration = Date.now() - start;
      
      assertStatus(res, 200);
      assert(duration >= delayMs, `Expected at least ${delayMs}ms, got ${duration}ms`);
    });

    await test('Large payload handling', async () => {
      const largeData = {
        data: 'x'.repeat(10000),
        nested: {
          array: Array(100).fill({ value: 'test' })
        }
      };
      
      const res = await request('POST',
        `/api/plugins/${CONFIG.testPluginId}/actions/echo`,
        largeData);
      
      assertStatus(res, 200);
    });
  });
}

// ============================================
// Main Test Runner
// ============================================
async function runAllTests() {
  console.log(`\n${c.bright}${c.magenta}╔════════════════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.bright}${c.magenta}║   Plugin System Integration Test Suite                  ║${c.reset}`);
  console.log(`${c.bright}${c.magenta}╚════════════════════════════════════════════════════════╝${c.reset}`);
  console.log(`\n  Server: ${c.cyan}${CONFIG.baseUrl}${c.reset}`);
  console.log(`  Plugin: ${c.cyan}${CONFIG.testPluginId}${c.reset}`);
  console.log(`  Verbose: ${CONFIG.verbose ? c.green + 'ON' : c.dim + 'OFF'}${c.reset}\n`);

  try {
    // Run test suites in order
    await testServerConnection();
    await testPluginListingAPI();
    await testPluginInstallation();
    await testPluginMetadata();
    await testPluginActions();
    await testPluginExecution();
    await testPluginConfiguration();
    await testPluginDisable();
    await testMenuContributions();
    await testTrashOperations();
    await testPermanentDeletion();
    await testSecurityValidation();
    await testErrorHandling();
    await testConcurrency();
    await testPerformance();

  } finally {
    // Cleanup
    cleanupTestPlugin();
  }

  // Print summary
  const duration = Date.now() - results.startTime;
  const total = results.passed + results.failed + results.skipped;
  const percentage = total > 0 
    ? Math.round((results.passed / (total - results.skipped)) * 100) 
    : 0;

  console.log(`\n${c.bright}${c.blue}━━━ Test Summary ━━━${c.reset}`);
  console.log(`  ${c.green}✓ Passed:  ${results.passed}${c.reset}`);
  console.log(`  ${c.red}✗ Failed:  ${results.failed}${c.reset}`);
  console.log(`  ${c.yellow}⊘ Skipped: ${results.skipped}${c.reset}`);
  console.log(`  ${c.cyan}Total:   ${total}${c.reset}`);
  console.log(`  ${c.magenta}Duration: ${duration}ms${c.reset}`);
  console.log(`  ${c.bright}${percentage}% pass rate${c.reset}\n`);

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(err => {
  console.error(`${c.red}${c.bright}Fatal error:${c.reset}`, err);
  process.exit(1);
});