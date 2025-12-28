const orderService = require("../services/order.service");

exports.createOrder = async (req, res) => {
  const order = await orderService.createOrder(req.user.id, req.body);
  res.status(201).json(order);
};

exports.listClientOrders = async (req, res) => {
  const orders = await orderService.getClientOrders(req.user.id);
  res.json(orders);
};

exports.getOrder = async (req, res) => {
  const order = await orderService.getOrderById(req.params.id, {
    role: req.user.role,
    userId: req.user.id,
  });
  res.json(order);
};

exports.cancelOrder = async (req, res) => {
  await orderService.cancelOrder(req.params.id, req.user.id);
  res.status(204).send();
};

exports.adminListOrders = async (req, res) => {
  const orders = await orderService.adminListOrders();
  res.json(orders);
};
