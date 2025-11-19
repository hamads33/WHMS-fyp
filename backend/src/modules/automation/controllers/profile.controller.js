// src/modules/automation/controllers/profile.controller.js
// CRUD for profiles — scheduling handled by workers/cron.runner

const profileRepo = require('../repositories/profile.repo');
const { scheduleProfile, unscheduleProfile } = require('../workers/cron.runner');

async function createProfile(req, res, next) {
  try {
    const data = req.body;

    if (!data.name) {
      return res.status(400).json({ error: "Profile name is required" });
    }

    const created = await profileRepo.createProfile(data);

    // schedule immediately
    scheduleProfile(created);

    res.json(created);
  } catch (err) {
    next(err);
  }
}

async function listProfiles(req, res, next) {
  try {
    const list = await profileRepo.listProfiles();
    res.json(list);
  } catch (err) {
    next(err);
  }
}

async function getProfile(req, res, next) {
  try {
    const id = Number(req.params.id);
    const profile = await profileRepo.getProfile(id);

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    res.json(profile);
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const id = Number(req.params.id);
    const updated = await profileRepo.updateProfile(id, req.body);

    // re-schedule cron
    scheduleProfile(updated);

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function deleteProfile(req, res, next) {
  try {
    const id = Number(req.params.id);

    // unschedule before delete
    unscheduleProfile(id);

    await profileRepo.deleteProfile(id);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createProfile,
  listProfiles,
  getProfile,
  updateProfile,
  deleteProfile
};
