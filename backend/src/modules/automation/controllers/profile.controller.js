/**
 * ProfileController
 * ------------------------------------------------------------------
 * Handles HTTP requests related to Automation Profiles.
 *
 * Automation Profile:
 *  - Represents a scheduled automation configuration
 *  - Contains cron expression and enable/disable state
 *
 * Responsibilities:
 *  - Validate and process API requests
 *  - Delegate persistence to ProfileStore
 *  - Trigger scheduler updates when profiles change
 *  - Emit audit logs for compliance and traceability
 *
 * Important:
 *  - Controller NEVER executes automation logic
 *  - Execution is always delegated to Scheduler/Worker
 *
 * API-First Design:
 *  - No UI logic
 *  - Stateless request handling
 */

class ProfileController {
  constructor({ profileStore, scheduler, logger, audit }) {
    this.profileStore = profileStore;
    this.scheduler = scheduler;
    this.logger = logger;
    this.audit = audit;
  }

  async list(req, res) {
    const list = await this.profileStore.listAll();
    return res.success(list);
  }

  async create(req, res) {
    const data = req.body;

    try {
      const p = await this.profileStore.create(data);

      if (p.enabled) this.scheduler.scheduleProfile(p);

      // SYSTEM AUDIT — because user triggered creation
      await this.audit.system("automation.profile.create", {
        userId: req.auditContext.userId,
        entity: "AutomationProfile",
        entityId: p.id,
        ip: req.auditContext.ip,
        userAgent: req.auditContext.userAgent,
        data: p
      });

      return res.success(p);
    } catch (err) {
      return res.fail(err.message || "Create failed", 400);
    }
  }

  async get(req, res) {
    const id = Number(req.params.id);
    const p = await this.profileStore.getById(id);
    if (!p) return res.fail("Not found", 404);

    return res.success(p);
  }

  async update(req, res) {
    const id = Number(req.params.id);
    const data = req.body;

    const p = await this.profileStore.update(id, data);

    // Reschedule profile if modified
    if (p.enabled) this.scheduler.scheduleProfile(p);
    else this.scheduler.stopProfile(id);

    // SYSTEM AUDIT
    await this.audit.system("automation.profile.update", {
      userId: req.auditContext.userId,
      entity: "AutomationProfile",
      entityId: id,
      ip: req.auditContext.ip,
      userAgent: req.auditContext.userAgent,
      data
    });

    return res.success(p);
  }

  async delete(req, res) {
    const id = Number(req.params.id);

    await this.profileStore.delete(id);
    this.scheduler.stopProfile(id);

    // SYSTEM AUDIT
    await this.audit.system("automation.profile.delete", {
      userId: req.auditContext.userId,
      entity: "AutomationProfile",
      entityId: id,
      ip: req.auditContext.ip,
      userAgent: req.auditContext.userAgent,
      data: null
    });

    return res.success({ deleted: true });
  }

  async enable(req, res) {
    const id = Number(req.params.id);

    await this.profileStore.setEnabled(id, true);
    const p = await this.profileStore.getById(id);

    this.scheduler.scheduleProfile(p);

    // AUTOMATION AUDIT
    await this.audit.automation("profile.enable", { profileId: id }, req.auditContext.userId);

    return res.success({ enabled: true });
  }

  async disable(req, res) {
    const id = Number(req.params.id);

    await this.profileStore.setEnabled(id, false);
    this.scheduler.stopProfile(id);

    // AUTOMATION AUDIT
    await this.audit.automation("profile.disable", { profileId: id }, req.auditContext.userId);

    return res.success({ disabled: true });
  }
}

module.exports = ProfileController;
