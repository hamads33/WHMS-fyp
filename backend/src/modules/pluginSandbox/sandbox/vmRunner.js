// src/modules/pluginSandbox/sandbox/vmRunner.js
const vm = require("vm");
const safeGlobals = require("./safeGlobals");
const safeRequire = require("./safeRequire");

async function run(pluginCode, config, ctx) {
  const sandbox = {
    console,
    require: safeRequire,
    module: { exports: {} },
    exports: {},
    process: undefined, // Block process access
    setTimeout,
    clearTimeout,
    ...safeGlobals,
    __config: config,
    __ctx: ctx
  };

  const script = new vm.Script(pluginCode, {
    filename: "plugin.js",
    displayErrors: true
  });

  const context = vm.createContext(sandbox);

  script.runInContext(context);

  // plugin must export execute()
  if (typeof sandbox.module.exports.execute !== "function") {
    throw new Error("Plugin must export execute(ctx, config)");
  }

  return await sandbox.module.exports.execute(ctx, config);
}

module.exports = { run };
