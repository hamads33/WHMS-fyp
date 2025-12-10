module.exports = ({ prisma }) => async (req, res) => {
  const data = await prisma.marketplaceProduct.findMany({
    orderBy: { installCount: "desc" },
    take: 10
  });
  res.json({ success: true, data });
};
