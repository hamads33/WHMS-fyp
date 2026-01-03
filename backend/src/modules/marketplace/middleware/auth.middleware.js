// src/modules/marketplace/middleware/auth.middleware.js
// Authentication and authorization middleware

/**
 * Require authentication
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      ok: false,
      error: 'Authentication required'
    });
  }
  next();
}

/**
 * Require admin role
 */
async function requireAdmin(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        error: 'Authentication required'
      });
    }

    // Check if user has admin role
    const hasAdminRole = req.user.roles && req.user.roles.some(r => r.role.name === 'admin');
    
    if (!hasAdminRole) {
      return res.status(403).json({
        ok: false,
        error: 'Admin role required'
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: 'Authorization check failed'
    });
  }
}

/**
 * Require developer role
 */
async function requireDeveloper(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        error: 'Authentication required'
      });
    }

    // Check if user has developer role
    const hasDeveloperRole = req.user.roles && req.user.roles.some(r => r.role.name === 'developer');
    
    if (!hasDeveloperRole) {
      return res.status(403).json({
        ok: false,
        error: 'Developer role required'
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: 'Authorization check failed'
    });
  }
}

module.exports = {
  requireAuth,
  requireAdmin,
  requireDeveloper
};

// src/modules/marketplace/middleware/developer.middleware.js
// Developer profile validation

/**
 * Validate developer profile exists
 */
async function validateDeveloper(prisma) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          ok: false,
          error: 'Authentication required'
        });
      }

      const developer = await prisma.developerProfile.findUnique({
        where: { userId: req.user.id }
      });

      if (!developer) {
        return res.status(403).json({
          ok: false,
          error: 'Developer profile required',
          createProfileUrl: '/api/developer/profile/create'
        });
      }

      // Attach developer to request
      req.developer = developer;
      next();
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: 'Profile validation failed'
      });
    }
  };
}

module.exports = { validateDeveloper };

// src/modules/marketplace/middleware/validation.middleware.js
// Request validation middleware

/**
 * Validate submission request
 */
function validateSubmission(req, res, next) {
  const { name, slug, version } = req.body;

  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('name is required and must be a non-empty string');
  }

  if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
    errors.push('slug is required and must be a non-empty string');
  } else if (!/^[a-z0-9-]+$/.test(slug)) {
    errors.push('slug must only contain lowercase letters, numbers, and hyphens');
  }

  if (!version || typeof version !== 'string') {
    errors.push('version is required');
  } else if (!/^\d+\.\d+\.\d+/.test(version)) {
    errors.push('version must follow semantic versioning (e.g., 1.0.0)');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      ok: false,
      error: 'Validation failed',
      errors
    });
  }

  next();
}

/**
 * Validate review request
 */
function validateReview(req, res, next) {
  const { rating, text } = req.body;

  const errors = [];

  if (!rating || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    errors.push('rating must be an integer between 1 and 5');
  }

  if (text && typeof text !== 'string') {
    errors.push('text must be a string');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      ok: false,
      error: 'Validation failed',
      errors
    });
  }

  next();
}

/**
 * Validate product ID format
 */
function validateProductId(req, res, next) {
  const { id } = req.params;

  if (!id || !/^[a-f0-9-]{36}$/.test(id)) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid product ID format'
    });
  }

  next();
}

/**
 * Validate submission review
 */
function validateReview(req, res, next) {
  const { action, notes } = req.body;

  if (!action || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({
      ok: false,
      error: 'action must be either "approve" or "reject"'
    });
  }

  if (notes && typeof notes !== 'string') {
    return res.status(400).json({
      ok: false,
      error: 'notes must be a string'
    });
  }

  next();
}

module.exports = {
  validateSubmission,
  validateReview,
  validateProductId
};