module.exports = ({ updateProductInfo }) => {
  return async (req, res, next) => {
    try {
      const productId = req.params.productId;

      if (!productId) {
        return res.status(400).json({ error: "productId missing in URL" });
      }

      const payload = req.body || {};

      const result = await updateProductInfo.execute({
        productId,
        payload,
      });

      return res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };
};
