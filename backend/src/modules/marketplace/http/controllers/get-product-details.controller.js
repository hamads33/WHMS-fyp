module.exports = ({ getProductDetails }) => {
  return async (req, res, next) => {
    try {
      const idOrSlug = req.params.productId;

      const result = await getProductDetails.execute({
        productId: idOrSlug
      });

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };
};
