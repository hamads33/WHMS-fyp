// src/modules/plugins/pluginEngine/sandbox.js
const { NodeVM } = require("vm2");
const URL = require("url").URL;

/**
 * createPluginVM
 *
 * @param {Object} opts
 * @param {Console|Object} opts.logger
 * @param {Object|null} opts.audit
 * @param {string[]} opts.allowedHosts
 * @param {number} opts.timeout
 * @param {number} opts.memoryLimit
 */
function createPluginVM({ logger = console, audit = null, allowedHosts = [], timeout = 5000, memoryLimit = 64 } = {}) {
  // Host-side safe http helper (proxied into VM)
  async function safeHttp(opts) {
    if (!opts || !opts.url) throw new Error("safe.http: missing url");
    const parsed = new URL(opts.url);
    const hostname = parsed.hostname;

    if (Array.isArray(allowedHosts) && allowedHosts.length) {
      if (!allowedHosts.includes(hostname)) {
        throw new Error(`safe.http: host not allowed (${hostname})`);
      }
    } else {
      throw new Error("safe.http: no allowed hosts configured on server");
    }

    const axios = require("axios");
    const method = (opts.method || "GET").toLowerCase();
    const config = {
      url: opts.url,
      method,
      headers: opts.headers || {},
      data: opts.body,
      timeout: opts.timeout || 5000,
      validateStatus: () => true,
    };

    const res = await axios(config);
    return {
      status: res.status,
      headers: res.headers,
      data: res.data,
    };
  }

  const safeAPI = {
    log: {
      info: (...args) => logger.info("[plugin]", ...args),
      warn: (...args) => logger.warn("[plugin]", ...args),
      error: (...args) => logger.error("[plugin]", ...args),
    },
    now: () => Date.now(),
    audit: audit
      ? {
          async record(actor, action, meta) {
            try {
              await audit.log(actor, action, meta);
              return { ok: true };
            } catch (e) {
              return { ok: false, error: e.message };
            }
          },
        }
      : null,
    http: safeHttp,
  };

  const vm = new NodeVM({
    console: "inherit", // keep plugin logs visible under host logger
    sandbox: { safe: safeAPI },
    require: {
      external: false,
      builtin: [], // disallow Node built-ins in plugin
      context: "sandbox",
    },
    wrapper: "commonjs",
    timeout,
    memoryLimit,
  });

  return vm;
}

module.exports = { createPluginVM };
