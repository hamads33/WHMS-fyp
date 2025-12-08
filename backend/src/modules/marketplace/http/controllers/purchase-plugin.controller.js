module.exports = ({ purchasePlugin }) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id || req.body.userId;
      const productId = req.params.productId;
      const versionId = req.body.versionId;

      const result = await purchasePlugin.execute({
        productId,
        versionId,
        userId
      });

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };
};
