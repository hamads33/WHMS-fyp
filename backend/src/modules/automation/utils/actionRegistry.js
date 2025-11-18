// src/modules/automation/utils/actionRegistry.js
// Loads actions dynamically from actions/ folder and provides lookup helpers.

const fs = require('fs');
const path = require('path');

const ACTIONS_DIR = path.join(__dirname, '..', 'actions');

const registry = new Map();

/**
 * Try to load all action plugins from actions folder.
 * Each action module must export: id, name, jsonSchema (optional), execute(ctx, params), test(params) optional.
 */
function loadActions() {
  registry.clear();
  if (!fs.existsSync(ACTIONS_DIR)) return;
  const files = fs.readdirSync(ACTIONS_DIR);
  for (const f of files) {
    if (!f.endsWith('.js')) continue;
    try {
      const mod = require(path.join(ACTIONS_DIR, f));
      if (!mod || !mod.id) {
        console.warn(`[actionRegistry] skipping ${f} — no id exported`);
        continue;
      }
      // normalize shape
      const action = {
        id: mod.id,
        name: mod.name || mod.id,
        version: mod.version || '0.0.0',
        description: mod.description || '',
        jsonSchema: mod.jsonSchema || null,
        aliases: mod.aliases || null, // optional map for migrating keys
        execute: mod.execute,
        test: mod.test || (mod.execute ? (p) => mod.execute({ test: true }, p) : null)
      };
      registry.set(action.id, action);
      console.info(`[actionRegistry] Loaded action: ${action.id}`);
    } catch (err) {
      console.error(`[actionRegistry] failed to load ${f}`, err);
    }
  }
}

/** Get an action by id */
function getAction(id) {
  return registry.get(id);
}

/** Return list of actions metadata */
function listActions() {
  return Array.from(registry.values()).map(a => ({
    id: a.id,
    name: a.name,
    description: a.description,
    version: a.version,
    jsonSchema: a.jsonSchema
  }));
}

// initial load
loadActions();

// Allow hot reload if needed
function reload() {
  // clean require cache for actions folder
  if (!fs.existsSync(ACTIONS_DIR)) return;
  const files = fs.readdirSync(ACTIONS_DIR).filter(f => f.endsWith('.js'));
  for (const f of files) {
    const full = path.join(ACTIONS_DIR, f);
    delete require.cache[require.resolve(full)];
  }
  loadActions();
}

module.exports = { getAction, listActions, reload };
