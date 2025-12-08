// add-review.controller.js
module.exports = ({ addReview }) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id; // ← currently logged in user
      const productId = req.params.productId;

      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const { rating, review } = req.body;

      const result = await addReview.execute({
        userId,
        productId,
        rating,
        review,
      });

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };
};
