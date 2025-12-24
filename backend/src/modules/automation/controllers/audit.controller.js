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

  // ------------------------------------------------------
  // GET /audit/logs
  // ------------------------------------------------------
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
      return res.error(err.message, 500);
    }
  }

  // ------------------------------------------------------
  // GET /audit/logs/count
  // ------------------------------------------------------
  async getTotalLogs(req, res) {
    try {
      const total = await this.auditService.count();
      return res.success({ total });
    } catch (err) {
      return res.error(err.message, 500);
    }
  }

  // ------------------------------------------------------
  // GET /audit/profiles/:profileId/logs
  // ------------------------------------------------------
 async getLogsForProfile(req, res) {
  try {
    const profileId = Number(req.params.profileId);
    const { limit, offset } = req.query;

    const logs = await this.auditService.list(
      {
        source: "automation",
        meta: {
          path: ["profileId"],
          equals: profileId
        }
      },
      Math.min(Number(limit) || 50, 100),
      Math.max(Number(offset) || 0, 0)
    );

    return res.success(logs);
  } catch (err) {
    return res.error(err.message, 500);
  }
}

  // ------------------------------------------------------
  // GET /audit/profiles/:profileId/logs/count
  // ------------------------------------------------------
async getProfileLogCount(req, res) {
  try {
    const profileId = Number(req.params.profileId);

    const total = await this.auditService.count({
      source: "automation",
      meta: {
        path: ["profileId"],
        equals: profileId
      }
    });

    return res.success({ total });
  } catch (err) {
    return res.error(err.message, 500);
  }
}

}

module.exports = AuditController;
