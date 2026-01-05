/**
 * Built-in Actions Registry
 * ------------------------------------------------------------------
 * Central registry for all built-in automation actions.
 *
 * Each action exports:
 *  - name: Display name
 *  - type: "builtin"
 *  - description: Human-readable description
 *  - schema: JSON Schema for validation
 *  - execute(meta, context): Async execution function
 */

// Import all built-in actions
const httpRequest = require('./http-request.action');
// const emailAction = require('./email');
// const slackAction = require('./slack');
// const databaseAction = require('./database');
// const fileAction = require('./file');

// All available built-in actions
const all = [
  httpRequest,
  // emailAction,
  // slackAction,
  // databaseAction,
  // fileAction,
];

// Create lookup map by action type
const actionMap = new Map();
actionMap.set('http_request', httpRequest);
// actionMap.set('email', emailAction);
// actionMap.set('slack', slackAction);
// actionMap.set('database', databaseAction);
// actionMap.set('file', fileAction);

module.exports = {
  /**
   * Get action by type
   * @param {String} actionType - e.g. "http_request"
   * @returns {Object|null} Action object or null if not found
   */
  get(actionType) {
    if (!actionType || typeof actionType !== 'string') {
      return null;
    }
    return actionMap.get(actionType) || null;
  },

  /**
   * Get all available actions
   * @returns {Array} All registered actions
   */
  all,
};