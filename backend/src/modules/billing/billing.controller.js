const prisma = require('../../db/prisma');

exports.listInvoices = async (req, res) => {
  const list = await prisma.invoice.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(list);
};

exports.createInvoice = async (req, res) => {
  const { clientId, amount, items } = req.body;
  const inv = await prisma.invoice.create({ data: { clientId, amount, items: items || [] }});
  res.status(201).json(inv);
};
