module.exports = ({ analyticsOverview }) => {
  return async (req, res, next) => {
    try {
      const productId = req.params.productId;

      const result = await analyticsOverview.execute({ productId });

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };
};
