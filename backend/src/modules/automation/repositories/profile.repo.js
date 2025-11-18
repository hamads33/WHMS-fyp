// src/modules/automation/repositories/profile.repo.js

const prisma = require('../../../lib/prisma');

async function createProfile(data) {
  return prisma.profile.create({ data });
}

async function updateProfile(id, data) {
  return prisma.profile.update({
    where: { id: Number(id) },
    data
  });
}

async function getProfile(id) {
  return prisma.profile.findUnique({
    where: { id: Number(id) },
    include: { tasks: true }
  });
}

async function listProfiles() {
  return prisma.profile.findMany({
    include: { tasks: true }
  });
}

async function deleteProfile(id) {
  // If using CASCADE on Task.profileId, this is enough:
  return prisma.profile.delete({
    where: { id: Number(id) }
  });
}

module.exports = {
  createProfile,
  updateProfile,
  getProfile,
  listProfiles,
  deleteProfile
};
