/**
 * Parameter Validators - COMPREHENSIVE FIX
 * ------------------------------------------------------------------
 * Validates URL parameters with proper type coercion
 * 
 * CRITICAL FIXES:
 * ✅ Allows both string and integer types (Express sends strings from URL)
 * ✅ Uses oneOf for type flexibility
 * ✅ Pattern validation for string numbers
 * ✅ Proper required field validation
 *
 * Why oneOf?
 * Express extracts URL params as strings: /profiles/2 → profileId: "2"
 * But our code often converts to numbers: Number("2") → 2
 * Using oneOf allows BOTH string and number representations
 * 
 * Examples:
 * - /profiles/2 → { profileId: "2" } ✅ Valid (string match)
 * - Body with profileId: 2 → { profileId: 2 } ✅ Valid (number match)
 * - Both work seamlessly with type coercion
 */

module.exports = {
  /**
   * idParamSchema
   * Used for: /profiles/:id, /runs/:id, etc.
   * Validates a single "id" parameter
   */
  idParamSchema: {
    type: "object",
    properties: {
      id: {
        oneOf: [
          { type: "integer", minimum: 1 },
          { type: "string", pattern: "^[0-9]+$" }
        ],
        description: "Resource ID (numeric)"
      }
    },
    required: ["id"],
    additionalProperties: false
  },

  /**
   * profileIdParamSchema
   * Used for: /profiles/:profileId, /profiles/:profileId/tasks, etc.
   * Validates a single "profileId" parameter
   */
  profileIdParamSchema: {
    type: "object",
    properties: {
      profileId: {
        oneOf: [
          { type: "integer", minimum: 1 },
          { type: "string", pattern: "^[0-9]+$" }
        ],
        description: "Automation profile ID (numeric)"
      }
    },
    required: ["profileId"],
    additionalProperties: false
  },

  /**
   * taskIdParamSchema
   * Used for: /profiles/:profileId/tasks/:taskId
   * Validates BOTH "profileId" and "taskId" parameters
   */
  taskIdParamSchema: {
    type: "object",
    properties: {
      profileId: {
        oneOf: [
          { type: "integer", minimum: 1 },
          { type: "string", pattern: "^[0-9]+$" }
        ],
        description: "Automation profile ID (numeric)"
      },
      taskId: {
        oneOf: [
          { type: "integer", minimum: 1 },
          { type: "string", pattern: "^[0-9]+$" }
        ],
        description: "Automation task ID (numeric)"
      }
    },
    required: ["profileId", "taskId"],
    additionalProperties: false
  }
};