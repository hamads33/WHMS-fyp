/**
 * Validation Middleware - FIXED VERSION
 * ------------------------------------------------------------------
 * Handles JSON Schema validation for request data
 * 
 * KEY FIX: Coerces URL parameter types from string to number
 * This is required because Express always passes URL params as strings:
 *   - URL: /profiles/2/run
 *   - Parsed: req.params.profileId = "2" (string)
 *   - Schema expects: profileId: number
 *   - Solution: Convert "2" to 2 before validation
 *
 * Features:
 *  - Validates body, params, query
 *  - Type coercion for URL parameters
 *  - Proper error responses
 *  - Debug logging support
 */

const Ajv = require('ajv');

// Initialize validator with coerceTypes option
// Note: We handle manual coercion for params since they always come as strings
const ajv = new Ajv({
  coerceTypes: false,  // We'll do manual coercion for params
  removeAdditional: false
});

/**
 * Validation Middleware
 * 
 * Usage:
 *   validate(schema)              // Validates req.body by default
 *   validate(schema, "params")    // Validates req.params
 *   validate(schema, "query")     // Validates req.query
 */
const validate = (schema, location = "body") => {
  return (req, res, next) => {
    try {
      // Get the data to validate based on location
      let data = req[location];

      // ✅ CRITICAL FIX: Coerce URL parameters from string to number
      // Express always parses URL params as strings, but validators expect numbers
      if (location === "params" && data) {
        data = coerceParams(data);
      }

      // Compile the schema if not already compiled
      const validate = ajv.compile(schema);

      // Validate the data
      const valid = validate(data);

      if (!valid) {
        // Validation failed - return error response
        return res.status(400).json({
          success: false,
          error: {
            message: "Validation failed",
            code: "validation_error",
            details: validate.errors || []
          }
        });
      }

      // Validation passed - continue to next middleware
      next();
    } catch (err) {
      // Schema compilation or other error
      console.error("[VALIDATE] Error during validation:", err);
      return res.status(500).json({
        success: false,
        error: {
          message: "Validation error",
          code: "validation_error",
          details: [{ message: err.message }]
        }
      });
    }
  };
};

/**
 * Coerce URL Parameters
 * ------------------------------------------------------------------
 * Convert string parameters to their correct types based on common patterns
 * 
 * Examples:
 *   "2" → 2 (if all digits)
 *   "true" → true
 *   "false" → false
 *   "hello" → "hello" (stays string)
 */
function coerceParams(params) {
  if (!params || typeof params !== 'object') {
    return params;
  }

  const coerced = {};

  Object.keys(params).forEach(key => {
    const value = params[key];

    // If it's not a string, keep as-is
    if (typeof value !== 'string') {
      coerced[key] = value;
      return;
    }

    // Try to coerce string to appropriate type
    // Priority: number > boolean > original string

    // Check if it's a number (all digits, possibly with leading zeros)
    if (/^\d+$/.test(value)) {
      coerced[key] = Number(value);
      return;
    }

    // Check if it's a negative number
    if (/^-?\d+$/.test(value)) {
      coerced[key] = Number(value);
      return;
    }

    // Check if it's a float
    if (/^-?\d+\.\d+$/.test(value)) {
      coerced[key] = Number(value);
      return;
    }

    // Check if it's a boolean
    if (value === 'true') {
      coerced[key] = true;
      return;
    }

    if (value === 'false') {
      coerced[key] = false;
      return;
    }

    // Keep as string if no coercion applied
    coerced[key] = value;
  });

  return coerced;
}

module.exports = validate;