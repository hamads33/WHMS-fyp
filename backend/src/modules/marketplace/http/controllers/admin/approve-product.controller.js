module.exports = ({ prisma }) => async (req, res, next) => {
  try {
    const { productId } = req.params;

    const product = await prisma.marketplaceProduct.update({
      where: { id: productId },
      data: { status: "published", approvedAt: new Date() }
    });

    res.json({ success: true, product });
  } catch (err) {
    next(err);
  }
};
