module.exports = ({ createProduct }) => {
  return async (req, res, next) => {
    try {
      const sellerId = req.user?.id || req.body.sellerId;

      if (!sellerId) {
        return res.status(400).json({ error: "sellerId required" });
      }

      const result = await createProduct.execute({
        sellerId,
        title: req.body.title,
        slug: req.body.slug,
        shortDesc: req.body.shortDesc,
        longDesc: req.body.longDesc,
        categoryId: req.body.categoryId,
        tags: req.body.tags || [],
      });

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };
};
