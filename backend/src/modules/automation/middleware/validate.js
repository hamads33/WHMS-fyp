/**
 * Validation Middleware
 * ------------------------------------------------------------------
 * AJV-based request validation.
 *
 * Enforces:
 *  - Strict input schemas
 *  - API-first correctness
 *  - Early error detection
 *
 * IMPORTANT:
 *  - Does NOT mutate original request data
 *  - Validates a copy to prevent side effects
 *  - Preserves original field order and structure
 */

const Ajv = require("ajv").default;
const addFormats = require("ajv-formats");

// Configure AJV with safe settings
const ajv = new Ajv({ 
  allErrors: true, 
  coerceTypes: true, 
  removeAdditional: false,  // CRITICAL: Don't remove fields, just validate
  useDefaults: false,        // Don't modify data, just validate
  strict: false              // Allow additional keywords
});

addFormats(ajv);

module.exports = function validate(schema, source = "body") {
  const fn = ajv.compile(schema);

  return (req, res, next) => {
    // Get the data to validate
    const originalData = req[source];
    
    if (!originalData) {
      return res.fail(`No ${source} data provided`, 400, "validation_error");
    }

    // Create a deep copy for validation (don't mutate original)
    let dataToValidate;
    try {
      dataToValidate = JSON.parse(JSON.stringify(originalData));
    } catch (err) {
      return res.fail(`Invalid ${source} data format`, 400, "validation_error");
    }
    
    // Validate the copy
    const ok = fn(dataToValidate);

    if (!ok) {
      // Format error details for better debugging
      const errorDetails = fn.errors.map(err => {
        const field = err.instancePath 
          ? err.instancePath.replace(/^\//, '') 
          : (err.params?.missingProperty || 'unknown');
        
        return {
          field,
          message: err.message,
          keyword: err.keyword,
          params: err.params
        };
      });

      console.error(`❌ Validation failed for ${source}:`, {
        schema: schema.type || 'unknown',
        errors: errorDetails,
        data: dataToValidate
      });

      return res.fail(
        "Validation failed", 
        400, 
        "validation_error", 
        errorDetails
      );
    }

    // Validation passed - data remains unchanged in req[source]
    next();
  };
};