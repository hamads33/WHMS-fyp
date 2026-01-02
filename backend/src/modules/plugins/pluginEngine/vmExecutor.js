// src/modules/plugins/pluginEngine/vmExecutor.js
console.log("🔥 VMExecutor LOADED FROM:", __filename);

const path = require("path");
const fs = require("fs");
const { NodeVM } = require("vm2");

/**
 * Executes JS plugin actions inside a sandboxed VM
 * Contract:
 *   run({ pluginId, pluginDir, actionFile, fnName, meta })
 */
class VMExecutor {
  constructor({
    logger,
    allowBuiltin = [
      "path",
      "url",
      "util",
      "events",
      "stream",
      "buffer",
      "querystring"
    ]
  } = {}) {
    this.logger = logger || console;
    this.allowBuiltin = allowBuiltin;
  }

  async run({
    pluginId,
    pluginDir,
    actionFile,
    fnName = null,
    meta = {},
    timeout = 5000
  }) {
    // ---------------------------------------------
    // HARD SAFETY: JSON ONLY
    // ---------------------------------------------
    const safeMeta = JSON.parse(JSON.stringify(meta));

    const actionPath = path.isAbsolute(actionFile)
      ? actionFile
      : path.join(pluginDir, actionFile);

    if (!fs.existsSync(actionPath)) {
      throw new Error(`Action file not found: ${actionPath}`);
    }

    // ---------------------------------------------
    // VM CONFIGURATION (SAFE)
    // ---------------------------------------------
    const vm = new NodeVM({
      console: "inherit",
      timeout,

      sandbox: {
        PLUGIN_META: safeMeta   // ✅ JSON only
      },

      require: {
        external: true,         // axios allowed
        builtin: this.allowBuiltin,
        root: pluginDir,
        context: "sandbox"
      },

      wrapper: "commonjs"
    });

    try {
      const exported = vm.require(actionPath);

      let fn = null;
      if (typeof exported === "function") fn = exported;
      else if (fnName && typeof exported[fnName] === "function") fn = exported[fnName];
      else if (typeof exported.handler === "function") fn = exported.handler;
      else if (typeof exported.main === "function") fn = exported.main;

      if (!fn) {
        throw new Error(
          `No callable export in ${actionPath}. Export function | handler | main`
        );
      }

      // ---------------------------------------------
      // EXECUTE INSIDE VM
      // ---------------------------------------------
      return await Promise.resolve(
        fn({ meta: safeMeta })
      );

    } catch (err) {
      this.logger.error(
        `Plugin VM Error [${pluginId}] → ${err.stack || err.message}`
      );
      throw err;
    }
  }
}

module.exports = VMExecutor;
