// src/modules/plugins/pluginEngine/vmExecutor.js
const path = require("path");
const fs = require("fs");
const { NodeVM } = require("vm2");

class VMExecutor {
  constructor({ logger, allowBuiltin = ["path", "url"] } = {}) {
    this.logger = logger || console;
    this.allowBuiltin = allowBuiltin;
  }

  async run({ pluginId, pluginDir, actionFile, fnName = null, meta = {}, timeout = 5000 }) {
    const actionPath = path.isAbsolute(actionFile)
      ? actionFile
      : path.join(pluginDir, actionFile);

    if (!fs.existsSync(actionPath)) {
      const msg = `Action file not found: ${actionPath}`;
      this.logger.error(msg);
      throw new Error(msg);
    }

 const axios = require("axios");
const { NodeVM } = require("vm2");

const vm = new NodeVM({
  console: "inherit",
  sandbox: {
    axios,          // <-- make axios available inside VM
    PLUGIN_META: meta
  },
  require: {
    external: true, // <-- allow requiring external modules
    builtin: [],    // optional
    root: pluginDir,
    context: "sandbox",
  },
  wrapper: "commonjs",
  timeout,
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
          `No callable export in ${actionPath}. Export a function or handler/main.`
        );
      }

      const result = await Promise.resolve(fn(meta));
      return result;
    } catch (err) {
      this.logger.error(`Plugin VM Error [${pluginId}] ${err.stack || err.message}`);
      throw err;
    }
  }
}

module.exports = VMExecutor;
