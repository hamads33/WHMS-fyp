const clientModel = require('./clients.model');
const bcrypt = require('bcryptjs');

exports.listClients = async (search) => {
  return await clientModel.findAll(search);
};

exports.createClient = async (data) => {
  data.password = await bcrypt.hash(data.password, 10);
  return await clientModel.create(data);
};

exports.resetPassword = async (clientId, newPassword) => {
  const hashed = await bcrypt.hash(newPassword, 10);
  return clientModel.update(clientId, { password: hashed });
};

exports.assignService = async (clientId, serviceName) =>
  clientModel.addService(clientId, serviceName);

exports.removeService = async (serviceId) =>
  clientModel.removeService(serviceId);
