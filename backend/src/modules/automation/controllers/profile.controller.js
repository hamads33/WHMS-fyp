// src/modules/automation/controllers/profile.controller.js
const Ajv = require("ajv");
const profileSchema = require("../validators/profile.validator");
const ajv = new Ajv();

const validateProfile = ajv.compile(profileSchema);

class ProfileController {
  constructor({ profileStore, scheduler, logger, audit }) {
    this.profileStore = profileStore;
    this.scheduler = scheduler;
    this.logger = logger;
    this.audit = audit;
  }

  async list(req, res) {
    const profiles = await this.profileStore.listAll();
    return res.success(profiles);
  }

  async create(req, res, next) {
    try {
      const body = req.body;
      if (!validateProfile(body)) {
        return res.fail("Invalid profile data", 400, "validation_error", validateProfile.errors);
      }

      const created = await this.profileStore.create(body);

      await this.audit.log(
        "automation",
        "profile.create",
        req.user?.username || "system",
        { profileId: created.id }
      );

      if (created.enabled) this.scheduler.scheduleProfile(created);

      res.status(201);
      return res.success(created);
    } catch (err) {
      next(err);
    }
  }

  async get(req, res, next) {
    try {
      const id = Number(req.params.id);
      const profile = await this.profileStore.getById(id);

      if (!profile) {
        const error = new Error("Profile not found");
        error.status = 404;
        error.code = "profile_not_found";
        throw error;
      }

      return res.success(profile);
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const id = Number(req.params.id);
      const body = req.body;

      if (!validateProfile(body)) {
        return res.fail("Invalid profile data", 400, "validation_error", validateProfile.errors);
      }

      const existing = await this.profileStore.getById(id);
      if (!existing) {
        const error = new Error("Profile not found");
        error.status = 404;
        error.code = "profile_not_found";
        throw error;
      }

      const updated = await this.profileStore.update(id, body);

      await this.audit.log("automation", "profile.update", req.user?.username || "system", {
        profileId: id
      });

      this.scheduler.scheduleProfile(updated);

      return res.success(updated);
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const id = Number(req.params.id);

      const existing = await this.profileStore.getById(id);
      if (!existing) {
        const error = new Error("Profile not found");
        error.status = 404;
        error.code = "profile_not_found";
        throw error;
      }

      await this.profileStore.delete(id);

      await this.audit.log("automation", "profile.delete", req.user?.username || "system", {
        profileId: id
      });

      this.scheduler.stopProfile(id);

      return res.success({ deleted: id });
    } catch (err) {
      next(err);
    }
  }

  async enable(req, res, next) {
    try {
      const id = Number(req.params.id);

      const profile = await this.profileStore.getById(id);
      if (!profile) {
        const error = new Error("Profile not found");
        error.status = 404;
        error.code = "profile_not_found";
        throw error;
      }

      const updated = await this.profileStore.setEnabled(id, true);

      await this.audit.log("automation", "profile.enable", req.user?.username || "system", {
        profileId: id
      });

      this.scheduler.scheduleProfile(updated);

      return res.success(updated);
    } catch (err) {
      next(err);
    }
  }

  async disable(req, res, next) {
    try {
      const id = Number(req.params.id);

      const profile = await this.profileStore.getById(id);
      if (!profile) {
        const error = new Error("Profile not found");
        error.status = 404;
        error.code = "profile_not_found";
        throw error;
      }

      const updated = await this.profileStore.setEnabled(id, false);

      await this.audit.log("automation", "profile.disable", req.user?.username || "system", {
        profileId: id
      });

      this.scheduler.stopProfile(id);

      return res.success(updated);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ProfileController;
