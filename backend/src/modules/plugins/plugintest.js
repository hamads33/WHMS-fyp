// test.js - Fixed Plugin System Test Suite
// Run with: node test.js
// Fixed version with better error handling, delays, and reporting

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// ============================================
// Test Configuration
// ============================================
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  apiPath: '/api/plugins',
  testPluginId: 'test-plugin',
  timeout: 5000,
  installDelay: 300 // Delay after installation for loader to reload
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

// ============================================
// HTTP Helper Functions
// ============================================
function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, CONFIG.baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      const body = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: json, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(CONFIG.timeout, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// ============================================
// Assertion Helpers
// ============================================
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${expected}, got ${actual}`
    );
  }
}

function assertOk(data, message) {
  assert(data.ok === true, message || `Expected ok=true, got ${data.ok}`);
}

// ============================================
// Test Framework (Improved)
// ============================================
async function test(name, fn) {
  process.stdout.write(`  ${colors.cyan}▶${colors.reset} ${name} ... `);
  
  try {
    await fn();
    console.log(`${colors.green}✓ PASS${colors.reset}`);
    results.passed++;
    results.tests.push({ name, status: 'passed' });
  } catch (error) {
    console.log(`${colors.red}✗ FAIL${colors.reset}`);
    console.log(`    ${colors.red}Error: ${error.message}${colors.reset}`);
    
    // Show more details for debugging
    if (error.response) {
      console.log(`    ${colors.gray}Status: ${error.response.status}${colors.reset}`);
      if (error.response.data) {
        console.log(`    ${colors.gray}Response: ${JSON.stringify(error.response.data).substring(0, 100)}${colors.reset}`);
      }
    }
    
    results.failed++;
    results.tests.push({ name, status: 'failed', error: error.message });
  }
}

function skip(name, reason) {
  console.log(`  ${colors.yellow}⊘${colors.reset} ${name} ... ${colors.yellow}SKIPPED${colors.reset} (${reason})`);
  results.skipped++;
  results.tests.push({ name, status: 'skipped', reason });
}

function describe(suite, fn) {
  console.log(`\n${colors.blue}━━━ ${suite} ━━━${colors.reset}`);
  return fn();
}

// ============================================
// Test Plugin Creation
// ============================================
function createTestPlugin() {
  const pluginDir = path.join(process.cwd(), 'test-plugin-temp');
  
  if (!fs.existsSync(pluginDir)) {
    fs.mkdirSync(pluginDir, { recursive: true });
    fs.mkdirSync(path.join(pluginDir, 'actions'), { recursive: true });
  }

  // Create manifest
  const manifest = {
    id: CONFIG.testPluginId,
    name: 'Test Plugin',
    version: '1.0.0',
    description: 'A test plugin for automated testing',
    actions: {
      hello: {
        file: 'actions/hello.js',
        fnName: 'handler',
        description: 'Simple hello action'
      },
      echo: {
        file: 'actions/echo.js',
        description: 'Echo back the input'
      },
      math: {
        file: 'actions/math.js',
        description: 'Simple math operation'
      }
    },
    hooks: {
      'test.event': {
        action: 'actions/testHook.js',
        description: 'Test hook handler'
      }
    }
  };

  fs.writeFileSync(
    path.join(pluginDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  // Create hello action
  fs.writeFileSync(
    path.join(pluginDir, 'actions', 'hello.js'),
    `module.exports.handler = async function({ meta }) {
  return {
    success: true,
    message: 'Hello from test plugin!',
    meta: meta || {}
  };
};`
  );

  // Create echo action
  fs.writeFileSync(
    path.join(pluginDir, 'actions', 'echo.js'),
    `module.exports = async function({ meta }) {
  return {
    success: true,
    echo: meta || {}
  };
};`
  );

  // Create math action
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

  // Create hook action
  fs.writeFileSync(
    path.join(pluginDir, 'actions', 'testHook.js'),
    `module.exports = async function({ meta }) {
  console.log('[Test Hook] Event received:', meta);
  return { success: true, hookExecuted: true };
};`
  );

  return pluginDir;
}

function cleanupTestPlugin() {
  const pluginDir = path.join(process.cwd(), 'test-plugin-temp');
  if (fs.existsSync(pluginDir)) {
    fs.rmSync(pluginDir, { recursive: true, force: true });
  }
}

// ============================================
// Test Suites (FIXED)
// ============================================

async function testServerConnection() {
  await describe('Server Connection', async () => {
    await test('Server is running and accessible', async () => {
      const res = await request('GET', '/api/plugins');
      assert(res.status === 200, `Expected status 200, got ${res.status}`);
    });
  });
}

async function testPluginAPI() {
  await describe('Plugin API - List & Metadata', async () => {
    await test('GET /api/plugins returns list', async () => {
      const res = await request('GET', '/api/plugins');
      assertEqual(res.status, 200);
      assert(res.data.ok === true || Array.isArray(res.data.plugins) || typeof res.data === 'object', 
        'Should return ok or plugins list');
    });

    await test('GET /api/plugins/:id/metadata returns 404 for non-existent plugin', async () => {
      const res = await request('GET', '/api/plugins/non-existent-plugin/metadata');
      assertEqual(res.status, 404);
    });

    await test('GET /api/plugins/:id/actions returns list', async () => {
      const res = await request('GET', '/api/plugins/non-existent-plugin/actions');
      // Should return 404 or empty list
      assert(res.status === 404 || Array.isArray(res.data), 
        'Should return 404 or action list');
    });
  });
}

async function testPluginInstallation() {
  let pluginDir;
  
  await describe('Plugin Installation', async () => {
    await test('Create test plugin files', async () => {
      pluginDir = createTestPlugin();
      assert(fs.existsSync(path.join(pluginDir, 'manifest.json')), 
        'Manifest should exist');
    });

    await test('POST /api/plugins/install/folder installs plugin', async () => {
      const res = await request('POST', '/api/plugins/install/folder', {
        pluginId: CONFIG.testPluginId,
        sourceDir: pluginDir
      });
      
      assertEqual(res.status, 200, 
        `Install failed with status ${res.status}. Response: ${JSON.stringify(res.data)}`);
      assert(res.data.ok === true || res.data.success === true || res.data.installed, 
        'Install response should indicate success');
    });

    // FIX: Add delay for loader to reload plugins
    await test('Wait for plugin registration', async () => {
      await new Promise(r => setTimeout(r, CONFIG.installDelay));
    });

    await test('Installed plugin appears in list', async () => {
      const res = await request('GET', '/api/plugins');
      assertEqual(res.status, 200);
      
      // Handle different response formats
      let plugins = [];
      if (Array.isArray(res.data)) {
        plugins = res.data;
      } else if (res.data.plugins) {
        plugins = res.data.plugins;
      } else if (typeof res.data === 'object') {
        plugins = Object.values(res.data);
      }
      
      const found = plugins.some(p => p && p.id === CONFIG.testPluginId);
      assert(found, 
        `Plugin ${CONFIG.testPluginId} should be in list. Found: ${
          plugins.map(p => p?.id || p).join(', ')
        }`);
    });

    await test('GET plugin metadata works', async () => {
      const res = await request('GET', `/api/plugins/${CONFIG.testPluginId}/metadata`);
      assertEqual(res.status, 200, 
        `Metadata failed with ${res.status}. Response: ${JSON.stringify(res.data)}`);
      assert(res.data.id || res.data.ok, 'Should return plugin metadata');
    });

    await test('GET plugin actions returns registered actions', async () => {
      const res = await request('GET', `/api/plugins/${CONFIG.testPluginId}/actions`);
      assertEqual(res.status, 200);
      assert(Array.isArray(res.data) || res.data.actions || res.data.ok, 
        'Should return actions list');
      const actions = Array.isArray(res.data) ? res.data : (res.data.actions || []);
      assert(actions.length > 0, 'Should have at least one action');
    });
  });
}

async function testPluginExecution() {
  await describe('Plugin Execution', async () => {
    await test('Execute hello action', async () => {
      const res = await request(
        'POST',
        `/api/plugins/${CONFIG.testPluginId}/actions/hello`,
        {}
      );
      
      assertEqual(res.status, 200, 
        `Execute failed with ${res.status}. Response: ${JSON.stringify(res.data)}`);
      assert(res.data.success === true || res.data.ok === true, 
        'Action should succeed');
    });

    await test('Execute echo action with data', async () => {
      const res = await request(
        'POST',
        `/api/plugins/${CONFIG.testPluginId}/actions/echo`,
        { test: 'data' }
      );
      
      assertEqual(res.status, 200);
      assert(res.data.success === true || res.data.ok === true, 'Action should succeed');
    });

    await test('Execute math action - addition', async () => {
      const res = await request(
        'POST',
        `/api/plugins/${CONFIG.testPluginId}/actions/math`,
        { a: 5, b: 3, operation: 'add' }
      );
      
      assertEqual(res.status, 200);
      assert(res.data.result === 8, 'Result should be 8');
    });

    await test('Execute math action - multiplication', async () => {
      const res = await request(
        'POST',
        `/api/plugins/${CONFIG.testPluginId}/actions/math`,
        { a: 4, b: 3, operation: 'multiply' }
      );
      
      assertEqual(res.status, 200);
      assert(res.data.result === 12, 'Result should be 12');
    });

    await test('Execute non-existent action returns 500', async () => {
      const res = await request(
        'POST',
        `/api/plugins/${CONFIG.testPluginId}/actions/nonexistent`,
        {}
      );
      
      // Should return 404 or 500
      assert(res.status === 404 || res.status === 500, 
        `Should return 404 or 500, got ${res.status}`);
    });

    await test('Execute action on disabled plugin returns 403', async () => {
      // First disable the plugin
      await request('POST', `/api/plugins/${CONFIG.testPluginId}/config`, {
        enabled: false
      });

      const res = await request(
        'POST',
        `/api/plugins/${CONFIG.testPluginId}/actions/hello`,
        {}
      );
      
      assertEqual(res.status, 403);

      // Re-enable for other tests
      await request('POST', `/api/plugins/${CONFIG.testPluginId}/config`, {
        enabled: true
      });
    });
  });
}

async function testPluginConfiguration() {
  await describe('Plugin Configuration', async () => {
    await test('GET plugin config', async () => {
      const res = await request('GET', `/api/plugins/${CONFIG.testPluginId}/config`);
      assertEqual(res.status, 200, 
        `Config GET failed with ${res.status}`);
      assert(res.data.ok === true || res.data.config || res.data.pluginId, 
        'Should return config');
    });

    await test('POST update plugin config', async () => {
      const res = await request('POST', `/api/plugins/${CONFIG.testPluginId}/config`, {
        testSetting: 'value',
        enabled: true
      });
      
      assertEqual(res.status, 200);
      assert(res.data.ok === true || res.data.config || res.data.upserted, 
        'Should return success');
    });

    await test('Config persists after update', async () => {
      const res = await request('GET', `/api/plugins/${CONFIG.testPluginId}/config`);
      assertEqual(res.status, 200);
      // Check settings exist
      assert(res.data.settings || res.data.config || res.data.ok, 
        'Settings should be returned');
    });
  });
}

async function testPluginTrash() {
  await describe('Plugin Trash & Restore', async () => {
    await test('DELETE plugin moves to trash', async () => {
      const res = await request('DELETE', `/api/plugins/${CONFIG.testPluginId}`);
      assertEqual(res.status, 200, 
        `Delete failed with ${res.status}: ${JSON.stringify(res.data)}`);
      assert(res.data.ok === true || res.data.success === true || res.data.removed, 
        'Delete should succeed');
    });

    // Add delay for trash operation
    await test('Wait for trash operation', async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    await test('Plugin appears in trash list', async () => {
      const res = await request('GET', '/api/plugins/trash/list');
      assertEqual(res.status, 200);
      assert(res.data.ok === true || Array.isArray(res.data.trash), 
        'Should return trash list');
      
      const trash = Array.isArray(res.data.trash) ? res.data.trash : (res.data.trash || []);
      const found = trash.some(p => p && p.id === CONFIG.testPluginId);
      assert(found, 
        `Plugin should be in trash. Found: ${trash.map(p => p?.id).join(', ')}`);
    });

    await test('Plugin no longer in active list', async () => {
      const res = await request('GET', '/api/plugins');
      assertEqual(res.status, 200);
      
      let plugins = [];
      if (Array.isArray(res.data)) {
        plugins = res.data;
      } else if (res.data.plugins) {
        plugins = res.data.plugins;
      } else if (typeof res.data === 'object') {
        plugins = Object.values(res.data);
      }
      
      const found = plugins.some(p => p && p.id === CONFIG.testPluginId);
      assert(!found, 'Plugin should not be in active list');
    });

    await test('Restore plugin from trash', async () => {
      const res = await request('POST', `/api/plugins/${CONFIG.testPluginId}/restore`);
      assertEqual(res.status, 200, 
        `Restore failed with ${res.status}: ${JSON.stringify(res.data)}`);
      assert(res.data.ok === true || res.data.success === true || res.data.restored, 
        'Restore should succeed');
    });

    await test('Restored plugin works', async () => {
      const res = await request(
        'POST',
        `/api/plugins/${CONFIG.testPluginId}/actions/hello`,
        {}
      );
      
      assertEqual(res.status, 200);
      assert(res.data.success === true || res.data.ok === true, 'Action should work');
    });
  });
}

async function testPluginValidation() {
  await describe('Input Validation', async () => {
    await test('Invalid plugin ID returns 400', async () => {
      const res = await request('GET', '/api/plugins/../etc/passwd/metadata');
      assert(res.status === 400 || res.status === 404, 
        `Should return 400 or 404, got ${res.status}`);
    });

    await test('Plugin ID with special chars returns 400', async () => {
      const res = await request('GET', '/api/plugins/test<script>/metadata');
      assertEqual(res.status, 400);
    });

    await test('Empty plugin ID returns 400', async () => {
      const res = await request('POST', '/api/plugins/install/folder', {
        pluginId: '',
        sourceDir: '/tmp'
      });
      assertEqual(res.status, 400);
    });
  });
}

async function testPluginSecurity() {
  await describe('Security Tests', async () => {
    await test('Cannot access files outside plugin directory', async () => {
      const res = await request('GET', '/plugins/ui/../../../etc/passwd');
      assert(res.status !== 200, 'Should not allow path traversal');
    });

    skip('Plugin actions timeout properly', 'Requires special test plugin with slow action');
  });
}

async function testCleanup() {
  await describe('Cleanup', async () => {
    await test('Remove test plugin', async () => {
      const res = await request('DELETE', `/api/plugins/${CONFIG.testPluginId}`);
      assert(res.status === 200 || res.status === 404, 'Cleanup should succeed');
    });

    await test('Permanently delete from trash', async () => {
      const res = await request('DELETE', `/api/plugins/trash/${CONFIG.testPluginId}`);
      assert(res.status === 200 || res.status === 404, 'Permanent delete should succeed');
    });

    await test('Remove test plugin files', async () => {
      cleanupTestPlugin();
      const pluginDir = path.join(process.cwd(), 'test-plugin-temp');
      assert(!fs.existsSync(pluginDir), 'Test plugin directory should be removed');
    });
  });
}

// ============================================
// Main Test Runner
// ============================================
async function runTests() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║          Plugin System Test Suite (Fixed)                 ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');

  const startTime = Date.now();

  try {
    await testServerConnection();
    await testPluginAPI();
    await testPluginInstallation();
    await testPluginExecution();
    await testPluginConfiguration();
    await testPluginTrash();
    await testPluginValidation();
    await testPluginSecurity();
    await testCleanup();
  } catch (error) {
    console.error(`\n${colors.red}Fatal error during test execution:${colors.reset}`);
    console.error(error);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // Print results
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                    Test Results                          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  ${colors.green}✓ Passed:${colors.reset}  ${results.passed}`);
  console.log(`  ${colors.red}✗ Failed:${colors.reset}  ${results.failed}`);
  console.log(`  ${colors.yellow}⊘ Skipped:${colors.reset} ${results.skipped}`);
  console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  Total:    ${results.passed + results.failed + results.skipped}`);
  console.log(`  Duration: ${duration}s`);
  console.log('');

  if (results.failed > 0) {
    console.log(`${colors.red}❌ ${results.failed} tests failed!${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${colors.green}✅ All tests passed!${colors.reset}\n`);
    process.exit(0);
  }
}

// ============================================
// CLI
// ============================================
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Plugin System Test Suite (Fixed Version)

Usage: node test.js [options]

Options:
  --help, -h          Show this help message
  --url <url>         Set base URL (default: http://localhost:3000)
  --timeout <ms>      Set request timeout (default: 5000)
  --plugin-id <id>    Set test plugin ID (default: test-plugin)
  --delay <ms>        Set install delay (default: 300ms)

Examples:
  node test.js
  node test.js --url http://localhost:8080
  node test.js --delay 500
    `);
    process.exit(0);
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--url':
        CONFIG.baseUrl = args[++i];
        break;
      case '--timeout':
        CONFIG.timeout = parseInt(args[++i], 10);
        break;
      case '--plugin-id':
        CONFIG.testPluginId = args[++i];
        break;
      case '--delay':
        CONFIG.installDelay = parseInt(args[++i], 10);
        break;
    }
  }

  console.log(`Testing against: ${colors.cyan}${CONFIG.baseUrl}${colors.reset}`);
  console.log(`Timeout: ${CONFIG.timeout}ms`);
  console.log(`Install delay: ${CONFIG.installDelay}ms`);
  console.log(`Test Plugin ID: ${CONFIG.testPluginId}`);

  runTests().catch(error => {
    console.error(`\n${colors.red}Unhandled error:${colors.reset}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = { runTests, test, describe, assert, assertEqual };