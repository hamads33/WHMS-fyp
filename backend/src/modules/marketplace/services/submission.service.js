// src/modules/marketplace/services/submission.service.js
// Handle plugin submission workflow and admin review (FR-M06, FR-M11)

class SubmissionService {
  constructor({
    prisma,
    logger = console,
    pluginVerifier,
    emailService,
    webhookService
  }) {
    this.prisma = prisma;
    this.logger = logger;
    this.pluginVerifier = pluginVerifier;
    this.emailService = emailService;
    this.webhookService = webhookService;
  }

  /**
   * FR-M06: Developer submits plugin to marketplace
   * @param {string} developerId - Developer user ID
   * @param {Object} submissionData - Submission data
   * @returns {Promise<Object>} Submission record
   */
  async submitPlugin(developerId, submissionData) {
    const {
      productId = null,
      name,
      slug,
      description,
      category,
      icon,
      tags = [],
      version,
      archivePath,
      manifestJson,
      changelog = null,
      licenseType = 'free'
    } = submissionData;

    try {
      // Validate required fields
      if (!name || !slug || !description || !version || !archivePath) {
        throw new Error('missing_required_fields');
      }

      // Get developer profile
      const developer = await this.prisma.developerProfile.findUnique({
        where: { userId: developerId }
      });

      if (!developer) {
        throw new Error('developer_profile_not_found');
      }

      let product;
      let submission;

      // Check if this is a new product or update
      if (productId) {
        // Update existing product
        product = await this.prisma.marketplaceProduct.findUnique({
          where: { id: productId }
        });

        if (!product || product.developerId !== developer.id) {
          throw new Error('product_not_found_or_unauthorized');
        }

        // Create new version
        const newVersion = await this.prisma.marketplaceVersion.create({
          data: {
            productId,
            version,
            downloadUrl: archivePath,
            manifestJson: typeof manifestJson === 'string'
              ? manifestJson
              : JSON.stringify(manifestJson),
            changelog: changelog || null,
            approved: false
          }
        });

        // Create submission for the new version
        submission = await this.prisma.marketplaceSubmission.create({
          data: {
            productId,
            versionId: newVersion.id,
            status: 'pending_review'
          }
        });

        this.logger.info(`[Submission] Product ${productId} version ${version} submitted`);
      } else {
        // Create new product
        product = await this.prisma.marketplaceProduct.create({
          data: {
            developerId: developer.id,
            name,
            slug: this._generateSlug(slug),
            description,
            category: category || null,
            icon: icon || null,
            tags: tags || [],
            licenseType,
            licenseRequired: licenseType !== 'free',
            status: 'draft'
          }
        });

        // Create initial version
        const version1 = await this.prisma.marketplaceVersion.create({
          data: {
            productId: product.id,
            version,
            downloadUrl: archivePath,
            manifestJson: typeof manifestJson === 'string'
              ? manifestJson
              : JSON.stringify(manifestJson),
            changelog: changelog || null,
            approved: false
          }
        });

        // Create submission
        submission = await this.prisma.marketplaceSubmission.create({
          data: {
            productId: product.id,
            versionId: version1.id,
            status: 'pending_review'
          }
        });

        this.logger.info(`[Submission] New product ${product.id} submitted`);
      }

      // Log build event
      await this._logBuildEvent(submission.id, product.id, submission.versionId, 'info', 'submission_created', 'submission');

      // Notify admin
      await this._notifyAdmins('new_submission', {
        submissionId: submission.id,
        productId: product.id,
        productName: product.name,
        developerName: developer.storeName || developer.displayName
      });

      return {
        submissionId: submission.id,
        productId: product.id,
        status: submission.status,
        createdAt: submission.createdAt
      };
    } catch (error) {
      this.logger.error(`[Submission] Submit plugin failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * FR-M11: Admin reviews and approves/rejects submission
   * @param {string} submissionId - Submission ID
   * @param {string} reviewerId - Admin user ID
   * @param {Object} reviewData - Review data
   * @returns {Promise<Object>} Updated submission
   */
  async reviewSubmission(submissionId, reviewerId, reviewData) {
    const {
      action, // 'approve' or 'reject'
      notes = null
    } = reviewData;

    try {
      // Validate action
      if (!['approve', 'reject'].includes(action)) {
        throw new Error('invalid_action');
      }

      // Get submission
      const submission = await this.prisma.marketplaceSubmission.findUnique({
        where: { id: submissionId },
        include: {
          product: true,
          version: true
        }
      });

      if (!submission) {
        throw new Error('submission_not_found');
      }

      if (submission.status !== 'pending_review') {
        throw new Error('submission_already_reviewed');
      }

      let newStatus = action === 'approve' ? 'approved' : 'rejected';

      // Update submission
      const updated = await this.prisma.marketplaceSubmission.update({
        where: { id: submissionId },
        data: {
          status: newStatus,
          reviewerId,
          notes
        }
      });

      // If approved, update product and version
      if (action === 'approve') {
        // Update product status
        await this.prisma.marketplaceProduct.update({
          where: { id: submission.productId },
          data: {
            status: 'approved',
            latestVersionId: submission.versionId
          }
        });

        // Approve version
        await this.prisma.marketplaceVersion.update({
          where: { id: submission.versionId },
          data: {
            approved: true,
            approvedAt: new Date()
          }
        });

        this.logger.info(`[Review] Submission ${submissionId} approved`);

        // Log build event
        await this._logBuildEvent(submissionId, submission.productId, submission.versionId, 'info', 'approval_complete', 'review');

        // Notify developer
        await this._notifyDeveloper(submission.product.developerId, 'submission_approved', {
          productName: submission.product.name,
          productId: submission.productId,
          version: submission.version?.version
        });
      } else {
        // Rejected
        this.logger.info(`[Review] Submission ${submissionId} rejected. Notes: ${notes}`);

        // Log build event
        await this._logBuildEvent(submissionId, submission.productId, submission.versionId, 'error', 'approval_failed', 'review');

        // Notify developer
        await this._notifyDeveloper(submission.product.developerId, 'submission_rejected', {
          productName: submission.product.name,
          productId: submission.productId,
          reason: notes
        });
      }

      // Trigger webhook
      await this._triggerWebhook('submission.reviewed', {
        submissionId,
        productId: submission.productId,
        action,
        reviewerId,
        notes
      });

      return updated;
    } catch (error) {
      this.logger.error(`[Review] Review submission failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get pending submissions for admin
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} Pending submissions
   */
  async getPendingSubmissions(options = {}) {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    try {
      const [submissions, total] = await Promise.all([
        this.prisma.marketplaceSubmission.findMany({
          where: { status: 'pending_review' },
          skip,
          take: limit,
          orderBy: { createdAt: 'asc' },
          include: {
            product: {
              include: {
                developer: true
              }
            },
            version: true,
            reviewer: true
          }
        }),
        this.prisma.marketplaceSubmission.count({
          where: { status: 'pending_review' }
        })
      ]);

      return {
        submissions: submissions.map(s => ({
          id: s.id,
          productId: s.product.id,
          productName: s.product.name,
          version: s.version?.version,
          developerName: s.product.developer?.storeName,
          status: s.status,
          notes: s.notes,
          submittedAt: s.createdAt,
          reviewedAt: s.reviewer ? new Date() : null
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      this.logger.error('[Submission] Get pending submissions failed:', error.message);
      throw error;
    }
  }

  /**
   * Get developer submissions
   * @param {string} developerId - Developer user ID
   * @returns {Promise<Array>} Developer submissions
   */
  async getDeveloperSubmissions(developerId) {
    try {
      const developer = await this.prisma.developerProfile.findUnique({
        where: { userId: developerId }
      });

      if (!developer) {
        throw new Error('developer_not_found');
      }

      const submissions = await this.prisma.marketplaceSubmission.findMany({
        where: {
          product: {
            developerId: developer.id
          }
        },
        include: {
          product: true,
          version: true
        },
        orderBy: { createdAt: 'desc' }
      });

      return submissions.map(s => ({
        id: s.id,
        productId: s.product.id,
        productName: s.product.name,
        status: s.status,
        version: s.version?.version,
        submittedAt: s.createdAt,
        notes: s.notes
      }));
    } catch (error) {
      this.logger.error('[Submission] Get developer submissions failed:', error.message);
      throw error;
    }
  }

  /**
   * Helper: Generate URL-friendly slug
   */
  _generateSlug(slug) {
    return slug
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Helper: Log build event
   */
  async _logBuildEvent(submissionId, productId, versionId, level, message, step) {
    try {
      await this.prisma.marketplaceBuildLog.create({
        data: {
          submissionId,
          productId,
          versionId,
          level,
          message,
          step
        }
      });
    } catch (error) {
      this.logger.warn('[Submission] Log build event failed:', error.message);
    }
  }

  /**
   * Helper: Notify admins
   */
  async _notifyAdmins(eventType, data) {
    try {
      const admins = await this.prisma.user.findMany({
        where: {
          roles: {
            some: {
              role: {
                name: 'admin'
              }
            }
          }
        }
      });

      if (this.emailService && this.emailService.send) {
        for (const admin of admins) {
          await this.emailService.send({
            to: admin.email,
            template: `marketplace_${eventType}`,
            data
          });
        }
      }
    } catch (error) {
      this.logger.warn('[Submission] Notify admins failed:', error.message);
    }
  }

  /**
   * Helper: Notify developer
   */
  async _notifyDeveloper(developerId, eventType, data) {
    try {
      const developer = await this.prisma.developerProfile.findUnique({
        where: { id: developerId },
        include: { user: true }
      });

      if (developer && this.emailService && this.emailService.send) {
        await this.emailService.send({
          to: developer.user.email,
          template: `marketplace_${eventType}`,
          data
        });
      }
    } catch (error) {
      this.logger.warn('[Submission] Notify developer failed:', error.message);
    }
  }

  /**
   * Helper: Trigger webhook
   */
  async _triggerWebhook(event, payload) {
    try {
      if (this.webhookService && this.webhookService.trigger) {
        await this.webhookService.trigger(event, payload);
      }
    } catch (error) {
      this.logger.warn('[Submission] Trigger webhook failed:', error.message);
    }
  }
}

module.exports = SubmissionService;