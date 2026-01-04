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

    // Build filter conditions - FIXED: Use correct schema field names
    const where = {
      status: 'approved', // MarketplaceProduct.status
      // NO disabled field in schema - removed
      // latestVersion: { isNot: null } - no latestVersion relation in schema
    };

    if (category) {
      where.categoryId = category;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { shortDesc: { contains: search, mode: 'insensitive' } },
        { longDesc: { contains: search, mode: 'insensitive' } },
        { tags: { hasSome: [search.toLowerCase()] } }
      ];
    }

    if (minRating > 0) {
      where.ratingAvg = {
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
            seller: {
              select: {
                storeName: true,
                displayName: true
              }
            },
            category: {
              select: {
                name: true,
                slug: true
              }
            },
            reviews: {
              select: {
                rating: true
              }
            },
            versions: {
              select: {
                version: true,
                createdAt: true
              },
              orderBy: { createdAt: 'desc' },
              take: 1
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
          seller: {
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
          category: {
            select: {
              name: true,
              slug: true
            }
          },
          versions: {
            where: { approvedAt: { not: null } },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
              id: true,
              version: true,
              createdAt: true,
              approvedAt: true,
              changelog: true
            }
          },
          reviews: {
            select: {
              id: true,
              rating: true,
              review: true,
              createdAt: true
            },
            orderBy: { createdAt: 'desc' },
            take: 20
          },
          dependencies: {
            select: {
              id: true,
              versionRange: true,
              approved: true
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

      // Get latest approved version
      const latestVersion = product.versions.length > 0 ? product.versions[0] : null;

      return {
        id: product.id,
        title: product.title,
        slug: product.slug,
        shortDesc: product.shortDesc,
        longDesc: product.longDesc,
        logo: product.logo,
        screenshots: product.screenshots,
        documentation: product.documentation,
        category: product.category ? {
          id: product.category.name,
          name: product.category.name,
          slug: product.category.slug
        } : null,
        tags: product.tags,
        status: product.status,
        ratingAvg: product.ratingAvg,
        ratingCount: product.ratingCount,
        seller: {
          name: product.seller?.storeName || product.seller?.displayName,
          website: product.seller?.website,
          github: product.seller?.github
        },
        currentVersion: latestVersion ? {
          id: latestVersion.id,
          version: latestVersion.version,
          releaseDate: latestVersion.createdAt,
          approvedAt: latestVersion.approvedAt,
          changelog: latestVersion.changelog
        } : null,
        allVersions: product.versions.map(v => ({
          id: v.id,
          version: v.version,
          releaseDate: v.createdAt,
          approved: !!v.approvedAt
        })),
        reviews: product.reviews.map(r => ({
          id: r.id,
          rating: r.rating,
          text: r.review,
          createdAt: r.createdAt
        })),
        dependencies: product.dependencies,
        stats: {
          installCount: product.installCount,
          downloadCount: product.downloadCount
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
            review: text || null
          }
        });
      } else {
        // Create new review
        review = await this.prisma.marketplaceReview.create({
          data: {
            productId,
            userId,
            rating,
            review: text || null
          }
        });
      }

      // Recalculate average rating
      await this._updateAverageRating(productId);

      return {
        id: review.id,
        rating: review.rating,
        text: review.review,
        createdAt: review.createdAt
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
            review: true,
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
      const categories = await this.prisma.marketplaceCategory.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          icon: true
        }
      });

      return categories;
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
      title: product.title,
      shortDesc: product.shortDesc,
      logo: product.logo,
      category: product.category?.name,
      tags: product.tags,
      version: product.versions[0]?.version || 'unknown',
      ratingAvg: product.ratingAvg,
      ratingCount: product.ratingCount,
      installCount: product.installCount,
      downloadCount: product.downloadCount,
      seller: product.seller?.storeName || 'Unknown Developer'
    };
  }

  /**
   * Helper: Get sort order
   */
  _getSortOrder(sortBy) {
    switch (sortBy) {
      case 'rating':
        return { ratingAvg: 'desc' };
      case 'newest':
        return { createdAt: 'desc' };
      case 'downloads':
      default:
        return { downloadCount: 'desc' };
    }
  }

  /**
   * Helper: Update average rating
   */
  async _updateAverageRating(productId) {
    try {
      const ratings = await this.prisma.marketplaceReview.findMany({
        where: { productId },
        select: { rating: true }
      });

      if (ratings.length > 0) {
        const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

        await this.prisma.marketplaceProduct.update({
          where: { id: productId },
          data: {
            ratingAvg: parseFloat(avgRating.toFixed(2)),
            ratingCount: ratings.length
          }
        });
      }
    } catch (error) {
      this.logger.warn('[Marketplace] Update rating failed:', error.message);
    }
  }
}

module.exports = MarketplaceService;