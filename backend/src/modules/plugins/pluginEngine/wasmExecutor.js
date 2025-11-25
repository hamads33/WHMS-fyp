// src/modules/plugins/pluginEngine/wasmExecutor.js
const fs = require("fs");
const path = require("path");
const { WASI } = require("wasi"); // Node >=14.17 recommended
const { TextDecoder, TextEncoder } = require("util");

class WASMExecutor {
  constructor({ logger = console, wasmTimeoutMs = 5000 } = {}) {
    this.logger = logger;
    this.wasmTimeoutMs = wasmTimeoutMs;
  }

  /**
   * Run a WASM action
   * @param {Object} options
   * @param {string} options.pluginId
   * @param {string} options.pluginDir  // absolute path to plugin folder
   * @param {string} options.wasmFile   // wasm file path relative to pluginDir
   * @param {string} options.exportName // exported function to call (optional)
   * @param {Object} options.meta       // JSON-serializable meta passed to the wasm module (stringified)
   */
  async run({ pluginId, pluginDir, wasmFile, exportName = "run", meta = {} }) {
    const wasmPath = path.isAbsolute(wasmFile) ? wasmFile : path.join(pluginDir, wasmFile);
    if (!fs.existsSync(wasmPath)) {
      throw new Error(`WASM file not found: ${wasmPath}`);
    }

    // Read wasm binary
    const wasmBuffer = fs.readFileSync(wasmPath);

    // Prepare WASI instance with minimal env and preopened cwd (pluginDir)
    const wasi = new WASI({
      args: [],
      env: {},
      preopens: {
        "/plugin": pluginDir
      }
    });

    const importObject = {
      wasi_snapshot_preview1: wasi.wasiImport,
      // Host bridging helpers: expose `host_print(ptr, len)` etc.
      env: {
        // log string from wasm (ptr, len)
        host_print: (ptr, len) => {
          try {
            const mem = instance.exports.memory;
            const bytes = new Uint8Array(mem.buffer, ptr, len);
            const str = new TextDecoder().decode(bytes);
            this.logger.info(`[wasm ${pluginId}] ${str}`);
          } catch (e) {
            this.logger.warn("[wasm] host_print failed", e);
          }
        }
      }
    };

    // Instantiate WebAssembly
    let module;
    try {
      module = await WebAssembly.compile(wasmBuffer);
    } catch (err) {
      throw new Error("WASM compile failed: " + err.message);
    }

    let instance;
    try {
      instance = await WebAssembly.instantiate(module, importObject);
    } catch (err) {
      throw new Error("WASM instantiate failed: " + err.message);
    }

    // Start WASI if present
    try {
      wasi.start(instance);
    } catch (_) {
      // some modules don't use wasi.start; that's OK
    }

    // If the exported fn exists and expects a pointer to input JSON, try to call it.
    const exports = instance.exports || {};
    const fn = exports[exportName] || null;

    // If no exported function, but module exports "_start" or so, try to call _start
    if (!fn) {
      if (typeof exports._start === "function") {
        try {
          exports._start();
          return { ok: true, result: null };
        } catch (err) {
          throw new Error("WASM _start failed: " + err.message);
        }
      }
      throw new Error(`WASM export '${exportName}' not found in ${wasmPath}`);
    }

    // If function signature expects a pointer, we need to pass input; but we can't know ABI.
    // We'll support two conventions:
    // 1) export fn run(ptr, len) => writes result to WASI stdout or memory (not covered)
    // 2) export fn run() and module reads from preopened file '/plugin/input.json'
    // We'll do (2): write meta to /plugin/input.json then call run()
    try {
      const inputJson = JSON.stringify(meta || {});
      const inputPath = path.join(pluginDir, "input.json");
      fs.writeFileSync(inputPath, inputJson, "utf8");
    } catch (err) {
      this.logger.warn("wasmExecutor: failed to write input.json", err);
    }

    // Call exported function — wrap in timeout
    const callPromise = new Promise((resolve, reject) => {
      try {
        // Many WASM functions return integer codes; we accept any return.
        const result = fn();
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("WASM execution timeout")), this.wasmTimeoutMs)
    );

    try {
      const raw = await Promise.race([callPromise, timeoutPromise]);
      return { ok: true, result: raw };
    } catch (err) {
      throw new Error("WASM execution failed: " + err.message);
    }
  }
}

module.exports = WASMExecutor;
