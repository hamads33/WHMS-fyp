// src/modules/marketplace/services/marketplace.service.js
// Core marketplace service for browsing, viewing, and managing plugins

class MarketplaceService {
  constructor({ prisma, logger = console }) {
    this.prisma = prisma;
    this.logger = logger;
  }

  /**
   * FR-M01: Browse all approved marketplace plugins
   * @param {Object} options - Filtering options
   * @returns {Promise<Array>} Approved plugins
   */
  async browsePlugins(options = {}) {
    const {
      page = 1,
      limit = 20,
      category = null,
      search = null,
      sortBy = 'downloads', // downloads, rating, newest
      minRating = 0
    } = options;

    const skip = (page - 1) * limit;

    // Build filter conditions
    const where = {
      status: 'approved',
      disabled: false,
      latestVersion: {
        isNot: null
      }
    };

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { hasSome: [search.toLowerCase()] } }
      ];
    }

    if (minRating > 0) {
      where.avgRating = {
        gte: minRating
      };
    }

    // Build sort
    const orderBy = this._getSortOrder(sortBy);

    try {
      const [products, total] = await Promise.all([
        this.prisma.marketplaceProduct.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            developer: {
              select: {
                storeName: true,
                displayName: true
              }
            },
            latestVersion: {
              select: {
                version: true,
                releaseDate: true
              }
            },
            reviews: {
              select: {
                rating: true
              }
            },
            dependencies: {
              select: {
                dependencyId: true
              }
            }
          }
        }),
        this.prisma.marketplaceProduct.count({ where })
      ]);

      return {
        products: products.map(p => this._formatProductSummary(p)),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      this.logger.error('[Marketplace] Browse plugins failed:', error.message);
      throw error;
    }
  }

  /**
   * FR-M02: Get detailed plugin specifications and metadata
   * @param {string} productId - Plugin product ID
   * @returns {Promise<Object>} Detailed plugin information
   */
  async getPluginDetails(productId) {
    try {
      const product = await this.prisma.marketplaceProduct.findUnique({
        where: { id: productId },
        include: {
          developer: {
            select: {
              user: {
                select: {
                  email: true
                }
              },
              storeName: true,
              displayName: true,
              website: true,
              github: true
            }
          },
          versions: {
            where: { approved: true },
            orderBy: { releaseDate: 'desc' },
            take: 10,
            select: {
              id: true,
              version: true,
              releaseDate: true,
              changelog: true,
              downloads: true
            }
          },
          latestVersion: {
            select: {
              id: true,
              version: true,
              releaseDate: true,
              downloadUrl: true,
              manifestJson: true,
              fileSize: true,
              changelog: true
            }
          },
          reviews: {
            select: {
              id: true,
              rating: true,
              text: true,
              userId: true,
              createdAt: true
            },
            orderBy: { createdAt: 'desc' },
            take: 20
          },
          dependencies: {
            select: {
              dependencyId: true,
              required: true,
              minVersion: true
            }
          },
          analytics: {
            take: 1,
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!product) {
        throw new Error('plugin_not_found');
      }

      if (product.status !== 'approved') {
        throw new Error('plugin_not_available');
      }

      // Format manifest for response
      let manifest = null;
      if (product.latestVersion?.manifestJson) {
        try {
          manifest = typeof product.latestVersion.manifestJson === 'string'
            ? JSON.parse(product.latestVersion.manifestJson)
            : product.latestVersion.manifestJson;
        } catch (e) {
          this.logger.warn('Failed to parse manifest:', e.message);
        }
      }

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        icon: product.icon,
        category: product.category,
        tags: product.tags,
        status: product.status,
        avgRating: product.avgRating,
        totalRatings: product.totalRatings,
        developer: {
          name: product.developer?.storeName || product.developer?.displayName,
          website: product.developer?.website,
          github: product.developer?.github
        },
        currentVersion: {
          version: product.latestVersion?.version,
          releaseDate: product.latestVersion?.releaseDate,
          fileSize: product.latestVersion?.fileSize,
          changelog: product.latestVersion?.changelog,
          downloadUrl: product.latestVersion?.downloadUrl
        },
        manifest: manifest ? {
          id: manifest.id,
          name: manifest.name,
          version: manifest.version,
          description: manifest.description,
          actions: manifest.actions,
          hooks: manifest.hooks,
          ui: manifest.ui,
          dependencies: manifest.dependencies
        } : null,
        allVersions: product.versions,
        reviews: product.reviews.map(r => ({
          id: r.id,
          rating: r.rating,
          text: r.text,
          userId: r.userId,
          createdAt: r.createdAt
        })),
        dependencies: product.dependencies,
        stats: {
          downloads: product.totalDownloads,
          active: product.activeInstances,
          crashes: product.totalCrashes
        },
        license: {
          type: product.licenseType,
          required: product.licenseRequired
        }
      };
    } catch (error) {
      this.logger.error(`[Marketplace] Get plugin details failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * FR-M10: Submit and view plugin ratings
   * @param {string} productId - Plugin ID
   * @param {string} userId - User ID
   * @param {number} rating - Rating 1-5
   * @param {string} text - Review text
   * @returns {Promise<Object>} Created review
   */
  async submitRating(productId, userId, rating, text) {
    try {
      // Validate rating
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new Error('invalid_rating');
      }

      // Check if product exists and is approved
      const product = await this.prisma.marketplaceProduct.findUnique({
        where: { id: productId }
      });

      if (!product || product.status !== 'approved') {
        throw new Error('plugin_not_found');
      }

      // Check if user has already reviewed
      const existingReview = await this.prisma.marketplaceReview.findFirst({
        where: {
          productId,
          userId
        }
      });

      let review;
      if (existingReview) {
        // Update existing review
        review = await this.prisma.marketplaceReview.update({
          where: { id: existingReview.id },
          data: {
            rating,
            text: text || null,
            updatedAt: new Date()
          }
        });
      } else {
        // Create new review
        review = await this.prisma.marketplaceReview.create({
          data: {
            productId,
            userId,
            rating,
            text: text || null
          }
        });
      }

      // Recalculate average rating
      await this._updateAverageRating(productId);

      return {
        id: review.id,
        rating: review.rating,
        text: review.text,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt
      };
    } catch (error) {
      this.logger.error(`[Marketplace] Submit rating failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get ratings for a plugin
   * @param {string} productId - Plugin ID
   * @param {Object} options - Pagination options
   * @returns {Promise<Array>} Ratings
   */
  async getPluginRatings(productId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    try {
      const [reviews, total] = await Promise.all([
        this.prisma.marketplaceReview.findMany({
          where: { productId },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            rating: true,
            text: true,
            userId: true,
            createdAt: true
          }
        }),
        this.prisma.marketplaceReview.count({
          where: { productId }
        })
      ]);

      return {
        reviews,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      this.logger.error(`[Marketplace] Get ratings failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get plugin categories
   * @returns {Promise<Array>} Categories
   */
  async getCategories() {
    try {
      const categories = await this.prisma.marketplaceProduct.findMany({
        distinct: ['category'],
        where: {
          status: 'approved',
          disabled: false
        },
        select: {
          category: true
        }
      });

      return categories.map(c => c.category).filter(Boolean);
    } catch (error) {
      this.logger.error('[Marketplace] Get categories failed:', error.message);
      throw error;
    }
  }

  /**
   * Helper: Format product for summary view
   */
  _formatProductSummary(product) {
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      icon: product.icon,
      category: product.category,
      tags: product.tags,
      version: product.latestVersion?.version || 'unknown',
      avgRating: product.avgRating,
      totalRatings: product.totalRatings,
      downloads: product.totalDownloads,
      developer: product.developer?.storeName || 'Unknown Developer',
      licenseRequired: product.licenseRequired
    };
  }

  /**
   * Helper: Get sort order
   */
  _getSortOrder(sortBy) {
    switch (sortBy) {
      case 'rating':
        return { avgRating: 'desc' };
      case 'newest':
        return { createdAt: 'desc' };
      case 'downloads':
      default:
        return { totalDownloads: 'desc' };
    }
  }

  /**
   * Helper: Update average rating
   */
  async _updateAverageRating(productId) {
    try {
      const ratings = await this.prisma.marketplaceReview.groupBy({
        by: ['productId'],
        where: { productId },
        _avg: { rating: true },
        _count: { id: true }
      });

      if (ratings.length > 0) {
        const avgRating = ratings[0]._avg.rating || 0;
        const totalRatings = ratings[0]._count.id || 0;

        await this.prisma.marketplaceProduct.update({
          where: { id: productId },
          data: {
            avgRating: parseFloat(avgRating.toFixed(2)),
            totalRatings
          }
        });
      }
    } catch (error) {
      this.logger.warn('[Marketplace] Update rating failed:', error.message);
    }
  }
}

module.exports = MarketplaceService;