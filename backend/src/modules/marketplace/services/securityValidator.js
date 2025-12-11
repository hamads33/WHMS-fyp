// src/modules/marketplace/services/securityValidator.js
const fs = require("fs");
const path = require("path");

// Configuration thresholds (tune these)
const MAX_FILE_COUNT = 10000;           // if more, suspect zip-bomb
const MAX_TOTAL_UNCOMPRESSED = 500 * 1024 * 1024; // 500 MB
const MAX_SINGLE_FILE = 150 * 1024 * 1024; // 150 MB
const FORBIDDEN_EXT = [
  ".exe", ".dll", ".bat", ".sh", ".cmd", ".py", ".php", ".pl", ".so", ".dylib"
];

const DANGEROUS_PATTERNS = [
  "eval(", "new Function(", "child_process", "require('child_process')", "require(\"child_process\")",
  "fs.writeFile", "fs.writeFileSync", "process.env", "process.exec", "spawn(", "exec(", "System.exit",
  "XMLHttpRequest", "fetch(", "atob(", "btoa("
];

function walkStats(folder) {
  let count = 0;
  let totalSize = 0;
  const files = [];

  const stack = [folder];
  while (stack.length) {
    const cur = stack.pop();
    const entries = fs.readdirSync(cur, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(cur, ent.name);
      if (ent.isDirectory()) {
        stack.push(full);
      } else {
        count++;
        let size = 0;
        try { size = fs.statSync(full).size; } catch (e) { size = 0; }
        totalSize += size;
        files.push({ path: full, name: ent.name, size });
      }
    }
  }
  return { count, totalSize, files };
}

function scan(folder) {
  const reasons = [];

  try {
    const stats = walkStats(folder);

    // ZIP bomb heuristics
    if (stats.count > MAX_FILE_COUNT) reasons.push(`too_many_files: ${stats.count} files`);
    if (stats.totalSize > MAX_TOTAL_UNCOMPRESSED) reasons.push(`total_uncompressed_size_exceeds: ${stats.totalSize} bytes`);
    const bigFiles = stats.files.filter(f => f.size > MAX_SINGLE_FILE);
    for (const bf of bigFiles) reasons.push(`large_file: ${bf.name} size=${bf.size}`);

    // Forbidden extensions & JS static analysis
    for (const f of stats.files) {
      const ext = path.extname(f.name).toLowerCase();
      if (FORBIDDEN_EXT.includes(ext)) {
        reasons.push(`forbidden_file_extension: ${ext} at ${path.relative(folder, f.path)}`);
      }
      // examine text files (basic)
      const textExt = [".js", ".mjs", ".cjs", ".ts", ".jsx", ".tsx", ".json", ".html", ".htm"];
      if (textExt.includes(ext)) {
        try {
          const content = fs.readFileSync(f.path, "utf8");
          for (const p of DANGEROUS_PATTERNS) {
            if (content.includes(p)) {
              reasons.push(`dangerous_pattern "${p}" found in ${path.relative(folder, f.path)}`);
            }
          }
          // additional: suspicious long eval strings
          if ((content.match(/eval\(/g) || []).length > 3) {
            reasons.push(`multiple_eval_calls in ${path.relative(folder, f.path)}`);
          }
        } catch (e) {
          // ignore
        }
      }
    }
  } catch (e) {
    return { ok: false, reasons: ["scanner_failed", e.message] };
  }

  return { ok: reasons.length === 0, reasons };
}

module.exports = { scan };
