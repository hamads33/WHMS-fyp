const timelineService = require("../services/activity-timeline.service");

exports.getTimeline = async (req, res) => {
  try {
    const { limit, range } = req.query;
    const result = await timelineService.getTimeline(req.params.id, {
      limit: limit ? parseInt(limit, 10) : 100,
      range: range || "24h",
    });
    res.json(result);
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};
