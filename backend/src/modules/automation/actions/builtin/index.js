/**
 * Built-in Actions Registry
 * ------------------------------------------------------------------
 * Central registry for all built-in automation actions.
 *
 * Each action exports:
 *  - name: Display name
 *  - type: "builtin"
 *  - actionType: canonical key used by the engine
 *  - module: logical grouping (orders, billing, services, …)
 *  - description: Human-readable description
 *  - schema: JSON Schema for validation
 *  - execute(meta, context): Async execution function
 */

const httpRequest = require('./http-request.action');
const echoAction  = require('./echo.action');
const systemLog   = require('./system-log.action');

// Module action arrays
const orderActions   = require('./order.action');
const billingActions = require('./billing.action');
const serviceActions = require('./service.action');
const clientActions  = require('./client.action');
const supportActions = require('./support.action');
const notifyActions  = require('./notify.action');
const userActions    = require('./user.action');
const dataActions    = require('./data.action');
const flowActions    = require('./flow.action');

// ----------------------------------------------------------------
// Build the map
// ----------------------------------------------------------------
const actionMap = new Map();

// Legacy single-action registrations
actionMap.set('http_request', httpRequest);
actionMap.set('echo',         echoAction);
actionMap.set('system_log',   systemLog);

// Register module action arrays
for (const action of [
  ...orderActions,
  ...billingActions,
  ...serviceActions,
  ...clientActions,
  ...supportActions,
  ...notifyActions,
  ...userActions,
  ...dataActions,
  ...flowActions,
]) {
  if (!action.actionType) {
    console.warn('[builtin/index] Action missing actionType:', action.name);
    continue;
  }
  actionMap.set(action.actionType, action);
}

// ----------------------------------------------------------------
// Exports
// ----------------------------------------------------------------
module.exports = {
  /**
   * Get action by type
   */
  get(actionType) {
    if (!actionType || typeof actionType !== 'string') return null;
    return actionMap.get(actionType) || null;
  },

  /**
   * All registered actions as array
   */
  get all() {
    return [...actionMap.values()];
  },

  /**
   * Raw map (for registry.js key enumeration)
   */
  actionMap,
};
