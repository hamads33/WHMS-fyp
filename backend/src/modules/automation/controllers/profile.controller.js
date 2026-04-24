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

  // ==================================================
  // LIST PROFILES
  // ==================================================
  async list(req, res) {
    try {
      const profiles = await this.profileStore.listWithMeta();
      return res.success(profiles);
    } catch (err) {
      this.logger.error("Failed to list profiles:", err);
      return res.error(err, 500);
    }
  }

  // ==================================================
  // CREATE PROFILE
  // ==================================================
  async create(req, res) {
    try {
      const data = req.body;

      const profile = await this.profileStore.create(data);

      // Schedule if enabled
      if (profile.enabled) {
        this.scheduler.scheduleProfile(profile);
      }

      // Audit the creation
      await this.audit.system("automation.profile.create", {
        userId: req.auditContext?.userId || null,
        entity: "AutomationProfile",
        entityId: profile.id,
        ip: req.auditContext?.ip || null,
        userAgent: req.auditContext?.userAgent || null,
        data: profile
      });

      return res.success(profile, {}, 201);
    } catch (err) {
      this.logger.error("Failed to create profile:", err);
      return res.error(err, 500);
    }
  }

  // ==================================================
  // GET PROFILE
  // ==================================================
  async get(req, res) {
    try {
      // âœ… FIXED: Use profileId from params (matches route definition)
      const profileId = Number(req.params.profileId);

      if (!Number.isInteger(profileId) || profileId <= 0) {
        return res.fail("Invalid profileId", 400, "invalid_param");
      }

      const profile = await this.profileStore.getById(profileId);
      
      if (!profile) {
        return res.fail("Profile not found", 404);
      }

      return res.success(profile);
    } catch (err) {
      this.logger.error("Failed to get profile:", err);
      return res.error(err, 500);
    }
  }

  // ==================================================
  // UPDATE PROFILE
  // ==================================================
  async update(req, res) {
    try {
      // âœ… FIXED: Use profileId from params
      const profileId = Number(req.params.profileId);

      if (!Number.isInteger(profileId) || profileId <= 0) {
        return res.fail("Invalid profileId", 400, "invalid_param");
      }

      const data = req.body;

      const profile = await this.profileStore.update(profileId, data);

      // Reschedule if modified
      if (profile.enabled) {
        this.scheduler.scheduleProfile(profile);
      } else {
        this.scheduler.stopProfile(profileId);
      }

      // Audit the update
      await this.audit.system("automation.profile.update", {
        userId: req.auditContext?.userId || null,
        entity: "AutomationProfile",
        entityId: profileId,
        ip: req.auditContext?.ip || null,
        userAgent: req.auditContext?.userAgent || null,
        data
      });

      return res.success(profile);
    } catch (err) {
      this.logger.error("Failed to update profile:", err);
      return res.error(err, 500);
    }
  }

  // ==================================================
  // DELETE PROFILE
  // ==================================================
  async delete(req, res) {
    try {
      // âœ… FIXED: Use profileId from params
      const profileId = Number(req.params.profileId);

      if (!Number.isInteger(profileId) || profileId <= 0) {
        return res.fail("Invalid profileId", 400, "invalid_param");
      }

      await this.profileStore.delete(profileId);
      this.scheduler.stopProfile(profileId);

      // Audit the deletion
      await this.audit.system("automation.profile.delete", {
        userId: req.auditContext?.userId || null,
        entity: "AutomationProfile",
        entityId: profileId,
        ip: req.auditContext?.ip || null,
        userAgent: req.auditContext?.userAgent || null,
        data: null
      });

      return res.success({ deleted: true });
    } catch (err) {
      this.logger.error("Failed to delete profile:", err);
      return res.error(err, 500);
    }
  }

  // ==================================================
  // ENABLE PROFILE
  // ==================================================
  async enable(req, res) {
    try {
      // âœ… FIXED: Use profileId from params
      const profileId = Number(req.params.profileId);

      if (!Number.isInteger(profileId) || profileId <= 0) {
        return res.fail("Invalid profileId", 400, "invalid_param");
      }

      await this.profileStore.setEnabled(profileId, true);
      const profile = await this.profileStore.getById(profileId);

      if (profile) {
        this.scheduler.scheduleProfile(profile);
      }

      // Audit the enable
      await this.audit.automation(
        "profile.enable",
        { profileId },
        req.auditContext?.userId || "system"
      );

      return res.success({ enabled: true });
    } catch (err) {
      this.logger.error("Failed to enable profile:", err);
      return res.error(err, 500);
    }
  }

  // ==================================================
  // DISABLE PROFILE
  // ==================================================
  async disable(req, res) {
    try {
      // âœ… FIXED: Use profileId from params
      const profileId = Number(req.params.profileId);

      if (!Number.isInteger(profileId) || profileId <= 0) {
        return res.fail("Invalid profileId", 400, "invalid_param");
      }

      await this.profileStore.setEnabled(profileId, false);
      this.scheduler.stopProfile(profileId);

      // Audit the disable
      await this.audit.automation(
        "profile.disable",
        { profileId },
        req.auditContext?.userId || "system"
      );

      return res.success({ disabled: true });
    } catch (err) {
      this.logger.error("Failed to disable profile:", err);
      return res.error(err, 500);
    }
  }
}

module.exports = ProfileController;