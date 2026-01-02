/**
 * Task Validator Schema
 * ------------------------------------------------------------------
 * Validates task creation/update payloads.
 *
 * Requirements:
 *  - actionType: required string (identifies the action to execute)
 *  - actionMeta: optional object (configuration for the action)
 *  - order: optional integer (execution order within profile)
 *
 * Design Notes:
 *  - Matches Prisma schema exactly (AutomationTask model)
 *  - More permissive to allow backend defaults to work
 *  - Does NOT use additionalProperties: false to prevent field removal
 */

module.exports = {
  type: "object",
  properties: {
    actionType: {
      type: "string",
      minLength: 1
    },
    actionMeta: {
      type: ["object", "null"]
    },
    order: {
      type: "integer",
      minimum: 0
    }
  },
  required: ["actionType"]
  // NOTE: No additionalProperties restriction
  // This allows Prisma defaults to work correctly
}