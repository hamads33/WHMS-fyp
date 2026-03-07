const BroadcastService = require('../services/broadcast.service');

const prisma = require('../../../db/prisma');
const broadcastService = new BroadcastService(prisma);

// ADMIN CONTROLLERS

exports.createBroadcast = async (req, res) => {
  try {
    const { type, title, content, targetAudience, targetUserIds, severity, isDismissible, publishAt, expiresAt } = req.body;

    if (!type || !title) {
      return res.status(400).json({ success: false, error: 'Missing required fields: type, title' });
    }

    let fileKey = null;
    let fileOriginalName = null;
    let fileMimeType = null;
    let fileSize = null;

    if (type === 'DOCUMENT' && req.file) {
      fileKey = req.file.filename;
      fileOriginalName = req.file.originalname;
      fileMimeType = req.file.mimetype;
      fileSize = req.file.size;
    }

    const broadcast = await broadcastService.createBroadcast({
      type,
      title,
      content,
      fileKey,
      fileOriginalName,
      fileMimeType,
      fileSize,
      targetAudience: targetAudience || 'ALL',
      targetUserIds: targetUserIds ? JSON.parse(targetUserIds) : null,
      severity: severity || 'INFO',
      isDismissible: isDismissible !== undefined ? JSON.parse(isDismissible) : true,
      publishAt,
      expiresAt,
      createdById: req.user.id,
    });

    // Log audit
    await req.app.locals.auditLogger.log({
      source: 'broadcast',
      action: 'broadcast.created',
      actor: req.user.id,
      level: 'INFO',
      userId: req.user.id,
      entity: 'Broadcast',
      entityId: broadcast.id,
      ip: req.auditContext?.ip,
      userAgent: req.auditContext?.userAgent,
      meta: { type, title, targetAudience },
    });

    res.json({ success: true, data: broadcast });
  } catch (err) {
    console.error('Error creating broadcast:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

exports.listBroadcasts = async (req, res) => {
  try {
    const { type, isActive, page = 1, limit = 20 } = req.query;
    const result = await broadcastService.listBroadcasts({
      type,
      isActive: isActive ? JSON.parse(isActive) : undefined,
      page: parseInt(page),
      limit: parseInt(limit),
    });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Error listing broadcasts:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getBroadcast = async (req, res) => {
  try {
    const broadcast = await broadcastService.getBroadcast(req.params.id);
    res.json({ success: true, data: broadcast });
  } catch (err) {
    console.error('Error getting broadcast:', err);
    res.status(err.message === 'Broadcast not found' ? 404 : 500).json({ success: false, error: err.message });
  }
};

exports.updateBroadcast = async (req, res) => {
  try {
    const broadcast = await broadcastService.updateBroadcast(req.params.id, req.body);

    // Log audit
    await req.app.locals.auditLogger.log({
      source: 'broadcast',
      action: 'broadcast.updated',
      actor: req.user.id,
      level: 'INFO',
      userId: req.user.id,
      entity: 'Broadcast',
      entityId: broadcast.id,
      ip: req.auditContext?.ip,
      userAgent: req.auditContext?.userAgent,
      meta: { updates: Object.keys(req.body) },
    });

    res.json({ success: true, data: broadcast });
  } catch (err) {
    console.error('Error updating broadcast:', err);
    res.status(err.message === 'Broadcast not found' ? 404 : 500).json({ success: false, error: err.message });
  }
};

exports.deleteBroadcast = async (req, res) => {
  try {
    await broadcastService.deleteBroadcast(req.params.id);

    // Log audit
    await req.app.locals.auditLogger.log({
      source: 'broadcast',
      action: 'broadcast.deleted',
      actor: req.user.id,
      level: 'INFO',
      userId: req.user.id,
      entity: 'Broadcast',
      entityId: parseInt(req.params.id),
      ip: req.auditContext?.ip,
      userAgent: req.auditContext?.userAgent,
    });

    res.json({ success: true, message: 'Broadcast deleted' });
  } catch (err) {
    console.error('Error deleting broadcast:', err);
    res.status(err.message === 'Broadcast not found' ? 404 : 500).json({ success: false, error: err.message });
  }
};

exports.getEngagement = async (req, res) => {
  try {
    const stats = await broadcastService.getEngagementStats(req.params.id);
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error('Error getting engagement stats:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// CLIENT CONTROLLERS

exports.getNotifications = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { roles: { include: { role: true } } },
    });

    const userRoles = user?.roles?.map(ur => ur.role.name.toLowerCase()) || [];
    const notifications = await broadcastService.getActiveNotificationsForUser(req.user.id, userRoles);

    res.json({ success: true, data: notifications });
  } catch (err) {
    console.error('Error getting notifications:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getDocuments = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { roles: { include: { role: true } } },
    });

    const userRoles = user?.roles?.map(ur => ur.role.name.toLowerCase()) || [];
    const documents = await broadcastService.getDocumentsForUser(req.user.id, userRoles);

    // Record VIEW engagement for each document
    for (const doc of documents) {
      await broadcastService.recordEngagement(doc.id, req.user.id, 'VIEW');
    }

    res.json({ success: true, data: documents });
  } catch (err) {
    console.error('Error getting documents:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.dismissNotification = async (req, res) => {
  try {
    await broadcastService.dismissBroadcast(req.params.id, req.user.id);
    await broadcastService.recordEngagement(req.params.id, req.user.id, 'DISMISS');

    // Log audit
    await req.app.locals.auditLogger.log({
      source: 'broadcast',
      action: 'broadcast.dismissed',
      actor: req.user.id,
      level: 'INFO',
      userId: req.user.id,
      entity: 'Broadcast',
      entityId: parseInt(req.params.id),
      ip: req.auditContext?.ip,
      userAgent: req.auditContext?.userAgent,
    });

    res.json({ success: true, message: 'Notification dismissed' });
  } catch (err) {
    console.error('Error dismissing notification:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.downloadDocument = async (req, res) => {
  try {
    const broadcast = await prisma.broadcast.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!broadcast || broadcast.type !== 'DOCUMENT') {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    const filePath = require('path').join(__dirname, '../../../../storage/broadcasts', broadcast.fileKey);

    // Check if file exists
    if (!require('fs').existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    // Record DOWNLOAD engagement
    await broadcastService.recordEngagement(req.params.id, req.user.id, 'DOWNLOAD');

    // Log audit
    await req.app.locals.auditLogger.log({
      source: 'broadcast',
      action: 'broadcast.downloaded',
      actor: req.user.id,
      level: 'INFO',
      userId: req.user.id,
      entity: 'Broadcast',
      entityId: broadcast.id,
      ip: req.auditContext?.ip,
      userAgent: req.auditContext?.userAgent,
      meta: { fileName: broadcast.fileOriginalName },
    });

    res.download(filePath, broadcast.fileOriginalName);
  } catch (err) {
    console.error('Error downloading document:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
