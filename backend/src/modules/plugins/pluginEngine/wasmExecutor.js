// src/modules/plugins/pluginEngine/wasmExecutor.js
const fs = require("fs");
const path = require("path");
const { WASI } = require("wasi");
const { TextDecoder } = require("util");

/**
 * Executes WebAssembly plugin modules
 * Supports:
 *   - wasi modules using _start()
 *   - exported function "run"
 *   - metadata passed via input.json
 */
class WASMExecutor {
  constructor({ logger = console, wasmTimeoutMs = 5000 } = {}) {
    this.logger = logger;
    this.wasmTimeoutMs = wasmTimeoutMs;
  }

  async run({ pluginId, pluginDir, wasmFile, exportName = "run", meta = {} }) {
    const wasmPath = path.isAbsolute(wasmFile)
      ? wasmFile
      : path.join(pluginDir, wasmFile);

    if (!fs.existsSync(wasmPath)) {
      throw new Error(`WASM file not found: ${wasmPath}`);
    }

    const wasmBuffer = fs.readFileSync(wasmPath);

    // Prepare WASI runtime
    const wasi = new WASI({
      args: [],
      env: {},
      preopens: {
        "/plugin": pluginDir,
      },
    });

    // Host imports (allow wasm code to print logs)
    const importObject = {
      wasi_snapshot_preview1: wasi.wasiImport,
      env: {
        host_print: (ptr, len) => {
          try {
            const mem = instance.exports.memory;
            const bytes = new Uint8Array(mem.buffer, ptr, len);
            const text = new TextDecoder().decode(bytes);

            this.logger.info(`[wasm ${pluginId}] ${text}`);
          } catch (e) {
            this.logger.warn("[wasm] host_print failed", e);
          }
        },
      },
    };

    // Compile module
    const module = await WebAssembly.compile(wasmBuffer);

    // Instantiate
    let instance = await WebAssembly.instantiate(module, importObject);

    // WASI start (safe even if not needed)
    try {
      wasi.start(instance);
    } catch (_) {}

    // Determine exported function
    const exports = instance.exports;
    const fn = exports[exportName] || null;

    if (!fn) {
      if (typeof exports._start === "function") {
        exports._start();
        return { ok: true, result: null };
      }
      throw new Error(`WASM export '${exportName}' not found`);
    }

    // Write metadata into pluginDir/input.json
    try {
      fs.writeFileSync(
        path.join(pluginDir, "input.json"),
        JSON.stringify(meta || {}),
        "utf8"
      );
    } catch (err) {
      this.logger.warn("wasmExecutor: failed to write input.json", err);
    }

    // Execute with timeout
    const execution = new Promise((resolve, reject) => {
      try {
        const raw = fn();
        resolve(raw);
      } catch (err) {
        reject(err);
      }
    });

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("WASM execution timeout")), this.wasmTimeoutMs)
    );

    const raw = await Promise.race([execution, timeout]);
    return { ok: true, result: raw };
  }
}

module.exports = WASMExecutor;
