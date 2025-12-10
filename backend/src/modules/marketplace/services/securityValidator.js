// src/modules/marketplace/services/securityValidator.js
const fs = require("fs");
const path = require("path");

const FORBIDDEN_EXT = [
  ".exe", ".dll", ".bat", ".sh", ".cmd", ".py", ".php", ".pl", ".so", ".dll", ".dylib"
];

// Dangerous JS patterns (simple textual check)
const DANGEROUS_PATTERNS = [
  "eval(", "new Function(", "child_process", "require('child_process')", "require(\"child_process\")",
  "fs.writeFile", "fs.writeFileSync", "process.env", "process.exec", "spawn(", "exec("
];

function walkDir(baseDir, fileCallback) {
  const stack = [baseDir];
  while (stack.length) {
    const cur = stack.pop();
    const entries = fs.readdirSync(cur, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(cur, ent.name);
      if (ent.isDirectory()) {
        stack.push(full);
      } else {
        fileCallback(full);
      }
    }
  }
}

function scan(extractDir) {
  const reasons = [];

  try {
    walkDir(extractDir, (fullPath) => {
      const ext = path.extname(fullPath).toLowerCase();
      if (FORBIDDEN_EXT.includes(ext)) {
        reasons.push(`forbidden_file_extension: ${ext} at ${path.relative(extractDir, fullPath)}`);
      }

      // Quick JS content scan for dangerous patterns for .js/.mjs files and other text files
      const textExt = [".js", ".mjs", ".cjs", ".ts", ".jsx", ".tsx", ".json", ".html", ".htm"];
      if (textExt.includes(ext)) {
        try {
          const content = fs.readFileSync(fullPath, "utf8");
          for (const p of DANGEROUS_PATTERNS) {
            if (content.includes(p)) {
              reasons.push(`dangerous_pattern "${p}" found in ${path.relative(extractDir, fullPath)}`);
            }
          }
        } catch (e) {
          // ignore binary read errors
        }
      }
    });
  } catch (e) {
    return { ok: false, reasons: ["scanner_failed", e.message] };
  }

  return { ok: reasons.length === 0, reasons };
}

module.exports = { scan };
