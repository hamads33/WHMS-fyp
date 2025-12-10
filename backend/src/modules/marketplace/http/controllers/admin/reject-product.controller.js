module.exports = ({ prisma }) => async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { reason } = req.body;

    const product = await prisma.marketplaceProduct.update({
      where: { id: productId },
      data: { status: "rejected", rejectReason: reason }
    });

    res.json({ success: true, product });
  } catch (err) {
    next(err);
  }
};
