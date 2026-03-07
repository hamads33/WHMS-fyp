const fs = require('fs');
const path = require('path');

class BroadcastService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async createBroadcast(data) {
    return this.prisma.broadcast.create({
      data: {
        type: data.type,
        title: data.title,
        content: data.content || null,
        fileKey: data.fileKey || null,
        fileOriginalName: data.fileOriginalName || null,
        fileMimeType: data.fileMimeType || null,
        fileSize: data.fileSize || null,
        targetAudience: data.targetAudience || 'ALL',
        targetUserIds: data.targetUserIds || null,
        severity: data.severity || 'INFO',
        isDismissible: data.isDismissible !== undefined ? data.isDismissible : true,
        publishAt: data.publishAt ? new Date(data.publishAt) : null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        isActive: true,
        createdById: data.createdById,
      },
      include: { createdBy: { select: { id: true, email: true } } },
    });
  }

  async listBroadcasts(filters = {}) {
    const { type, isActive, page = 1, limit = 20 } = filters;
    const where = {};
    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive;

    const [broadcasts, total] = await Promise.all([
      this.prisma.broadcast.findMany({
        where,
        include: {
          createdBy: { select: { id: true, email: true } },
          engagements: true,
          dismissals: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.broadcast.count({ where }),
    ]);

    return {
      data: broadcasts.map(b => this._enrichBroadcast(b)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async getBroadcast(id) {
    const broadcast = await this.prisma.broadcast.findUnique({
      where: { id: parseInt(id) },
      include: {
        createdBy: { select: { id: true, email: true } },
        engagements: true,
        dismissals: true,
      },
    });
    if (!broadcast) throw new Error('Broadcast not found');
    return this._enrichBroadcast(broadcast);
  }

  async updateBroadcast(id, data) {
    const updateData = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.targetAudience !== undefined) updateData.targetAudience = data.targetAudience;
    if (data.targetUserIds !== undefined) updateData.targetUserIds = data.targetUserIds;
    if (data.severity !== undefined) updateData.severity = data.severity;
    if (data.isDismissible !== undefined) updateData.isDismissible = data.isDismissible;
    if (data.publishAt !== undefined) updateData.publishAt = data.publishAt ? new Date(data.publishAt) : null;
    if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    return this.prisma.broadcast.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        createdBy: { select: { id: true, email: true } },
        engagements: true,
        dismissals: true,
      },
    });
  }

  async deleteBroadcast(id) {
    const broadcast = await this.prisma.broadcast.findUnique({
      where: { id: parseInt(id) },
    });
    if (!broadcast) throw new Error('Broadcast not found');

    // Delete file if it's a document
    if (broadcast.fileKey && broadcast.type === 'DOCUMENT') {
      const filePath = path.join(__dirname, '../../../../storage/broadcasts', broadcast.fileKey);
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (err) {
        console.error(`Failed to delete file ${filePath}:`, err);
      }
    }

    // Soft delete
    return this.prisma.broadcast.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
      include: { createdBy: { select: { id: true, email: true } } },
    });
  }

  async getActiveNotificationsForUser(userId, userRoles) {
    const now = new Date();
    const where = {
      type: 'NOTIFICATION',
      isActive: true,
      OR: [{ publishAt: null }, { publishAt: { lte: now } }],
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    };

    // Filter by target audience
    const targetConditions = [{ targetAudience: 'ALL' }];
    if (userRoles.includes('client')) targetConditions.push({ targetAudience: 'CLIENTS' });
    if (userRoles.includes('admin') || userRoles.includes('staff')) targetConditions.push({ targetAudience: 'STAFF' });
    if (userRoles.includes('developer')) targetConditions.push({ targetAudience: 'DEVELOPERS' });
    where.OR = targetConditions;

    const broadcasts = await this.prisma.broadcast.findMany({
      where,
      include: {
        createdBy: { select: { id: true, email: true } },
        dismissals: { where: { userId } },
      },
      orderBy: { publishAt: 'desc' },
    });

    // Filter out dismissed broadcasts
    return broadcasts
      .filter(b => b.dismissals.length === 0)
      .map(b => this._enrichBroadcast(b));
  }

  async getDocumentsForUser(userId, userRoles) {
    const now = new Date();
    const where = {
      type: 'DOCUMENT',
      isActive: true,
      OR: [{ publishAt: null }, { publishAt: { lte: now } }],
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    };

    // Filter by target audience (same logic as notifications)
    const targetConditions = [{ targetAudience: 'ALL' }];
    if (userRoles.includes('client')) targetConditions.push({ targetAudience: 'CLIENTS' });
    if (userRoles.includes('admin') || userRoles.includes('staff')) targetConditions.push({ targetAudience: 'STAFF' });
    if (userRoles.includes('developer')) targetConditions.push({ targetAudience: 'DEVELOPERS' });
    where.OR = targetConditions;

    return this.prisma.broadcast.findMany({
      where,
      include: {
        createdBy: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async dismissBroadcast(broadcastId, userId) {
    return this.prisma.broadcastDismissal.upsert({
      where: { broadcastId_userId: { broadcastId: parseInt(broadcastId), userId } },
      update: {},
      create: { broadcastId: parseInt(broadcastId), userId },
    });
  }

  async recordEngagement(broadcastId, userId, action) {
    return this.prisma.broadcastEngagement.create({
      data: {
        broadcastId: parseInt(broadcastId),
        userId,
        action,
      },
    });
  }

  async getEngagementStats(broadcastId) {
    const engagements = await this.prisma.broadcastEngagement.findMany({
      where: { broadcastId: parseInt(broadcastId) },
    });

    const dismissals = await this.prisma.broadcastDismissal.findMany({
      where: { broadcastId: parseInt(broadcastId) },
    });

    const stats = {
      views: engagements.filter(e => e.action === 'VIEW').length,
      downloads: engagements.filter(e => e.action === 'DOWNLOAD').length,
      dismissals: dismissals.length,
      uniqueUsers: new Set(engagements.map(e => e.userId)).size,
    };

    return stats;
  }

  _enrichBroadcast(broadcast) {
    const now = new Date();
    let status = 'Live';
    if (!broadcast.isActive) status = 'Inactive';
    else if (broadcast.publishAt && broadcast.publishAt > now) status = 'Scheduled';
    else if (broadcast.expiresAt && broadcast.expiresAt <= now) status = 'Expired';

    return {
      ...broadcast,
      status,
      engagementStats: {
        views: broadcast.engagements?.filter(e => e.action === 'VIEW').length || 0,
        downloads: broadcast.engagements?.filter(e => e.action === 'DOWNLOAD').length || 0,
        dismissals: broadcast.dismissals?.length || 0,
      },
    };
  }
}

module.exports = BroadcastService;
