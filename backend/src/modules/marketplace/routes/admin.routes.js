// src/modules/marketplace/routes/admin.routes.js
// Admin management and approval API (FR-M11)

const express = require('express');

module.exports = function adminRoutes({
  submissionService,
  marketplaceService,
  verificationService,
  dependencyService,
  prisma,
  logger = console
} = {}) {
  const router = express.Router();

  /**
   * FR-M11: GET /admin/submissions - Get pending submissions for review
   */
  router.get('/submissions', async (req, res, next) => {
    try {
      const { page = 1, limit = 20, status } = req.query;

      const where = status ? { status } : { status: 'pending_review' };

      const [submissions, total] = await Promise.all([
        prisma.marketplaceSubmission.findMany({
          where,
          skip: (parseInt(page) - 1) * parseInt(limit),
          take: parseInt(limit),
          orderBy: { createdAt: 'asc' },
          include: {
            product: {
              include: {
                developer: {
                  select: {
                    storeName: true,
                    displayName: true,
                    user: { select: { email: true } }
                  }
                }
              }
            },
            version: true,
            reviewer: {
              select: { email: true }
            }
          }
        }),
        prisma.marketplaceSubmission.count({ where })
      ]);

      res.json({
        ok: true,
        data: submissions.map(s => ({
          id: s.id,
          productId: s.product.id,
          productName: s.product.name,
          version: s.version?.version,
          developer: {
            name: s.product.developer?.storeName || s.product.developer?.displayName,
            email: s.product.developer?.user.email
          },
          status: s.status,
          submittedAt: s.createdAt,
          reviewer: s.reviewer?.email || null,
          notes: s.notes
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      logger.error('[Admin] Get submissions error:', error.message);
      next(error);
    }
  });

  /**
   * FR-M11: GET /admin/submissions/:id - Get submission details for review
   */
  router.get('/submissions/:id', async (req, res, next) => {
    try {
      const submission = await prisma.marketplaceSubmission.findUnique({
        where: { id: req.params.id },
        include: {
          product: {
            include: {
              developer: {
                select: {
                  storeName: true,
                  displayName: true,
                  user: { select: { email: true } }
                }
              },
              versions: {
                select: {
                  version: true,
                  createdAt: true,
                  approvedAt: true
                }
              }
            }
          },
          version: true,
          reviewer: {
            select: { email: true }
          }
        }
      });

      if (!submission) {
        return res.status(404).json({
          ok: false,
          error: 'Submission not found'
        });
      }

      // Get verification result
      const verification = await verificationService.getVerificationResult(
        submission.productId,
        submission.versionId
      );

      // Get dependency check
      let dependencies = null;
      if (submission.version?.manifestJson) {
        try {
          const manifest = typeof submission.version.manifestJson === 'string'
            ? JSON.parse(submission.version.manifestJson)
            : submission.version.manifestJson;
          dependencies = await dependencyService.checkDependencies(
            submission.productId,
            submission.versionId,
            manifest
          );
        } catch (e) {
          logger.warn('Failed to check dependencies:', e.message);
        }
      }

      res.json({
        ok: true,
        data: {
          id: submission.id,
          status: submission.status,
          product: {
            id: submission.product.id,
            name: submission.product.name,
            slug: submission.product.slug,
            description: submission.product.description,
            category: submission.product.category,
            icon: submission.product.icon,
            versions: submission.product.versions
          },
          version: {
            id: submission.version?.id,
            version: submission.version?.version,
            changelog: submission.version?.changelog,
            manifest: submission.version?.manifestJson
          },
          developer: {
            name: submission.product.developer?.storeName || submission.product.developer?.displayName,
            email: submission.product.developer?.user.email
          },
          verification,
          dependencies,
          submittedAt: submission.createdAt,
          reviewer: submission.reviewer?.email || null,
          notes: submission.notes
        }
      });
    } catch (error) {
      logger.error('[Admin] Get submission details error:', error.message);
      next(error);
    }
  });

  /**
   * FR-M11: POST /admin/submissions/:id/review - Review and approve/reject submission
   */
  router.post('/submissions/:id/review', async (req, res, next) => {
    try {
      const { action, notes } = req.body;

      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({
          ok: false,
          error: 'Action must be approve or reject'
        });
      }

      const submission = await submissionService.reviewSubmission(
        req.params.id,
        req.user.id,
        { action, notes }
      );

      res.json({
        ok: true,
        data: submission,
        message: `Submission ${action === 'approve' ? 'approved' : 'rejected'}`
      });
    } catch (error) {
      if (error.message === 'submission_not_found') {
        return res.status(404).json({
          ok: false,
          error: 'Submission not found'
        });
      }

      if (error.message === 'submission_already_reviewed') {
        return res.status(400).json({
          ok: false,
          error: 'Submission already reviewed'
        });
      }

      logger.error('[Admin] Review submission error:', error.message);
      next(error);
    }
  });

  /**
   * FR-M11: GET /admin/products - Get all marketplace products
   */
  router.get('/products', async (req, res, next) => {
    try {
      const { page = 1, limit = 20, status, category } = req.query;

      const where = {};
      if (status) where.status = status;
      if (category) where.category = category;

      const [products, total] = await Promise.all([
        prisma.marketplaceProduct.findMany({
          where,
          skip: (parseInt(page) - 1) * parseInt(limit),
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' },
          include: {
            developer: {
              select: {
                storeName: true,
                user: { select: { email: true } }
              }
            },
            _count: {
              select: { reviews: true }
            }
          }
        }),
        prisma.marketplaceProduct.count({ where })
      ]);

      res.json({
        ok: true,
        data: products.map(p => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          status: p.status,
          category: p.category,
          developer: p.developer?.storeName,
          avgRating: p.avgRating,
          totalRatings: p.totalRatings,
          totalDownloads: p.totalDownloads,
          reviewCount: p._count.reviews,
          disabled: p.disabled,
          createdAt: p.createdAt
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      logger.error('[Admin] Get products error:', error.message);
      next(error);
    }
  });

  /**
   * FR-M11: GET /admin/products/:id - Get product details for admin
   */
  router.get('/products/:id', async (req, res, next) => {
    try {
      const product = await prisma.marketplaceProduct.findUnique({
        where: { id: req.params.id },
        include: {
          developer: {
            select: {
              storeName: true,
              user: { select: { email: true } }
            }
          },
          versions: {
            orderBy: { createdAt: 'desc' }
          },
          submissions: {
            orderBy: { createdAt: 'desc' },
            take: 10
          },
          reviews: {
            select: {
              id: true,
              rating: true,
              review: true,
              createdAt: true,
              user: { select: { email: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 10
          },
          dependencies: true
        }
      });

      if (!product) {
        return res.status(404).json({
          ok: false,
          error: 'Product not found'
        });
      }

      res.json({
        ok: true,
        data: product
      });
    } catch (error) {
      logger.error('[Admin] Get product error:', error.message);
      next(error);
    }
  });

  /**
   * FR-M11: PATCH /admin/products/:id - Update product metadata
   */
  router.patch('/products/:id', async (req, res, next) => {
    try {
      const {
        status,
        disabled,
        category,
        tags,
        licenseRequired,
        licenseType
      } = req.body;

      const updated = await prisma.marketplaceProduct.update({
        where: { id: req.params.id },
        data: {
          ...(status && { status }),
          ...(typeof disabled === 'boolean' && { disabled }),
          ...(category && { category }),
          ...(tags && { tags }),
          ...(typeof licenseRequired === 'boolean' && { licenseRequired }),
          ...(licenseType && { licenseType })
        }
      });

      res.json({
        ok: true,
        data: updated,
        message: 'Product updated successfully'
      });
    } catch (error) {
      logger.error('[Admin] Update product error:', error.message);
      next(error);
    }
  });

  /**
   * DELETE /admin/products/:id - Disable product
   */
  router.delete('/products/:id', async (req, res, next) => {
    try {
      const updated = await prisma.marketplaceProduct.update({
        where: { id: req.params.id },
        data: { disabled: true }
      });

      res.json({
        ok: true,
        data: updated,
        message: 'Product disabled'
      });
    } catch (error) {
      logger.error('[Admin] Disable product error:', error.message);
      next(error);
    }
  });

  /**
   * POST /admin/products/:id/restore - Re-enable product
   */
  router.post('/products/:id/restore', async (req, res, next) => {
    try {
      const updated = await prisma.marketplaceProduct.update({
        where: { id: req.params.id },
        data: { disabled: false }
      });

      res.json({
        ok: true,
        data: updated,
        message: 'Product restored'
      });
    } catch (error) {
      logger.error('[Admin] Restore product error:', error.message);
      next(error);
    }
  });

  /**
   * GET /admin/dashboard - Admin dashboard stats
   */
  router.get('/dashboard', async (req, res, next) => {
    try {
      const [
        pendingSubmissions,
        approvedProducts,
        totalProducts,
        totalDownloads,
        totalReviews
      ] = await Promise.all([
        prisma.marketplaceSubmission.count({
          where: { status: 'pending_review' }
        }),
        prisma.marketplaceProduct.count({
          where: { status: 'approved', disabled: false }
        }),
        prisma.marketplaceProduct.count({}),
        prisma.marketplaceProduct.aggregate({
          _sum: { totalDownloads: true }
        }),
        prisma.marketplaceReview.count({})
      ]);

      res.json({
        ok: true,
        data: {
          pendingSubmissions,
          approvedProducts,
          totalProducts,
          totalDownloads: totalDownloads._sum.totalDownloads || 0,
          totalReviews
        }
      });
    } catch (error) {
      logger.error('[Admin] Get dashboard error:', error.message);
      next(error);
    }
  });

  return router;
};