const clientService = require('./clients.service');

exports.list = async (req, res) => {
  const { search } = req.query;
  const clients = await clientService.listClients(search);
  res.json(clients);
};

exports.create = async (req, res) => {
  try {
    const data = req.body;
    const client = await clientService.createClient(data);
    res.status(201).json(client);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { newPassword } = req.body;
    await clientService.resetPassword(clientId, newPassword);
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.addService = async (req, res) => {
  const { clientId } = req.params;
  const { serviceName } = req.body;
  const service = await clientService.assignService(clientId, serviceName);
  res.status(201).json(service);
};

exports.removeService = async (req, res) => {
  const { serviceId } = req.params;
  await clientService.removeService(serviceId);
  res.json({ message: 'Service removed' });
};
