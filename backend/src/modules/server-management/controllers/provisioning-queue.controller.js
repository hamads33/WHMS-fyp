const queueService = require("../services/provisioning-queue.service");

exports.list = async (req, res) => {
  try {
    const { serverId, status, type } = req.query;
    const jobs = await queueService.listJobs({ serverId, status, type });
    res.json({ data: jobs, total: jobs.length });
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const job = await queueService.getJob(req.params.id);
    res.json(job);
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};

exports.retry = async (req, res) => {
  try {
    const job = await queueService.retryJob(req.params.id);
    res.json(job);
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};
