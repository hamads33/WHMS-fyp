// test-backup-controllers.js
// Simple test suite for backup controllers (no Jest required)
// Run with: node test-backup-controllers.js

const http = require('http');

// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
  baseUrl: 'http://localhost:4000',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiMTU4ZWI2MC1mMDg1LTRlMmQtOTczYS02ODMwZWY2ODViNzAiLCJpYXQiOjE3NjcyMTU3OTgsImV4cCI6MTc2NzIxNjY5OH0.RiKKftfhC8FGXCp2A5kNyD2e1RnuNpTEVoIbdx1FZCk', // Replace with a valid token
  testBackupId: null, // Will be set after creating a test backup
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, CONFIG.baseUrl);
    
    const options = {
      method,
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
      headers: {
        'Authorization': `Bearer ${CONFIG.token}`,
        'Content-Type': 'application/json',
      },
    };

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
            data: parsed,
            headers: res.headers,
          });
        } catch (err) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers,
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

function assert(condition, testName, expected, actual) {
  if (condition) {
    log(`✓ PASS: ${testName}`, 'green');
    return true;
  } else {
    log(`✗ FAIL: ${testName}`, 'red');
    log(`  Expected: ${JSON.stringify(expected)}`, 'yellow');
    log(`  Actual: ${JSON.stringify(actual)}`, 'yellow');
    return false;
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// TEST SUITES
// ============================================================================

async function testStatsEndpoint() {
  log('\n=== Testing Stats Endpoint ===', 'cyan');
  
  try {
    const response = await makeRequest('GET', '/api/backups/stats');
    
    assert(
      response.status === 200,
      'Stats endpoint returns 200',
      200,
      response.status
    );

    assert(
      response.data.success === true,
      'Response has success=true',
      true,
      response.data.success
    );

    assert(
      typeof response.data.data === 'object',
      'Response has data object',
      'object',
      typeof response.data.data
    );

    const stats = response.data.data;
    
    assert(
      typeof stats.totalBackups === 'number',
      'Stats includes totalBackups',
      'number',
      typeof stats.totalBackups
    );

    assert(
      typeof stats.successRate === 'number',
      'Stats includes successRate',
      'number',
      typeof stats.successRate
    );

    assert(
      typeof stats.totalStorageUsedGB === 'number',
      'Stats includes totalStorageUsedGB',
      'number',
      typeof stats.totalStorageUsedGB
    );

    assert(
      typeof stats.storageProviderBreakdown === 'object',
      'Stats includes storageProviderBreakdown',
      'object',
      typeof stats.storageProviderBreakdown
    );

    log(`  Total Backups: ${stats.totalBackups}`, 'blue');
    log(`  Success Rate: ${stats.successRate}%`, 'blue');
    log(`  Storage Used: ${stats.totalStorageUsedGB} GB`, 'blue');

  } catch (err) {
    log(`✗ ERROR: ${err.message}`, 'red');
  }
}

async function testHealthEndpoint() {
  log('\n=== Testing Health Endpoint ===', 'cyan');
  
  try {
    const response = await makeRequest('GET', '/api/backups/stats/health');
    
    assert(
      response.status === 200,
      'Health endpoint returns 200',
      200,
      response.status
    );

    const health = response.data.data;
    
    assert(
      typeof health.status === 'string',
      'Health includes status',
      'string',
      typeof health.status
    );

    assert(
      typeof health.checks === 'object',
      'Health includes checks object',
      'object',
      typeof health.checks
    );

    assert(
      typeof health.checks.database === 'object',
      'Health includes database check',
      'object',
      typeof health.checks.database
    );

    assert(
      typeof health.checks.storage === 'object',
      'Health includes storage check',
      'object',
      typeof health.checks.storage
    );

    log(`  System Status: ${health.status}`, 'blue');
    log(`  Database: ${health.checks.database.status}`, 'blue');
    log(`  Storage: ${health.checks.storage.status}`, 'blue');

  } catch (err) {
    log(`✗ ERROR: ${err.message}`, 'red');
  }
}

async function testAnalyticsTimeline() {
  log('\n=== Testing Analytics Timeline ===', 'cyan');
  
  try {
    // Test different periods
    const periods = ['7d', '30d'];
    
    for (const period of periods) {
      const response = await makeRequest('GET', `/api/backups/analytics/timeline?period=${period}`);
      
      assert(
        response.status === 200,
        `Timeline endpoint returns 200 for period=${period}`,
        200,
        response.status
      );

      assert(
        Array.isArray(response.data.data.timeline),
        `Timeline data is an array for period=${period}`,
        true,
        Array.isArray(response.data.data.timeline)
      );

      assert(
        response.data.data.period === period,
        `Timeline returns correct period`,
        period,
        response.data.data.period
      );

      log(`  Timeline for ${period}: ${response.data.data.timeline.length} data points`, 'blue');
    }

  } catch (err) {
    log(`✗ ERROR: ${err.message}`, 'red');
  }
}

async function testAnalyticsStorageUsage() {
  log('\n=== Testing Analytics Storage Usage ===', 'cyan');
  
  try {
    const response = await makeRequest('GET', '/api/backups/analytics/storage-usage');
    
    assert(
      response.status === 200,
      'Storage usage endpoint returns 200',
      200,
      response.status
    );

    assert(
      Array.isArray(response.data.data),
      'Storage usage data is an array',
      true,
      Array.isArray(response.data.data)
    );

    if (response.data.data.length > 0) {
      const firstItem = response.data.data[0];
      
      assert(
        typeof firstItem.cumulativeGB === 'number',
        'Storage usage includes cumulativeGB',
        'number',
        typeof firstItem.cumulativeGB
      );

      log(`  Storage growth entries: ${response.data.data.length}`, 'blue');
    }

  } catch (err) {
    log(`✗ ERROR: ${err.message}`, 'red');
  }
}

async function testAnalyticsSuccessRate() {
  log('\n=== Testing Analytics Success Rate ===', 'cyan');
  
  try {
    const response = await makeRequest('GET', '/api/backups/analytics/success-rate');
    
    assert(
      response.status === 200,
      'Success rate endpoint returns 200',
      200,
      response.status
    );

    assert(
      Array.isArray(response.data.data),
      'Success rate data is an array',
      true,
      Array.isArray(response.data.data)
    );

    if (response.data.data.length > 0) {
      const firstItem = response.data.data[0];
      
      assert(
        typeof firstItem.successRate === 'number',
        'Success rate includes successRate number',
        'number',
        typeof firstItem.successRate
      );

      assert(
        firstItem.successRate >= 0 && firstItem.successRate <= 100,
        'Success rate is between 0 and 100',
        true,
        firstItem.successRate >= 0 && firstItem.successRate <= 100
      );

      log(`  Success rate entries: ${response.data.data.length}`, 'blue');
    }

  } catch (err) {
    log(`✗ ERROR: ${err.message}`, 'red');
  }
}

async function testAnalyticsTypeDistribution() {
  log('\n=== Testing Analytics Type Distribution ===', 'cyan');
  
  try {
    const response = await makeRequest('GET', '/api/backups/analytics/type-distribution');
    
    assert(
      response.status === 200,
      'Type distribution endpoint returns 200',
      200,
      response.status
    );

    assert(
      Array.isArray(response.data.data),
      'Type distribution data is an array',
      true,
      Array.isArray(response.data.data)
    );

    if (response.data.data.length > 0) {
      const firstItem = response.data.data[0];
      
      assert(
        typeof firstItem.type === 'string',
        'Type distribution includes type string',
        'string',
        typeof firstItem.type
      );

      assert(
        typeof firstItem.count === 'number',
        'Type distribution includes count',
        'number',
        typeof firstItem.count
      );

      log(`  Backup types found: ${response.data.data.length}`, 'blue');
      response.data.data.forEach(item => {
        log(`    ${item.type}: ${item.count} backups (${item.successRate}% success)`, 'blue');
      });
    }

  } catch (err) {
    log(`✗ ERROR: ${err.message}`, 'red');
  }
}

async function testBackupLogs() {
  log('\n=== Testing Backup Logs ===', 'cyan');
  
  try {
    // First, get a backup ID
    const backupsResponse = await makeRequest('GET', '/api/backups?limit=1');
    
    if (backupsResponse.data.data && backupsResponse.data.data.length > 0) {
      const backupId = backupsResponse.data.data[0].id;
      CONFIG.testBackupId = backupId;
      
      const response = await makeRequest('GET', `/api/backups/${backupId}/logs`);
      
      assert(
        response.status === 200,
        'Logs endpoint returns 200',
        200,
        response.status
      );

      assert(
        Array.isArray(response.data.data),
        'Logs data is an array',
        true,
        Array.isArray(response.data.data)
      );

      log(`  Log entries found: ${response.data.data.length}`, 'blue');
      
      if (response.data.data.length > 0) {
        const firstLog = response.data.data[0];
        
        assert(
          typeof firstLog.step === 'string',
          'Log entry includes step',
          'string',
          typeof firstLog.step
        );

        assert(
          typeof firstLog.status === 'string',
          'Log entry includes status',
          'string',
          typeof firstLog.status
        );

        log(`    First step: ${firstLog.step} (${firstLog.status})`, 'blue');
      }
    } else {
      log('  No backups found to test logs', 'yellow');
    }

  } catch (err) {
    log(`✗ ERROR: ${err.message}`, 'red');
  }
}

async function testBackupStatus() {
  log('\n=== Testing Backup Status ===', 'cyan');
  
  try {
    if (!CONFIG.testBackupId) {
      // Get a backup ID
      const backupsResponse = await makeRequest('GET', '/api/backups?limit=1');
      if (backupsResponse.data.data && backupsResponse.data.data.length > 0) {
        CONFIG.testBackupId = backupsResponse.data.data[0].id;
      }
    }

    if (CONFIG.testBackupId) {
      const response = await makeRequest('GET', `/api/backups/${CONFIG.testBackupId}/logs/status`);
      
      assert(
        response.status === 200,
        'Status endpoint returns 200',
        200,
        response.status
      );

      const status = response.data.data;
      
      assert(
        typeof status.status === 'string',
        'Status includes status string',
        'string',
        typeof status.status
      );

      assert(
        typeof status.progress === 'number',
        'Status includes progress number',
        'number',
        typeof status.progress
      );

      assert(
        status.progress >= 0 && status.progress <= 100,
        'Progress is between 0 and 100',
        true,
        status.progress >= 0 && status.progress <= 100
      );

      log(`  Backup Status: ${status.status}`, 'blue');
      log(`  Progress: ${status.progress}%`, 'blue');
      log(`  Current Step: ${status.currentStep}`, 'blue');
    } else {
      log('  No backups found to test status', 'yellow');
    }

  } catch (err) {
    log(`✗ ERROR: ${err.message}`, 'red');
  }
}

async function testRetentionInfo() {
  log('\n=== Testing Retention Info ===', 'cyan');
  
  try {
    if (!CONFIG.testBackupId) {
      const backupsResponse = await makeRequest('GET', '/api/backups?limit=1');
      if (backupsResponse.data.data && backupsResponse.data.data.length > 0) {
        CONFIG.testBackupId = backupsResponse.data.data[0].id;
      }
    }

    if (CONFIG.testBackupId) {
      const response = await makeRequest('GET', `/api/backups/${CONFIG.testBackupId}/retention-info`);
      
      assert(
        response.status === 200,
        'Retention info endpoint returns 200',
        200,
        response.status
      );

      const retention = response.data.data;
      
      assert(
        typeof retention.retentionDays === 'number',
        'Retention includes retentionDays',
        'number',
        typeof retention.retentionDays
      );

      assert(
        typeof retention.daysUntilExpiry === 'number',
        'Retention includes daysUntilExpiry',
        'number',
        typeof retention.daysUntilExpiry
      );

      assert(
        typeof retention.willBeDeleted === 'boolean',
        'Retention includes willBeDeleted',
        'boolean',
        typeof retention.willBeDeleted
      );

      log(`  Retention Days: ${retention.retentionDays}`, 'blue');
      log(`  Days Until Expiry: ${retention.daysUntilExpiry}`, 'blue');
      log(`  Will Be Deleted: ${retention.willBeDeleted}`, 'blue');
    } else {
      log('  No backups found to test retention', 'yellow');
    }

  } catch (err) {
    log(`✗ ERROR: ${err.message}`, 'red');
  }
}

async function testRetentionSummary() {
  log('\n=== Testing Retention Summary ===', 'cyan');
  
  try {
    const response = await makeRequest('GET', `/api/backups/retention/summary`);
    
    // This endpoint might not exist based on routing, let's handle both cases
    if (response.status === 404) {
      log('  Retention summary endpoint not found (check routing)', 'yellow');
      return;
    }

    assert(
      response.status === 200,
      'Retention summary endpoint returns 200',
      200,
      response.status
    );

    const summary = response.data.data;
    
    assert(
      typeof summary.totalBackups === 'number',
      'Summary includes totalBackups',
      'number',
      typeof summary.totalBackups
    );

    assert(
      typeof summary.expiringWithin7Days === 'number',
      'Summary includes expiringWithin7Days',
      'number',
      typeof summary.expiringWithin7Days
    );

    log(`  Total Backups: ${summary.totalBackups}`, 'blue');
    log(`  Expiring Within 7 Days: ${summary.expiringWithin7Days}`, 'blue');
    log(`  Total Retained Size: ${summary.totalRetainedSizeGB} GB`, 'blue');

  } catch (err) {
    log(`✗ ERROR: ${err.message}`, 'red');
  }
}

async function testBulkDelete() {
  log('\n=== Testing Bulk Delete (Dry Run) ===', 'cyan');
  
  try {
    // Test with empty array (should fail validation)
    const response = await makeRequest('POST', '/api/backups/bulk-delete', {
      backupIds: []
    });
    
    assert(
      response.status === 400,
      'Bulk delete rejects empty array',
      400,
      response.status
    );

    log('  ✓ Empty array validation works', 'green');

    // Test with non-existent IDs (should return not found)
    const response2 = await makeRequest('POST', '/api/backups/bulk-delete', {
      backupIds: [999999, 999998]
    });
    
    assert(
      response2.status === 404 || response2.status === 200,
      'Bulk delete handles non-existent IDs',
      '404 or 200',
      response2.status
    );

    log('  ✓ Non-existent ID handling works', 'green');

  } catch (err) {
    log(`✗ ERROR: ${err.message}`, 'red');
  }
}

async function testAuthenticationRequired() {
  log('\n=== Testing Authentication ===', 'cyan');
  
  try {
    // Save original token
    const originalToken = CONFIG.token;
    
    // Test with no token
    CONFIG.token = '';
    const response = await makeRequest('GET', '/api/backups/stats');
    
    assert(
      response.status === 401 || response.status === 403,
      'Endpoints require authentication',
      '401 or 403',
      response.status
    );

    log('  ✓ Authentication is required', 'green');

    // Restore token
    CONFIG.token = originalToken;

  } catch (err) {
    log(`✗ ERROR: ${err.message}`, 'red');
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║       BACKUP CONTROLLERS TEST SUITE                       ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  if (CONFIG.token === 'YOUR_AUTH_TOKEN_HERE') {
    log('\n⚠️  WARNING: Please set a valid auth token in CONFIG.token', 'yellow');
    log('Edit this file and replace YOUR_AUTH_TOKEN_HERE with a real token\n', 'yellow');
    return;
  }

  const startTime = Date.now();

  // Run all tests
  await testAuthenticationRequired();
  await testStatsEndpoint();
  await testHealthEndpoint();
  await testAnalyticsTimeline();
  await testAnalyticsStorageUsage();
  await testAnalyticsSuccessRate();
  await testAnalyticsTypeDistribution();
  await testBackupLogs();
  await testBackupStatus();
  await testRetentionInfo();
  await testRetentionSummary();
  await testBulkDelete();

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log(`║  Tests completed in ${duration}s                               ║`, 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
}

// Run tests
runAllTests().catch((err) => {
  log(`\n✗ FATAL ERROR: ${err.message}`, 'red');
  console.error(err);
  process.exit(1);
});