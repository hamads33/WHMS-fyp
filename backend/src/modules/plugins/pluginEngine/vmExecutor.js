// src/modules/plugins/pluginEngine/vmExecutor.js
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const { NodeVM } = require("vm2");

/**
 * Executes JS plugin actions inside a sandboxed VM
 * Supports:
 *   - export default function
 *   - module.exports = function
 *   - exports.handler()
 *   - exports.main()
 */
class VMExecutor {
  constructor({ logger, allowBuiltin = ["path", "url"] } = {}) {
    this.logger = logger || console;
    this.allowBuiltin = allowBuiltin;
  }

  async run({ pluginId, pluginDir, actionFile, fnName = null, meta = {}, timeout = 5000 }) {
    // Resolve action path
    const actionPath = path.isAbsolute(actionFile)
      ? actionFile
      : path.join(pluginDir, actionFile);

    if (!fs.existsSync(actionPath)) {
      const msg = `Action file not found: ${actionPath}`;
      this.logger.error(msg);
      throw new Error(msg);
    }

    // -------------------------------
    // Construct sandboxed VM
    // -------------------------------
    const vm = new NodeVM({
      console: "inherit",
      timeout,

      sandbox: {
        axios,       // Allow axios inside plugin VM
        PLUGIN_META: meta,
      },

      require: {
        external: true,   // Allow requiring dependencies inside plugin folder
        builtin: this.allowBuiltin,
        root: pluginDir,
        context: "sandbox",
      },

      wrapper: "commonjs",
    });

    try {
      // Load plugin action file inside VM
      const exported = vm.require(actionPath);

      // Determine callable function
      let fn = null;
      if (typeof exported === "function") fn = exported;
      else if (fnName && typeof exported[fnName] === "function") fn = exported[fnName];
      else if (typeof exported.handler === "function") fn = exported.handler;
      else if (typeof exported.main === "function") fn = exported.main;

      if (!fn) {
        throw new Error(
          `No callable export in ${actionPath}. Export a function, handler(), or main().`
        );
      }

      // Execute plugin code safely inside VM
      const result = await Promise.resolve(fn(meta));
      return result;

    } catch (err) {
      this.logger.error(`Plugin VM Error [${pluginId}] → ${err.stack || err.message}`);
      throw err;
    }
  }
}

module.exports = VMExecutor;
