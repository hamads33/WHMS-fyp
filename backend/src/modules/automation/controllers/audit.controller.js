/**
 * AuditController
 * ---------------------------------------------------------
 * Read-only access to audit logs.
 *
 * Responsibilities:
 *  - Global audit logs
 *  - Per-automation-profile audit logs
 *  - Total counts for pagination / dashboards
 *
 * Notes:
 *  - No write operations here
 *  - Business logic lives in AuditService
 */

class AuditController {
  constructor({ auditService }) {
    this.auditService = auditService;
  }

  // ======================================================
  // GET /audit/logs
  // ======================================================
  async getLogs(req, res) {
    try {
      const { source, action, limit, offset } = req.query;

      const filters = {};
      if (source) filters.source = source;
      if (action) filters.action = action;

      const logs = await this.auditService.list(
        filters,
        Math.min(Number(limit) || 50, 100),
        Math.max(Number(offset) || 0, 0)
      );

      return res.success(logs);
    } catch (err) {
      return res.error(err, 500);
    }
  }

  // ======================================================
  // GET /audit/logs/count
  // ======================================================
  async getTotalLogs(req, res) {
    try {
      const total = await this.auditService.count();
      return res.success({ total });
    } catch (err) {
      return res.error(err, 500);
    }
  }

  // ======================================================
  // GET /audit/profiles/:profileId/logs
  // ======================================================
  async getLogsForProfile(req, res) {
    try {
      const profileId = Number(req.params.profileId);
      const { limit, offset } = req.query;

      if (!Number.isInteger(profileId) || profileId <= 0) {
        return res.fail("Invalid profileId", 400, "invalid_param");
      }

      // Fetch all automation logs and filter by profileId in meta
      // This works because we store profileId in meta.profileId
      const logs = await this.auditService.list(
        { source: "automation" },
        Math.min(Number(limit) || 50, 100),
        Math.max(Number(offset) || 0, 0)
      );

      // Filter by profileId in meta (application-side filtering)
      const filtered = logs.filter(log => log.meta?.profileId === profileId);

      return res.success(filtered);
    } catch (err) {
      return res.error(err, 500);
    }
  }

  // ======================================================
  // GET /audit/profiles/:profileId/logs/count
  // ======================================================
  async getProfileLogCount(req, res) {
    try {
      const profileId = Number(req.params.profileId);

      if (!Number.isInteger(profileId) || profileId <= 0) {
        return res.fail("Invalid profileId", 400, "invalid_param");
      }

      // Get all automation logs (limited to prevent memory issues)
      const allLogs = await this.auditService.list(
        { source: "automation" },
        10000,  // Fetch up to 10k logs for counting
        0
      );

      // Filter and count by profileId
      const filtered = allLogs.filter(log => log.meta?.profileId === profileId);

      return res.success({ total: filtered.length });
    } catch (err) {
      return res.error(err, 500);
    }
  }
}

module.exports = AuditController;