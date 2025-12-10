module.exports = ({ prisma }) => async (req, res) => {
  const data = await prisma.marketplaceAnalyticsAggregate.findMany({
    orderBy: { date: "desc" },
    take: 30
  });
  res.json({ success: true, data });
};
