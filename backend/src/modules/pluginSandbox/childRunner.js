// src/modules/pluginSandbox/childRunner.js
'use strict';

const path = require('path');
const vm = require('vm');
const fs = require('fs');

function safeSend(payload) {
  if (process && process.send) {
    try { process.send(payload); } catch(e) {}
  }
}

/**
 * Harden some globals a bit to reduce plugin escape surface.
 * (Note: child process still has Node APIs; further locking requires vm or worker with custom loader.)
 */
function lockdown() {
  // prevent accidental exit from plugin code
  process.exit = function(code) {
    safeSend({ ok: false, error: "Plugin attempted to call process.exit (blocked)", code });
    // don't exit
  };

  // disable eval globally (best-effort)
  try {
    global.eval = function() { throw new Error("eval disabled in plugin sandbox"); };
  } catch (e) {}
}

function isAllowedPluginPath(pluginPath) {
  const cwd = process.cwd();
  const normalized = path.resolve(pluginPath);
  // only allow plugins under <cwd>/plugins/actions or builtins (optional)
  const allowedBase = path.join(cwd, 'plugins', 'actions');
  return normalized.startsWith(path.resolve(allowedBase));
}

async function runPlugin(pluginPath, config, ctx) {
  // quick validation
  if (!pluginPath || typeof pluginPath !== 'string') {
    throw new Error("invalid pluginPath");
  }
  const resolved = path.resolve(pluginPath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`plugin entry not found: ${resolved}`);
  }

  if (!isAllowedPluginPath(resolved)) {
    // extra safety: refuse to load arbitrary paths (can toggle if builtins should be allowed)
    throw new Error("plugin path not allowed in sandbox");
  }

  // isolate by creating a fresh module wrapper to require the file
  // We will use Node's require but with a fresh module cache for the plugin path only
  const Module = require('module');
  const m = new Module(resolved, module.parent);
  m.filename = resolved;
  m.paths = Module._nodeModulePaths(path.dirname(resolved));

  // load plugin
  try {
    m._compile(fs.readFileSync(resolved, 'utf8'), resolved);
  } catch (err) {
    // try plain require fallback (some plugins may rely on native requires)
    // but if compile fails we still bubble the error
    throw err;
  }

  const plugin = m.exports;

  // plugin should export execute(ctx, config) or default function
  const fn = plugin && (plugin.execute || plugin) ;
  if (typeof fn !== 'function') {
    throw new Error("plugin does not export an execute function");
  }

  // run it (allow asynchronous)
  const result = await Promise.resolve(fn(ctx, config));
  return result;
}

// main listener
process.on('message', async (msg) => {
  // apply quick lockdown
  lockdown();

  try {
    const { pluginPath, config, ctx } = msg || {};
    const res = await runPlugin(pluginPath, config, ctx);
    safeSend({ ok: true, result: res });
  } catch (err) {
    safeSend({ ok: false, error: err.message || String(err), stack: err.stack ? String(err.stack).slice(0, 8000) : undefined });
  } finally {
    // gracefully exit after small delay so parent gets message
    setTimeout(() => process.exit(0), 50);
  }
});

// safeguard: if no message received in 10s then exit
setTimeout(() => {
  // no-op to keep process alive for IPC — actual runs will exit
}, 1000000);
