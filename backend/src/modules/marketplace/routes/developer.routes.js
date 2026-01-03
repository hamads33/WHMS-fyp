// src/modules/marketplace/routes/developer.routes.js
// Developer submission and management API (FR-M06)

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

module.exports = function developerRoutes({
  submissionService,
  marketplaceService,
  analyticsService,
  pluginInstaller,
  verificationService,
  prisma,
  logger = console
} = {}) {
  const router = express.Router();

  // Setup multer for zip uploads
  const uploadDir = path.join(process.cwd(), 'storage', 'marketplace', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}.zip`;
      cb(null, uniqueName);
    }
  });

  const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (ext !== '.zip') {
        return cb(new Error('Only .zip files allowed'));
      }
      cb(null, true);
    },
    limits: {
      fileSize: 50 * 1024 * 1024 // 50MB
    }
  });

  /**
   * FR-M06: POST /developer/submit - Submit new plugin
   */
  router.post('/submit', upload.single('archive'), async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          ok: false,
          error: 'Plugin archive required'
        });
      }

      const {
        name,
        slug,
        description,
        category,
        icon,
        tags,
        version,
        changelog,
        licenseType = 'free'
      } = req.body;

      // Parse manifest from uploaded file
      let manifestJson;
      try {
        manifestJson = JSON.parse(req.body.manifest || '{}');
      } catch (e) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          ok: false,
          error: 'Invalid manifest JSON'
        });
      }

      // Submit plugin
      const submission = await submissionService.submitPlugin(req.user.id, {
        name,
        slug,
        description,
        category: category || null,
        icon: icon || null,
        tags: tags ? tags.split(',').map(t => t.trim()) : [],
        version,
        archivePath: req.file.path,
        manifestJson,
        changelog: changelog || null,
        licenseType
      });

      // Run verification asynchronously
      verificationService.verifyPlugin(
        submission.productId,
        submission.submissionId,
        req.file.path,
        manifestJson
      ).catch(err => logger.error('Verification failed:', err.message));

      res.json({
        ok: true,
        data: submission
      });
    } catch (error) {
      if (req.file) {
        fs.unlinkSync(req.file.path).catch(() => {});
      }

      if (error.message === 'developer_profile_not_found') {
        return res.status(403).json({
          ok: false,
          error: 'Developer profile required'
        });
      }

      if (error.message === 'missing_required_fields') {
        return res.status(400).json({
          ok: false,
          error: 'Missing required fields'
        });
      }

      logger.error('[Developer] Submit plugin error:', error.message);
      next(error);
    }
  });

  /**
   * GET /developer/products - List developer's products
   */
  router.get('/products', async (req, res, next) => {
    try {
      const developer = await prisma.developerProfile.findUnique({
        where: { userId: req.user.id }
      });

      if (!developer) {
        return res.status(403).json({
          ok: false,
          error: 'Developer profile not found'
        });
      }

      const products = await prisma.marketplaceProduct.findMany({
        where: { developerId: developer.id },
        include: {
          versions: {
            select: {
              version: true,
              approvedAt: true,
              createdAt: true
            },
            orderBy: { createdAt: 'desc' }
          },
          submissions: {
            select: {
              status: true,
              createdAt: true
            },
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          _count: {
            select: { reviews: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        ok: true,
        data: products.map(p => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          status: p.status,
          latestVersion: p.versions[0]?.version,
          description: p.description,
          avgRating: p.avgRating,
          totalRatings: p.totalRatings,
          totalDownloads: p.totalDownloads,
          reviewCount: p._count.reviews,
          latestSubmission: p.submissions[0]?.status,
          createdAt: p.createdAt
        }))
      });
    } catch (error) {
      logger.error('[Developer] Get products error:', error.message);
      next(error);
    }
  });

  /**
   * GET /developer/products/:id - Get product details
   */
  router.get('/products/:id', async (req, res, next) => {
    try {
      const developer = await prisma.developerProfile.findUnique({
        where: { userId: req.user.id }
      });

      if (!developer) {
        return res.status(403).json({
          ok: false,
          error: 'Developer profile not found'
        });
      }

      const product = await prisma.marketplaceProduct.findUnique({
        where: { id: req.params.id },
        include: {
          versions: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              version: true,
              changelog: true,
              createdAt: true,
              approvedAt: true
            }
          },
          submissions: {
            orderBy: { createdAt: 'desc' },
            include: {
              version: { select: { version: true } },
              reviewer: { select: { email: true } }
            }
          }
        }
      });

      if (!product || product.developerId !== developer.id) {
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
      logger.error('[Developer] Get product error:', error.message);
      next(error);
    }
  });

  /**
   * PATCH /developer/products/:id - Update product metadata
   */
  router.patch('/products/:id', async (req, res, next) => {
    try {
      const developer = await prisma.developerProfile.findUnique({
        where: { userId: req.user.id }
      });

      if (!developer) {
        return res.status(403).json({
          ok: false,
          error: 'Developer profile not found'
        });
      }

      const product = await prisma.marketplaceProduct.findUnique({
        where: { id: req.params.id }
      });

      if (!product || product.developerId !== developer.id) {
        return res.status(404).json({
          ok: false,
          error: 'Product not found'
        });
      }

      const { description, category, icon, tags } = req.body;

      const updated = await prisma.marketplaceProduct.update({
        where: { id: req.params.id },
        data: {
          ...(description && { description }),
          ...(category && { category }),
          ...(icon && { icon }),
          ...(tags && { tags })
        }
      });

      res.json({
        ok: true,
        data: updated
      });
    } catch (error) {
      logger.error('[Developer] Update product error:', error.message);
      next(error);
    }
  });

  /**
   * GET /developer/submissions - Get submission history
   */
  router.get('/submissions', async (req, res, next) => {
    try {
      const submissions = await submissionService.getDeveloperSubmissions(req.user.id);

      res.json({
        ok: true,
        data: submissions
      });
    } catch (error) {
      logger.error('[Developer] Get submissions error:', error.message);
      next(error);
    }
  });

  /**
   * GET /developer/submissions/:id - Get submission details
   */
  router.get('/submissions/:id', async (req, res, next) => {
    try {
      const submission = await prisma.marketplaceSubmission.findUnique({
        where: { id: req.params.id },
        include: {
          product: {
            include: {
              developer: true
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

      // Check authorization
      if (submission.product.developerId !== (await prisma.developerProfile.findUnique({
        where: { userId: req.user.id }
      }))?.id) {
        return res.status(403).json({
          ok: false,
          error: 'Unauthorized'
        });
      }

      // Get verification result
      const verification = await verificationService.getVerificationResult(
        submission.productId,
        submission.versionId
      );

      res.json({
        ok: true,
        data: {
          ...submission,
          verification
        }
      });
    } catch (error) {
      logger.error('[Developer] Get submission error:', error.message);
      next(error);
    }
  });

  /**
   * GET /developer/analytics - Get usage analytics for all products
   */
  router.get('/analytics', async (req, res, next) => {
    try {
      const { days = 30 } = req.query;

      const developer = await prisma.developerProfile.findUnique({
        where: { userId: req.user.id }
      });

      if (!developer) {
        return res.status(403).json({
          ok: false,
          error: 'Developer profile not found'
        });
      }

      // Get all products for developer
      const products = await prisma.marketplaceProduct.findMany({
        where: { developerId: developer.id },
        select: { id: true }
      });

      const productIds = products.map(p => p.id);

      // Get analytics data
      const analytics = await prisma.marketplaceAnalytics.groupBy({
        by: ['productId', 'eventType'],
        where: {
          productId: { in: productIds },
          createdAt: {
            gte: new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000)
          }
        },
        _count: { id: true }
      });

      // Get product stats
      const stats = await prisma.marketplaceProduct.findMany({
        where: { developerId: developer.id },
        select: {
          id: true,
          name: true,
          totalDownloads: true,
          activeInstances: true,
          totalCrashes: true,
          avgRating: true,
          totalRatings: true
        }
      });

      res.json({
        ok: true,
        data: {
          stats,
          analytics,
          period: { days }
        }
      });
    } catch (error) {
      logger.error('[Developer] Get analytics error:', error.message);
      next(error);
    }
  });

  /**
   * GET /developer/analytics/:productId - Get analytics for specific product
   */
  router.get('/analytics/:productId', async (req, res, next) => {
    try {
      const { days = 30 } = req.query;

      const developer = await prisma.developerProfile.findUnique({
        where: { userId: req.user.id }
      });

      if (!developer) {
        return res.status(403).json({
          ok: false,
          error: 'Developer profile not found'
        });
      }

      const product = await prisma.marketplaceProduct.findUnique({
        where: { id: req.params.productId }
      });

      if (!product || product.developerId !== developer.id) {
        return res.status(404).json({
          ok: false,
          error: 'Product not found'
        });
      }

      const stats = await analyticsService.getPluginStats(req.params.productId);
      const timeline = await analyticsService.getPluginTimeline(req.params.productId, parseInt(days));

      res.json({
        ok: true,
        data: {
          stats,
          timeline
        }
      });
    } catch (error) {
      logger.error('[Developer] Get product analytics error:', error.message);
      next(error);
    }
  });

  return router;
};