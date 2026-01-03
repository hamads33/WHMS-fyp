
// src/modules/marketplace/utils/slug.generator.js
// URL slug generation

class SlugGenerator {
  /**
   * Generate slug from text
   */
  static generate(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special chars
      .replace(/[\s_-]+/g, '-')   // Replace spaces with hyphens
      .replace(/^-+|-+$/g, '');   // Remove leading/trailing hyphens
  }

  /**
   * Check if slug is valid
   */
  static isValid(slug) {
    return /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(slug);
  }

  /**
   * Ensure unique slug
   */
  static async ensureUnique(slug, prisma, excludeId = null) {
    let uniqueSlug = slug;
    let counter = 1;

    while (true) {
      const existing = await prisma.marketplaceProduct.findFirst({
        where: {
          slug: uniqueSlug,
          ...(excludeId && { id: { not: excludeId } })
        }
      });

      if (!existing) break;

      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    return uniqueSlug;
  }
}

module.exports = SlugGenerator;

