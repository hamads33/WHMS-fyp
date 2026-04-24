const groupService = require("../services/server-group.service");

exports.list = async (req, res) => {
  try {
    const groups = await groupService.listGroups();
    res.json({ data: groups, total: groups.length });
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const group = await groupService.getGroup(req.params.id);
    res.json(group);
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};

exports.create = async (req, res) => {
  try {
    const group = await groupService.createGroup(req.body);
    res.status(201).json(group);
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};

exports.update = async (req, res) => {
  try {
    const group = await groupService.updateGroup(req.params.id, req.body);
    res.json(group);
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await groupService.deleteGroup(req.params.id);
    res.status(204).send();
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};

exports.assignServer = async (req, res) => {
  try {
    const server = await groupService.assignServerToGroup(
      req.body.serverId,
      req.params.id
    );
    res.json(server);
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};

exports.setDefault = async (req, res) => {
  try {
    const server = await groupService.setDefaultServer(
      req.body.serverId,
      req.params.id
    );
    res.json(server);
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};
