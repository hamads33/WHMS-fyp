// src/modules/marketplace/services/manifestValidator.js
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const semver = require("semver");
const fs = require("fs");
const path = require("path");

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

// Manifest schema (extend as needed)
const manifestSchema = {
  type: "object",
  required: ["id", "name", "version", "actions"],
  properties: {
    id: { type: "string", pattern: "^[a-z0-9-_]+$" },
    name: { type: "string" },
    version: { type: "string" },
    description: { type: "string" },
    actions: {
      type: "object",
      additionalProperties: {
        type: "object",
        required: ["file", "fnName"],
        properties: {
          file: { type: "string" },
          fnName: { type: "string" },
          description: { type: "string" }
        }
      }
    },
    ui: {
      type: "object",
      properties: {
        pages: { type: "object", additionalProperties: { type: "string" } }
      },
      additionalProperties: true
    },
    dependencies: {
      // allow either object or array of objects
      anyOf: [
        {
          type: "object",
          additionalProperties: { type: "string" } // { "plugin_id": ">=1.0.0" }
        },
        {
          type: "array",
          items: {
            type: "object",
            required: ["id", "versionRange"],
            properties: {
              id: { type: "string" },
              versionRange: { type: "string" }
            }
          }
        }
      ]
    }
  },
  additionalProperties: true
};

const validateAjv = ajv.compile(manifestSchema);

function fileExists(baseDir, relPath) {
  const p = path.join(baseDir, relPath);
  return fs.existsSync(p) && fs.lstatSync(p).isFile();
}

function validate(manifest, opts = {}) {
  const errors = [];

  // ajv basic structural validation
  const ok = validateAjv(manifest);
  if (!ok) {
    for (const e of validateAjv.errors || []) {
      errors.push(`${e.instancePath} ${e.message}`);
    }
  }

  // semver check
  if (manifest.version && !semver.valid(manifest.version)) {
    errors.push("manifest.version must be a valid semver (x.y.z)");
  }

  // product id vs manifest.id check if provided
  if (opts.productId && manifest.id && manifest.id !== opts.productId) {
    errors.push("manifest.id must match productId");
  }

  // validate action files exist
  if (manifest.actions && opts.topFolder) {
    for (const [actionName, actionDef] of Object.entries(manifest.actions)) {
      if (!actionDef || !actionDef.file) {
        errors.push(`actions.${actionName}.file missing`);
        continue;
      }
      if (!fileExists(opts.topFolder, actionDef.file)) {
        errors.push(`actions.${actionName}.file not found: ${actionDef.file}`);
      }
    }
  }

  // validate UI files exist
  if (manifest.ui && manifest.ui.pages && opts.topFolder) {
    for (const [pageName, pagePath] of Object.entries(manifest.ui.pages)) {
      if (!fileExists(opts.topFolder, pagePath)) {
        errors.push(`ui.pages.${pageName} not found: ${pagePath}`);
      }
    }
  }

  // validate dependencies format & semver ranges
  if (manifest.dependencies) {
    // normalized to array
    let deps = [];
    if (Array.isArray(manifest.dependencies)) deps = manifest.dependencies;
    else if (typeof manifest.dependencies === "object") {
      deps = Object.entries(manifest.dependencies).map(([id, vr]) => ({ id, versionRange: vr }));
    } else {
      errors.push("dependencies must be object or array");
    }

    for (const d of deps) {
      if (!d.id || !d.versionRange) {
        errors.push("each dependency must include id and versionRange");
        continue;
      }
      // check semver range
      try {
        if (!semver.validRange(d.versionRange)) {
          errors.push(`dependency ${d.id} has invalid versionRange: ${d.versionRange}`);
        }
      } catch (e) {
        errors.push(`dependency ${d.id} has invalid versionRange: ${d.versionRange}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validate };
