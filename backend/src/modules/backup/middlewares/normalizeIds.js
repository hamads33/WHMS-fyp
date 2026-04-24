// src/modules/backup/middlewares/normalizeIds.js
/**
 * Middleware to normalize and validate ID parameters
 * 
 * FIX: Ensures consistent ID type handling across all routes
 * Prisma schema uses Int for IDs, but Express params are always strings
 * 
 * Usage:
 *   router.get("/:id", normalizeIds(['id']), handler)
 *   router.patch("/:configId", normalizeIds(['configId']), handler)
 */

function normalizeIds(paramNames = ["id"]) {
  return (req, res, next) => {
    for (const name of paramNames) {
      if (req.params[name] !== undefined) {
        const num = Number(req.params[name]);

        // Check if conversion failed (NaN) or if it's not a safe integer
        if (isNaN(num) || !Number.isSafeInteger(num) || num < 0) {
          return res.status(400).json({
            success: false,
            error: `Invalid ${name}: must be a positive integer`,
          });
        }

        // Replace string with number
        req.params[name] = num;
      }
    }
    next();
  };
}

module.exports = normalizeIds;