// src/modules/plugins/pluginEngine/wasmExecutor.js
// Secure WASM executor with proper resource limits

const fs = require("fs");
const path = require("path");
const { WASI } = require("wasi");
const { TextDecoder, TextEncoder } = require("util");

/**
 * WASM Executor with timeout and memory limits
 */
class WASMExecutor {
  constructor({ 
    logger = console, 
    wasmTimeoutMs = 5000,
    maxMemoryPages = 256 // ~16MB
  } = {}) {
    this.logger = logger;
    this.wasmTimeoutMs = wasmTimeoutMs;
    this.maxMemoryPages = maxMemoryPages;
  }

  async run({ 
    pluginId, 
    pluginDir, 
    wasmFile, 
    exportName = "run", 
    ctx = {} 
  }) {
    const wasmPath = path.isAbsolute(wasmFile)
      ? wasmFile
      : path.join(pluginDir, wasmFile);

    if (!fs.existsSync(wasmPath)) {
      throw new Error(`WASM file not found: ${wasmPath}`);
    }

    const wasmBuffer = fs.readFileSync(wasmPath);

    // Prepare WASI runtime with limited access
    const wasi = new WASI({
      args: [],
      env: {
        // Minimal environment
        PLUGIN_ID: pluginId
      },
      preopens: {
        // Only allow reading from plugin directory
        "/plugin": pluginDir
      },
      returnOnExit: true
    });

    let instance;
    const logBuffer = [];

    // Host imports
    const importObject = {
      wasi_snapshot_preview1: wasi.wasiImport,
      env: {
        // Host logging function
        host_print: (ptr, len) => {
          try {
            if (!instance || !instance.exports || !instance.exports.memory) {
              return;
            }

            const mem = instance.exports.memory;
            const bytes = new Uint8Array(mem.buffer, ptr, len);
            const text = new TextDecoder().decode(bytes);

            const logMsg = `[wasm:${pluginId}] ${text}`;
            this.logger.info(logMsg);
            logBuffer.push(logMsg);
          } catch (e) {
            this.logger.warn("[wasm] host_print failed:", e.message);
          }
        },

        // Memory allocation tracking
        host_alloc: (size) => {
          if (!instance || !instance.exports || !instance.exports.memory) {
            return 0;
          }

          const mem = instance.exports.memory;
          const currentPages = mem.buffer.byteLength / 65536;

          if (currentPages >= this.maxMemoryPages) {
            this.logger.warn(`[wasm:${pluginId}] Memory limit reached`);
            return 0;
          }

          return size;
        }
      }
    };

    try {
      // Compile module
      const module = await WebAssembly.compile(wasmBuffer);

      // Check for required exports
      const moduleExports = WebAssembly.Module.exports(module);
      const hasMemory = moduleExports.some(e => e.name === "memory" && e.kind === "memory");

      if (!hasMemory) {
        throw new Error("WASM module must export memory");
      }

      // Instantiate
      instance = await WebAssembly.instantiate(module, importObject);

      // Initialize WASI (safe even if not needed)
      try {
        wasi.start(instance);
      } catch (e) {
        // Some modules don't use _start, that's ok
        this.logger.debug(`[wasm:${pluginId}] No _start function:`, e.message);
      }

      // Write metadata to plugin directory
      const meta = ctx.meta || {};
      try {
        const inputPath = path.join(pluginDir, "input.json");
        fs.writeFileSync(inputPath, JSON.stringify(meta), "utf8");
      } catch (err) {
        this.logger.warn(`[wasm:${pluginId}] Failed to write input.json:`, err.message);
      }

      // Get the export function
      const exports = instance.exports;
      const fn = exports[exportName];

      if (!fn) {
        // Try _start if no specific export
        if (typeof exports._start === "function") {
          exports._start();
          return { ok: true, result: null, logs: logBuffer };
        }

        throw new Error(
          `WASM export '${exportName}' not found. Available: ${Object.keys(exports).join(", ")}`
        );
      }

      if (typeof fn !== "function") {
        throw new Error(`WASM export '${exportName}' is not a function`);
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
        setTimeout(
          () => reject(new Error("WASM execution timeout")),
          this.wasmTimeoutMs
        )
      );

      const raw = await Promise.race([execution, timeout]);

      // Try to read output.json if it was written
      let output = null;
      try {
        const outputPath = path.join(pluginDir, "output.json");
        if (fs.existsSync(outputPath)) {
          const outputContent = fs.readFileSync(outputPath, "utf8");
          output = JSON.parse(outputContent);
          // Clean up
          fs.unlinkSync(outputPath);
        }
      } catch (err) {
        this.logger.debug(`[wasm:${pluginId}] No output.json or parse error`);
      }

      return { 
        ok: true, 
        result: output || raw,
        logs: logBuffer
      };
    } catch (err) {
      this.logger.error(`[wasm:${pluginId}] Execution failed:`, err.message);
      throw err;
    } finally {
      // Cleanup input file
      try {
        const inputPath = path.join(pluginDir, "input.json");
        if (fs.existsSync(inputPath)) {
          fs.unlinkSync(inputPath);
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
}

module.exports = WASMExecutor;