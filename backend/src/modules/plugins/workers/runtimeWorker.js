/**
 * runtimeWorker.js
 *
 * Worker thread that loads plugin entry code inside Node VM with restricted globals.
 * - Runs small execution to detect immediate runtime errors.
 * - If plugin exposes a synchronous or async `selftest()` function on module.exports, it will run it.
 *
 * NOTE: This is a smoke-test only. For deep runtime isolation use OS-level containers.
 */

const { parentPort, workerData } = require('worker_threads');
const vm = require('vm');
const fs = require('fs');
const path = require('path');

(async () => {
  const logs = [];
  const pushLog = (lvl, msg) => logs.push({ lvl, msg, ts: new Date().toISOString() });

  try {
    const { folder, manifest, timeoutMs } = workerData;

    if (!folder || !fs.existsSync(folder)) {
      parentPort.postMessage({ passed: false, logs, details: { error: 'plugin folder missing' } });
      return;
    }

    // determine entry file
    const entry = (manifest && manifest.entry) || 'index.js';
    const entryPath = path.join(folder, entry);

    if (!fs.existsSync(entryPath)) {
      pushLog('error', `Entry file not found: ${entryPath}`);
      parentPort.postMessage({ passed: false, logs, details: { error: 'entry_not_found', entryPath } });
      return;
    }

    // read code
    const code = fs.readFileSync(entryPath, 'utf8');

    // build a minimal sandbox
    const sandboxConsole = {
      log: (...args) => pushLog('log', args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')),
      warn: (...args) => pushLog('warn', args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')),
      error: (...args) => pushLog('error', args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '))
    };

    const sandbox = {
      console: sandboxConsole,
      module: { exports: {} },
      exports: {},
      // disable require to prevent filesystem/network access
      require: () => { throw new Error('require() is disabled in runtime smoke-test'); },
      setTimeout,
      setInterval: () => { throw new Error('setInterval disabled'); },
      Buffer: undefined,
      process: { env: {} } // limited process object to prevent access
    };

    const script = new vm.Script(code, { filename: entryPath });

    const context = vm.createContext(sandbox, { name: 'plugin-sandbox' });

    // run synchronously with a timeout. vm.runInContext supports `timeout` option for synchronous code.
    try {
      script.runInContext(context, { timeout: Math.max(timeoutMs || 2000, 2000) });
      pushLog('info', 'Execution completed (sync)');
    } catch (e) {
      pushLog('error', 'Script execution error: ' + e.message);
      parentPort.postMessage({ passed: false, logs, details: { error: 'execution_error', message: e.message } });
      return;
    }

    // If module exports a selftest function, attempt to run it (may be sync or return Promise)
    const exported = sandbox.module && sandbox.module.exports ? sandbox.module.exports : sandbox.exports;
    if (exported && typeof exported.selftest === 'function') {
      pushLog('info', 'selftest() found, invoking');
      try {
        const result = exported.selftest();
        // if returns promise, await with timeout guard
        const promiseWithTimeout = (p, ms) => new Promise((resolve, reject) => {
          let done = false;
          const t = setTimeout(() => { if (!done) { done = true; reject(new Error('selftest timeout')); } }, ms);
          Promise.resolve(p).then((r) => { if (!done) { done = true; clearTimeout(t); resolve(r); } }).catch((err) => { if (!done) { done = true; clearTimeout(t); reject(err); } });
        });

        const outcome = await promiseWithTimeout(result, Math.max(timeoutMs || 2000, 2000));
        pushLog('info', 'selftest result: ' + (typeof outcome === 'string' ? outcome : JSON.stringify(outcome)));
        parentPort.postMessage({ passed: true, logs, details: { smokeTest: outcome } });
        return;
      } catch (e) {
        pushLog('error', 'selftest failed: ' + e.message);
        parentPort.postMessage({ passed: false, logs, details: { error: 'selftest_failed', message: e.message } });
        return;
      }
    }

    // no selftest -> success of basic execution
    parentPort.postMessage({ passed: true, logs, details: { smokeTest: 'no_selftest, basic_exec_ok' } });
  } catch (err) {
    parentPort.postMessage({ passed: false, logs, details: { error: err.message } });
  }
})();
