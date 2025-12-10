module.exports = ({ prisma }) => async (req, res, next) => {
  try {
    const products = await prisma.marketplaceProduct.findMany({
      include: { seller: true, category: true },
      orderBy: { createdAt: "desc" }
    });

    res.json({ success: true, data: products });
  } catch (err) {
    next(err);
  }
};
