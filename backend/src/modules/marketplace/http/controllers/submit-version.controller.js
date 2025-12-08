module.exports = ({ submitVersion }) => {
  return async (req, res, next) => {
    try {
      const productId = req.params.productId;

      if (!productId) {
        return res.status(400).json({ error: "productId missing in URL" });
      }

      const { version, changelog, priceCents } = req.body;

      const result = await submitVersion.execute({
        productId,
        version,
        changelog,
        priceCents
      });

      return res.json({ success: true, data: result });

    } catch (err) {
      next(err);
    }
  };
};
