const groupRepo = require("../repositories/server-group.repository");
const serverRepo = require("../repositories/server.repository");

function notFound(msg = "Server group not found") {
  const e = new Error(msg);
  e.statusCode = 404;
  return e;
}

function conflict(msg) {
  const e = new Error(msg);
  e.statusCode = 409;
  return e;
}

async function listGroups() {
  return groupRepo.findAll();
}

async function getGroup(id) {
  const group = await groupRepo.findById(id);
  if (!group) throw notFound();
  return group;
}

async function createGroup(data) {
  const existing = await groupRepo.findByName(data.name);
  if (existing) throw conflict(`Group name "${data.name}" already exists`);
  return groupRepo.create(data);
}

async function updateGroup(id, data) {
  await getGroup(id);
  if (data.name) {
    const existing = await groupRepo.findByName(data.name);
    if (existing && existing.id !== id) {
      throw conflict(`Group name "${data.name}" already exists`);
    }
  }
  return groupRepo.update(id, data);
}

async function deleteGroup(id) {
  await getGroup(id);
  return groupRepo.remove(id);
}

async function assignServerToGroup(serverId, groupId) {
  const group = await groupRepo.findById(groupId);
  if (!group) throw notFound("Server group not found");

  const server = await serverRepo.findById(serverId);
  if (!server) {
    const e = new Error("Server not found");
    e.statusCode = 404;
    throw e;
  }

  return serverRepo.update(serverId, { groupId });
}

async function setDefaultServer(serverId, groupId) {
  const group = await groupRepo.findById(groupId);
  if (!group) throw notFound("Server group not found");

  const server = await serverRepo.findById(serverId);
  if (!server) {
    const e = new Error("Server not found");
    e.statusCode = 404;
    throw e;
  }
  if (server.groupId !== groupId) {
    const e = new Error("Server does not belong to this group");
    e.statusCode = 400;
    throw e;
  }

  await serverRepo.clearGroupDefaults(groupId);
  return serverRepo.update(serverId, { isDefault: true });
}

module.exports = {
  listGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  assignServerToGroup,
  setDefaultServer,
};
