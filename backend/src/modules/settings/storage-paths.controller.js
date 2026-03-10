const storagePathsService = require("./storage-paths.service");

exports.get = async (req, res) => {
  try {
    const settings = await storagePathsService.get();
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const settings = await storagePathsService.update(req.body);
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
