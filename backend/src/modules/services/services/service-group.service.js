/**
 * Service Group Service
 * Path: src/modules/services/services/service-group.service.js
 * 
 * Manages service groups/categories for organizing services
 * Example: Web Hosting, VPS, Dedicated Servers, SSL Certificates, etc.
 */

const prisma = require("../../../../prisma");

class ServiceGroupService {
  /**
   * Create a new service group
   */
  async create(data, actor) {
    try {
      const slug = this.generateSlug(data.name);

      const group = await prisma.serviceGroup.create({
        data: {
          name: data.name,
          slug,
          description: data.description,
          icon: data.icon,
          position: data.position || 0,
          active: true,
        },
        include: { services: true },
      });

      return group;
    } catch (err) {
      if (err.code === "P2002") {
        const e = new Error("Service group name or slug already exists");
        e.statusCode = 400;
        throw e;
      }
      throw err;
    }
  }

  /**
   * Get all service groups (admin)
   */
  async listAll() {
    return prisma.serviceGroup.findMany({
      include: {
        services: {
          where: { active: true },
          include: { plans: true },
        },
      },
      orderBy: { position: "asc" },
    });
  }

  /**
   * Get active service groups (client view)
   */
  async listActive() {
    return prisma.serviceGroup.findMany({
      where: { active: true, hidden: false },
      include: {
        services: {
          where: { active: true, hidden: false },
          include: {
            plans: {
              where: { active: true, hidden: false },
              include: {
                pricing: { where: { active: true } },
              },
            },
          },
        },
      },
      orderBy: { position: "asc" },
    });
  }

  /**
   * Get group by ID
   */
  async getById(id) {
    const group = await prisma.serviceGroup.findUnique({
      where: { id },
      include: {
        services: {
          include: {
            plans: {
              include: { pricing: true, features: true },
            },
          },
        },
      },
    });

    if (!group) {
      const err = new Error("Service group not found");
      err.statusCode = 404;
      throw err;
    }

    return group;
  }

  /**
   * Get group by slug
   */
  async getBySlug(slug) {
    const group = await prisma.serviceGroup.findUnique({
      where: { slug },
      include: {
        services: {
          where: { active: true, hidden: false },
          include: {
            plans: {
              where: { active: true, hidden: false },
              include: {
                pricing: { where: { active: true } },
                features: true,
              },
            },
          },
        },
      },
    });

    if (!group) {
      const err = new Error("Service group not found");
      err.statusCode = 404;
      throw err;
    }

    return group;
  }

  /**
   * Update service group
   */
  async update(id, data, actor) {
    await this.getById(id); // Validate exists

    const updateData = {};
    if (data.name !== undefined) {
      updateData.name = data.name;
      updateData.slug = this.generateSlug(data.name);
    }
    if (data.description !== undefined) updateData.description = data.description;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.position !== undefined) updateData.position = data.position;
    if (data.active !== undefined) updateData.active = data.active;
    if (data.hidden !== undefined) updateData.hidden = data.hidden;

    const updated = await prisma.serviceGroup.update({
      where: { id },
      data: updateData,
      include: { services: true },
    });

    return updated;
  }

  /**
   * Toggle group visibility
   */
  async toggleVisibility(id, actor) {
    const group = await this.getById(id);

    return this.update(id, { hidden: !group.hidden }, actor);
  }

  /**
   * Delete service group
   * Only allows deletion if no services are assigned
   */
  async delete(id, actor) {
    const group = await this.getById(id);

    if (group.services.length > 0) {
      const err = new Error(
        "Cannot delete service group with assigned services"
      );
      err.statusCode = 400;
      throw err;
    }

    await prisma.serviceGroup.delete({
      where: { id },
    });

    return { message: "Service group deleted successfully" };
  }

  /**
   * Reorder service groups
   */
  async reorder(groupIds, actor) {
    const updates = groupIds.map((id, index) =>
      prisma.serviceGroup.update({
        where: { id },
        data: { position: index },
      })
    );

    return Promise.all(updates);
  }

  /**
   * Get statistics for a group
   */
  async getStats(id) {
    const group = await this.getById(id);

    const stats = {
      groupId: id,
      serviceCount: group.services.length,
      planCount: group.services.reduce((sum, s) => sum + s.plans.length, 0),
      activeServices: group.services.filter((s) => s.active).length,
      activeHidden: group.services.filter((s) => s.hidden).length,
    };

    return stats;
  }

  /**
   * Bulk update groups (e.g. activate/deactivate/hide)
   */
  async bulkUpdate(ids, data, actor) {
    await prisma.serviceGroup.updateMany({ where: { id: { in: ids } }, data });
    return { updated: ids.length };
  }

  /**
   * Bulk delete groups (hard delete, bypasses service-count guard)
   */
  async bulkDelete(ids, actor) {
    await prisma.serviceGroup.deleteMany({ where: { id: { in: ids } } });
    return { deleted: ids.length };
  }

  /**
   * Helper: Generate URL-friendly slug
   */
  generateSlug(name) {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
}

module.exports = new ServiceGroupService();