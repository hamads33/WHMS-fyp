/**
 * staticAnalysis.service.js
 *
 * Lightweight static analysis for uploaded plugin archives.
 * - Runs ESLint (if JS files present)
 * - Scans code for suspicious constructs (eval, Function, child_process)
 * - Checks file sizes and counts
 *
 * For heavy duty static analysis (SAST) integrate with an external tool.
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const glob = require('glob');
const child_process = require('child_process');
const exec = promisify(child_process.exec);

const StaticAnalysisService = {
  /**
   * Analyze extracted plugin folder.
   * @param {String} folder - absolute path
   * @param {Object} opts - { maxFileSizeMB, maxFiles }
   * @returns {Object} { passed: Boolean, issues: Array }
   */
  async analyzeFolder(folder, opts = {}) {
    const issues = [];
    const maxFileSizeMB = opts.maxFileSizeMB || 5;
    const maxFiles = opts.maxFiles || 2000;

    // 1) File count & file sizes
    const files = glob.sync('**/*', { cwd: folder, nodir: true, dot: true });
    if (files.length > maxFiles) issues.push({ code: 'TOO_MANY_FILES', message: `Archive contains ${files.length} files (> ${maxFiles})` });

    for (const f of files) {
      const p = path.join(folder, f);
      const stat = fs.statSync(p);
      const sizeMB = stat.size / (1024*1024);
      if (sizeMB > maxFileSizeMB) {
        issues.push({ code: 'LARGE_FILE', file: f, message: `File ${f} is ${sizeMB.toFixed(2)} MB (> ${maxFileSizeMB}MB)` });
      }
    }

    // 2) Quick pattern scan for suspicious code (eval, new Function, child_process)
    const jsFiles = files.filter(x => x.endsWith('.js') || x.endsWith('.mjs') || x.endsWith('.cjs'));
    for (const jf of jsFiles.slice(0, 500)) { // limit to first 500 files for performance
      try {
        const txt = fs.readFileSync(path.join(folder, jf), 'utf8');
        if (/eval\s*\(/.test(txt)) issues.push({ code: 'EVAL_USAGE', file: jf, message: 'eval() usage detected' });
        if (/new\s+Function\s*\(/.test(txt)) issues.push({ code: 'NEW_FUNCTION', file: jf, message: 'new Function() detected' });
        if (/require\(['"]child_process['"]\)/.test(txt) || /child_process\./.test(txt)) issues.push({ code: 'CHILD_PROCESS', file: jf, message: 'child_process usage detected' });
      } catch (e) {
        // ignore unreadable file
      }
    }

    // 3) Optionally run ESLint if available in environment
    let eslintReport = null;
    try {
      // write a temporary package.json to enable eslint if needed (not always present)
      // Only run `npx eslint` if eslint available
      const hasJs = jsFiles.length > 0;
      if (hasJs) {
        const { stdout } = await exec(`npx eslint "${folder}/**/*.js" -f friendly --no-color`, { timeout: 60*1000 });
        eslintReport = stdout;
        // Note: parsing stdout for issues is left to client. If eslint exits non-zero it throws.
      }
    } catch (e) {
      // eslint may not be installed or may fail. We capture the error as potential issues
      issues.push({ code: 'ESLINT_FAILED', message: e.message });
    }

    const passed = issues.length === 0;

    return { passed, issues, eslintReport };
  }
};

module.exports = StaticAnalysisService;
