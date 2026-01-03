// src/modules/marketplace/middleware/developer.middleware.js
// Validates that user is a verified developer

module.exports = {
  /**
   * Middleware: Validate developer
   * Checks if user has developer role/status
   */
  validateDeveloper: async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          ok: false,
          error: 'Authentication required'
        });
      }

      // Check if user has developer role
      const isDeveloper = req.user.roles?.includes('developer') ||
                         req.user.isDeveloper ||
                         req.user.role === 'developer';

      if (!isDeveloper) {
        return res.status(403).json({
          ok: false,
          error: 'Developer access required',
          message: 'Please request developer access to submit plugins'
        });
      }

      // Developer validation passed
      next();
    } catch (error) {
      console.error('❌ Developer middleware error:', error.message);
      res.status(500).json({
        ok: false,
        error: 'Validation failed'
      });
    }
  },

  /**
   * Middleware: Optional developer check
   * Doesn't block non-developers, just marks them
   */
  checkDeveloper: async (req, res, next) => {
    try {
      if (!req.user) {
        req.isDeveloper = false;
        return next();
      }

      const isDeveloper = req.user.roles?.includes('developer') ||
                         req.user.isDeveloper ||
                         req.user.role === 'developer';

      req.isDeveloper = isDeveloper;
      next();
    } catch (error) {
      req.isDeveloper = false;
      next();
    }
  },

  /**
   * Middleware: Validate developer ownership
   * Checks if developer owns the submission/product
   */
  validateOwnership: (prisma) => {
    return async (req, res, next) => {
      try {
        const { id } = req.params;
        if (!id) {
          return res.status(400).json({
            ok: false,
            error: 'Product ID required'
          });
        }

        // Find product by ID
        const product = await prisma.marketplaceProduct?.findUnique({
          where: { id },
          select: { 
            id: true,
            developerId: true,
            developer: {
              select: {
                id: true,
                userId: true
              }
            }
          }
        });

        if (!product) {
          return res.status(404).json({
            ok: false,
            error: 'Product not found'
          });
        }

        // Check ownership
        const isDeveloper = req.user.roles?.includes('developer');
        const isOwner = product.developerId === req.user.id ||
                       product.developer?.userId === req.user.id;
        const isAdmin = req.user.roles?.includes('admin');

        if (!isOwner && !isAdmin) {
          return res.status(403).json({
            ok: false,
            error: 'Access denied',
            message: 'You can only manage your own products'
          });
        }

        // Ownership validated
        req.product = product;
        next();
      } catch (error) {
        console.error('❌ Ownership validation error:', error.message);
        res.status(500).json({
          ok: false,
          error: 'Validation failed'
        });
      }
    };
  }
};