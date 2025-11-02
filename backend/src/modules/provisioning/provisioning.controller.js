const provisioningService = require('./provisioning.service');

exports.provisionService = async (req, res) => {
  try {
    const { serviceId } = req.body;
    const result = await provisioningService.provision(serviceId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
