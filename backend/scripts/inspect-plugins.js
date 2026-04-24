// scripts/inspect-plugins.js
// Usage: node scripts/inspect-plugins.js /path/to/plugins.zip

const fs = require('fs');
const path = require('path');
const os = require('os');
const unzipper = require('unzipper');
const Ajv = require('ajv').default || require('ajv');
const util = require('util');

async function extractZip(zipPath, dest) {
  await fs.promises.mkdir(dest, { recursive: true });
  return new Promise((resolve, reject) => {
    fs.createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: dest }))
      .on('close', resolve)
      .on('error', reject);
  });
}

function loadJsonSafe(p) {
  try {
    return { ok: true, data: JSON.parse(fs.readFileSync(p,'utf8')) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function probeExportsCode(jsPath) {
  try {
    const src = fs.readFileSync(jsPath, 'utf8');
    const exportsFound = [];
    if (/\bmodule\.exports\b/.test(src)) exportsFound.push('module.exports');
    const fnMatch = src.match(/module\.exports\.(\w+)/g) || src.match(/exports\.(\w+)/g) || [];
    fnMatch && fnMatch.forEach(m => {
      const name = m.split('.').pop();
      if (!exportsFound.includes(name)) exportsFound.push(name);
    });
    return { ok: true, exportsFound, size: src.length };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function makeManifestSchema() {
  // minimal schema used by loader (adjust if your loader uses a different schema)
  return {
    type: "object",
    required: ["id","name","version"],
    additionalProperties: true, // allow additional props, we'll validate actions separately
    properties: {
      id: { type: "string" },
      name: { type: "string" },
      version: { type: "string" },
      actions: {
        type: "array",
        items: {
          anyOf: [
            { type: "string" },
            { type: "object", required: ["type"], properties: { type: { type: "string" } } }
          ]
        }
      },
      allowedHosts: { type: "array", items: { type: "string" } }
    }
  };
}

async function main() {
  const zipArg = process.argv[2];
  if (!zipArg) {
    console.error("Usage: node scripts/inspect-plugins.js /path/to/plugins.zip");
    process.exit(2);
  }
  const zipPath = path.resolve(zipArg);
  if (!fs.existsSync(zipPath)) {
    console.error("Zip not found:", zipPath);
    process.exit(2);
  }

  const tmpdir = path.join(os.tmpdir(), "plugin_inspect_" + Date.now());
  await extractZip(zipPath, tmpdir);
  console.log("Extracted to", tmpdir);

  // Walk
  const files = [];
  function walk(dir){
    for(const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      const rel = path.relative(tmpdir, full);
      if (fs.statSync(full).isDirectory()) {
        walk(full);
      } else {
        files.push(rel);
      }
    }
  }
  walk(tmpdir);

  // find candidate plugin roots: directories containing manifest.json
  const manifestPaths = files.filter(f => f.endsWith('manifest.json'));
  const results = [];
  const ajv = new Ajv({ allErrors: true, strict:false });
  const schema = makeManifestSchema();
  const validateManifest = ajv.compile(schema);

  for (const mrel of manifestPaths) {
    const full = path.join(tmpdir, mrel);
    const manifestRes = loadJsonSafe(full);
    const rootDir = path.dirname(full);
    const pluginId = path.basename(rootDir);
    const item = { manifestPath: mrel, pluginId, rootDir, manifestOk: manifestRes.ok, manifest: manifestRes.data || null, errors: [] };

    if (!manifestRes.ok) {
      item.errors.push({ type: "manifest_parse", message: manifestRes.error });
      results.push(item);
      continue;
    }

    // validate
    const valid = validateManifest(manifestRes.data);
    if (!valid) {
      item.errors.push({ type: "manifest_schema", errors: validateManifest.errors });
    }

    // check actions present
    if (!manifestRes.data.actions || !Array.isArray(manifestRes.data.actions) || manifestRes.data.actions.length === 0) {
      item.warnings = item.warnings || [];
      item.warnings.push("missing_or_empty_actions");
    }

    // check ui
    const uiDir = path.join(rootDir, "ui");
    if (fs.existsSync(uiDir) && fs.statSync(uiDir).isDirectory()) {
      const indexHtml = path.join(uiDir, "index.html");
      item.ui = { exists: true, indexHtml: fs.existsSync(indexHtml) };
      if (!item.ui.indexHtml) item.ui.missingIndex = true;
    } else {
      item.ui = { exists: false };
    }

    // find index.js candidate
    const indexJsCandidates = ["index.js", "main.js", "action.js"].map(n => path.join(rootDir, n)).filter(p => fs.existsSync(p));
    if (indexJsCandidates.length===0) {
      item.errors.push({ type: "no_index_js", message: "no index.js/main.js/action.js found at plugin root" });
    } else {
      item.indexCandidates = indexJsCandidates.map(p => path.relative(tmpdir, p));
      item.indexProbe = indexJsCandidates.map(p => probeExportsCode(p));
    }

    // record allowedHosts
    item.allowedHosts = manifestRes.data.allowedHosts || null;

    results.push(item);
  }

  const report = { zipPath, tmpdir, pluginCount: results.length, results };
  const out = path.join(process.cwd(), "plugin-inspect-report.json");
  fs.writeFileSync(out, JSON.stringify(report, null, 2), 'utf8');
  console.log("Report saved to", out);
  console.log("Summary:");
  for(const r of results) {
    console.log(" -", r.pluginId, "ui:", r.ui && r.ui.exists ? "ui" : "no-ui", "errors:", (r.errors||[]).length, "warnings:", (r.warnings||[]).length);
  }
  console.log("Done");
}

main().catch(e => { console.error(e); process.exit(1); });
