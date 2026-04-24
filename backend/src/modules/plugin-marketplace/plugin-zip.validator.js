/**
 * plugin-zip.validator.js
 * ------------------------------------------------------------------
 * Validates the contents of an extracted plugin zip folder.
 *
 * Required files:
 *   plugin.js
 *   package.json  (must contain name, version, main)
 *
 * Optional files (not validated but documented):
 *   service.js
 *   hooks.js
 *   api.js
 *   migrations/
 *   README.md
 *   icon.png
 */

const fs   = require("fs");
const path = require("path");

/**
 * validateExtractedPlugin
 * Checks that the extracted folder is a valid plugin.
 *
 * @param  {string} folderPath  - Absolute path to the extracted plugin folder
 * @returns {{ valid: boolean, errors: string[], meta: object|null }}
 */
function validateExtractedPlugin(folderPath) {
  const errors = [];
  let meta = null;

  // 1. plugin.js must exist
  const pluginJsPath = path.join(folderPath, "plugin.js");
  if (!fs.existsSync(pluginJsPath)) {
    errors.push("Missing required file: plugin.js");
  }

  // 2. package.json must exist and contain required fields
  const packageJsonPath = path.join(folderPath, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    errors.push("Missing required file: package.json");
  } else {
    let pkg;
    try {
      pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    } catch {
      errors.push("package.json is not valid JSON");
      pkg = null;
    }

    if (pkg) {
      if (!pkg.name || typeof pkg.name !== "string") {
        errors.push("package.json must include a valid \"name\" field");
      }
      if (!pkg.version || typeof pkg.version !== "string") {
        errors.push("package.json must include a valid \"version\" field");
      }
      if (!pkg.main || typeof pkg.main !== "string") {
        errors.push("package.json must include a valid \"main\" field");
      }

      // Store metadata for caller
      meta = {
        name        : pkg.name,
        version     : pkg.version,
        main        : pkg.main,
        pluginType  : pkg.plugin?.type || null,
      };
    }
  }

  return {
    valid  : errors.length === 0,
    errors,
    meta,
  };
}

module.exports = { validateExtractedPlugin };
